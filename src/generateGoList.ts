import { Context } from "telegraf"
import { Message, MessageEntity } from "telegraf/typings/core/types/typegram"
import _ from "underscore"
import { sendMessage } from "./sendMessage"

export const generateGoList = (ctx: Context, reply: Message.TextMessage & Message.MediaMessage) => {
  if (reply) {
    const entities = (reply.entities || reply.caption_entities) as Array<MessageEntity.TextLinkMessageEntity>
    const text = reply.text || reply.caption
    if (text && entities) {
      // console.log(text)
      // console.log(entities)
      const boss = entities
        .filter(e => e.type === 'text_link' && e.url.match('pokebattler'))
      const links = entities
        .filter(e => e.type === 'text_link' && e.url.match('t\.me\/(?!detectivepikachubot)(.*)'))

      if (boss.length && links.length) {
        let bossText = ''
        const hourMatch = text.match('(🇪🇸[^\n]+)')
        let hour = hourMatch ? hourMatch[0] : ''
        if (boss && boss.length) {
          bossText = text.slice(boss[0].offset, boss[0].offset + boss[0].length)
        }
        
        let users: Array<string> = []
        if (links) {
          links.forEach(e => {
            users.push(text.slice(e.offset, e.offset + e.length))
          });
        }
        const attendants = _.uniq(users).slice(1)
        const attLinks = links.filter(l => l.url !== links[0].url)
        const attNicks = attLinks.map(l => l.url.match('t\.me\/(?!detectivepikachubot)(.*)'))
        let attNicksText = '‼️ Atentos casuals ‼️\n'
        attNicks.forEach(m => {
          if (m && m.length > 1) {
            attNicksText = `${attNicksText}@${m[1]} `
          }
        })
        
        sendMessage(ctx, 'html', `${attNicksText}\n\n<a href="${boss[0].url}"><b>${bossText}</b></a> de <a href="${links[0].url}"><b>${users[0]}</b></a>\n🔽${hour}🔽`)
        sendMessage(ctx, 'markdown', `\`${attendants.join(',')}\``)

        if (attendants.length > 5) {
          const att = attendants.length
          const sizes: Array<number> = []
          const s = Math.ceil(att / 5)
          const n = Math.floor(att/s)
          const r = att - n*s
          for (let i = 0; i < s; i += 1) {
            sizes.push(n)
          }
          for (let i = 0; i < r; i += 1) {
            sizes[i] += 1
          }
          let start = 0

          sendMessage(ctx, 'normal', '--------------------------')
          sizes.forEach(s => {
            sendMessage(ctx, 'markdown', `\`${attendants.slice(start, start + s).join(',')}\``)
            start += s
          })     
        }
      }
    }
  }
}
