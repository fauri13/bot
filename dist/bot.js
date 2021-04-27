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
bot.hears(/^\/?(go|gg|lista|invito|vamos|dale)$/i, (ctx) => {
    if (chatAllowed(ctx.chat.id) && ctx.message.reply_to_message) {
        generateGoList_1.generateGoList(ctx, ctx.message.reply_to_message);
    }
});
bot.command('raidstoday', async (ctx) => {
    if (chatAllowed(ctx.chat.id) && userAllowed(ctx.message.from.id)) {
        const raids = await database_1.default.getRaids(new Date(Date.now()).toDateString());
        ctx.deleteMessage(ctx.message.message_id);
        ctx.reply(await dailyStatistics_1.getRaidsMessage(new Date(Date.now()).toDateString()));
    }
});
bot.command('enfermos', async (ctx) => {
    if (chatAllowed(ctx.chat.id) && userAllowed(ctx.message.from.id)) {
        ctx.deleteMessage(ctx.message.message_id);
        ctx.reply(await dailyStatistics_1.getEnfermosMessage(new Date(Date.now()).toDateString()));
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