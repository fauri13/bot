"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateHof = exports.confirmHof = exports.setHofNick = exports.setHofValue = exports.setHofBoss = exports.setHofType = exports.setHofShiny = exports.setHofLegendary = exports.deleteHof = exports.verifyHof = exports.startHof = void 0;
const telegraf_1 = require("telegraf");
const underscore_1 = __importDefault(require("underscore"));
const database_1 = __importDefault(require("./database"));
const remotasChatId = process.env.REMOTAS_CHAT_ID;
const hofsChatId = process.env.HOFS_CHAT_ID;
const hofPhrases = [
    'So you think you achieved a HOF? 🧐\n¿Crees que te mereces un HOF? 🧐',
    'So you think you achieved a HOF? 🧐\n¿Seguro que crees que es un HOF? 🧐',
    'So you think you achieved a HOF? 🧐\n¿Seguro que quieres enviarlo a revisión? 🧐',
    'Good good, but it needs review first 😏\nBien bien, pero necesito revisar algunas cosillas primero 😏',
    'Well well well, shall we send it for review? 📮\nBueno bueno bueno, ¿lo enviamos a revisión? 📮',
];
const hofReviewPhrases = [
    '🕐 Let me check that...\n🕐 Déjame comprobar algunas cosas...',
    "🕑 mmm... Ok, let's check with the big guns\n🕑 mmm... Vale, vamos a verificarlo con los jefazos",
    '🕐 We are reviewing it...\n🕐 Estamos verificándolo...',
    '🕑 The monkey is on it 🐒\n🕑 El mono está en ello 🐒',
    '🕒 Be patient\n🕒 A esperar',
];
const hofReviewedPhrases = [
    'So it is really a HOF, gz! 🥳\nPues era un HOF de verdad, ¡enhorabuena! 🥳',
    'So it is really a HOF, gz! 🎉\nPues era un HOF de verdad, ¡enhorabuena! 🎉',
    'So it is really a HOF, gz! 🎊\nPues era un HOF de verdad, ¡enhorabuena! 🎊',
    'WOW, good HOF!\nWOW, ¡buen HOF!',
    "You're killing it!\n¡Estás que te sales!",
];
const hofReviewedPhrasesFail = [
    'Nice try\nBuen intento',
    'Today is not your day...\nNo es tu día',
    '👎',
    'Next time baby',
];
const getButtons = (hof) => {
    const buttonsInner = [
        telegraf_1.Markup.button.callback('Send to review!', `verify-hof-${hof.id}`),
        telegraf_1.Markup.button.callback('No, I whish 😫', `cancel-hof-${hof.id}`),
    ];
    return telegraf_1.Markup.inlineKeyboard([buttonsInner]);
};
const getHofMessage = (hof, final) => {
    return `<a href="https://t.me/c/${remotasChatId?.slice(4)}/${hof.messageId}"><b>${final === true ? '✅' : final === false ? '❌' : '✏️'} HOF de ${hof.user?.name}</b></a>

- Id: ${hof.id}
- Date: ${hof.date}
- IGN: ${hof.nick ?? ''}
- Type: ${hof.type ?? ''}
- Boss: ${hof.boss ?? ''}
- Value: ${hof.value ?? ''}
  `;
};
const getEditButtons = (hof) => {
    const buttonsInner = [
        telegraf_1.Markup.button.callback('Verificar!', `confirm-hof-${hof.id}`),
        telegraf_1.Markup.button.callback('Borrar', `delete-hof-${hof.id}`),
    ];
    const buttonsChecks = [
        telegraf_1.Markup.button.callback(`${hof.legendary ? '✅' : '▪️'} Legendary`, `legendary-hof-${hof.id}-${hof.legendary ? 0 : 1}`),
        telegraf_1.Markup.button.callback(`${hof.shiny ? '✅' : '▪️'} Shiny`, `shiny-hof-${hof.id}-${hof.shiny ? 0 : 1}`),
    ];
    return telegraf_1.Markup.inlineKeyboard([buttonsChecks, buttonsInner]);
};
const startHof = async (ctx, reply) => {
    const user = await database_1.default.getOrInsertUser({
        telegramId: reply.from.id,
        name: reply.from.first_name,
        alias: reply.from.username,
    });
    const hof = await database_1.default.createHofTemp({
        user: user,
        date: new Date((reply?.date ?? 0) * 1000),
        messageId: reply?.message_id,
    });
    const response = await ctx.replyWithMarkdown(underscore_1.default.sample(hofPhrases) ?? '', {
        reply_to_message_id: ctx.message?.message_id,
        reply_markup: getButtons(hof).reply_markup,
    });
    database_1.default.setHofTempBotMessage(hof.id, response.message_id);
};
exports.startHof = startHof;
const verifyHof = async (ctx) => {
    try {
        const id = Number(ctx.match[1]);
        const hof = await database_1.default.getHofTemp(id);
        if (hof &&
            ctx.from?.id === hof.user?.telegramId &&
            remotasChatId &&
            hofsChatId) {
            await ctx.telegram.forwardMessage(hofsChatId, remotasChatId, hof.messageId);
            await ctx.telegram.sendMessage(hofsChatId, getHofMessage(hof), {
                parse_mode: 'HTML',
                reply_markup: getEditButtons(hof).reply_markup,
            });
            await ctx.editMessageText(underscore_1.default.sample(hofReviewPhrases) ?? '');
            ctx.answerCbQuery('Sent!').catch(() => { });
        }
        else {
            ctx.answerCbQuery('You cannot do that 🤨').catch(() => { });
        }
    }
    catch (e) {
        ctx.deleteMessage().catch(() => { });
        ctx
            .answerCbQuery(`Error, contact an admin`, { show_alert: true })
            .catch(() => { });
    }
};
exports.verifyHof = verifyHof;
const deleteHof = (ctx) => {
    const id = Number(ctx.match[1]);
    if (id) {
        database_1.default.removeHofTemp(id);
    }
    ctx.deleteMessage();
    try {
        ctx.answerCbQuery('Ok', { show_alert: true });
    }
    catch { }
};
exports.deleteHof = deleteHof;
const setHofLegendary = async (ctx, legendary) => {
    const id = Number(ctx.match[1]);
    if (id) {
        const hof = await database_1.default.getHofTemp(id);
        if (hof) {
            hof.legendary = legendary;
            database_1.default.setHofTempLegendary(id, legendary);
            ctx.editMessageText(getHofMessage(hof), {
                parse_mode: 'HTML',
                reply_markup: getEditButtons(hof).reply_markup,
            });
            ctx.answerCbQuery('Actualizado').catch(() => { });
        }
    }
};
exports.setHofLegendary = setHofLegendary;
const setHofShiny = async (ctx, shiny) => {
    const id = Number(ctx.match[1]);
    if (id) {
        const hof = await database_1.default.getHofTemp(id);
        if (hof) {
            hof.shiny = shiny;
            database_1.default.setHofTempShiny(id, shiny);
            ctx.editMessageText(getHofMessage(hof), {
                parse_mode: 'HTML',
                reply_markup: getEditButtons(hof).reply_markup,
            });
            ctx.answerCbQuery('Updated').catch(() => { });
        }
    }
};
exports.setHofShiny = setHofShiny;
const setHofType = async (ctx, reply, type) => {
    if (reply && reply.text) {
        const match = /Id: (\d+)/.exec(reply.text);
        if (match) {
            const id = Number(match[1]);
            if (id) {
                const hof = await database_1.default.getHofTemp(id);
                if (hof) {
                    switch (type) {
                        case '100':
                        case '0':
                        case 'Perfect Shoot':
                        case 'Weekly Raids':
                        case 'Monthly Raids':
                        case '1000 Raids/Pokémon':
                        case '10000 Raids':
                        case 'Full Team':
                        case '5 Golds':
                        case 'Platino':
                        case 'Gold':
                        case 'Silver':
                        case 'Bronze':
                            hof.type = type;
                            break;
                        default:
                            ctx.reply('Invalid type').then((response) => {
                                setTimeout(() => {
                                    ctx.telegram.deleteMessage(response.chat.id, response.message_id);
                                }, 3000);
                            });
                            return;
                    }
                    database_1.default.setHofTempType(hof.id, hof.type);
                    ctx.telegram.editMessageText(reply.chat?.id, reply.message_id, undefined, getHofMessage(hof), {
                        parse_mode: 'HTML',
                        reply_markup: getEditButtons(hof).reply_markup,
                    });
                }
            }
        }
    }
};
exports.setHofType = setHofType;
const setHofBoss = async (ctx, reply, boss) => {
    if (reply && reply.text) {
        const match = /Id: (\d+)/.exec(reply.text);
        if (match) {
            const id = Number(match[1]);
            if (id) {
                const hof = await database_1.default.getHofTemp(id);
                if (hof) {
                    hof.boss = boss;
                    database_1.default.setHofTempBoss(hof.id, boss);
                    ctx.telegram.editMessageText(reply.chat?.id, reply.message_id, undefined, getHofMessage(hof), {
                        parse_mode: 'HTML',
                        reply_markup: getEditButtons(hof).reply_markup,
                    });
                }
            }
        }
    }
};
exports.setHofBoss = setHofBoss;
const setHofValue = async (ctx, reply, value) => {
    if (reply && reply.text) {
        const match = /Id: (\d+)/.exec(reply.text);
        if (match) {
            const id = Number(match[1]);
            if (id) {
                const hof = await database_1.default.getHofTemp(id);
                if (hof) {
                    hof.value = value;
                    database_1.default.setHofTempValue(hof.id, value);
                    ctx.telegram.editMessageText(reply.chat?.id, reply.message_id, undefined, getHofMessage(hof), {
                        parse_mode: 'HTML',
                        reply_markup: getEditButtons(hof).reply_markup,
                    });
                }
            }
        }
    }
};
exports.setHofValue = setHofValue;
const setHofNick = async (ctx, reply, nick) => {
    if (reply && reply.text) {
        const match = /Id: (\d+)/.exec(reply.text);
        if (match) {
            const id = Number(match[1]);
            if (id) {
                const hof = await database_1.default.getHofTemp(id);
                if (hof) {
                    hof.nick = nick;
                    database_1.default.setHofTempNick(hof.id, nick);
                    ctx.telegram.editMessageText(reply.chat?.id, reply.message_id, undefined, getHofMessage(hof), {
                        parse_mode: 'HTML',
                        reply_markup: getEditButtons(hof).reply_markup,
                    });
                }
            }
        }
    }
};
exports.setHofNick = setHofNick;
const confirmHof = async (ctx) => {
    try {
        const id = Number(ctx.match[1]);
        const hof = await database_1.default.getHofTemp(id);
        if (hof) {
            database_1.default.persistHof(hof);
            database_1.default.removeHofTemp(id);
            ctx.telegram.editMessageText(remotasChatId, hof.botMessageId, undefined, underscore_1.default.sample(hofReviewedPhrases) ?? '');
            ctx.editMessageText(getHofMessage(hof, true), { parse_mode: 'HTML' });
            ctx.answerCbQuery('Verified!').catch(() => { });
        }
    }
    catch (e) {
        ctx.answerCbQuery(`Error, contact an admin`).catch(() => { });
    }
};
exports.confirmHof = confirmHof;
const invalidateHof = async (ctx) => {
    try {
        const id = Number(ctx.match[1]);
        const hof = await database_1.default.getHofTemp(id);
        if (hof) {
            database_1.default.removeHofTemp(id);
            ctx.telegram.editMessageText(remotasChatId, hof.botMessageId, undefined, underscore_1.default.sample(hofReviewedPhrasesFail) ?? '', { parse_mode: 'HTML' });
            ctx.editMessageText(getHofMessage(hof, false), { parse_mode: 'HTML' });
            ctx.answerCbQuery('Deleted!').catch(() => { });
        }
    }
    catch (e) {
        ctx.answerCbQuery(`Error, contact an admin`).catch(() => { });
    }
};
exports.invalidateHof = invalidateHof;
//# sourceMappingURL=hofs.js.map