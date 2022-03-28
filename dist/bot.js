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
const hofs_1 = require("./hofs");
const validations_1 = require("./validations");
const token = process.env.BOT_TOKEN;
const announcesChatId = process.env.ANNOUNCES_CHAT_ID;
if (token === undefined) {
    throw new Error('BOT_TOKEN must be provided!');
}
const bot = new telegraf_1.Telegraf(token);
// Generate list from Pikachu
bot.hears(/^\/?(go|gg|lista?|invito|vamos|dale)$/i, (ctx) => {
    if ((0, validations_1.chatAllowed)(ctx.chat.id) && ctx.message.reply_to_message) {
        (0, generateGoList_1.generateGoList)(ctx, ctx.message.reply_to_message);
    }
});
// Solo raiders
bot.hears(/^(?:quiero\s*u?n?|i?\s*want|busco|me interesa)\s*(\w+)/i, (ctx) => {
    if ((0, validations_1.chatAllowed)(ctx.chat.id)) {
        (0, soloRaiders_1.soloRaidersWanted)(ctx);
    }
});
bot.hears(/^(?:tengo\s*u?n?|i?\s*have|invito)\s*a?\s*(\w+)/i, (ctx) => {
    if ((0, validations_1.chatAllowed)(ctx.chat.id)) {
        (0, soloRaiders_1.soloRaidersHave)(ctx, bot);
    }
});
bot.command('createboss', async (ctx) => {
    if ((0, validations_1.chatAllowed)(ctx.chat.id) && (0, validations_1.userAllowed)(ctx.from.id)) {
        const params = ctx.message.text.split(' ');
        if (params.length > 1) {
            database_1.default.insertRaidBoss({
                name: params[1],
                image: params[2],
            });
        }
        await ctx.reply(`Agregado ${params[1]}`, {
            reply_to_message_id: ctx.message.message_id,
        });
    }
    await ctx.deleteMessage(ctx.message.message_id);
});
bot.command('createform', async (ctx) => {
    if ((0, validations_1.chatAllowed)(ctx.chat.id) && (0, validations_1.userAllowed)(ctx.from.id)) {
        const params = ctx.message.text.split(' ');
        if (params.length > 1) {
            const type = params[1];
            for (let i = 2; i < params.length; i += 1) {
                database_1.default.createForm({
                    type: Number(type),
                    description: params[i],
                    subtype: i - 1,
                    isAvailable: true,
                });
            }
        }
        await ctx.reply(`Agregada forma ${params[1]}`, {
            reply_to_message_id: ctx.message.message_id,
        });
    }
    await ctx.deleteMessage(ctx.message.message_id);
});
bot.command('setform', async (ctx) => {
    if ((0, validations_1.chatAllowed)(ctx.chat.id) && (0, validations_1.userAllowed)(ctx.from.id)) {
        const params = ctx.message.text.split(' ');
        if (params.length > 1) {
            const boss = params[1];
            const form = params[2];
            database_1.default.setBossForm(boss, Number(form));
        }
        await ctx.reply(`Agregada forma ${params[2]} a ${params[1]}`, {
            reply_to_message_id: ctx.message.message_id,
        });
    }
    await ctx.deleteMessage(ctx.message.message_id);
});
bot.command('register', (ctx) => {
    if (ctx.chat.type === 'private') {
        database_1.default.updateUserChat(ctx.from.id, ctx.chat.id);
        ctx.reply(`Registrado ${ctx.from.id} ${ctx.chat.id}`);
    }
});
bot.command('unregister', (ctx) => {
    if (ctx.chat.type === 'private') {
        database_1.default.updateUserChat(ctx.from.id, '');
        ctx.reply(`Desregistrado`);
    }
});
bot.action(/join-(\w+)/, (ctx) => {
    (0, soloRaiders_1.addSoloRaider)(ctx);
});
bot.action(/leave-(\w+)/, (ctx) => {
    (0, soloRaiders_1.removeSoloRaider)(ctx);
});
bot.action(/form-(\w+)-(\d+)/, (ctx) => {
    (0, soloRaiders_1.onlyForm)(ctx);
});
bot.action(/getlist-(\w+)-(\d*)/, (ctx) => {
    (0, soloRaiders_1.getFormList)(ctx, bot);
});
// Hofs
bot.command('hof', (ctx) => {
    if ((0, validations_1.chatAllowed)(ctx.chat.id) &&
        ctx.message.reply_to_message &&
        ((0, validations_1.userHofAllowed)(ctx.from.id) ||
            ctx.from.id === ctx.message.reply_to_message.from?.id)) {
        (0, hofs_1.startHof)(ctx, ctx.message.reply_to_message);
    }
    ctx.deleteMessage(ctx.message.message_id);
});
bot.action(/verify-hof-(\d+)/, (ctx) => {
    (0, hofs_1.verifyHof)(ctx);
});
bot.action(/cancel-hof-(\d+)/, (ctx) => {
    (0, hofs_1.deleteHof)(ctx);
});
bot.on('photo', (ctx, next) => {
    if (ctx.message.caption?.match(/^#?hof.*/i)) {
        (0, hofs_1.startHof)(ctx, ctx.message);
    }
    next();
});
bot.action(/legendary-hof-(\d+)-0/, (ctx) => {
    (0, hofs_1.setHofLegendary)(ctx, false);
});
bot.action(/legendary-hof-(\d+)-1/, (ctx) => {
    (0, hofs_1.setHofLegendary)(ctx, true);
});
bot.action(/shiny-hof-(\d+)-0/, (ctx) => {
    (0, hofs_1.setHofShiny)(ctx, false);
});
bot.action(/shiny-hof-(\d+)-1/, (ctx) => {
    (0, hofs_1.setHofShiny)(ctx, true);
});
bot.command('type', (ctx, next) => {
    if ((0, validations_1.chatHofAllowed)(ctx.chat.id)) {
        const params = ctx.message.text.split(' ');
        const param = params.length > 1 ? ctx.message.text.slice(params[0].length).trim() : '';
        (0, hofs_1.setHofType)(ctx, ctx.message.reply_to_message, param);
        ctx.deleteMessage();
    }
    else {
        next();
    }
});
bot.command('boss', (ctx, next) => {
    if ((0, validations_1.chatHofAllowed)(ctx.chat.id)) {
        const params = ctx.message.text.split(' ');
        const param = params.length > 1 ? ctx.message.text.slice(params[0].length).trim() : '';
        (0, hofs_1.setHofBoss)(ctx, ctx.message.reply_to_message, param);
        ctx.deleteMessage();
    }
    else {
        next();
    }
});
bot.command('value', (ctx, next) => {
    if ((0, validations_1.chatHofAllowed)(ctx.chat.id)) {
        const params = ctx.message.text.split(' ');
        const param = params.length > 1 ? ctx.message.text.slice(params[0].length).trim() : '';
        (0, hofs_1.setHofValue)(ctx, ctx.message.reply_to_message, param);
        ctx.deleteMessage();
    }
    else {
        next();
    }
});
bot.command('ign', (ctx, next) => {
    if ((0, validations_1.chatHofAllowed)(ctx.chat.id)) {
        const params = ctx.message.text.split(' ');
        const param = params.length > 1 ? ctx.message.text.slice(params[0].length).trim() : '';
        (0, hofs_1.setHofNick)(ctx, ctx.message.reply_to_message, param);
        ctx.deleteMessage();
    }
    else {
        next();
    }
});
bot.action(/confirm-hof-(\d+)/, (ctx) => {
    (0, hofs_1.confirmHof)(ctx);
});
bot.action(/delete-hof-(\d+)/, (ctx) => {
    (0, hofs_1.invalidateHof)(ctx);
});
// Statistics
bot.command('raidstoday', async (ctx) => {
    if ((0, validations_1.chatAllowed)(ctx.chat.id) && (0, validations_1.userAllowed)(ctx.from.id)) {
        ctx.deleteMessage(ctx.message.message_id);
        ctx.reply(await (0, dailyStatistics_1.getRaidsMessage)(new Date().toDateString()));
    }
    ctx.deleteMessage(ctx.message.message_id);
});
bot.command('raidsyesterday', async (ctx) => {
    if ((0, validations_1.chatAllowed)(ctx.chat.id) && (0, validations_1.userAllowed)(ctx.from.id)) {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        ctx.deleteMessage(ctx.message.message_id);
        ctx.reply(await (0, dailyStatistics_1.getRaidsMessage)(date.toDateString()));
    }
    ctx.deleteMessage(ctx.message.message_id);
});
bot.command('enfermos', async (ctx) => {
    if ((0, validations_1.chatAllowed)(ctx.chat.id) && (0, validations_1.userAllowed)(ctx.from.id)) {
        ctx.deleteMessage(ctx.message.message_id);
        ctx.reply(await (0, dailyStatistics_1.getEnfermosMessage)(new Date().toDateString()));
    }
    ctx.deleteMessage(ctx.message.message_id);
});
bot.command('enfermosayer', async (ctx) => {
    if ((0, validations_1.chatAllowed)(ctx.chat.id) && (0, validations_1.userAllowed)(ctx.from.id)) {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        ctx.deleteMessage(ctx.message.message_id);
        ctx.reply(await (0, dailyStatistics_1.getEnfermosMessage)(date.toDateString()));
    }
    ctx.deleteMessage(ctx.message.message_id);
});
// Status
bot.command('ping', (ctx) => {
    if ((0, validations_1.userAllowed)(ctx.from.id)) {
        ctx.reply('pong v2.0123');
    }
});
if (announcesChatId) {
    node_cron_1.default.schedule('59 23 * * *', async () => {
        const date = new Date(Date.now()).toDateString();
        bot.telegram.sendMessage(announcesChatId, await (0, dailyStatistics_1.getRaidsMessage)(date));
        bot.telegram.sendMessage(announcesChatId, await (0, dailyStatistics_1.getEnfermosMessage)(date));
    });
}
exports.default = bot;
//# sourceMappingURL=bot.js.map