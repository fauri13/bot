"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateGoList = void 0;
var underscore_1 = __importDefault(require("underscore"));
var sendMessage_1 = require("./sendMessage");
var generateGoList = function (ctx, reply) {
    if (reply) {
        var entities = (reply.entities || reply.caption_entities);
        var text_1 = reply.text || reply.caption;
        if (text_1 && entities) {
            // console.log(text)
            // console.log(entities)
            var boss = entities
                .filter(function (e) { return e.type === 'text_link' && e.url.match('pokebattler'); });
            var links_1 = entities
                .filter(function (e) { return e.type === 'text_link' && e.url.match('t\.me\/(?!detectivepikachubot)(.*)'); });
            if (boss.length && links_1.length) {
                var bossText = '';
                var hourMatch = text_1.match('(🇪🇸[^\n]+)');
                var hour = hourMatch ? hourMatch[0] : '';
                if (boss && boss.length) {
                    bossText = text_1.slice(boss[0].offset, boss[0].offset + boss[0].length);
                }
                var users_1 = [];
                if (links_1) {
                    links_1.forEach(function (e) {
                        users_1.push(text_1.slice(e.offset, e.offset + e.length));
                    });
                }
                var attendants_1 = underscore_1.default.uniq(users_1).slice(1);
                var attLinks = links_1.filter(function (l) { return l.url !== links_1[0].url; });
                var attNicks = attLinks.map(function (l) { return l.url.match('t\.me\/(?!detectivepikachubot)(.*)'); });
                var attNicksText_1 = '‼️ Atentos casuals ‼️\n';
                attNicks.forEach(function (m) {
                    if (m && m.length > 1) {
                        attNicksText_1 = attNicksText_1 + " @" + m[1];
                    }
                });
                //sendMessage(ctx, 'normal', attNicksText)
                sendMessage_1.sendMessage(ctx, 'html', attNicksText_1 + "\n\n<a href=\"" + boss[0].url + "\"><b>" + bossText + "</b></a> de <a href=\"" + links_1[0].url + "\"><b>" + users_1[0] + "</b></a>\n\uD83D\uDD3D" + hour + "\uD83D\uDD3D");
                sendMessage_1.sendMessage(ctx, 'markdown', "`" + attendants_1.join(',') + "`");
                if (attendants_1.length > 5) {
                    var att = attendants_1.length;
                    var sizes = [];
                    var s = Math.ceil(att / (att % 5));
                    var n = Math.ceil(att / s);
                    var r = att - n * s;
                    for (var i = 0; i < n; i += 1) {
                        sizes.push(s);
                    }
                    for (var i = 0; i < r; i += 1) {
                        sizes[i] += 1;
                    }
                    var start_1 = 0;
                    sendMessage_1.sendMessage(ctx, 'normal', '--------------------------');
                    sizes.forEach(function (s) {
                        sendMessage_1.sendMessage(ctx, 'markdown', "`" + attendants_1.slice(start_1, start_1 + s).join(',') + "`");
                        start_1 += s;
                    });
                }
            }
        }
    }
};
exports.generateGoList = generateGoList;
//# sourceMappingURL=generateGoList.js.map