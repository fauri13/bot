import { Telegraf } from "telegraf";
import db from "./database";
import { generateGoList } from "./generateGoList";
import cron from 'node-cron'
import { getEnfermosMessage, getRaidsMessage } from "./dailyStatistics";
import { addSoloRaider, getFormList, onlyForm, removeSoloRaider, soloRaidersHave, soloRaidersWanted } from "./soloRaiders";

const token = process.env.BOT_TOKEN
const allowedChats = process.env.ALLOWED_CHATS
const allowedUsers = process.env.ALLOWED_USERS
const announcesChatId = process.env.ANNOUNCES_CHAT_ID
if (token === undefined) {
  throw new Error('BOT_TOKEN must be provided!')
}


const chatAllowed = (chatId: number) => allowedChats ? allowedChats.indexOf(chatId.toString()) !== -1 : true
const userAllowed = (userId: number) => allowedUsers ? allowedUsers.indexOf(userId.toString()) !== -1 : true

const bot = new Telegraf(token)
// Generate list from Pikachu
bot.hears(/^\/?(go|gg|lista?|invito|vamos|dale)$/i, async (ctx) => {
  if (chatAllowed(ctx.chat.id) && ctx.message.reply_to_message) {
    generateGoList(ctx, ctx.message.reply_to_message as any)
  }
});

// Solo raiders
bot.hears(/^(?:quiero\s*u?n?|i?\s*want|busco|me interesa)\s*(\w+)/i, (ctx) => {
  if (chatAllowed(ctx.chat.id)) {
    soloRaidersWanted(ctx)
  }
})
bot.hears(/^(?:tengo\s*u?n?|i?\s*have|invito)\s*a?\s*(\w+)/i, (ctx) => {
  if (chatAllowed(ctx.chat.id)) {
    soloRaidersHave(ctx, bot)
  }
})
bot.command('createboss', (ctx) => {
  if (chatAllowed(ctx.chat.id) && userAllowed(ctx.from.id)) {
    const params = ctx.message.text.split(' ')
    if (params.length > 1) {
      db.insertRaidBoss({
        name: params[1],
        image: params[2]
      })
    }
    ctx.reply(`Agregado ${params[1]}`, { reply_to_message_id: ctx.message.message_id })
  }
})
bot.command('createform', (ctx) => {
  if (chatAllowed(ctx.chat.id) && userAllowed(ctx.from.id)) {
    const params = ctx.message.text.split(' ')
    if (params.length > 1) {
      const type = params[1]
      for (let i = 2; i < params.length; i += 1) {
        db.createForm({
          type: Number(type),
          description: params[i],
          subtype: i - 1,
          isAvailable: true
        })
      }
    }
    ctx.reply(`Agregada forma ${params[1]}`, { reply_to_message_id: ctx.message.message_id })
  }
})
bot.command('setform', (ctx) => {
  if (chatAllowed(ctx.chat.id) && userAllowed(ctx.from.id)) {
    const params = ctx.message.text.split(' ')
    if (params.length > 1) {
      const boss = params[1]
      const form = params[2]
      db.setBossForm(boss, Number(form))
    }
    ctx.reply(`Agregada forma ${params[2]} a ${params[1]}`, { reply_to_message_id: ctx.message.message_id })
  }
})
bot.command('register', (ctx) => {
  if (ctx.chat.type === 'private') {
    db.updateUserChat(ctx.from.id, ctx.chat.id)
    ctx.reply(`Registrado ${ctx.from.id} ${ctx.chat.id}`)
  }
})
bot.command('unregister', (ctx) => {
  if (ctx.chat.type === 'private') {
    db.updateUserChat(ctx.from.id, '')
    ctx.reply(`Desregistrado`)
  }
})
bot.action(/join-(\w+)/, (ctx) => {
  addSoloRaider(ctx)
})
bot.action(/leave-(\w+)/, (ctx) => {
  removeSoloRaider(ctx)
})
bot.action(/form-(\w+)-(\d+)/, (ctx) => {
  onlyForm(ctx)
})
bot.action(/getlist-(\w+)-(\d+)/, (ctx) => {
  getFormList(ctx, bot)
})


// Statistics
bot.command('raidstoday', async (ctx) => {
  if (chatAllowed(ctx.chat.id) && userAllowed(ctx.from.id)) {
    ctx.deleteMessage(ctx.message.message_id)
    ctx.reply(await getRaidsMessage(new Date().toDateString()))
  }
})
bot.command('raidsyesterday', async (ctx) => {
  if (chatAllowed(ctx.chat.id) && userAllowed(ctx.from.id)) {
    let date = new Date()
    date.setDate(date.getDate() - 1)
    ctx.deleteMessage(ctx.message.message_id)
    ctx.reply(await getRaidsMessage(date.toDateString()))
  }
})
bot.command('enfermos', async (ctx) => {
  if (chatAllowed(ctx.chat.id) && userAllowed(ctx.from.id)) {
    ctx.deleteMessage(ctx.message.message_id)
    ctx.reply(await getEnfermosMessage(new Date().toDateString()))
  }
})
bot.command('enfermosayer', async (ctx) => {
  if (chatAllowed(ctx.chat.id) && userAllowed(ctx.from.id)) {
    let date = new Date()
    date.setDate(date.getDate() - 1)
    ctx.deleteMessage(ctx.message.message_id)
    ctx.reply(await getEnfermosMessage(date.toDateString()))
  }
})

// Status
bot.command('ping', (ctx) => {
  if (userAllowed(ctx.from.id)) {
    ctx.reply('pong')
  }
})

if (announcesChatId) {
  cron.schedule('59 23 * * *', async () => {
    const date = new Date(Date.now()).toDateString()
    bot.telegram.sendMessage(announcesChatId, await getRaidsMessage(date))
    bot.telegram.sendMessage(announcesChatId, await getEnfermosMessage(date))
  })
}

export default bot
