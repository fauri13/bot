import { Context, Markup } from 'telegraf'
import { Message, Update } from 'telegraf/typings/core/types/typegram'
import _ from 'underscore'
import db, { HOFTemp } from './database'

const remotasChatId = process.env.REMOTAS_CHAT_ID
const hofsChatId = process.env.HOFS_CHAT_ID

const hofPhrases = [
  'So you think you achieved a HOF? 🧐\n¿Crees que te mereces un HOF? 🧐',
  'So you think you achieved a HOF? 🧐\n¿Seguro que crees que es un HOF? 🧐',
  'So you think you achieved a HOF? 🧐\n¿Seguro que quieres enviarlo a revisión? 🧐',
  'Good good, but it needs review first 😏\nBien bien, pero necesito revisar algunas cosillas primero 😏',
  'Well well well, shall we send it for review? 📮\nBueno bueno bueno, ¿lo enviamos a revisión? 📮',
]

const hofReviewPhrases = [
  '🕐 Let me check that...\n🕐 Déjame comprobar algunas cosas...',
  "🕑 mmm... Ok, let's check with the big guns\n🕑 mmm... Vale, vamos a verificarlo con los jefazos",
  '🕐 We are reviewing it...\n🕐 Estamos verificándolo...',
  '🕑 The monkey is on it 🐒\n🕑 El mono está en ello 🐒',
  '🕒 Be patient\n🕒 A esperar',
]

const hofReviewedPhrases = [
  'So it is really a HOF, gz! 🥳\nPues era un HOF de verdad, ¡enhorabuena! 🥳',
  'So it is really a HOF, gz! 🎉\nPues era un HOF de verdad, ¡enhorabuena! 🎉',
  'So it is really a HOF, gz! 🎊\nPues era un HOF de verdad, ¡enhorabuena! 🎊',
  'WOW, good HOF!\nWOW, ¡buen HOF!',
  "You're killing it!\n¡Estás que te sales!",
]

const hofReviewedPhrasesFail = [
  'Nice try\nBuen intento',
  'Today is not your day...\nNo es tu día',
  '👎',
  'Next time baby',
]

const getButtons = (hof: HOFTemp) => {
  const buttonsInner = [
    Markup.button.callback('Send to review!', `verify-hof-${hof.id}`),
    Markup.button.callback('No, I whish 😫', `cancel-hof-${hof.id}`),
  ]

  return Markup.inlineKeyboard([buttonsInner])
}

const getHofMessage = (hof: HOFTemp, final?: boolean) => {
  return `<a href="https://t.me/c/${remotasChatId?.slice(4)}/${
    hof.messageId
  }"><b>${final === true ? '✅' : final === false ? '❌' : '✏️'} HOF de ${
    hof.user?.name
  }</b></a>

- Id: ${hof.id}
- Date: ${hof.date}
- IGN: ${hof.nick ?? ''}
- Type: ${hof.type ?? ''}
- Boss: ${hof.boss ?? ''}
- Value: ${hof.value ?? ''}
  `
}

const getEditButtons = (hof: HOFTemp) => {
  const buttonsInner = [
    Markup.button.callback('Verificar!', `confirm-hof-${hof.id}`),
    Markup.button.callback('Borrar', `delete-hof-${hof.id}`),
  ]
  const buttonsChecks = [
    Markup.button.callback(
      `${hof.legendary ? '✅' : '▪️'} Legendary`,
      `legendary-hof-${hof.id}-${hof.legendary ? 0 : 1}`
    ),
    Markup.button.callback(
      `${hof.shiny ? '✅' : '▪️'} Shiny`,
      `shiny-hof-${hof.id}-${hof.shiny ? 0 : 1}`
    ),
  ]

  return Markup.inlineKeyboard([buttonsChecks, buttonsInner])
}

export const startHof = async (
  ctx: Context<Update>,
  reply?: Partial<Message.TextMessage & Message.MediaMessage>
) => {
  const user = await db.getOrInsertUser({
    telegramId: reply!.from!.id,
    name: reply!.from!.first_name,
    alias: reply!.from!.username,
  })
  const hof = await db.createHofTemp({
    user: user,
    date: new Date((reply?.date ?? 0) * 1000),
    messageId: reply?.message_id,
  })
  const response = await ctx.replyWithMarkdown(_.sample(hofPhrases) ?? '', {
    reply_to_message_id: ctx.message?.message_id,
    reply_markup: getButtons(hof).reply_markup,
  })
  db.setHofTempBotMessage(hof.id, response.message_id)
}

export const verifyHof = async (
  ctx: Context<Update> & {
    match: RegExpExecArray
  }
) => {
  try {
    const id = Number(ctx.match[1])
    const hof = await db.getHofTemp(id)
    if (ctx.from?.id === hof.user?.telegramId && remotasChatId && hofsChatId) {
      await ctx.telegram.forwardMessage(
        hofsChatId,
        remotasChatId,
        hof.messageId!
      )
      await ctx.telegram.sendMessage(hofsChatId, getHofMessage(hof), {
        parse_mode: 'HTML',
        reply_markup: getEditButtons(hof).reply_markup,
      })
      await ctx.editMessageText(_.sample(hofReviewPhrases) ?? '')
      ctx.answerCbQuery('Sent!').catch(() => {})
    } else {
      ctx.answerCbQuery('You cannot do that 🤨').catch(() => {})
    }
  } catch (e) {
    ctx.deleteMessage().catch(() => {})
    ctx
      .answerCbQuery(`Error, contact an admin`, { show_alert: true })
      .catch(() => {})
  }
}

export const deleteHof = (
  ctx: Context<Update> & {
    match: RegExpExecArray
  }
) => {
  const id = Number(ctx.match[1])
  if (id) {
    db.removeHofTemp(id)
  }
  ctx.deleteMessage()
  try {
    ctx.answerCbQuery('Ok', { show_alert: true })
  } catch {}
}

export const setHofLegendary = async (
  ctx: Context<Update> & {
    match: RegExpExecArray
  },
  legendary: boolean
) => {
  const id = Number(ctx.match[1])
  if (id) {
    const hof = await db.getHofTemp(id)
    hof.legendary = legendary
    db.setHofTempLegendary(id, legendary)
    ctx.editMessageText(getHofMessage(hof), {
      parse_mode: 'HTML',
      reply_markup: getEditButtons(hof).reply_markup,
    })
    ctx.answerCbQuery('Actualizado').catch(() => {})
  }
}

export const setHofShiny = async (
  ctx: Context<Update> & {
    match: RegExpExecArray
  },
  shiny: boolean
) => {
  const id = Number(ctx.match[1])
  if (id) {
    const hof = await db.getHofTemp(id)
    hof.shiny = shiny
    db.setHofTempShiny(id, shiny)
    ctx.editMessageText(getHofMessage(hof), {
      parse_mode: 'HTML',
      reply_markup: getEditButtons(hof).reply_markup,
    })
    ctx.answerCbQuery('Updated').catch(() => {})
  }
}

export const setHofType = async (
  ctx: Context<Update>,
  reply?: Partial<Message.TextMessage>,
  type?: string
) => {
  if (reply && reply.text) {
    const match = /Id: (\d+)/.exec(reply.text)
    if (match) {
      const id = Number(match[1])
      if (id) {
        const hof = await db.getHofTemp(id)
        if (hof) {
          switch (type) {
            case '100':
            case '0':
            case 'Perfect Shoot':
            case 'Weekly Raids':
            case 'Monthly Raids':
            case '1000 Raids/Pokémon':
            case '10000 Raids':
            case 'Full Team':
            case '5 Golds':
            case 'Platino':
            case 'Gold':
            case 'Silver':
            case 'Bronze':
              hof.type = type
              break
            default:
              ctx.reply('Invalid type').then((response) => {
                setTimeout(() => {
                  ctx.telegram.deleteMessage(
                    response.chat.id,
                    response.message_id
                  )
                }, 3000)
              })
              return
          }
          db.setHofTempType(hof.id, hof.type)
          ctx.telegram.editMessageText(
            reply.chat?.id,
            reply.message_id,
            undefined,
            getHofMessage(hof),
            {
              parse_mode: 'HTML',
              reply_markup: getEditButtons(hof).reply_markup,
            }
          )
        }
      }
    }
  }
}

export const setHofBoss = async (
  ctx: Context<Update>,
  reply?: Partial<Message.TextMessage>,
  boss?: string
) => {
  if (reply && reply.text) {
    const match = /Id: (\d+)/.exec(reply.text)
    if (match) {
      const id = Number(match[1])
      if (id) {
        const hof = await db.getHofTemp(id)
        if (hof) {
          hof.boss = boss
          db.setHofTempBoss(hof.id, boss)
          ctx.telegram.editMessageText(
            reply.chat?.id,
            reply.message_id,
            undefined,
            getHofMessage(hof),
            {
              parse_mode: 'HTML',
              reply_markup: getEditButtons(hof).reply_markup,
            }
          )
        }
      }
    }
  }
}

export const setHofValue = async (
  ctx: Context<Update>,
  reply?: Partial<Message.TextMessage>,
  value?: string
) => {
  if (reply && reply.text) {
    const match = /Id: (\d+)/.exec(reply.text)
    if (match) {
      const id = Number(match[1])
      if (id) {
        const hof = await db.getHofTemp(id)
        if (hof) {
          hof.value = value
          db.setHofTempValue(hof.id, value)
          ctx.telegram.editMessageText(
            reply.chat?.id,
            reply.message_id,
            undefined,
            getHofMessage(hof),
            {
              parse_mode: 'HTML',
              reply_markup: getEditButtons(hof).reply_markup,
            }
          )
        }
      }
    }
  }
}

export const setHofNick = async (
  ctx: Context<Update>,
  reply?: Partial<Message.TextMessage>,
  nick?: string
) => {
  if (reply && reply.text) {
    const match = /Id: (\d+)/.exec(reply.text)
    if (match) {
      const id = Number(match[1])
      if (id) {
        const hof = await db.getHofTemp(id)
        if (hof) {
          hof.nick = nick
          db.setHofTempNick(hof.id, nick)
          ctx.telegram.editMessageText(
            reply.chat?.id,
            reply.message_id,
            undefined,
            getHofMessage(hof),
            {
              parse_mode: 'HTML',
              reply_markup: getEditButtons(hof).reply_markup,
            }
          )
        }
      }
    }
  }
}

export const confirmHof = async (
  ctx: Context<Update> & {
    match: RegExpExecArray
  }
) => {
  try {
    const id = Number(ctx.match[1])
    const hof = await db.getHofTemp(id)
    db.persistHof(hof)
    db.removeHofTemp(id)
    ctx.telegram.editMessageText(
      remotasChatId,
      hof.botMessageId,
      undefined,
      _.sample(hofReviewedPhrases) ?? ''
    )
    ctx.editMessageText(getHofMessage(hof, true), { parse_mode: 'HTML' })
    ctx.answerCbQuery('Verified!').catch(() => {})
  } catch (e) {
    ctx.answerCbQuery(`Error, contact an admin`).catch(() => {})
  }
}

export const invalidateHof = async (
  ctx: Context<Update> & {
    match: RegExpExecArray
  }
) => {
  try {
    const id = Number(ctx.match[1])
    const hof = await db.getHofTemp(id)
    db.removeHofTemp(id)
    ctx.telegram.editMessageText(
      remotasChatId,
      hof.botMessageId,
      undefined,
      _.sample(hofReviewedPhrasesFail) ?? '',
      { parse_mode: 'HTML' }
    )
    ctx.editMessageText(getHofMessage(hof, false), { parse_mode: 'HTML' })
    ctx.answerCbQuery('Deleted!').catch(() => {})
  } catch (e) {
    ctx.answerCbQuery(`Error, contact an admin`).catch(() => {})
  }
}
