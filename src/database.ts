import { Database, OPEN_CREATE, OPEN_READWRITE } from 'sqlite3'
import _ from 'underscore'
const dbpath = process.env.DB_PATH

export interface Raid {
  boss: string
  creator: string
  date: string
  time: string
  participants: Array<string>
}

export interface IDatabase {
  insertRaid: (raid: Raid) => void
}

class DB implements IDatabase {
  private _db: Database
  constructor() {
    if (!dbpath) {
      throw Error('DB undefined')
    }
    this._db = new Database(dbpath, OPEN_READWRITE | OPEN_CREATE, (err) => {
      if (err) {
        throw err
      }
      this._db.run('CREATE TABLE IF NOT EXISTS Raids (id INTEGER PRIMARY KEY, boss TEXT, creator TEXT, date TEXT, time TEXT)')
      this._db.run('CREATE TABLE IF NOT EXISTS Participants (id INTEGER PRIMARY KEY, raidId INTEGER, participant TEXT)')
    })
  }

  public insertRaid = (raid: Raid) => {
    const _this = this
    this._db.all(`
      select *
      from raids
      where creator = '${raid.creator}'
        and date = '${raid.date}'
        and time = '${raid.time}'`,
      function(_err, rows) {
        if (!rows || rows.length === 0) {
          _this._db.run(`
            INSERT INTO Raids(boss, creator, date, time)
            VALUES ('${raid.boss}', '${raid.creator}', '${raid.date}', '${raid.time}')`,
            function () {
              const raidId = this.lastID
              raid.participants.forEach(p => _this._db.run(`INSERT INTO Participants(raidId, participant) VALUES ('${raidId}', '${p}')`))
            }
          )
        }
      })
  }

  public getRaids = (date: string): Promise<number> => {
    return new Promise((resolve, reject) => {
      this._db.get(`
        SELECT COUNT(*) AS count
        FROM Raids
        WHERE date = '${date}'
      `, (_err, row) => {
        if (!_err && row) {
          resolve(row.count)
        }
        else {
          reject(_err)
        }
      })
    })
  }

  public getTopRaidParticipants = (date: string): Promise<Array<{ participant: string, count: number }>> => {
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
          resolve(_(row).take(5))
        }
        else {
          reject(_err)
        }
      })
    })
  }
}

const db = new DB()
export default db