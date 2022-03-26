"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFormList = exports.onlyForm = exports.removeSoloRaider = exports.addSoloRaider = exports.soloRaidersHave = exports.soloRaidersWanted = void 0;
const telegraf_1 = require("telegraf");
const underscore_1 = __importDefault(require("underscore"));
// @ts-ignore
const js_levenshtein_1 = __importDefault(require("js-levenshtein"));
const database_1 = __importDefault(require("./database"));
const getParticipantText = (participant, index) => `\n${index + 1}. <a href="https://t.me/${participant.user.alias}">${participant.user.name} (${participant.user.nick})</a>`;
const getParticipantsText = (participants, forms) => {
    if (forms && forms.length) {
        const all = `Lo quiero to:${participants
            .filter((p) => !p.form || !p.form.id)
            .map((p, index) => getParticipantText(p, index))
            .join('')}`;
        const rest = forms
            .map((f) => `Sólo ${f.description}:${participants
            .filter((p) => p.form && p.form.id == f.id)
            .map((p, index) => getParticipantText(p, index))
            .join('')}`)
            .join('\n\n');
        return `${all}\n\n${rest}`;
    }
    return `La lista de interesados es:${participants
        .map((p, index) => getParticipantText(p, index))
        .join('')}`;
};
const getButtons = (raidBoss) => {
    const buttonsInner = [
        telegraf_1.Markup.button.callback('Yo también quiero', `join-${raidBoss.id}`),
        telegraf_1.Markup.button.callback('Ya no quiero', `leave-${raidBoss.id}`),
    ];
    const extraButtons = [];
    const extraButtons2 = [];
    if (raidBoss.forms) {
        raidBoss.forms.forEach((f) => {
            extraButtons.push(telegraf_1.Markup.button.callback(`Sólo ${f.description}`, `form-${raidBoss.id}-${f.id}`));
            extraButtons2.push(telegraf_1.Markup.button.callback(`List ${f.description}`, `getlist-${raidBoss.id}-${f.id}`));
        });
    }
    else {
        extraButtons.push(telegraf_1.Markup.button.callback('Get List', `getlist-${raidBoss.id}-`));
    }
    return telegraf_1.Markup.inlineKeyboard([buttonsInner, extraButtons, extraButtons2]);
};
const soloRaidersWanted = async (ctx) => {
    const pokemon = ctx.match[1];
    if (pokemon) {
        const raidBosses = await database_1.default.getRaidBosses();
        const raidBoss = (0, underscore_1.default)(raidBosses)
            .chain()
            .map((b) => ({
            ...b,
            score: (0, js_levenshtein_1.default)(b.name.toLocaleLowerCase(), pokemon.toLocaleLowerCase()),
        }))
            .filter((b) => b.score < 3)
            .sortBy((b) => b.score)
            .value()
            ?.shift();
        if (raidBoss) {
            const participants = await database_1.default.getWantedRaidParticipants(raidBoss);
            const from = ctx.from;
            if (participants.find((p) => p.user.telegramId === from.id)) {
                // User already in
            }
            else {
                const newUser = {
                    telegramId: from.id,
                    name: from.first_name,
                    alias: from.username,
                };
                database_1.default.insertNewWantedParticipant(raidBoss, newUser);
                participants.push({ boss: raidBoss, user: newUser });
            }
            const buttons = getButtons(raidBoss);
            ctx
                .replyWithPhoto(raidBoss.image, {
                caption: `De acuerdo, te apunto para <b>${raidBoss.name}</b>\n\n${getParticipantsText(participants, raidBoss.forms)}`,
                parse_mode: 'HTML',
                reply_markup: buttons.reply_markup,
            })
                .then((m) => {
                if (raidBoss?.prevMessageId) {
                    ctx.deleteMessage(raidBoss.prevMessageId);
                }
                database_1.default.updateRaidBoss({ ...raidBoss, prevMessageId: m.message_id });
            });
        }
    }
};
exports.soloRaidersWanted = soloRaidersWanted;
const soloRaidersHave = async (ctx, bot) => {
    const pokemon = ctx.match[1];
    if (pokemon) {
        const raidBosses = await database_1.default.getRaidBosses();
        let raidBoss = (0, underscore_1.default)(raidBosses)
            .chain()
            .map((b) => ({
            ...b,
            score: (0, js_levenshtein_1.default)(b.name.toLocaleLowerCase(), pokemon.toLocaleLowerCase()),
        }))
            .filter((b) => b.score < 3)
            .sortBy((b) => b.score)
            .value()
            ?.shift();
        if (raidBoss) {
            raidBoss = await database_1.default.getRaidBoss(raidBoss.id);
            if (raidBoss) {
                const from = ctx.from;
                const hasForms = raidBoss.forms && raidBoss.forms.length > 0;
                const participants = await database_1.default.getWantedRaidParticipants(raidBoss);
                const buttons = getButtons(raidBoss);
                const m = await ctx.replyWithPhoto(raidBoss.image, {
                    caption: `<b>${raidBoss.name}</b>\n\n${getParticipantsText(participants, raidBoss.forms)}`,
                    parse_mode: 'HTML',
                    reply_markup: buttons.reply_markup,
                });
                if (raidBoss.prevMessageId) {
                    ctx.deleteMessage(raidBoss.prevMessageId);
                }
                database_1.default.updateRaidBoss({ ...raidBoss, prevMessageId: m.message_id });
                const plist = participants.filter((p) => p.user.nick && p.user.telegramId != from.id);
                if (!hasForms && plist && plist.length > 0) {
                    if (plist.length > 5) {
                        for (let i = 0; i < plist.length; i += 5) {
                            // ctx.reply(plist.slice(i, i + 5).map(p => `@${p.user.alias}`).join(' '))
                            ctx.replyWithMarkdown(`\`${plist
                                .slice(i, i + 5)
                                .map((p) => p.user.nick)
                                .join(',')}\``);
                        }
                    }
                    else {
                        // ctx.reply(plist.map(p => `@${p.user.alias}`).join(' '))
                        ctx.replyWithMarkdown(`\`${plist.map((p) => p.user.nick).join(',')}\``);
                    }
                    participants.forEach((p) => {
                        if (p.user.chatId) {
                            try {
                                bot.telegram.sendMessage(p.user.chatId, `${raidBoss.name} de ${ctx.from?.first_name}, ¡atento!`);
                            }
                            catch { }
                        }
                    });
                }
                if (hasForms) {
                    participants.forEach((p) => {
                        if (p.user.chatId) {
                            try {
                                bot.telegram.sendMessage(p.user.chatId, `${raidBoss.name} de ${ctx.from?.first_name}, ¡atento!`);
                            }
                            catch { }
                        }
                    });
                }
            }
        }
    }
};
exports.soloRaidersHave = soloRaidersHave;
const addSoloRaider = async (ctx) => {
    const bossId = ctx.match[1];
    if (bossId) {
        const raidBoss = await database_1.default.getRaidBoss(Number.parseInt(bossId, 10));
        if (raidBoss) {
            const participants = await database_1.default.getWantedRaidParticipants(raidBoss);
            const from = ctx.from;
            const existingUser = participants.find((p) => p.user.telegramId === from.id);
            if (existingUser) {
                existingUser.form = undefined;
                database_1.default.updateWantedRaidParticipantForm(existingUser);
            }
            else {
                const newUser = {
                    telegramId: from.id,
                    name: from.first_name,
                    alias: from.username,
                };
                database_1.default.insertNewWantedParticipant(raidBoss, newUser);
                participants.push({ boss: raidBoss, user: newUser });
            }
            const buttons = getButtons(raidBoss);
            ctx.editMessageCaption(`<b>${raidBoss.name}</b>\n\n${getParticipantsText(participants, raidBoss.forms)}`, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
            ctx.answerCbQuery('Apuntado!').catch(() => { });
            return;
        }
    }
    ctx.answerCbQuery('Ya has roto algo...').catch(() => { });
};
exports.addSoloRaider = addSoloRaider;
const removeSoloRaider = async (ctx) => {
    const bossId = ctx.match[1];
    if (bossId) {
        const raidBoss = await database_1.default.getRaidBoss(Number.parseInt(bossId, 10));
        if (raidBoss) {
            let participants = await database_1.default.getWantedRaidParticipants(raidBoss);
            const from = ctx.from;
            if (participants.find((p) => p.user.telegramId === from.id)) {
                database_1.default.removeWantedParticipant(raidBoss, from.id);
                participants = participants.filter((p) => p.user.telegramId !== from.id);
                const buttons = getButtons(raidBoss);
                ctx.editMessageCaption(`<b>${raidBoss.name}</b>\n\n${getParticipantsText(participants, raidBoss.forms)}`, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
                ctx.answerCbQuery('¿Ya tienes el shundo? 😏').catch(() => { });
            }
            else {
                ctx.answerCbQuery('No estabas apuntado 🤨').catch(() => { });
            }
        }
    }
};
exports.removeSoloRaider = removeSoloRaider;
const onlyForm = async (ctx) => {
    const bossId = ctx.match[1];
    const formId = ctx.match[2];
    if (bossId && formId) {
        const raidBoss = await database_1.default.getRaidBoss(Number.parseInt(bossId, 10));
        const form = { id: Number(formId) };
        if (raidBoss) {
            const participants = await database_1.default.getWantedRaidParticipants(raidBoss);
            const from = ctx.from;
            const existingUser = participants.find((p) => p.user.telegramId === from.id);
            if (existingUser) {
                existingUser.form = form;
                database_1.default.updateWantedRaidParticipantForm(existingUser);
            }
            else {
                const newUser = {
                    telegramId: from.id,
                    name: from.first_name,
                    alias: from.username,
                };
                participants.push({ boss: raidBoss, user: newUser, form });
                database_1.default.insertNewWantedParticipant(raidBoss, newUser, form);
            }
            const buttons = getButtons(raidBoss);
            ctx.editMessageCaption(`<b>${raidBoss.name}</b>\n\n${getParticipantsText(participants, raidBoss.forms)}`, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
            ctx.answerCbQuery(`Apuntado!`).catch(() => { });
        }
    }
};
exports.onlyForm = onlyForm;
const getFormList = async (ctx, bot) => {
    const bossId = ctx.match[1];
    const formId = ctx.match[2];
    if (bossId) {
        const raidBoss = await database_1.default.getRaidBoss(Number.parseInt(bossId, 10));
        if (raidBoss) {
            const from = ctx.from;
            const participants = await database_1.default.getWantedRaidParticipants(raidBoss);
            const filteredParticipants = participants.filter((p) => (!formId || !p.form || !p.form.id || p.form.id == Number(formId)) &&
                p.user.telegramId != from.id);
            if (filteredParticipants && filteredParticipants.length > 0) {
                const plist = filteredParticipants.filter((p) => p.user.nick);
                await ctx.reply(filteredParticipants
                    .map((u) => `${raidBoss.name} de ${from.first_name}, atentos!\n@${u.user.alias}`)
                    .join(' '));
                if (plist && plist.length > 0) {
                    if (plist.length > 5) {
                        for (let i = 0; i < plist.length; i += 5) {
                            // ctx.reply(plist.slice(i, i + 5).map(p => `@${p.user.alias}`).join(' '))
                            await ctx.replyWithMarkdown(`\`${plist
                                .slice(i, i + 5)
                                .map((p) => p.user.nick)
                                .join(',')}\``);
                        }
                    }
                    else {
                        // ctx.reply(plist.map(p => `@${p.user.alias}`).join(' '))
                        await ctx.replyWithMarkdown(`\`${plist.map((p) => p.user.nick).join(',')}\``);
                    }
                    participants.forEach((p) => {
                        if (p.user.chatId) {
                            try {
                                bot.telegram.sendMessage(p.user.chatId, `${raidBoss.name} de ${ctx.from?.first_name}, ¡atento!`);
                            }
                            catch { }
                        }
                    });
                    ctx.answerCbQuery('Go! Go! Go! 🤓').catch(() => { });
                }
                else {
                    ctx
                        .answerCbQuery('No tengo fichados a los apuntados 😳')
                        .catch(() => { });
                }
            }
            else {
                ctx.answerCbQuery('No hay interesados 😱').catch(() => { });
            }
        }
    }
};
exports.getFormList = getFormList;
//# sourceMappingURL=soloRaiders.js.map