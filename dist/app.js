"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var telegraf_1 = require("telegraf");
var generateGoList_1 = require("./generateGoList");
var token = process.env.BOT_TOKEN;
var endpoint = process.env.BOT_URL;
if (token === undefined) {
    throw new Error('BOT_TOKEN must be provided!');
}
if (endpoint === undefined) {
    throw new Error('BOT_URL must be provided!');
}
var bot = new telegraf_1.Telegraf(token);
bot.hears(/^\/?(go|gg|lista|invito|vamos|dale)$/i, function (ctx) {
    if (ctx.message.reply_to_message) {
        generateGoList_1.generateGoList(ctx, ctx.message.reply_to_message);
    }
});
//bot.launch()
// Set telegram webhook
// npm install -g localtunnel && lt --port 3000
bot.telegram.setWebhook(endpoint + "/some-path");
var app = express_1.default();
app.get('/', function (req, res) { return res.send('Hello World!'); });
// Set the bot API endpoint
app.use(bot.webhookCallback('/some-path'));
app.listen(3002, function () {
    console.log('Example app listening on port 3000!');
});
// No need to call bot.launch()
//# sourceMappingURL=app.js.map