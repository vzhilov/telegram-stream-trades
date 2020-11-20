"use strict";
//Object.defineProperty(exports, "__esModule", { value: true });
// Dependencies
const dotenv = require("dotenv");
const telegraf = require("telegraf");
//const Extra = require('telegraf/extra')
//const Markup = require('telegraf/markup')
const glob = require("glob")
const fs = require('fs');
const iconv = require('iconv-lite');
const cronJob = require('cron').CronJob;
const Chart = require('chart.js');
//const ChartFinancial = require('./dist/chartjs-chart-financial.js');

const { CanvasRenderService } = require('chartjs-node-canvas');        
const { title } = require("process");

const luxon = require("luxon");


// Get environment variables
dotenv.config({ path: `${__dirname}/.env` });
const bot = new telegraf.default(process.env.BOT_TOKEN);
const channelId = process.env.CHANNEL_ID;
const merchantToken = process.env.MERCHANT_TOKEN;
const tgMsgs = `${__dirname}/messages/`;
const streamTradesJob = new cronJob('0 */3 * * * *', function() {streamTrades()}, null, false, 'Europe/Moscow')
const dailyGraphJob = new cronJob('0 0 19 * * 1-5', function() {genTradeGraph ('d')}, null, false, 'Europe/Moscow')
const weeklyGraphJob = new cronJob('0 0 19 * * 6', function() {genTradeGraph ('w')}, null, false, 'Europe/Moscow')
const monthlyGraphJob = new cronJob('0 0 20 1 * *', function() {genTradeGraph ('w')}, null, false, 'Europe/Moscow')

const devMode = true

if (!devMode) {
    streamTradesJob.start()
    dailyGraphJob.start()
    weeklyGraphJob.start()
    monthlyGraphJob.start()
	merchantBot()
} else {

    genTradeGraph ('d') 
    //merchantBot()

    

}






function merchantBot() {

    const qaButtons = telegraf.Extra
    .HTML()
    .markup((m) => m.inlineKeyboard([
			[m.callbackButton("Описание ботов", "description"), m.callbackButton("Стоимость", "price")],
			[m.callbackButton("Режимы торговли", "modes"), m.callbackButton("Пример использования", "example")],
			[m.callbackButton("График доходности за месяц", "profit"), m.callbackButton("Трансляция сделок", "channel")],
			[m.callbackButton("Купить ботов", "buy")],
		],
	))

    const backButton = telegraf.Extra
    .HTML()
    .markup((m) => m.inlineKeyboard([
			[m.callbackButton("⬅️ Назад", "start")],
		],
	))

    const startMsg = "Торговая система @StreamTrades состоит из комплекса торговых программ (ботов) для работы на бирже ММВБ"
	
    const desctiptionMsg = "\
<b>&gt      Система ботов для торговли</b>\n\
\n\
        Данная система торговли состоит из трех торговых программ (торговых ботов) и \
по желанию дополнительной программы @StreamTrades для транслирования сделок и доходности в Telegram.\n\
\n\
        <b>Бот профайлер</b> - анализирует историчесике данные котировок более чем 200 акций торгуемых на ММВБ и <i>составляет профили бумаг</i>\n\
\n\
        <b>Бот трейдер</b> - сопоставляет текущие котировки акций с профилями бумаг, \
составленнымы Профайлером и <i>выдает рекомендации или сам совершает сделки</i> по открытию и закрытию позиций. \n\
\n\
        &#9679; Если бот трейдер настроен для работы в ручном режиме, он только рекомендует открытие и \
закрытие позицый, но сам не совершает никаких сделок. \n\
\n\
        &#9679; В полуавтоматическом режиме бот трейдер так же выдает рекомендации, но может и торговать \
самостоятельно, но только в случаях резкого изменения котировок по бумагам, чтобы не упустить \
момент бурного роста или падения.\n\
\n\
        &#9679; В полностью автоматическом режиме бот осущетвляет всё торговлю сам.\n\
\n\
        <b>Бот Логгер</b> - <i>ведет журнал сделок</i> и регистрирует доходность по каждой закрытой позиции.\n\
\n\
        <b>Бот Стриммер</b> - отдельная от торговой системы бесплатная программа, позволяющая трансилоровать результаты работы \
системы в публиный или приватный канал Telegram.\n\
\n"

	const exampleMsg = "\
        <b>Пример использования</b>\n\
\n\
        В телеграм канал @StreamTrades транслируются результаты работы бота трейдера, запущенного в полуавтоматическом режиме. \
Автоматически открываются позиции только в случае выстрела бумаги. Автоматическое закрытие позиций просиходит в случае достижения \
высокой доходности, либо большого убытка.\n\
\n\
        Данные боты являются результатом моих проб и ошибок в торговле на финансовом рынке. И хотя я сам написал этих ботов, я считаю \
что важные аспекты человеческой жизни, такаие как например финансы, медицина или образвание не дожны быть полностью вверны машинам. \
Поэтому я использую ботов в полуавтоматическом режиме. Я сам регулярно \
промастриваю открытые ботами позиции и закрываю их вручную, если накомленная доходность меня устраивает.\n\
\n\
        Паралельно слежу за остальными рекомендациями, которые выдаёт бот трейдер, просматриваю графики \
рекомендуемых им бумаг, дополнительно сам провожу теханализ и принимаю решение об \
открытии и закрытии позиций.\n\
\n\
        Когда я вижу что ситуация на рынке изменилась или когда бот трейдер перестал получать желаюмую доходность, я запускаю бота \
профайлера, чтобы заново проанализировать рынок и адаптироваться под текущую коньюнктуру."
   
	const priceMsg = "За 12 лет торговли я испробовал много стратегий на рынке ММВБ: трендовая торговля, использование индикаторов, торговля только по 'стакану'. \
	в итоге весь мой опыт свелся к довольно простой системе, которя может использоватся как при торговле внутри дня, так и на больших промежутках.\
	"
   
    const invoice = {
        provider_token: merchantToken,
        start_parameter: 'trading_bots',
        title: 'Набор торговых ботов',
        description: 'Три торговых бота на языке Lua торгового терминала Quik, zip-архив',
        currency: 'RUB',
        photo_url: 'https://avatars.mds.yandex.net/get-pdb/1352825/885173cc-dacd-4375-beb9-5dc5ee6553fd/s1200?webp=false',
        need_shipping_address: false,
        is_flexible: false,
        prices: [
            { label: 'Набор торговых роботов', amount: 6790000 }
        ],
        payload: {}
    
    };


    bot.start((ctx) => {ctx.reply(startMsg, qaButtons)})
    bot.action('start', (ctx) => {ctx.reply(startMsg, qaButtons);ctx.answerCbQuery()})
    bot.action('description', (ctx) => {ctx.reply(desctiptionMsg, backButton);ctx.answerCbQuery()})
    bot.action('price', (ctx) => {ctx.reply("priceMsg", backButton);ctx.answerCbQuery()})
    bot.action('modes', (ctx) => {ctx.reply("modesMsg", backButton);ctx.answerCbQuery()})
    bot.action('example', (ctx) => {ctx.reply(exampleMsg, backButton);ctx.answerCbQuery()})
    bot.action('profit', (ctx) => {genTradeGraph ('m', ctx);ctx.answerCbQuery()})
    bot.action('channel', (ctx) => {ctx.reply("channelMsg", backButton);ctx.answerCbQuery()})
    bot.action('buy', (ctx) => ctx.replyWithInvoice(invoice));





    bot.on('pre_checkout_query', (ctx) => {
        ctx.answerPreCheckoutQuery(true)
    })
    
    bot.on('message', (ctx) => {
        if (ctx.update.message.successful_payment != undefined) {
            ctx.reply('Thanks for the purchase!')
        } else {
            // Handle other message types, subtypes
        }
    })

    bot.launch()
}


function genTradeGraph (period, ctx = null) {
    let xy = {}
    const quikLog = process.env.QUIK_LOGFILE;
    const yMcxFile = tgMsgs + 'micex' + period + ".indx"
    const yLog = fs.readFileSync(quikLog, 'utf8')
    const yMcx = fs.readFileSync(yMcxFile, 'utf8')
    const yLogArr = yLog.split("\n").filter(function (el) {
        return el != '';
      });
    const m = yMcx.split(",").filter(function (el) {
        return el != '';
      });
    const curDate = new Date()

    switch(period) {
        case 'd':
            xy = {"10:00": 0, "11:00": 0,"12:00": 0,"13:00": 0,"14:00": 0,"15:00": 0,"16:00": 0,"17:00": 0,"18:00": 0,"19:00": 0,};
            
            yLogArr.forEach(function (fline) {
                if (fline.length) {
                    const lineArr = fline.split(",")
                    const fCloseDate = new Date(lineArr[1])
                    const fCloseProfit = lineArr[7].trim()

                    let key = 0
                    
                    if (curDate.getFullYear() == fCloseDate.getFullYear() && curDate.getMonth() == fCloseDate.getMonth() && curDate.getDate() == fCloseDate.getDate()) {
                        key = (Number(fCloseDate.getHours()) + 1) + ":00"
                        //console.log(fCloseDate + " | " + fCloseProfit + " | " + key)
                        xy[key] = Math.floor(Number(xy[key]) + Number(fCloseProfit))
                    }
                }
            })

        break
        case 'w':
            xy = {"пн": 0, "вт": 0,"ср": 0,"чт": 0,"пт": 0};

            yLogArr.forEach(function (fline) {
                if (fline.length) {
                    const lineArr = fline.split(",")
                    const fCloseDate = new Date(lineArr[1])
                    const fCloseProfit = lineArr[7].trim()

                    let key = 0
                    let weekDays = ['пн', 'вт', 'ср', 'чт', 'пт', ]
                    
                    if (lastSunday < fCloseDate) {
                        key =  weekDays[Number(fCloseDate.getDay())-1]
                        console.log(fCloseDate + " | " + fCloseProfit + " | " + key)
                        xy[key] = Math.floor(Number(xy[key]) + Number(fCloseProfit))
                    }
                }
            })

        break
        case 'm':
            const lastSunday = new Date(curDate.setDate(curDate.getDate() - curDate.getDay()))
            const sixWeeksAgoSunday = new Date(lastSunday.setDate(lastSunday.getDate() - 42))

            yLogArr.forEach(function (fline) {
                if (fline.length) {
                    const lineArr = fline.split(",")
                    const fCloseDate = new Date(lineArr[1])
                    const fCloseProfit = lineArr[7].trim()

                    if (sixWeeksAgoSunday < fCloseDate) {
                        fCloseDate.setDate(fCloseDate.getDate() + 5 - fCloseDate.getDay())
                        let key = humanDate(fCloseDate)
                        //console.log(fCloseDate + " | " + fCloseProfit + " | " + key + " | " + fCloseFriday)
                        if (isNaN(xy[key])) xy[key] = 0
                        xy[key] = Math.floor(Number(xy[key]) + Number(fCloseProfit))
                    }
                }
            })

        break
    }
    let res = {}, x = [], y1 = [], y2 = [], cum = 0
    
    
    for (const [key, value] of Object.entries(xy)) {
        x.push(key)
        y1.push(value)
        cum = cum + value
        y2.push(cum)
    }

/**
    res['x'] = x
    res['y1'] = y1
    res['y2'] = y2
    res['m'] = m
*/
    //console.log(res)
    
    return drawGraph (x, y1, y2, m, period, ctx, cum)
}

function drawGraph (x, y1, y2, m, period, ctx, cum) {


    let title = ""
    if (period == 'd') title = "день"
    if (period == 'w') title = "неделю"
    if (period == 'm') title = "месяц"

    const width = 600;
    const height = 400;

    const chartJsFactory = () => {
        //require('chart.js');
        require('chartjs-plugin-datalabels');
        require('./dist/chartjs-chart-financial.js');
        //delete require.cache[require.resolve('chart.js')];
        delete require.cache[require.resolve('chartjs-plugin-datalabels')];
        delete require.cache[require.resolve('./dist/chartjs-chart-financial.js')];
        return Chart;
    }

    const canvasRenderService = new CanvasRenderService(width, height, undefined, undefined, chartJsFactory);

var barCount = 60;
var initialDateStr = '01 Apr 2017 00:00 Z';


    (async () => {
    const configuration = {
        type: 'bar',
        data: {
            datasets: [
                {
                    type:"bar",
                    yAxisID: 'left-y-axis',
                    //barThickness: 24,
                    label: 'Почасовой',
                    data: y1,
                    backgroundColor: 'rgba(54, 162, 135, 0.2)', //'rgba(75,192, 192, 0.2)',
                    borderColor: 'rgba(54, 162, 135, 0.2)',
                    borderWidth: 1,
                    datalabels: {
                        align: 'center',
                        anchor: 'center',

                        //backgroundColor: 'rgba(54, 162, 135, 0.1)',
                        //function(context) {return context.dataset.backgroundColor;},
                        borderRadius: 4,
                        color: 'rgba(54, 162, 135, 0.8)',//'rgba(75,192, 192, 0.8)',
                        
                        formatter: function(value, context) {
                            if (value > 0)
                                return "+" + Math.round(value)
                            else 
                                return Math.round(value)
                        },
                        display: function(context) {
                            return context.dataset.data[context.dataIndex] != 0; // or >= 1 or ...
                        }
                    }
                }, 
                {
                    type:"line",
                    yAxisID: 'left-y-axis',
                    label: 'Накопительный',
                    data: y2,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderColor: 'rgba(54, 162, 135, 1)',
                    borderWidth: 2,
                    lineTension: 0.3,
                    datalabels: {
                        //display: false,
                        align: 'end',
                        anchor: 'end',
                        color: 'rgba(54, 162, 135, 1)', //'rgba(75,192, 192, 1)',
                    }
                }, 
                
                {

                    type:"line",
                    /*
                    type: 'candlestick',
                    data: {
                        datasets: [{
                            label: 'CHRT - Chart.js Corporation',
                            data: getRandomData(initialDateStr, barCount)
                        }]
                    },
                    */
                    yAxisID: 'right-y-axis',
                    //barThickness: 24,
                    label: 'Индекс ММВБ',
                    data: m,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderColor: 'rgba(245, 120, 81, 0.5)', //'rgba(14, 67, 96, 0.2)', //'rgba(234, 78, 106, 0.2)',
                    borderDash: [20, 3, 3, 3, 3, 3, 3, 3],
                    borderWidth: 1,
                    datalabels: {
                        display: false,

                    }
                }, 
 
            ],
                labels: x,
        },

        options: {
            title: {
                display: true,
                text: 'График доходности за ' + title,
                fontColor: 'rgba(104, 143, 133, 1)',
                fontSize: '16',
            },
            legend: {
                display: true,
                labels: {
                    fontColor: 'rgba(54, 162, 135, 1)',
                    //padding: 50, //'2, 3, 4, 5',
                },
                
            },   
            scales: {
                yAxes: [
                    {
                        id: 'left-y-axis',
                        position: 'left',
                        //stacked: false,
                        ticks: {
                            beginAtZero: true,
                            callback: (value) => value + "₽",
                            fontColor: 'rgba(104, 143, 133, 1)',
                            max: cum + cum/5,
    
                            //padding: 25,


                        },
                        gridLines: {
                            color: 'rgba(104, 143, 133, 0.2)',
                            zeroLineColor: 'rgba(104, 143, 133, 0.5)',
                        },

                    },
                    {
                        id: 'right-y-axis',
                        position: 'right',
                        gridLines: {
                            display: false,
                        },
                        ticks: {
                            fontColor: 'rgba(245, 120, 81, 0.8)',
                        },

                    }
                ],
                xAxes: [
                    {
                        //stacked: true,
                        gridLines: {
                            color: 'rgba(104, 143, 133, 0.2)',
                            zeroLineColor: 'rgba(104, 143, 133, 0.5)',    
                            //tickMarkLength: 15                          
                        },
                        ticks: {
                            fontColor: 'rgba(104, 143, 133, 1)',
                        },
                   }
                ],
            },
            plugins: {
            },

        }
    };

    const image = await canvasRenderService.renderToBuffer(configuration);

   

	if (ctx == null) {
		if(devMode) {
			fs.writeFileSync(tgMsgs + "test.png", image)
		} else {
			bot.telegram.sendPhoto(channelId, {source: image});
		}
	} else ctx.replyWithPhoto({ source: image })

    })(); 

}




// ************************************* randomizer *******************************************
var getRandomInt = function(max) {
	return Math.floor(Math.random() * Math.floor(max));
};

function randomNumber(min, max) {
	return Math.random() * (max - min) + min;
}

function randomBar(date, lastClose) {
	var open = randomNumber(lastClose * 0.95, lastClose * 1.05).toFixed(2);
	var close = randomNumber(open * 0.95, open * 1.05).toFixed(2);
	var high = randomNumber(Math.max(open, close), Math.max(open, close) * 1.1).toFixed(2);
	var low = randomNumber(Math.min(open, close) * 0.9, Math.min(open, close)).toFixed(2);
	return {
		t: date.valueOf(),
		o: open,
		h: high,
		l: low,
		c: close
	};

}

function getRandomData(dateStr, count) {
	var date = luxon.DateTime.fromRFC2822(dateStr);
	var data = [randomBar(date, 30)];
	while (data.length < count) {
		date = date.plus({days: 1});
		if (date.weekday <= 5) {
			data.push(randomBar(date, data[data.length - 1].c));
		}
	}
	return data;
}

//******************************************************************************************************************* */














function streamTrades() {
    console.log("Cron" + new Date())
    const txtFiles = tgMsgs + "*.txt"
    glob(txtFiles, function (er, files) {
        files.forEach(function(file, i, arr) {
            console.log(file)
            fs.readFile(file, (err, data) => {
                if (err) throw err;
                else {
                    const message = iconv.decode(data, "win1251").toString();
                    bot.telegram.sendMessage(channelId, message, {parse_mode: 'HTML'});
                    fs.unlinkSync(file)
                }
            });
        })   
    })
}

function humanDate(date) {
    return date.getDate() + "-" + ("0" + (date.getMonth()+1)).slice(-2) + "-" + date.getFullYear()
}


/**
const stickerSetName = 'phpSuckedSeconds';
bot.start(async (ctx) => {
    try {
        const botUsername = ctx.me;
        const stickerId = await getStickerId();
        await ctx.telegram.createNewStickerSet(ownerId, `${stickerSetName}_by_${botUsername}`, 'PHP sucked for this many seconds', {
            png_sticker: stickerId,
            emojis: '💩',
            mask_position: undefined,
        });
        const stickerSet = await bot.telegram.getStickerSet(`${stickerSetName}_by_${botUsername}`);
        const sticker = stickerSet.stickers[0];
        return ctx.replyWithSticker(sticker.file_id);
    }
    catch (err) {
        return ctx.reply(err.message);
    }
});
setInterval(updateSticker, 60 * 1000);
async function updateSticker() {
    console.log('Updating stickers');
    const botUsername = bot.options.username;
    const stickerSet = await bot.telegram.getStickerSet(`${stickerSetName}_by_${botUsername}`);
    const sticker = stickerSet.stickers[0];
    await bot.telegram.deleteStickerFromSet(sticker.file_id);
    await bot.telegram.addStickerToSet(ownerId, stickerSetName, {
        png_sticker: await getStickerId(),
        emojis: '💩',
        mask_position: undefined,
    }, false);
    console.log('Updated stickers');
}
async function getStickerId() {
    const secondsAfterPHP = Math.floor(new Date().getTime() / 1000 - new Date('1995').getTime() / 1000);
    const result = await textToPicture.convert({
        text: `${secondsAfterPHP}`,
        source: {
            width: 512,
            height: 512,
            background: '0xFF0000FF',
        },
        color: 'white',
    });
    const file = await bot.telegram.uploadStickerFile(ownerId, {
        source: await result.getBuffer(),
    });
    return file.file_id;
}
bot.launch().then(() => console.log("It's alive!"));
//# sourceMappingURL=app.js.map
*/
