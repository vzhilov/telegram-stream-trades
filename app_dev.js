"use strict";
//Object.defineProperty(exports, "__esModule", { value: true });
// Dependencies
const dotenv = require("dotenv");
const telegraf = require("telegraf");
const glob = require("glob")
const fs = require('fs');
const iconv = require('iconv-lite');
const cronJob = require('cron').CronJob;

// Get environment variables
dotenv.config({ path: `${__dirname}/.env` });
const bot = new telegraf.default(process.env.BOT_TOKEN);
const channelId = process.env.CHANNEL_ID;
const tgMsgs = `${__dirname}/messages/*.txt`;
const daysOfWeek = ['пн', 'вт', 'ср', 'чт', 'пт']
const dailygraphJob = new cronJob('* */3 * * * *', streamTrades())

const devMode = false

if (!devMode) {
    dailygraphJob.start()


} else {


}

function streamTrades() {
    glob(tgMsgs, function (er, files) {
        files.forEach(function(file, i, arr) {
            console.log(file)
            fs.readFile(file, (err, data) => {
                if (err) throw err;
                else {
                    const message = iconv.decode(data, "win1251").toString();
                    bot.telegram.sendMessage(channelId, message);
                    fs.unlinkSync(file)
                }
            });
        })   
    })
}
 
function inixYValues (period) {


    genTradeGraph(xData, yData)
}

function genTradeGraph (x, y) {


}

function inixXValues (period){
    switch(period) {
        case 'd':
            return daysOfWeek;
            break
        case 'w':

        case 'm':
    }
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