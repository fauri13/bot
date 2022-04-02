import { Context, Markup, Telegraf } from 'telegraf'
import {
  InlineKeyboardButton,
  Update,
} from 'telegraf/typings/core/types/typegram'
import _ from 'underscore'
// @ts-ignore
import levenshtein from 'js-levenshtein'
import db, { Form, RaidBoss, WantedRaidParticipants } from './database'

const getParticipantText = (
  participant: WantedRaidParticipants,
  index: number,
  tag = false
) =>
  `\n${index + 1}. <a href="https://t.me/${participant.user.alias}">${
    participant.user.nick ?? participant.user.name
  }</a> ${tag ? `(@${participant.user.alias})` : ''}`

const getParticipantsText = (
  participants: Array<WantedRaidParticipants>,
  forms: Array<Form> | undefined
): string => {
  if (forms && forms.length) {
    const all = `Lo quiero to:${participants
      .filter((p) => !p.form || !p.form.id)
      .map((p, index) => getParticipantText(p, index))
      .join('')}`
    const rest = forms
      .map(
        (f) =>
          `Sólo ${f.description}:${participants
            .filter((p) => p.form && p.form.id == f.id)
            .map((p, index) => getParticipantText(p, index))
            .join('')}`
      )
      .join('\n\n')
    return `${all}\n\n${rest}`
  }
  return `La lista de interesados es:${participants
    .map((p, index) => getParticipantText(p, index, true))
    .join('')}`
}

const getButtons = (raidBoss: RaidBoss) => {
  const buttonsInner = [
    Markup.button.callback('Yo también quiero', `join-${raidBoss.id}`),
    Markup.button.callback('Ya no quiero', `leave-${raidBoss.id}`),
  ]
  const extraButtons: Array<InlineKeyboardButton> = []
  const extraButtons2: Array<InlineKeyboardButton> = []
  if (raidBoss.forms) {
    raidBoss.forms.forEach((f) => {
      extraButtons.push(
        Markup.button.callback(
          `Sólo ${f.description}`,
          `form-${raidBoss!.id}-${f.id}`
        )
      )
      extraButtons2.push(
        Markup.button.callback(
          `List ${f.description}`,
          `getlist-${raidBoss!.id}-${f.id}`
        )
      )
    })
  } else {
    extraButtons.push(
      Markup.button.callback('Get List', `getlist-${raidBoss!.id}-`)
    )
  }

  return Markup.inlineKeyboard([buttonsInner, extraButtons, extraButtons2])
}

export const soloRaidersWanted = async (
  ctx: Context<Update> & {
    match: RegExpExecArray
  }
) => {
  const pokemon = ctx.match[1]
  if (pokemon) {
    const raidBosses = await db.getRaidBosses()
    const raidBoss: RaidBoss | undefined = _(raidBosses)
      .chain()
      .map((b) => ({
        ...b,
        score: levenshtein(
          b.name!.toLocaleLowerCase(),
          pokemon.toLocaleLowerCase()
        ),
      }))
      .filter((b) => b.score < 3)
      .sortBy((b) => b.score)
      .value()
      ?.shift()
    if (raidBoss) {
      const participants = await db.getWantedRaidParticipants(raidBoss)
      const from = ctx.from!
      if (participants.find((p) => p.user.telegramId === from.id)) {
        // User already in
      } else {
        const newUser = {
          telegramId: from.id,
          name: from.first_name,
          alias: from.username,
        }
        db.insertNewWantedParticipant(raidBoss, newUser)
        participants.push({ boss: raidBoss, user: newUser })
      }
      const buttons = getButtons(raidBoss)
      ctx
        .replyWithPhoto(raidBoss.image!, {
          caption: `De acuerdo, te apunto para <b>${
            raidBoss.name
          }</b>\n\n${getParticipantsText(participants, raidBoss.forms)}`,
          parse_mode: 'HTML',
          reply_markup: buttons.reply_markup,
        })
        .then((m) => {
          if (raidBoss?.prevMessageId) {
            ctx.deleteMessage(raidBoss.prevMessageId)
          }
          db.updateRaidBoss({ ...raidBoss, prevMessageId: m.message_id })
        })
    }
  }
}

export const soloRaidersHave = async (
  ctx: Context<Update> & {
    match: RegExpExecArray
  },
  bot: Telegraf<Context<Update>>
) => {
  const pokemon = ctx.match[1]
  if (pokemon) {
    const raidBosses = await db.getRaidBosses()
    let raidBoss: RaidBoss | undefined = _(raidBosses)
      .chain()
      .map((b) => ({
        ...b,
        score: levenshtein(
          b.name!.toLocaleLowerCase(),
          pokemon.toLocaleLowerCase()
        ),
      }))
      .filter((b) => b.score < 3)
      .sortBy((b) => b.score)
      .value()
      ?.shift()
    if (raidBoss) {
      raidBoss = await db.getRaidBoss(raidBoss.id!)
      if (raidBoss) {
        const from = ctx.from!
        const participants = await db.getWantedRaidParticipants(raidBoss)
        const buttons = getButtons(raidBoss)
        const m = await ctx.replyWithPhoto(raidBoss.image!, {
          caption: `<b>${raidBoss.name}</b>\n\n${getParticipantsText(
            participants,
            raidBoss.forms
          )}`,
          parse_mode: 'HTML',
          reply_markup: buttons.reply_markup,
        })
        if (raidBoss!.prevMessageId) {
          ctx.deleteMessage(raidBoss!.prevMessageId)
        }
        db.updateRaidBoss({ ...raidBoss, prevMessageId: m.message_id })
        const plist = participants.filter(
          (p) => p.user.nick && p.user.telegramId != from.id
        )
      }
    }
  }
}

export const addSoloRaider = async (
  ctx: Context<Update> & {
    match: RegExpExecArray
  }
) => {
  const bossId = ctx.match[1]
  if (bossId) {
    const raidBoss = await db.getRaidBoss(Number.parseInt(bossId, 10))
    if (raidBoss) {
      const participants = await db.getWantedRaidParticipants(raidBoss)
      const from = ctx.from!
      const existingUser = participants.find(
        (p) => p.user.telegramId === from.id
      )
      if (existingUser) {
        existingUser.form = undefined
        db.updateWantedRaidParticipantForm(existingUser)
      } else {
        const newUser = {
          telegramId: from.id,
          name: from.first_name,
          alias: from.username,
        }
        db.insertNewWantedParticipant(raidBoss, newUser)
        participants.push({ boss: raidBoss, user: newUser })
      }

      const buttons = getButtons(raidBoss)
      ctx.editMessageCaption(
        `<b>${raidBoss.name}</b>\n\n${getParticipantsText(
          participants,
          raidBoss.forms
        )}`,
        { parse_mode: 'HTML', reply_markup: buttons.reply_markup }
      )
      ctx.answerCbQuery('Apuntado!').catch(() => {})
      return
    }
  }
  ctx.answerCbQuery('Ya has roto algo...').catch(() => {})
}

export const removeSoloRaider = async (
  ctx: Context<Update> & {
    match: RegExpExecArray
  }
) => {
  const bossId = ctx.match[1]
  if (bossId) {
    const raidBoss = await db.getRaidBoss(Number.parseInt(bossId, 10))
    if (raidBoss) {
      let participants = await db.getWantedRaidParticipants(raidBoss)
      const from = ctx.from!
      if (participants.find((p) => p.user.telegramId === from.id)) {
        db.removeWantedParticipant(raidBoss, from.id)
        participants = participants.filter((p) => p.user.telegramId !== from.id)

        const buttons = getButtons(raidBoss)
        ctx.editMessageCaption(
          `<b>${raidBoss.name}</b>\n\n${getParticipantsText(
            participants,
            raidBoss.forms
          )}`,
          { parse_mode: 'HTML', reply_markup: buttons.reply_markup }
        )
        ctx.answerCbQuery('¿Ya tienes el shundo? 😏').catch(() => {})
      } else {
        ctx.answerCbQuery('No estabas apuntado 🤨').catch(() => {})
      }
    }
  }
}

export const onlyForm = async (
  ctx: Context<Update> & {
    match: RegExpExecArray
  }
) => {
  const bossId = ctx.match[1]
  const formId = ctx.match[2]
  if (bossId && formId) {
    const raidBoss = await db.getRaidBoss(Number.parseInt(bossId, 10))
    const form = { id: Number(formId) }
    if (raidBoss) {
      const participants = await db.getWantedRaidParticipants(raidBoss)
      const from = ctx.from!
      const existingUser = participants.find(
        (p) => p.user.telegramId === from.id
      )
      if (existingUser) {
        existingUser.form = form
        db.updateWantedRaidParticipantForm(existingUser)
      } else {
        const newUser = {
          telegramId: from.id,
          name: from.first_name,
          alias: from.username,
        }
        participants.push({ boss: raidBoss, user: newUser, form })
        db.insertNewWantedParticipant(raidBoss, newUser, form)
      }

      const buttons = getButtons(raidBoss)
      ctx.editMessageCaption(
        `<b>${raidBoss.name}</b>\n\n${getParticipantsText(
          participants,
          raidBoss.forms
        )}`,
        { parse_mode: 'HTML', reply_markup: buttons.reply_markup }
      )
      ctx.answerCbQuery(`Apuntado!`).catch(() => {})
    }
  }
}

export const getFormList = async (
  ctx: Context<Update> & {
    match: RegExpExecArray
  },
  bot: Telegraf<Context<Update>>
) => {
  const bossId = ctx.match[1]
  const formId = ctx.match[2]
  if (bossId) {
    const raidBoss = await db.getRaidBoss(Number.parseInt(bossId, 10))
    if (raidBoss) {
      const from = ctx.from!
      const participants = await db.getWantedRaidParticipants(raidBoss)
      const filteredParticipants = participants.filter(
        (p) =>
          (!formId || !p.form || !p.form.id || p.form.id == Number(formId)) &&
          p.user.telegramId != from.id
      )
      if (filteredParticipants && filteredParticipants.length > 0) {
        const plist = filteredParticipants.filter((p) => p.user.nick)
        await ctx.reply(
          `${raidBoss.name} de ${
            from.first_name
          }, atentos!\n\n${filteredParticipants
            .map((u) => `@${u.user.alias} `)
            .join(' ')}`
        )
        if (plist && plist.length > 0) {
          if (plist.length > 5) {
            for (let i = 0; i < plist.length; i += 5) {
              await ctx.replyWithMarkdown(
                `\`${plist
                  .slice(i, i + 5)
                  .map((p) => p.user.nick)
                  .join(',')}\``
              )
            }
          } else {
            await ctx.replyWithMarkdown(
              `\`${plist.map((p) => p.user.nick).join(',')}\``
            )
          }
          participants.forEach((p) => {
            if (p.user.chatId) {
              try {
                bot.telegram.sendMessage(
                  p.user.chatId,
                  `${raidBoss!.name} de ${ctx.from?.first_name}, ¡atento!`
                )
              } catch {}
            }
          })
          ctx.answerCbQuery('Go! Go! Go! 🤓').catch(() => {})
        } else {
          ctx
            .answerCbQuery('No tengo fichados a los apuntados 😳')
            .catch(() => {})
        }
      } else {
        ctx.answerCbQuery('No hay interesados 😱').catch(() => {})
      }
    }
  }
}
