"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeSoloRaider = exports.addSoloRaider = exports.soloRaidersHave = exports.soloRaidersWanted = void 0;
const telegraf_1 = require("telegraf");
const underscore_1 = __importDefault(require("underscore"));
// @ts-ignore
const js_levenshtein_1 = __importDefault(require("js-levenshtein"));
const database_1 = __importDefault(require("./database"));
const getParticipantsText = (participants, showAlias) => {
    return `La lista de interesados es:${participants.map((p, index) => `\n${index + 1}. <a href="https://t.me/${p.user.alias}">${p.user.name}</a>${showAlias ? ` (@${p.user.alias})` : ''}`).join('')}`;
};
const soloRaidersWanted = async (ctx) => {
    const pokemon = ctx.match[1];
    if (pokemon) {
        const raidBosses = await database_1.default.getRaidBosses();
        const raidBoss = underscore_1.default(raidBosses).find(b => js_levenshtein_1.default(b.name.toLocaleLowerCase(), pokemon.toLocaleLowerCase()) < 3);
        if (raidBoss) {
            const participants = await database_1.default.getWantedRaidParticipants(raidBoss);
            const from = ctx.from;
            if (participants.find(p => p.user.telegramId === from.id)) {
                // User already in
            }
            else {
                const newUser = { telegramId: from.id, name: from.first_name, alias: from.username };
                database_1.default.insertNewWantedParticipant(raidBoss, newUser);
                participants.push({ boss: raidBoss, user: newUser });
            }
            const buttons = telegraf_1.Markup.inlineKeyboard([
                telegraf_1.Markup.button.callback("Yo también quiero", `join-${raidBoss.id}`),
                telegraf_1.Markup.button.callback("Ya no quiero", `leave-${raidBoss.id}`)
            ]);
            ctx.replyWithPhoto(raidBoss.image, { caption: `De acuerdo, te apunto para <b>${raidBoss.name}</b>\n\n${getParticipantsText(participants, false)}`, parse_mode: 'HTML', reply_markup: buttons.reply_markup }).then((m) => {
                if (raidBoss.prevMessageId) {
                    ctx.deleteMessage(raidBoss.prevMessageId);
                }
                database_1.default.updateRaidBoss({ ...raidBoss, prevMessageId: m.message_id });
            });
        }
    }
};
exports.soloRaidersWanted = soloRaidersWanted;
const soloRaidersHave = async (ctx) => {
    const pokemon = ctx.match[1];
    if (pokemon) {
        const raidBosses = await database_1.default.getRaidBosses();
        const raidBoss = underscore_1.default(raidBosses).find(b => js_levenshtein_1.default(b.name.toLocaleLowerCase(), pokemon.toLocaleLowerCase()));
        if (raidBoss) {
            const participants = await database_1.default.getWantedRaidParticipants(raidBoss);
            const buttons = telegraf_1.Markup.inlineKeyboard([
                telegraf_1.Markup.button.callback("Yo también quiero", `join-${raidBoss.id}`),
                telegraf_1.Markup.button.callback("Ya no quiero", `leave-${raidBoss.id}`)
            ]);
            ctx.replyWithPhoto(raidBoss.image, { caption: `<b>${raidBoss.name}</b>\n\n${getParticipantsText(participants, true)}`, parse_mode: 'HTML', reply_markup: buttons.reply_markup }).then((m) => {
                if (raidBoss.prevMessageId) {
                    ctx.deleteMessage(raidBoss.prevMessageId);
                }
                database_1.default.updateRaidBoss({ ...raidBoss, prevMessageId: m.message_id });
                const plist = participants.filter((p) => p.user.nick);
                if (plist && plist.length > 0) {
                    ctx.replyWithMarkdown(`\`${plist.map((p) => p.user.nick).join(',')}\``);
                }
            });
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
            if (participants.find(p => p.user.telegramId === from.id)) {
                // User already in
            }
            else {
                const newUser = { telegramId: from.id, name: from.first_name, alias: from.username };
                database_1.default.insertNewWantedParticipant(raidBoss, newUser);
                participants.push({ boss: raidBoss, user: newUser });
                const buttons = telegraf_1.Markup.inlineKeyboard([
                    telegraf_1.Markup.button.callback("Yo también quiero", `join-${raidBoss.id}`),
                    telegraf_1.Markup.button.callback("Ya no quiero", `leave-${raidBoss.id}`)
                ]);
                ctx.editMessageCaption(`<b>${raidBoss.name}</b>\n\n${getParticipantsText(participants, false)}`, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
            }
        }
    }
};
exports.addSoloRaider = addSoloRaider;
const removeSoloRaider = async (ctx) => {
    const bossId = ctx.match[1];
    if (bossId) {
        const raidBoss = await database_1.default.getRaidBoss(Number.parseInt(bossId, 10));
        if (raidBoss) {
            let participants = await database_1.default.getWantedRaidParticipants(raidBoss);
            const from = ctx.from;
            if (participants.find(p => p.user.telegramId === from.id)) {
                database_1.default.removeWantedParticipant(raidBoss, from.id);
                participants = participants.filter(p => p.user.telegramId !== from.id);
                const buttons = telegraf_1.Markup.inlineKeyboard([
                    telegraf_1.Markup.button.callback("Yo también quiero", `join-${raidBoss.id}`),
                    telegraf_1.Markup.button.callback("Ya no quiero", `leave-${raidBoss.id}`)
                ]);
                ctx.editMessageCaption(`<b>${raidBoss.name}</b>\n\n${getParticipantsText(participants, false)}`, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
            }
        }
    }
};
exports.removeSoloRaider = removeSoloRaider;
//# sourceMappingURL=soloRaiders.js.map