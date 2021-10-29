"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bot_1 = __importDefault(require("./bot"));
const fs_1 = __importDefault(require("fs"));
const https_1 = __importDefault(require("https"));
const endpoint = process.env.BOT_URL;
const path = process.env.BOT_PATH;
const port = process.env.BOT_PORT;
const announcesChatId = process.env.ANNOUNCES_CHAT_ID;
const production = process.env.IS_PROD === 'true';
if (endpoint === undefined) {
    throw new Error('BOT_URL must be provided!');
}
if (port === undefined) {
    throw new Error('BOT_PORT must be provided!');
}
// No need to call bot.launch()
// Set telegram webhook
// npm install -g localtunnel && lt --port 3000
bot_1.default.telegram.setWebhook(endpoint).then(v => {
    console.log(`Registered to telegram ${v}`);
}).catch(e => {
    console.log(`Error ${e}`);
});
const app = express_1.default();
app.get('/', (req, res) => res.send('It works!'));
app.post('/troll', (req, a) => {
    if (req.headers.authorization === 'Bearer asistenta' && announcesChatId) {
        bot_1.default.telegram.sendMessage(announcesChatId, req.body, { disable_web_page_preview: true, parse_mode: 'HTML' });
    }
});
// Set the bot API endpoint
app.use(bot_1.default.webhookCallback(path));
if (production) {
    const privateKey = fs_1.default.readFileSync('my_cert.key', 'utf8');
    const certificate = fs_1.default.readFileSync('my_cert.crt', 'utf8');
    const credentials = { key: privateKey, cert: certificate };
    const httpsServer = https_1.default.createServer(credentials, app);
    httpsServer.listen(port);
}
else {
    app.listen(Number.parseInt(port), () => {
        console.log(`Bot listening on port ${port}`);
    });
}
//# sourceMappingURL=app.js.map