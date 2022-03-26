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
      this._db.run(
        'CREATE TABLE IF NOT EXISTS Raids (id INTEGER PRIMARY KEY, boss TEXT, creator TEXT, date TEXT, time TEXT)'
      )
      this._db.run(
        'CREATE TABLE IF NOT EXISTS Participants (id INTEGER PRIMARY KEY, raidId INTEGER, participant TEXT)'
      )
      this._db.run(
        'CREATE TABLE IF NOT EXISTS Users (id INTEGER PRIMARY KEY, telegramId INTEGER, name TEXT, alias TEXT, nick TEXT, chatId INTEGER)'
      )
      this._db.run(
        'CREATE TABLE IF NOT EXISTS RaidBosses (id INTEGER PRIMARY KEY, name TEXT, image TEXT, prevMessageId INTEGER, formType INTEGER)'
      )
      this._db.run(
        'CREATE TABLE IF NOT EXISTS WantedRaidParticipants (id INTEGER PRIMARY KEY, bossId INTEGER, userId INTEGER, formId INTEGER)'
      )
      this._db.run(
        'CREATE TABLE IF NOT EXISTS Forms (id INTEGER PRIMARY KEY, type INTEGER, subtype INTEGER, description string, isAvailable INTEGER)'
      )
      this._db.run(
        'CREATE TABLE IF NOT EXISTS Hofs (id INTGER PRIMARY KEY, type TEXT, date TEXT, nick TEXT, boss TEXT, shiny INTEGER, legendary INTEGER, value INTEGER)'
      )
      this._db.run(
        'CREATE TABLE IF NOT EXISTS HofsTemp (id INTEGER PRIMARY KEY, type TEXT, date TEXT, nick TEXT, userId INTEGER, boss TEXT, shiny INTEGER, legendary INTEGER, value INTEGER, messageId INTEGER, botMessageId INTEGER)'
      )
      //alter table RaidBosses add column formType integer;
      //alter table WantedRaidParticipants add column formId integer;
    })
  }

  public insertRaid = (raid: Raid) => {
    const _this = this
    this._db.all(
      `
      SELECT *
      FROM raids
      WHERE creator = '${raid.creator}'
        AND date = '${raid.date}'
        AND time = '${raid.time}'`,
      function (_err, rows) {
        if (!rows || rows.length === 0) {
          _this._db.run(
            `
            INSERT INTO Raids(boss, creator, date, time)
            VALUES ('${raid.boss}', '${raid.creator}', '${raid.date}', '${raid.time}')`,
            function () {
              const raidId = this.lastID
              raid.participants.forEach((p) =>
                _this._db.run(
                  `INSERT INTO Participants(raidId, participant) VALUES ('${raidId}', '${p}')`
                )
              )
            }
          )
        }
      }
    )
  }

  public getRaids = (date: string): Promise<number> => {
    return new Promise((resolve, reject) => {
      this._db.get(
        `
        SELECT COUNT(*) AS count
        FROM Raids
        WHERE date = '${date}'
      `,
        (_err, row) => {
          if (!_err && row) {
            resolve(row.count)
          } else {
            reject(_err)
          }
        }
      )
    })
  }

  public getTopRaidParticipants = (
    date: string
  ): Promise<Array<ParticipantCount>> => {
    return new Promise((resolve, reject) => {
      this._db.all(
        `
        SELECT p.participant, COUNT(*) AS count
        FROM Participants p
        INNER JOIN Raids r on r.id = p.raidId
        WHERE r.date = '${date}'
        GROUP BY p.participant
        ORDER BY COUNT(*) desc
      `,
        (_err, row) => {
          if (!_err && row) {
            resolve(_(row).take(5))
          } else {
            reject(_err)
          }
        }
      )
    })
  }

  public getRaidBosses = (): Promise<Array<RaidBoss>> => {
    return new Promise((resolve, reject) => {
      this._db.all(
        `
        SELECT *
        FROM RaidBosses
      `,
        (_err, rows) => {
          if (!_err && rows) {
            resolve(rows)
          } else {
            reject(_err)
          }
        }
      )
    })
  }

  public getRaidBoss = (bossId: number): Promise<RaidBoss> => {
    return new Promise((resolve, reject) => {
      this._db.all(
        `
        SELECT b.id as id, b.image, b.name, f.id as formId, f.type as formType, f.subtype, f.description
        FROM RaidBosses b
        LEFT JOIN Forms f on f.type = b.formType
        WHERE b.id = ${bossId}
      `,
        (_err, rows) => {
          if (!_err && rows) {
            const boss: RaidBoss = {}
            if (rows && rows.length > 0) {
              boss.id = rows[0].id
              boss.image = rows[0].image
              boss.name = rows[0].name
              boss.forms = rows[0].formType
                ? rows.map((r: any) => ({
                    id: r.formId,
                    type: r.formType,
                    subtype: r.subtype,
                    description: r.description,
                  }))
                : undefined
            }
            resolve(boss)
          } else {
            reject(_err)
          }
        }
      )
    })
  }

  public insertRaidBoss = (boss: RaidBoss) => {
    this._db.get(
      `
      SELECT *
      FROM RaidBosses
      WHERE name = '${boss.name}'
    `,
      (_err, row) => {
        if (!row) {
          this._db.run(`
          INSERT INTO RaidBosses (name, image)
          VALUES ('${boss.name}', '${boss.image}')
        `)
        }
      }
    )
  }

  public updateRaidBoss = (boss: RaidBoss) => {
    this._db.run(`
      UPDATE RaidBosses
      SET prevMessageId = ${boss.prevMessageId}
      WHERE id = ${boss.id}
    `)
  }

  public getWantedRaidParticipants = (
    boss: RaidBoss
  ): Promise<Array<WantedRaidParticipants>> => {
    return new Promise((resolve, reject) => {
      this._db.all(
        `
        SELECT r.id as id, r.userId, u.telegramId, u.name, u.alias, u.nick, u.chatId, r.formId
        FROM WantedRaidParticipants r
        INNER JOIN Users u ON u.id = r.userId
        WHERE bossId = ${boss.id}
      `,
        (_err, rows) => {
          if (!_err && rows) {
            resolve(
              rows.map((r) => ({
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
              }))
            )
          } else {
            reject(_err)
          }
        }
      )
    })
  }

  public insertNewWantedParticipant = (
    boss: RaidBoss,
    user: User,
    form?: Form
  ) => {
    const _this = this
    this._db.get(
      `
      SELECT id
      FROM Users
      WHERE telegramId = '${user.telegramId}'
    `,
      function (_err, row) {
        if (row) {
          _this._db.run(`
          INSERT INTO WantedRaidParticipants (bossId, userId, formId)
          VALUES (${boss.id}, ${row.id}, ${form?.id ?? 'NULL'})
        `)
        } else {
          _this._db.run(
            `
          INSERT INTO Users (telegramId, name, alias)
          VALUES (${user.telegramId}, '${user.name}', '${user.alias}')
        `,
            function (_err) {
              _this._db.run(`
              INSERT INTO WantedRaidParticipants (bossId, userId, formId)
              VALUES (${boss.id}, ${this.lastID}, ${form?.id ?? 'NULL'})
            `)
            }
          )
        }
      }
    )
  }

  public removeWantedParticipant = (boss: RaidBoss, telegramId: number) => {
    this._db.run(`
      DELETE FROM WantedRaidParticipants
      WHERE id IN (
        SELECT p.id
        FROM WantedRaidParticipants p
        INNER JOIN Users u ON u.id = p.userId
        WHERE p.bossId = ${boss.id} AND u.telegramId = ${telegramId}
      )
    `)
  }

  public updateUserNick = (alias: string, nick: string) => {
    this._db.get(
      `
      SELECT *
      FROM Users
      WHERE alias = '${alias}'
    `,
      (_err, row) => {
        if (row && row.nick !== nick) {
          this._db.run(`
          UPDATE Users
          SET nick = '${nick}'
          WHERE id = ${row.id}
        `)
        }
      }
    )
  }

  public updateUserChat = (userId: number, chatId: number | string) => {
    this._db.get(
      `
      SELECT *
      FROM Users
      WHERE telegramId = ${userId}
    `,
      (_err, row) => {
        if (row && row.chatId !== chatId) {
          this._db.run(`
          UPDATE Users
          SET chatId = '${chatId}'
          WHERE id = ${row.id}
        `)
        }
      }
    )
  }

  public createForm = (form: Form) => {
    this._db.run(`
      INSERT INTO Forms (type, subtype, description, isAvailable)
      VALUES (${form.type}, ${form.subtype}, '${form.description}', ${
      form.isAvailable ? 1 : 0
    })
    `)
  }

  public setBossForm = (boss: string, form: number) => {
    this._db.run(`
      UPDATE RaidBosses
      SET formType = ${form}
      WHERE name = '${boss}'
    `)
  }

  public updateWantedRaidParticipantForm = (
    participant: WantedRaidParticipants
  ) => {
    this._db.run(`
      UPDATE WantedRaidParticipants
      SET formId = ${participant.form?.id ?? 'NULL'}
      WHERE id = ${participant.id}
    `)
  }

  public getOrInsertUser = (user: User): Promise<User> => {
    return new Promise((resolve, reject) => {
      const _this = this
      this._db.get(
        `
        SELECT *
        FROM Users
        WHERE telegramId = '${user.telegramId}'
        `,
        function (_err, row) {
          if (row) {
            resolve(row)
          } else {
            _this._db.run(
              `
                INSERT INTO Users (telegramId, name, alias)
                VALUES (${user.telegramId}, '${user.name}', '${user.alias}')
                `,
              function (_err) {
                if (_err) {
                  reject(_err)
                } else {
                  resolve({
                    ...user,
                    id: this.lastID,
                  })
                }
              }
            )
          }
        }
      )
    })
  }

  public getHofTemp = (id: number): Promise<HOFTemp> => {
    return new Promise((resolve, reject) => {
      this._db.get(
        `
        SELECT ht.id as id, ht.*, u.telegramId, u.name
        FROM HofsTemp ht
        INNER JOIN Users u ON u.id = ht.userId
        WHERE ht.id = '${id}'
      `,
        (_err, row) => {
          if (!_err && row) {
            resolve({
              ...row,
              user: {
                id: row.userId,
                telegramId: row.telegramId,
                name: row.name,
              },
            })
          } else {
            reject(_err)
          }
        }
      )
    })
  }

  public createHofTemp = (hofTemp: Omit<HOFTemp, 'id'>): Promise<HOFTemp> => {
    return new Promise((resolve, reject) => {
      this._db.run(
        `
        INSERT INTO HofsTemp (userId, nick, date, messageId)
        VALUES (
          ${hofTemp.user?.id},
          '${hofTemp.user?.nick}',
          '${new Date(hofTemp.date).toDateString()}',
          ${hofTemp.messageId}
        )
      `,
        function (_err) {
          if (!_err) {
            resolve({
              ...hofTemp,
              id: this.lastID,
            })
          } else {
            reject(_err)
          }
        }
      )
    })
  }

  public setHofTempBotMessage = (hofTempId: number, botMessageId: number) => {
    this._db.run(`
      UPDATE HofsTemp
      SET botMessageId = ${botMessageId}
      WHERE id = ${hofTempId}
    `)
  }

  public removeHofTemp = (hofTempId: number) => {
    this._db.run(`
      DELETE FROM HofsTemp
      WHERE id = ${hofTempId}
    `)
  }

  public setHofTempType = (hofTempId: number, type: HOFType) => {
    this._db.run(`
      UPDATE HofsTemp
      SET type = '${type}'
      WHERE id = ${hofTempId}
    `)
  }

  public setHofTempBoss = (hofTempId: number, boss?: string) => {
    this._db.run(`
      UPDATE HofsTemp
      SET boss = '${boss ?? ''}'
      WHERE id = ${hofTempId}
    `)
  }

  public setHofTempShiny = (hofTempId: number, shiny: boolean) => {
    this._db.run(`
      UPDATE HofsTemp
      SET shiny = ${Number(shiny)}
      WHERE id = ${hofTempId}
    `)
  }

  public setHofTempLegendary = (hofTempId: number, legendary: boolean) => {
    this._db.run(`
      UPDATE HofsTemp
      SET legendary = ${Number(legendary)}
      WHERE id = ${hofTempId}
    `)
  }

  public setHofTempValue = (hofTempId: number, value?: string) => {
    this._db.run(`
      UPDATE HofsTemp
      SET value = '${value ?? ''}'
      WHERE id = ${hofTempId}
    `)
  }

  public setHofTempNick = (hofTempId: number, nick?: string) => {
    this._db.run(`
      UPDATE HofsTemp
      SET nick = '${nick ?? ''}'
      WHERE id = ${hofTempId}
    `)
  }

  public persistHof = (hofTemp: HOFTemp) => {
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
    `)
  }
}

export type ParticipantCount = {
  participant: string
  count: number
}

export type RaidBoss = {
  id?: number
  name?: string
  image?: string
  prevMessageId?: number
  forms?: Array<Form>
}

export type WantedRaidParticipants = {
  id?: number
  boss?: RaidBoss
  user: User
  form?: Form
}

export type User = {
  id?: number
  telegramId: number
  name: string
  alias?: string
  nick?: string
  chatId?: number
}

export type Form = {
  id?: number
  type?: number
  subtype?: number
  description?: string
  isAvailable?: boolean
}

export type HOFType =
  | '100'
  | '0'
  | 'Perfect Shoot'
  | 'Weekly Raids'
  | 'Monthly Raids'
  | '1000 Raids/Pokémon'
  | '10000 Raids'
  | 'Full Team'
  | '5 Golds'
  | 'Platino'
  | 'Gold'
  | 'Silver'
  | 'Bronze'

export type HOF = {
  id?: number
  type: HOFType
  user?: User
  nick: string
  date: Date
  boss: string
  shiny?: boolean
  legendary?: boolean
}

export type HOFTemp = {
  id: number
  type?: HOFType
  nick?: string
  user?: Partial<User>
  date: Date
  boss?: string
  shiny?: boolean
  legendary?: boolean
  value?: string
  messageId?: number
  botMessageId?: number
}

const db = new DB()
export default db
