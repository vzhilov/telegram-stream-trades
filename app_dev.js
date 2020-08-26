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


// Get environment variables
dotenv.config({ path: `${__dirname}/.env` });
const bot = new telegraf.default(process.env.BOT_TOKEN);
const channelId = process.env.CHANNEL_ID;
const tgMsgs = `${__dirname}/messages/`;
//const daysOfWeek = {пн: 0, вт: 0, ср: 0, чт: 0, пт: 0}
const dailygraphJob = new cronJob('0 */3 * * * *', function() {
    streamTrades()
}, null, false, 'Europe/Moscow')

const devMode = true

if (!devMode) {
    dailygraphJob.start()


} else {
    const axes = getAxes('d')
    console.log(axes)
    genTradeGraph(axes['x'], axes['y1'], axes['y2'], axes['m'], 'd')

}

 
function getAxes (period) {
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
    switch(period) {
        case 'd':
            xy = {"10:00": 0, "11:00": 0,"12:00": 0,"13:00": 0,"14:00": 0,"15:00": 0,"16:00": 0,"17:00": 0,"18:00": 0,"19:00": 0,};
            
            yLogArr.forEach(function (fline) {
                if (fline.length) {
                    const lineArr = fline.split(",")
                    const fCloseDate = new Date(lineArr[1])
                    const fCloseProfit = lineArr[7].trim()
                    const curDate = new Date()
                    let key = 0
                    
                    if (curDate.getFullYear() == fCloseDate.getFullYear() && curDate.getMonth() == fCloseDate.getMonth() && curDate.getDate() == fCloseDate.getDate()) {
                        key = (Number(fCloseDate.getHours()) + 1) + ":00"
                        xy[key] = Math.floor(Number(fCloseProfit))
                    }
                }
            })

        break
        case 'w':

        break
        case 'm':

        break
    }
    let res = {}, x = [], y1 = [], y2 = [], cum = 0
    
    
    for (const [key, value] of Object.entries(xy)) {
        x.push(key)
        y1.push(value)
        cum = cum + value
        y2.push(cum)
    }

    res['x'] = x
    res['y1'] = y1
    res['y2'] = y2
    res['m'] = m
    return res
}

function genTradeGraph (x, y1, y2, m, period) {

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
                    barThickness: 24,
                    label: 'My dataset1',
                    data: y1,
                    backgroundColor: 'rgba(75,192, 192, 0.2)',
                    borderColor: 'rgba(54, 162, 135, 0.2)',
                    borderWidth: 1,
                    datalabels: {
                        align: 'center',
                        anchor: 'center',

                            backgroundColor: function(context) {
                                //return context.dataset.backgroundColor;
                            },
                            borderRadius: 4,
                            color: 'rgba(75,192, 192, 0.8)',
                            
                         
                            formatter: function(value, context) {
                                if (value > 0)
                                    return "+" + Math.round(value)
                                else 
                                    return "-" + Math.round(value)
                            },
                            display: function(context) {
                                return context.dataset.data[context.dataIndex] > 1; // or >= 1 or ...
                             }
                        


                    }
                }, 
                {
                    type:"line",
                    yAxisID: 'left-y-axis',
                    label: 'My dataset2',
                    data: y2,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderColor: 'rgba(54, 162, 135, 1)',
                    //borderWidth: 1,
                    datalabels: {
                        align: 'end',
                        anchor: 'end'
                    }
                }, 
                
                {
                    type:"line",
                    yAxisID: 'right-y-axis',
                    //barThickness: 24,
                    label: 'My dataset3',
                    data: m,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderColor: 'rgba(54, 162, 135, 0.2)',
                    borderWidth: 1,
                    datalabels: {
                        align: 'start',
                        anchor: 'start'
                    }
                }, 
 
            ],
                labels: x,
        },

        options: {
            scales: {
                yAxes: [
                    {
                        id: 'left-y-axis',
                        position: 'left',
                        //stacked: false,
                        ticks: {
                            //beginAtZero: true,
                            callback: (value) => value + "R"
                        },
                    },
                    {
                        id: 'right-y-axis',
                        position: 'right',
                        ticks: {
                            //beginAtZero: false,
                            //callback: (value) => value + "R"
                        },

                    }
                ],
                xAxes: [{
                    stacked: true,

                }]
            },
            plugins: {

            }
        }
    };
    const image = await canvasRenderService.renderToBuffer(configuration);
    fs.writeFileSync(tgMsgs + "test.png", image)        
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
