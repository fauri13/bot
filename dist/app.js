"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bot_1 = __importDefault(require("./bot"));
const endpoint = process.env.BOT_URL;
const path = process.env.BOT_PATH;
const port = process.env.BOT_PORT;
if (endpoint === undefined) {
    throw new Error('BOT_URL must be provided!');
}
if (port === undefined) {
    throw new Error('BOT_PORT must be provided!');
}
// No need to call bot.launch()
// Set telegram webhook
// npm install -g localtunnel && lt --port 3000
bot_1.default.telegram.setWebhook(endpoint);
const app = express_1.default();
app.get('/', (req, res) => res.send('It works!'));
// Set the bot API endpoint
app.use(bot_1.default.webhookCallback(path));
app.listen(Number.parseInt(port), () => {
    console.log(`Bot listening on port ${port}`);
});
//# sourceMappingURL=app.js.map