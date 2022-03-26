"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateGoList = void 0;
const underscore_1 = __importDefault(require("underscore"));
const database_1 = __importDefault(require("./database"));
const sendMessage_1 = require("./sendMessage");
const writeLog_1 = require("./writeLog");
const pikachuId = Number.parseInt(process.env.PIKACHU_ID || '', 10);
const updateUserNick = async (url, nick) => {
    const alias = url.match('t.me/(.*)')[1];
    database_1.default.updateUserNick(alias, nick);
};
const generateGoList = (ctx, reply) => {
    if (reply && reply.from?.id === pikachuId) {
        const entities = (reply.entities ||
            reply.caption_entities);
        const text = reply.text || reply.caption;
        if (text && entities) {
            (0, writeLog_1.writeLog)(text);
            (0, writeLog_1.writeLog)(entities);
            const boss = entities.filter((e) => e.type === 'text_link' && e.url.match('pokebattler'));
            let links = entities.filter((e) => e.type === 'text_link' &&
                e.url.match('t.me/(?!detectivepikachubot)(.*)'));
            if (links.length > 1) {
                let bossText = '';
                let bossTextPlain = '';
                const hourMatch = text.match(/(🇪🇸\d+[^\n\\]+)/);
                const hour = hourMatch ? hourMatch[0] : '';
                if (boss && boss.length) {
                    bossTextPlain = text.slice(boss[0].offset, boss[0].offset + boss[0].length);
                    bossText = `<a href="${boss[0].url}"><b>${bossTextPlain}</b></a>`;
                }
                else {
                    const matches = text.match(/^.+?\s+?(\w+(\s\w+)?)\s+de/);
                    bossText = matches ? `<b>${matches[1]}</b>` : 'no boss found';
                }
                const users = [];
                const usersRemoved = [];
                const usersRemovedMatch = text.matchAll(/❌[^\d]+\d+\s+(\w+)/g);
                let m = usersRemovedMatch.next();
                while (!m.done) {
                    usersRemoved.push(m.value[1]);
                    links = links.filter((l) => l.offset > m.value.index + 10 || l.offset < m.value.index);
                    m = usersRemovedMatch.next();
                }
                links.forEach((e) => {
                    const nick = text.slice(e.offset, e.offset + e.length);
                    updateUserNick(e.url, nick);
                    users.push(nick);
                });
                const creator = users[0];
                const attendants = (0, underscore_1.default)(users).chain().uniq().without(creator).value();
                const attLinks = links.filter((l) => l.url !== links[0].url);
                const attAlias = attLinks.map((l) => l.url.match('t.me/(?!detectivepikachubot)(.*)'));
                let attNicksText = '‼️ Atentos Ksuals ‼️\n';
                attAlias.forEach((m) => {
                    if (m && m.length > 1) {
                        attNicksText = `${attNicksText}@${m[1]} `;
                    }
                });
                (0, sendMessage_1.sendMessage)(ctx, 'html', `${attNicksText}\n\n${bossText} de <a href="${links[0].url}"><b>${creator}</b></a>\n🔽${hour}🔽`, { disable_web_page_preview: true });
                if (attendants.length) {
                    (0, sendMessage_1.sendMessage)(ctx, 'markdown', `\`${attendants.join(',')}\``);
                }
                if (attendants.length > 5) {
                    const att = attendants.length;
                    const sizes = [];
                    const s = Math.ceil(att / 5);
                    const n = Math.floor(att / s);
                    const r = att - n * s;
                    for (let i = 0; i < s; i += 1) {
                        sizes.push(n);
                    }
                    for (let i = 0; i < r; i += 1) {
                        sizes[i] += 1;
                    }
                    let start = 0;
                    (0, sendMessage_1.sendMessage)(ctx, 'normal', '--------------------------');
                    sizes.forEach((s) => {
                        (0, sendMessage_1.sendMessage)(ctx, 'markdown', `\`${attendants.slice(start, start + s).join(',')}\``);
                        start += s;
                    });
                }
                const participants = [...attendants];
                if (usersRemoved.indexOf(creator) < 0) {
                    participants.push(creator);
                }
                database_1.default.insertRaid({
                    boss: bossTextPlain.replace("'", "''"),
                    creator,
                    date: new Date(Date.now()).toDateString(),
                    time: hour,
                    participants,
                });
            }
        }
    }
};
exports.generateGoList = generateGoList;
//# sourceMappingURL=generateGoList.js.map