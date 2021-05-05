"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const database_1 = __importDefault(require("./database"));
const generateGoList_1 = require("./generateGoList");
const node_cron_1 = __importDefault(require("node-cron"));
const dailyStatistics_1 = require("./dailyStatistics");
const soloRaiders_1 = require("./soloRaiders");
const token = process.env.BOT_TOKEN;
const allowedChats = process.env.ALLOWED_CHATS;
const allowedUsers = process.env.ALLOWED_USERS;
const announcesChatId = process.env.ANNOUNCES_CHAT_ID;
if (token === undefined) {
    throw new Error('BOT_TOKEN must be provided!');
}
const chatAllowed = (chatId) => allowedChats ? allowedChats.indexOf(chatId.toString()) !== -1 : true;
const userAllowed = (userId) => allowedUsers ? allowedUsers.indexOf(userId.toString()) !== -1 : true;
const bot = new telegraf_1.Telegraf(token);
// Generate list from Pikachu
bot.hears(/^\/?(go|gg|lista|invito|vamos|dale)$/i, async (ctx) => {
    if (chatAllowed(ctx.chat.id) && ctx.message.reply_to_message) {
        generateGoList_1.generateGoList(ctx, ctx.message.reply_to_message);
    }
});
// Solo raiders
bot.hears(/^(?:quiero\s*u?n?|i?\s*want|busco|me interesa)\s*(\w+)/i, (ctx) => {
    if (chatAllowed(ctx.chat.id)) {
        soloRaiders_1.soloRaidersWanted(ctx);
    }
});
bot.hears(/^(?:tengo\s*u?n?|i?\s*have|invito)\s*a?\s*(\w+)/i, (ctx) => {
    if (chatAllowed(ctx.chat.id)) {
        soloRaiders_1.soloRaidersHave(ctx);
    }
});
bot.command('createboss', (ctx) => {
    if (chatAllowed(ctx.chat.id) && userAllowed(ctx.from.id)) {
        const params = ctx.message.text.split(' ');
        if (params.length > 1) {
            database_1.default.insertRaidBoss({
                name: params[1],
                image: params[2]
            });
        }
        ctx.reply(`Agregado ${params[1]}`, { reply_to_message_id: ctx.message.message_id });
    }
});
bot.action(/join-(\w+)/, (ctx) => {
    soloRaiders_1.addSoloRaider(ctx);
});
bot.action(/leave-(\w+)/, (ctx) => {
    soloRaiders_1.removeSoloRaider(ctx);
});
// Statistics
bot.command('raidstoday', async (ctx) => {
    if (chatAllowed(ctx.chat.id) && userAllowed(ctx.from.id)) {
        ctx.deleteMessage(ctx.message.message_id);
        ctx.reply(await dailyStatistics_1.getRaidsMessage(new Date().toDateString()));
    }
});
bot.command('raidsyesterday', async (ctx) => {
    if (chatAllowed(ctx.chat.id) && userAllowed(ctx.from.id)) {
        let date = new Date();
        date.setDate(date.getDate() - 1);
        ctx.deleteMessage(ctx.message.message_id);
        ctx.reply(await dailyStatistics_1.getRaidsMessage(date.toDateString()));
    }
});
bot.command('enfermos', async (ctx) => {
    if (chatAllowed(ctx.chat.id) && userAllowed(ctx.from.id)) {
        ctx.deleteMessage(ctx.message.message_id);
        ctx.reply(await dailyStatistics_1.getEnfermosMessage(new Date().toDateString()));
    }
});
bot.command('enfermosayer', async (ctx) => {
    if (chatAllowed(ctx.chat.id) && userAllowed(ctx.from.id)) {
        let date = new Date();
        date.setDate(date.getDate() - 1);
        ctx.deleteMessage(ctx.message.message_id);
        ctx.reply(await dailyStatistics_1.getEnfermosMessage(date.toDateString()));
    }
});
// Status
bot.command('ping', (ctx) => {
    if (userAllowed(ctx.from.id)) {
        ctx.reply('pong');
    }
});
if (announcesChatId) {
    node_cron_1.default.schedule('59 23 * * *', async () => {
        const date = new Date(Date.now()).toDateString();
        bot.telegram.sendMessage(announcesChatId, await dailyStatistics_1.getRaidsMessage(date));
        bot.telegram.sendMessage(announcesChatId, await dailyStatistics_1.getEnfermosMessage(date));
    });
}
exports.default = bot;
//# sourceMappingURL=bot.js.map