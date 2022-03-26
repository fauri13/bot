"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sqlite3_1 = require("sqlite3");
const underscore_1 = __importDefault(require("underscore"));
const dbpath = process.env.DB_PATH;
class DB {
    constructor() {
        this.insertRaid = (raid) => {
            const _this = this;
            this._db.all(`
      SELECT *
      FROM raids
      WHERE creator = '${raid.creator}'
        AND date = '${raid.date}'
        AND time = '${raid.time}'`, function (_err, rows) {
                if (!rows || rows.length === 0) {
                    _this._db.run(`
            INSERT INTO Raids(boss, creator, date, time)
            VALUES ('${raid.boss}', '${raid.creator}', '${raid.date}', '${raid.time}')`, function () {
                        const raidId = this.lastID;
                        raid.participants.forEach((p) => _this._db.run(`INSERT INTO Participants(raidId, participant) VALUES ('${raidId}', '${p}')`));
                    });
                }
            });
        };
        this.getRaids = (date) => {
            return new Promise((resolve, reject) => {
                this._db.get(`
        SELECT COUNT(*) AS count
        FROM Raids
        WHERE date = '${date}'
      `, (_err, row) => {
                    if (!_err && row) {
                        resolve(row.count);
                    }
                    else {
                        reject(_err);
                    }
                });
            });
        };
        this.getTopRaidParticipants = (date) => {
            return new Promise((resolve, reject) => {
                this._db.all(`
        SELECT p.participant, COUNT(*) AS count
        FROM Participants p
        INNER JOIN Raids r on r.id = p.raidId
        WHERE r.date = '${date}'
        GROUP BY p.participant
        ORDER BY COUNT(*) desc
      `, (_err, row) => {
                    if (!_err && row) {
                        resolve((0, underscore_1.default)(row).take(5));
                    }
                    else {
                        reject(_err);
                    }
                });
            });
        };
        this.getRaidBosses = () => {
            return new Promise((resolve, reject) => {
                this._db.all(`
        SELECT *
        FROM RaidBosses
      `, (_err, rows) => {
                    if (!_err && rows) {
                        resolve(rows);
                    }
                    else {
                        reject(_err);
                    }
                });
            });
        };
        this.getRaidBoss = (bossId) => {
            return new Promise((resolve, reject) => {
                this._db.all(`
        SELECT b.id as id, b.image, b.name, f.id as formId, f.type as formType, f.subtype, f.description
        FROM RaidBosses b
        LEFT JOIN Forms f on f.type = b.formType
        WHERE b.id = ${bossId}
      `, (_err, rows) => {
                    if (!_err && rows) {
                        const boss = {};
                        if (rows && rows.length > 0) {
                            boss.id = rows[0].id;
                            boss.image = rows[0].image;
                            boss.name = rows[0].name;
                            boss.forms = rows[0].formType
                                ? rows.map((r) => ({
                                    id: r.formId,
                                    type: r.formType,
                                    subtype: r.subtype,
                                    description: r.description,
                                }))
                                : undefined;
                        }
                        resolve(boss);
                    }
                    else {
                        reject(_err);
                    }
                });
            });
        };
        this.insertRaidBoss = (boss) => {
            this._db.get(`
      SELECT *
      FROM RaidBosses
      WHERE name = '${boss.name}'
    `, (_err, row) => {
                if (!row) {
                    this._db.run(`
          INSERT INTO RaidBosses (name, image)
          VALUES ('${boss.name}', '${boss.image}')
        `);
                }
            });
        };
        this.updateRaidBoss = (boss) => {
            this._db.run(`
      UPDATE RaidBosses
      SET prevMessageId = ${boss.prevMessageId}
      WHERE id = ${boss.id}
    `);
        };
        this.getWantedRaidParticipants = (boss) => {
            return new Promise((resolve, reject) => {
                this._db.all(`
        SELECT r.id as id, r.userId, u.telegramId, u.name, u.alias, u.nick, u.chatId, r.formId
        FROM WantedRaidParticipants r
        INNER JOIN Users u ON u.id = r.userId
        WHERE bossId = ${boss.id}
      `, (_err, rows) => {
                    if (!_err && rows) {
                        resolve(rows.map((r) => ({
                            id: r.id,
                            user: {
                                id: r.userId,
                                telegramId: r.telegramId,
                                name: r.name,
                                alias: r.alias,
                                nick: r.nick,
                                chatId: r.chatId,
                            },
                            form: {
                                id: r.formId,
                            },
                        })));
                    }
                    else {
                        reject(_err);
                    }
                });
            });
        };
        this.insertNewWantedParticipant = (boss, user, form) => {
            const _this = this;
            this._db.get(`
      SELECT id
      FROM Users
      WHERE telegramId = '${user.telegramId}'
    `, function (_err, row) {
                if (row) {
                    _this._db.run(`
          INSERT INTO WantedRaidParticipants (bossId, userId, formId)
          VALUES (${boss.id}, ${row.id}, ${form?.id ?? 'NULL'})
        `);
                }
                else {
                    _this._db.run(`
          INSERT INTO Users (telegramId, name, alias)
          VALUES (${user.telegramId}, '${user.name}', '${user.alias}')
        `, function (_err) {
                        _this._db.run(`
              INSERT INTO WantedRaidParticipants (bossId, userId, formId)
              VALUES (${boss.id}, ${this.lastID}, ${form?.id ?? 'NULL'})
            `);
                    });
                }
            });
        };
        this.removeWantedParticipant = (boss, telegramId) => {
            this._db.run(`
      DELETE FROM WantedRaidParticipants
      WHERE id IN (
        SELECT p.id
        FROM WantedRaidParticipants p
        INNER JOIN Users u ON u.id = p.userId
        WHERE p.bossId = ${boss.id} AND u.telegramId = ${telegramId}
      )
    `);
        };
        this.updateUserNick = (alias, nick) => {
            this._db.get(`
      SELECT *
      FROM Users
      WHERE alias = '${alias}'
    `, (_err, row) => {
                if (row && row.nick !== nick) {
                    this._db.run(`
          UPDATE Users
          SET nick = '${nick}'
          WHERE id = ${row.id}
        `);
                }
            });
        };
        this.updateUserChat = (userId, chatId) => {
            this._db.get(`
      SELECT *
      FROM Users
      WHERE telegramId = ${userId}
    `, (_err, row) => {
                if (row && row.chatId !== chatId) {
                    this._db.run(`
          UPDATE Users
          SET chatId = '${chatId}'
          WHERE id = ${row.id}
        `);
                }
            });
        };
        this.createForm = (form) => {
            this._db.run(`
      INSERT INTO Forms (type, subtype, description, isAvailable)
      VALUES (${form.type}, ${form.subtype}, '${form.description}', ${form.isAvailable ? 1 : 0})
    `);
        };
        this.setBossForm = (boss, form) => {
            this._db.run(`
      UPDATE RaidBosses
      SET formType = ${form}
      WHERE name = '${boss}'
    `);
        };
        this.updateWantedRaidParticipantForm = (participant) => {
            this._db.run(`
      UPDATE WantedRaidParticipants
      SET formId = ${participant.form?.id ?? 'NULL'}
      WHERE id = ${participant.id}
    `);
        };
        this.getOrInsertUser = (user) => {
            return new Promise((resolve, reject) => {
                const _this = this;
                this._db.get(`
        SELECT *
        FROM Users
        WHERE telegramId = '${user.telegramId}'
        `, function (_err, row) {
                    if (row) {
                        resolve(row);
                    }
                    else {
                        _this._db.run(`
                INSERT INTO Users (telegramId, name, alias)
                VALUES (${user.telegramId}, '${user.name}', '${user.alias}')
                `, function (_err) {
                            if (_err) {
                                reject(_err);
                            }
                            else {
                                resolve({
                                    ...user,
                                    id: this.lastID,
                                });
                            }
                        });
                    }
                });
            });
        };
        this.getHofTemp = (id) => {
            return new Promise((resolve, reject) => {
                this._db.get(`
        SELECT ht.id as id, ht.*, u.telegramId, u.name
        FROM HofsTemp ht
        INNER JOIN Users u ON u.id = ht.userId
        WHERE ht.id = '${id}'
      `, (_err, row) => {
                    if (!_err && row) {
                        resolve({
                            ...row,
                            user: {
                                id: row.userId,
                                telegramId: row.telegramId,
                                name: row.name,
                            },
                        });
                    }
                    else {
                        reject(_err);
                    }
                });
            });
        };
        this.createHofTemp = (hofTemp) => {
            return new Promise((resolve, reject) => {
                this._db.run(`
        INSERT INTO HofsTemp (userId, nick, date, messageId)
        VALUES (
          ${hofTemp.user?.id},
          '${hofTemp.user?.nick}',
          '${new Date(hofTemp.date).toDateString()}',
          ${hofTemp.messageId}
        )
      `, function (_err) {
                    if (!_err) {
                        resolve({
                            ...hofTemp,
                            id: this.lastID,
                        });
                    }
                    else {
                        reject(_err);
                    }
                });
            });
        };
        this.setHofTempBotMessage = (hofTempId, botMessageId) => {
            this._db.run(`
      UPDATE HofsTemp
      SET botMessageId = ${botMessageId}
      WHERE id = ${hofTempId}
    `);
        };
        this.removeHofTemp = (hofTempId) => {
            this._db.run(`
      DELETE FROM HofsTemp
      WHERE id = ${hofTempId}
    `);
        };
        this.setHofTempType = (hofTempId, type) => {
            this._db.run(`
      UPDATE HofsTemp
      SET type = '${type}'
      WHERE id = ${hofTempId}
    `);
        };
        this.setHofTempBoss = (hofTempId, boss) => {
            this._db.run(`
      UPDATE HofsTemp
      SET boss = '${boss ?? ''}'
      WHERE id = ${hofTempId}
    `);
        };
        this.setHofTempShiny = (hofTempId, shiny) => {
            this._db.run(`
      UPDATE HofsTemp
      SET shiny = ${Number(shiny)}
      WHERE id = ${hofTempId}
    `);
        };
        this.setHofTempLegendary = (hofTempId, legendary) => {
            this._db.run(`
      UPDATE HofsTemp
      SET legendary = ${Number(legendary)}
      WHERE id = ${hofTempId}
    `);
        };
        this.setHofTempValue = (hofTempId, value) => {
            this._db.run(`
      UPDATE HofsTemp
      SET value = '${value ?? ''}'
      WHERE id = ${hofTempId}
    `);
        };
        this.setHofTempNick = (hofTempId, nick) => {
            this._db.run(`
      UPDATE HofsTemp
      SET nick = '${nick ?? ''}'
      WHERE id = ${hofTempId}
    `);
        };
        this.persistHof = (hofTemp) => {
            this._db.run(`
      INSERT INTO Hofs(type, date, nick, boss, shiny, legendary, value)
      VALUES (
        '${hofTemp.type}',
        '${hofTemp.nick}'
        '${new Date(hofTemp.date).toDateString()}',
        '${hofTemp.boss ?? ''}',
        ${Number(hofTemp.shiny) ?? 0},
        ${Number(hofTemp.legendary) ?? 0},
        '${hofTemp.value ?? ''}'
      )
    `);
        };
        if (!dbpath) {
            throw Error('DB undefined');
        }
        this._db = new sqlite3_1.Database(dbpath, sqlite3_1.OPEN_READWRITE | sqlite3_1.OPEN_CREATE, (err) => {
            if (err) {
                throw err;
            }
            this._db.run('CREATE TABLE IF NOT EXISTS Raids (id INTEGER PRIMARY KEY, boss TEXT, creator TEXT, date TEXT, time TEXT)');
            this._db.run('CREATE TABLE IF NOT EXISTS Participants (id INTEGER PRIMARY KEY, raidId INTEGER, participant TEXT)');
            this._db.run('CREATE TABLE IF NOT EXISTS Users (id INTEGER PRIMARY KEY, telegramId INTEGER, name TEXT, alias TEXT, nick TEXT, chatId INTEGER)');
            this._db.run('CREATE TABLE IF NOT EXISTS RaidBosses (id INTEGER PRIMARY KEY, name TEXT, image TEXT, prevMessageId INTEGER, formType INTEGER)');
            this._db.run('CREATE TABLE IF NOT EXISTS WantedRaidParticipants (id INTEGER PRIMARY KEY, bossId INTEGER, userId INTEGER, formId INTEGER)');
            this._db.run('CREATE TABLE IF NOT EXISTS Forms (id INTEGER PRIMARY KEY, type INTEGER, subtype INTEGER, description string, isAvailable INTEGER)');
            this._db.run('CREATE TABLE IF NOT EXISTS Hofs (id INTGER PRIMARY KEY, type TEXT, date TEXT, nick TEXT, boss TEXT, shiny INTEGER, legendary INTEGER, value INTEGER)');
            this._db.run('CREATE TABLE IF NOT EXISTS HofsTemp (id INTEGER PRIMARY KEY, type TEXT, date TEXT, nick TEXT, userId INTEGER, boss TEXT, shiny INTEGER, legendary INTEGER, value INTEGER, messageId INTEGER, botMessageId INTEGER)');
            //alter table RaidBosses add column formType integer;
            //alter table WantedRaidParticipants add column formId integer;
        });
    }
}
const db = new DB();
exports.default = db;
//# sourceMappingURL=database.js.map