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
                        raid.participants.forEach(p => _this._db.run(`INSERT INTO Participants(raidId, participant) VALUES ('${raidId}', '${p}')`));
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
                        resolve(underscore_1.default(row).take(5));
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
                this._db.get(`
        SELECT *
        FROM RaidBosses
        WHERE id = ${bossId}
      `, (_err, row) => {
                    if (!_err && row) {
                        resolve(row);
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
        SELECT *
        FROM WantedRaidParticipants r
        INNER JOIN Users u ON u.id = r.userId
        WHERE bossId = ${boss.id}
      `, (_err, rows) => {
                    if (!_err && rows) {
                        resolve(rows.map((r) => ({
                            id: r.id,
                            user: {
                                id: r.id,
                                telegramId: r.telegramId,
                                name: r.name,
                                alias: r.alias,
                                nick: r.nick
                            }
                        })));
                    }
                    else {
                        reject(_err);
                    }
                });
            });
        };
        this.insertNewWantedParticipant = (boss, user) => {
            const _this = this;
            this._db.get(`
      SELECT id
      FROM Users
      WHERE telegramId = '${user.telegramId}'
    `, function (_err, row) {
                if (row) {
                    _this._db.run(`
          INSERT INTO WantedRaidParticipants (bossId, userId)
          VALUES (${boss.id}, ${row.id})
        `);
                }
                else {
                    _this._db.run(`
          INSERT INTO Users (telegramId, name, alias)
          VALUES (${user.telegramId}, '${user.name}', '${user.alias}')
        `, function (_err) {
                        _this._db.run(`
              INSERT INTO WantedRaidParticipants (bossId, userId)
              VALUES (${boss.id}, ${this.lastID})
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
        if (!dbpath) {
            throw Error('DB undefined');
        }
        this._db = new sqlite3_1.Database(dbpath, sqlite3_1.OPEN_READWRITE | sqlite3_1.OPEN_CREATE, (err) => {
            if (err) {
                throw err;
            }
            this._db.run('CREATE TABLE IF NOT EXISTS Raids (id INTEGER PRIMARY KEY, boss TEXT, creator TEXT, date TEXT, time TEXT)');
            this._db.run('CREATE TABLE IF NOT EXISTS Participants (id INTEGER PRIMARY KEY, raidId INTEGER, participant TEXT)');
            this._db.run('CREATE TABLE IF NOT EXISTS Users (id INTEGER PRIMARY KEY, telegramId INTEGER, name TEXT, alias TEXT, nick TEXT)');
            this._db.run('CREATE TABLE IF NOT EXISTS RaidBosses (id INTEGER PRIMARY KEY, name TEXT, image TEXT, prevMessageId INTEGER)');
            this._db.run('CREATE TABLE IF NOT EXISTS WantedRaidParticipants (id INTEGER PRIMARY KEY, bossId INTEGER, userId integer)');
        });
    }
}
const db = new DB();
exports.default = db;
//# sourceMappingURL=database.js.map