import { Context, Markup } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";
import _ from "underscore";
// @ts-ignore
import levenshtein from 'js-levenshtein'
import db, { RaidBoss, WantedRaidParticipants } from "./database";

const getParticipantsText = (participants: Array<WantedRaidParticipants>, showAlias: boolean): string => {
  return `La lista de interesados es:${participants.map((p, index) =>
    `\n${index+1}. <a href="https://t.me/${p.user.alias}">${p.user.name}</a>${showAlias ? ` (@${p.user.alias})` : ''}`).join('')}`
}

export const soloRaidersWanted = async (ctx: Context<Update> & {
  match: RegExpExecArray;
}) => {
  const pokemon = ctx.match[1]
  if (pokemon) {
    const raidBosses = await db.getRaidBosses()
    const raidBoss = _(raidBosses).find(b => levenshtein(b.name.toLocaleLowerCase(), pokemon.toLocaleLowerCase()) < 3)
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
      const buttons = Markup.inlineKeyboard([
        Markup.button.callback("Yo también quiero", `join-${raidBoss.id}`),
        Markup.button.callback("Ya no quiero", `leave-${raidBoss.id}`)
      ])
      ctx.replyWithPhoto(raidBoss.image, { caption: `De acuerdo, te apunto para <b>${raidBoss.name}</b>\n\n${getParticipantsText(participants, false)}`, parse_mode: 'HTML', reply_markup: buttons.reply_markup }).then((m) => {
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
}) => {
  const pokemon = ctx.match[1]
  if (pokemon) {
    const raidBosses = await db.getRaidBosses()
    const raidBoss = _(raidBosses).find(b => levenshtein(b.name.toLocaleLowerCase(), pokemon.toLocaleLowerCase()) < 3)
    if (raidBoss) {
      const participants = await db.getWantedRaidParticipants(raidBoss)
      const buttons = Markup.inlineKeyboard([
        Markup.button.callback("Yo también quiero", `join-${raidBoss.id}`),
        Markup.button.callback("Ya no quiero", `leave-${raidBoss.id}`)
      ])
      ctx.replyWithPhoto(raidBoss.image, { caption: `<b>${raidBoss.name}</b>\n\n${getParticipantsText(participants, true)}`, parse_mode: 'HTML', reply_markup: buttons.reply_markup }).then((m) => {
        if (raidBoss.prevMessageId) {
          ctx.deleteMessage(raidBoss.prevMessageId)
        }
        db.updateRaidBoss({ ...raidBoss, prevMessageId: m.message_id })
        const plist = participants.filter((p) => p.user.nick)
        if (plist && plist.length > 0) {
          ctx.replyWithMarkdown(`\`${plist.map((p) => p.user.nick).join(',')}\``)
        }
      })
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
      if (participants.find(p => p.user.telegramId === from.id)) {
        // User already in
      } else {
        const newUser = { telegramId: from.id, name: from.first_name, alias: from.username }
        db.insertNewWantedParticipant(raidBoss, newUser)
        participants.push({ boss: raidBoss, user: newUser })
      
        const buttons = Markup.inlineKeyboard([
          Markup.button.callback("Yo también quiero", `join-${raidBoss.id}`),
          Markup.button.callback("Ya no quiero", `leave-${raidBoss.id}`)
        ])
        ctx.editMessageCaption(`<b>${raidBoss.name}</b>\n\n${getParticipantsText(participants, false)}`, { parse_mode: 'HTML', reply_markup: buttons.reply_markup })
      }
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
      
        const buttons = Markup.inlineKeyboard([
          Markup.button.callback("Yo también quiero", `join-${raidBoss.id}`),
          Markup.button.callback("Ya no quiero", `leave-${raidBoss.id}`)
        ])
        ctx.editMessageCaption(`<b>${raidBoss.name}</b>\n\n${getParticipantsText(participants, false)}`, { parse_mode: 'HTML', reply_markup: buttons.reply_markup })
      }
    }
  }
}

