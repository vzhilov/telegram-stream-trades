"use strict";
//Object.defineProperty(exports, "__esModule", { value: true });
// Dependencies
const dotenv = require("dotenv");
const telegraf = require("telegraf");
const glob = require("glob")
const fs = require('fs');
const iconv = require('iconv-lite');
const cronJob = require('cron').CronJob;
const Chart = require('chart.js');
const { CanvasRenderService } = require('chartjs-node-canvas');        
const { title } = require("process");


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
} else {

    //genTradeGraph ('m') 
    merchantBot()

    

}

function merchantBot() {

    const startMsg = "/info - описание систмы \n\
    /profit - график доходности за месяц \n\
    /buy - приобрести роботов \n\
    @StreamTrade = канал с трансляцией сделок и доходности в реальном времени"
    
    const buyButton = telegraf.Extra
    .markdown()
    .markup((m) => m.inlineKeyboard([
        m.callbackButton("Купить роботов", "buy")
    ]))

    const infoMsg = "\
        Система ботов для торговли\n\
    \n\
        Моя система торговли состоит из трех торговых программ (торговых ботов) и \
    по желанию дополнительной программы @StereamTrades для транслирования сделок и доходности в Telegram.\n\
    \n\
        <b>Бот Профайлер</b> - это первый бот, анализирующих историчесике данные котировок более чем 200 акций торгуемых на ММВБ и составляющий профили бумаг\n\
    \n\
        <b>Бот Трейдер</b> - бот, который сопоставляет текущие котировки акций с профилями бумаг, составленные Профайлером. \
    Если бот настроен для работы в ручном режиме, он только рекомендует рекомендует открытие и \
    закрытие позицый, но сам не совершает никаких сделок. В полуавтоматическом режиме бот может торговать \
    самостоятельно, но только в случаях резкого изменения котировок по бумагам, чтобы не упустить \
    момент бурного роста или падения.\n\
    \n\
        В полностью автоматическом режиме бот совершает всё торговлю сам.\n\
    \n\
        Бот Логгер - бот, который ведет журнал сделок и регистрирует доходность по каждой закрытой позиции.\n\
    \n\
        Бот Стриммер - отдельная от торговой системы программа, позволяющая трансилоровать результаты работы\
    системы в открытиые или приватный канал Telegram.\n\
    \n\
        <u>Пример использования</u>\n\
    \n\
        Я использую своих ботов в полуавтоматическом режиме, когда они открывают позиции сами только в \
    случае выстрела бумаги и закрывают позиции в случае чрезвычайно высокой доходности. Я сам регулярно \
    промастриваю открытые позиции и закрываю их вручную, если накомленная доходность меня устраивает.\n\
    \n\
        Паралельно с слежу за остальныеми рекомендациями, которые дает Бот Трейдер, открываю графики \
    рекомендуемых им бумаг, дополнительно провожу теханализ самостоятельно и принимаю решение об \
    открытии таких позиций вручную"
    
    const invoice = {
        provider_token: merchantToken,
        start_parameter: 'online_conslutation',
        title: 'Онлайн консультация Айболит',
        description: 'Проведение Онлайн консультации с врачем. Стоимость 1000 рублей. Длительность 1час',
        currency: 'RUB',
        photo_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcThWVMksAXRtRQJn3oHFWyz9FMusRty4pQX5Iobe8OfMEJmRzpD&usqp=CAU',
        need_shipping_address: false,
        is_flexible: false,
        prices: [
            { label: 'Онлайн консультация', amount: 6790000 }
        ],
        payload: {}
    
    };


    bot.start((ctx) => {
        ctx.reply(startMsg, buyButton)
    })
    
    bot.action('buy', (ctx) => ctx.replyWithInvoice(invoice));
    bot.command('buy', (ctx) => ctx.replyWithInvoice(invoice));
    bot.command('profit', (ctx) => {
        genTradeGraph ('m')
    })
    bot.command('info', (ctx) => {
        ctx.reply(infoMsg, buyButton, { parse_mode: 'HTML' })
    })







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


function genTradeGraph (period) {
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
    
    drawGraph (x, y1, y2, m, period)
}

function drawGraph (x, y1, y2, m, period) {


    let title = ""
    if (period == 'd') title = "день"
    if (period == 'w') title = "неделю"
    if (period == 'm') title = "месяц"

    const width = 600;
    const height = 400;

    const chartJsFactory = () => {
        require('chartjs-plugin-datalabels');
        delete require.cache[require.resolve('chart.js')];
        delete require.cache[require.resolve('chartjs-plugin-datalabels')];
        return Chart;
    }

    const canvasRenderService = new CanvasRenderService(width, height, undefined, undefined, chartJsFactory);

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
                        align: 'end',
                        anchor: 'end',
                        color: 'rgba(54, 162, 135, 1)', //'rgba(75,192, 192, 1)',
                    }
                }, 
                
                {
                    type:"line",
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
                    //padding: '2, 3, 4, 5',
                }
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
                        },
                        ticks: {
                            fontColor: 'rgba(104, 143, 133, 1)',
                        },
                   }
                ],
            },
            plugins: {

            }
        }
    };

    const image = await canvasRenderService.renderToBuffer(configuration);
   
    
    if(devMode) {
        fs.writeFileSync(tgMsgs + "test.png", image)
   
    } else {
        bot.telegram.sendPhoto(channelId, {source: image});


    }
    })(); 

}


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
