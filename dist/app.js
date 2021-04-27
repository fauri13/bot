"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const telegraf_1 = require("telegraf");
const database_1 = __importDefault(require("./database"));
const generateGoList_1 = require("./generateGoList");
const token = process.env.BOT_TOKEN;
const endpoint = process.env.BOT_URL;
const path = process.env.BOT_PATH;
const port = process.env.BOT_PORT;
if (token === undefined) {
    throw new Error('BOT_TOKEN must be provided!');
}
if (endpoint === undefined) {
    throw new Error('BOT_URL must be provided!');
}
if (port === undefined) {
    throw new Error('BOT_PORT must be provided!');
}
const bot = new telegraf_1.Telegraf(token);
bot.hears(/^\/?(go|gg|lista|invito|vamos|dale)$/i, (ctx) => {
    if (ctx.message.reply_to_message) {
        generateGoList_1.generateGoList(ctx, ctx.message.reply_to_message);
    }
});
bot.command('raidstoday', async (ctx) => {
    const raids = await database_1.default.getRaids(new Date(Date.now()).toDateString());
    ctx.deleteMessage(ctx.message.message_id);
    ctx.reply(`Hoy se ha(n) hecho ${raids} raid(s)`);
});
bot.command('enfermos', async (ctx) => {
    if (ctx.chat.id === -517067676) {
        const enfermos = await database_1.default.getTopRaidParticipants(new Date(Date.now()).toDateString());
        ctx.deleteMessage(ctx.message.message_id);
        if (enfermos && enfermos.length) {
            ctx.reply(`Los enfermos de hoy son:${enfermos.map((e, index) => `\n${index + 1}. ${e.participant} (${e.count})`).join('')}`);
        }
        else {
            ctx.reply('No hay enfermos hoy 😳');
        }
    }
});
// No need to call bot.launch()
// Set telegram webhook
// npm install -g localtunnel && lt --port 3000
bot.telegram.setWebhook(endpoint);
const app = express_1.default();
app.get('/', (req, res) => res.send('It works!'));
// Set the bot API endpoint
app.use(bot.webhookCallback(path));
app.listen(Number.parseInt(port), () => {
    console.log(`Bot listening on port ${port}`);
});
//# sourceMappingURL=app.js.map