import { Context } from 'telegraf'
import { Message, MessageEntity } from 'telegraf/typings/core/types/typegram'
import _ from 'underscore'
import db from './database'
import { sendMessage } from './sendMessage'
import { writeLog } from './writeLog'

const pikachuId = Number.parseInt(process.env.PIKACHU_ID || '', 10)

const updateUserNick = async (url: string, nick: string) => {
  const alias = url.match('t.me/(.*)')![1]
  db.updateUserNick(alias, nick)
}

export const generateGoList = (
  ctx: Context,
  reply: Partial<Message.TextMessage & Message.MediaMessage>
) => {
  if (reply && reply.from?.id === pikachuId) {
    const entities = (reply.entities ||
      reply.caption_entities) as Array<MessageEntity.TextLinkMessageEntity>
    const text = reply.text || reply.caption
    if (text && entities) {
      writeLog(text)
      writeLog(entities)
      const boss = entities.filter(
        (e) => e.type === 'text_link' && e.url.match('pokebattler')
      )
      let links = entities.filter(
        (e) =>
          e.type === 'text_link' &&
          e.url.match('t.me/(?!detectivepikachubot)(.*)')
      )

      if (links.length > 1) {
        let bossText = ''
        let bossTextPlain = ''
        const hourMatch = text.match(/(🇪🇸\d+[^\n\\]+)/)
        const hour = hourMatch ? hourMatch[0] : ''
        if (boss && boss.length) {
          bossTextPlain = text.slice(
            boss[0].offset,
            boss[0].offset + boss[0].length
          )
          bossText = `<a href="${boss[0].url}"><b>${bossTextPlain}</b></a>`
        } else {
          const matches = text.match(/^.+?\s+?(\w+(\s\w+)?)\s+de/)
          bossText = matches ? `<b>${matches[1]}</b>` : 'no boss found'
        }

        const users: Array<string> = []
        const usersRemoved: Array<string> = []
        const usersRemovedMatch = text.matchAll(/❌[^\d]+\d+\s+(\w+)/g)
        let m = usersRemovedMatch.next()
        while (!m.done) {
          usersRemoved.push(m.value[1])
          links = links.filter(
            (l) => l.offset > m.value.index + 10 || l.offset < m.value.index
          )
          m = usersRemovedMatch.next()
        }
        links.forEach((e) => {
          const nick = text.slice(e.offset, e.offset + e.length)
          updateUserNick(e.url, nick)
          users.push(nick)
        })
        const creator = users[0]
        const attendants = _(users).chain().uniq().without(creator).value()
        const attLinks = links.filter((l) => l.url !== links[0].url)
        const attAlias = attLinks.map((l) =>
          l.url.match('t.me/(?!detectivepikachubot)(.*)')
        )
        let attNicksText = '‼️ Atentos Ksuals ‼️\n'
        attAlias.forEach((m) => {
          if (m && m.length > 1) {
            attNicksText = `${attNicksText}@${m[1]} `
          }
        })

        sendMessage(
          ctx,
          'html',
          `${attNicksText}\n\n${bossText} de <a href="${links[0].url}"><b>${creator}</b></a>\n🔽${hour}🔽`,
          { disable_web_page_preview: true }
        )
        if (attendants.length) {
          sendMessage(ctx, 'markdown', `\`${attendants.join(',')}\``)
        }
        if (attendants.length > 5) {
          const att = attendants.length
          const sizes: Array<number> = []
          const s = Math.ceil(att / 5)
          const n = Math.floor(att / s)
          const r = att - n * s
          for (let i = 0; i < s; i += 1) {
            sizes.push(n)
          }
          for (let i = 0; i < r; i += 1) {
            sizes[i] += 1
          }
          let start = 0

          sendMessage(ctx, 'normal', '--------------------------')
          sizes.forEach((s) => {
            sendMessage(
              ctx,
              'markdown',
              `\`${attendants.slice(start, start + s).join(',')}\``
            )
            start += s
          })
        }

        const participants = [...attendants]
        if (usersRemoved.indexOf(creator) < 0) {
          participants.push(creator)
        }
        db.insertRaid({
          boss: bossTextPlain.replace("'", "''"),
          creator,
          date: new Date(Date.now()).toDateString(),
          time: hour,
          participants,
        })
      }
    }
  }
}
