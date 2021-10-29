import { Context, Markup, Telegraf } from "telegraf";
import { InlineKeyboardButton, Update } from "telegraf/typings/core/types/typegram";
import _ from "underscore";
// @ts-ignore
import levenshtein from 'js-levenshtein'
import db, { Form, RaidBoss, WantedRaidParticipants } from "./database";

const getParticipantText = (participant: WantedRaidParticipants, index: number, showAlias: boolean) =>
  `\n${index + 1}. <a href="https://t.me/${participant.user.alias}">${participant.user.name}</a>${showAlias ? ` (@${participant.user.alias})` : ''}`


const getParticipantsText = (participants: Array<WantedRaidParticipants>, forms: Array<Form> | undefined, showAlias: boolean): string => {
  if (forms && forms.length) {
    const all = `Lo quiero to:${
      participants.filter(p => !p.form || !p.form.id).map((p, index) => getParticipantText(p, index, showAlias)).join('')
    }`
    const rest = forms.map((f) => `Sólo ${f.description}:${
      participants.filter(p => p.form && p.form.id == f.id).map((p, index) => getParticipantText(p, index, showAlias)).join('')
    }`).join('\n\n')
    return `${all}\n\n${rest}`
  }
  return `La lista de interesados es:${
    participants.map((p, index) => getParticipantText(p, index, showAlias)).join('')
  }`
}

const getButtons = (raidBoss: RaidBoss) => {
  const buttonsInner = [
    Markup.button.callback("Yo también quiero", `join-${raidBoss.id}`),
    Markup.button.callback("Ya no quiero", `leave-${raidBoss.id}`)
  ]
  const extraButtons: Array<InlineKeyboardButton> = []
  const extraButtons2: Array<InlineKeyboardButton> = []
  if (raidBoss.forms) {
    raidBoss.forms.forEach((f) => {
      extraButtons.push(Markup.button.callback(`Sólo ${f.description}`, `form-${raidBoss!.id}-${f.id}`))
      extraButtons2.push(Markup.button.callback(`List ${f.description}`, `getlist-${raidBoss!.id}-${f.id}`))
    })
  }

  return Markup.inlineKeyboard([buttonsInner, extraButtons, extraButtons2])
}

export const soloRaidersWanted = async (ctx: Context<Update> & {
  match: RegExpExecArray;
}) => {
  const pokemon = ctx.match[1]
  if (pokemon) {
    const raidBosses = await db.getRaidBosses()
    const raidBoss = _(raidBosses).find(b => levenshtein(b.name!.toLocaleLowerCase(), pokemon.toLocaleLowerCase()) < 3)
    if (raidBoss) {
      const participants = await db.getWantedRaidParticipants(raidBoss)
      const from = ctx.from!
      if (participants.find(p => p.user.telegramId === from.id)) {
        // User already in
      } else {
        const newUser = { telegramId: from.id, name: from.first_name, alias: from.username }
        db.insertNewWantedParticipant(raidBoss, newUser)
        participants.push({ boss: raidBoss, user: newUser })
      }
      const buttons = getButtons(raidBoss)
      ctx.replyWithPhoto(raidBoss.image!, { caption: `De acuerdo, te apunto para <b>${raidBoss.name}</b>\n\n${getParticipantsText(participants, raidBoss.forms, false)}`, parse_mode: 'HTML', reply_markup: buttons.reply_markup }).then((m) => {
        if (raidBoss.prevMessageId) {
          ctx.deleteMessage(raidBoss.prevMessageId)
        }
        db.updateRaidBoss({ ...raidBoss, prevMessageId: m.message_id })
      })
    }
  }
}

export const soloRaidersHave = async (ctx: Context<Update> & {
  match: RegExpExecArray;
}, bot: Telegraf<Context<Update>>) => {
  const pokemon = ctx.match[1]
  if (pokemon) {
    const raidBosses = await db.getRaidBosses()
    let raidBoss = _(raidBosses).find(b => levenshtein(b.name!.toLocaleLowerCase(), pokemon.toLocaleLowerCase()) < 3)
    if (raidBoss) {
      raidBoss = await db.getRaidBoss(raidBoss.id!)
      if (raidBoss) {
        const hasForms = raidBoss.forms && raidBoss.forms.length > 0
        const participants = await db.getWantedRaidParticipants(raidBoss)
        const buttons = getButtons(raidBoss)
        ctx.replyWithPhoto(raidBoss.image!, { caption: `<b>${raidBoss.name}</b>\n\n${getParticipantsText(participants, raidBoss.forms, !hasForms)}`, parse_mode: 'HTML', reply_markup: buttons.reply_markup }).then((m) => {
          if (raidBoss!.prevMessageId) {
            ctx.deleteMessage(raidBoss!.prevMessageId)
          }
          db.updateRaidBoss({ ...raidBoss, prevMessageId: m.message_id })
          const plist = participants.filter((p) => p.user.nick)
          if (!hasForms && plist && plist.length > 0) {
            if (plist.length > 5) {
              for (let i = 0; i < plist.length; i += 5) {
                // ctx.reply(plist.slice(i, i + 5).map(p => `@${p.user.alias}`).join(' '))
                ctx.replyWithMarkdown(`\`${plist.slice(i, i + 5).map((p) => p.user.nick).join(',')}\``)
              }
            } else {
              // ctx.reply(plist.map(p => `@${p.user.alias}`).join(' '))
              ctx.replyWithMarkdown(`\`${plist.map((p) => p.user.nick).join(',')}\``)
            }
          }
          if (hasForms) {
            participants.forEach(p => {
              if (p.user.chatId) {
                try {
                  bot.telegram.sendMessage(p.user.chatId, `${raidBoss!.name} de ${ctx.from?.first_name}, ¡atento!`)
                }
                catch { }
              }
            })
          }
        })
      }
    }
  }
}

export const addSoloRaider = async (ctx: Context<Update> & {
  match: RegExpExecArray;
}) => {
  const bossId = ctx.match[1]
  if (bossId) {
    const raidBoss = await db.getRaidBoss(Number.parseInt(bossId, 10))
    if (raidBoss) {
      const participants = await db.getWantedRaidParticipants(raidBoss)
      const from = ctx.from!
      const existingUser = participants.find(p => p.user.telegramId === from.id)
      if (existingUser) {
        existingUser.form = undefined
        db.updateWantedRaidParticipantForm(existingUser)
      } else {
        const newUser = { telegramId: from.id, name: from.first_name, alias: from.username }
        db.insertNewWantedParticipant(raidBoss, newUser)
        participants.push({ boss: raidBoss, user: newUser })
      }

      const buttons = getButtons(raidBoss)
      ctx.editMessageCaption(`<b>${raidBoss.name}</b>\n\n${getParticipantsText(participants, raidBoss.forms, false)}`, { parse_mode: 'HTML', reply_markup: buttons.reply_markup })
    }
  }
}

export const removeSoloRaider = async (ctx: Context<Update> & {
  match: RegExpExecArray;
}) => {
  const bossId = ctx.match[1]
  if (bossId) {
    const raidBoss = await db.getRaidBoss(Number.parseInt(bossId, 10))
    if (raidBoss) {
      let participants = await db.getWantedRaidParticipants(raidBoss)
      const from = ctx.from!
      if (participants.find(p => p.user.telegramId === from.id)) {
        db.removeWantedParticipant(raidBoss, from.id)
        participants = participants.filter(p => p.user.telegramId !== from.id)

        const buttons = getButtons(raidBoss)
        ctx.editMessageCaption(`<b>${raidBoss.name}</b>\n\n${getParticipantsText(participants, raidBoss.forms, false)}`, { parse_mode: 'HTML', reply_markup: buttons.reply_markup })
      }
    }
  }
}

export const onlyForm = async (ctx: Context<Update> & {
  match: RegExpExecArray;
}) => {
  const bossId = ctx.match[1]
  const formId = ctx.match[2]
  if (bossId && formId) {
    const raidBoss = await db.getRaidBoss(Number.parseInt(bossId, 10))
    const form = { id: Number(formId) }
    if (raidBoss) {
      let participants = await db.getWantedRaidParticipants(raidBoss)
      const from = ctx.from!
      const existingUser = participants.find(p => p.user.telegramId === from.id)
      if (existingUser) {
        existingUser.form = form
        db.updateWantedRaidParticipantForm(existingUser)
      } else {
        const newUser = { telegramId: from.id, name: from.first_name, alias: from.username }
        participants.push({ boss: raidBoss, user: newUser, form })
        db.insertNewWantedParticipant(raidBoss, newUser, form)
      }

      const buttons = getButtons(raidBoss)
      ctx.editMessageCaption(`<b>${raidBoss.name}</b>\n\n${getParticipantsText(participants, raidBoss.forms, false)}`, { parse_mode: 'HTML', reply_markup: buttons.reply_markup })
    }
  }
}

export const getFormList = async (ctx: Context<Update> & {
  match: RegExpExecArray;
}, bot: Telegraf<Context<Update>>) => {
  const bossId = ctx.match[1]
  const formId = ctx.match[2]
  if (bossId && formId) {
    const raidBoss = await db.getRaidBoss(Number.parseInt(bossId, 10))
    const form = { id: Number(formId) }
    if (raidBoss) {
      let participants = await db.getWantedRaidParticipants(raidBoss)

      const plist = participants.filter((p) => p.user.nick && (!p.form || !p.form.id || p.form.id == Number(formId)))
      if (plist && plist.length > 0) {
        ctx.reply(participants.map((u) => `@${u.user.alias}`).join(' '))
        if (plist.length > 5) {
          for (let i = 0; i < plist.length; i += 5) {
            // ctx.reply(plist.slice(i, i + 5).map(p => `@${p.user.alias}`).join(' '))
            ctx.replyWithMarkdown(`\`${plist.slice(i, i + 5).map((p) => p.user.nick).join(',')}\``)
          }
        } else {
          // ctx.reply(plist.map(p => `@${p.user.alias}`).join(' '))
          ctx.replyWithMarkdown(`\`${plist.map((p) => p.user.nick).join(',')}\``)
        }
        participants.forEach(p => {
          if (p.user.chatId) {
            try {
              bot.telegram.sendMessage(p.user.chatId, `${raidBoss!.name} de ${ctx.from?.first_name}, ¡atento!`)
            }
            catch { }
          }
        })
      }
    }
  }
}
