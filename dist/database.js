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
      select *
      from raids
      where creator = '${raid.creator}'
        and date = '${raid.date}'
        and time = '${raid.time}'`, function (_err, rows) {
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
        ORDER BY COUNT(*)
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
        if (!dbpath) {
            throw Error('DB undefined');
        }
        this._db = new sqlite3_1.Database(dbpath, sqlite3_1.OPEN_READWRITE | sqlite3_1.OPEN_CREATE, (err) => {
            if (err) {
                throw err;
            }
            this._db.run('CREATE TABLE IF NOT EXISTS Raids (id INTEGER PRIMARY KEY, boss TEXT, creator TEXT, date TEXT, time TEXT)');
            this._db.run('CREATE TABLE IF NOT EXISTS Participants (id INTEGER PRIMARY KEY, raidId INTEGER, participant TEXT)');
        });
    }
}
const db = new DB();
exports.default = db;
//# sourceMappingURL=database.js.map