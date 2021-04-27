"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateGoList = void 0;
const underscore_1 = __importDefault(require("underscore"));
const database_1 = __importDefault(require("./database"));
const sendMessage_1 = require("./sendMessage");
const debug = process.env.DEBUG_TRACES === 'true';
const generateGoList = (ctx, reply) => {
    if (reply) {
        const entities = (reply.entities || reply.caption_entities);
        const text = reply.text || reply.caption;
        if (text && entities) {
            if (debug)
                console.log(text);
            if (debug)
                console.log(entities);
            const boss = entities
                .filter(e => e.type === 'text_link' && e.url.match('pokebattler'));
            let links = entities
                .filter(e => e.type === 'text_link' && e.url.match('t\.me\/(?!detectivepikachubot)(.*)'));
            if (links.length) {
                let bossText = '';
                let bossTextPlain = '';
                const hourMatch = text.match(/(🇪🇸\d+[^\n\\]+)/);
                let hour = hourMatch ? hourMatch[0] : '';
                if (boss && boss.length) {
                    bossTextPlain = text.slice(boss[0].offset, boss[0].offset + boss[0].length);
                    bossText = `<a href="${boss[0].url}"><b>${bossTextPlain}</b></a>`;
                }
                else {
                    const matches = text.match(/^.+?\s+(\w+(\s\w+)?)\s+de/);
                    bossText = matches ? `<b>${matches[1]}</b>` : 'no boss found';
                }
                let users = [];
                let usersRemoved = [];
                const usersRemovedMatch = text.matchAll(/❌[^\d]+\d+\s+(\w+)/g);
                let m = usersRemovedMatch.next();
                while (!m.done) {
                    usersRemoved.push(m.value[1]);
                    links = links.filter(l => l.offset > (m.value.index + 10) || l.offset < m.value.index);
                    m = usersRemovedMatch.next();
                }
                links.forEach(e => {
                    users.push(text.slice(e.offset, e.offset + e.length));
                });
                const creator = users[0];
                const attendants = underscore_1.default(users).chain().uniq().without(creator).value();
                const attLinks = links.filter(l => l.url !== links[0].url);
                const attNicks = attLinks.map(l => l.url.match('t\.me\/(?!detectivepikachubot)(.*)'));
                let attNicksText = '‼️ Atentos Ksuals ‼️\n';
                attNicks.forEach(m => {
                    if (m && m.length > 1) {
                        attNicksText = `${attNicksText}@${m[1]} `;
                    }
                });
                sendMessage_1.sendMessage(ctx, 'html', `${attNicksText}\n\n${bossText} de <a href="${links[0].url}"><b>${creator}</b></a>\n🔽${hour}🔽`, { disable_web_page_preview: true });
                sendMessage_1.sendMessage(ctx, 'markdown', `\`${attendants.join(',')}\``);
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
                    sendMessage_1.sendMessage(ctx, 'normal', '--------------------------');
                    sizes.forEach(s => {
                        sendMessage_1.sendMessage(ctx, 'markdown', `\`${attendants.slice(start, start + s).join(',')}\``);
                        start += s;
                    });
                }
                const participants = [...attendants];
                if (usersRemoved.indexOf(creator) < 0) {
                    participants.push(creator);
                }
                database_1.default.insertRaid({ boss: bossTextPlain, creator, date: new Date(Date.now()).toDateString(), time: hour, participants });
            }
        }
    }
};
exports.generateGoList = generateGoList;
//# sourceMappingURL=generateGoList.js.map