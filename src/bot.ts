import { Telegraf } from 'telegraf'
import db from './database'
import { generateGoList } from './generateGoList'
import cron from 'node-cron'
import { getEnfermosMessage, getRaidsMessage } from './dailyStatistics'
import {
  addSoloRaider,
  getFormList,
  onlyForm,
  removeSoloRaider,
  soloRaidersHave,
  soloRaidersWanted,
} from './soloRaiders'
import {
  startHof,
  verifyHof,
  setHofLegendary,
  setHofShiny,
  setHofType,
  setHofValue,
  setHofBoss,
  confirmHof,
  deleteHof,
  setHofNick,
  invalidateHof,
} from './hofs'

const token = process.env.BOT_TOKEN
const allowedChats = process.env.ALLOWED_CHATS
const allowedHofChats = process.env.HOFS_CHAT_ID
const allowedUsers = process.env.ALLOWED_USERS
const allowedHofUsers = process.env.ALLOWED_HOF_USERS
const announcesChatId = process.env.ANNOUNCES_CHAT_ID
if (token === undefined) {
  throw new Error('BOT_TOKEN must be provided!')
}

const chatAllowed = (chatId: number) =>
  allowedChats ? allowedChats.indexOf(chatId.toString()) !== -1 : true
const userAllowed = (userId: number) =>
  allowedUsers ? allowedUsers.indexOf(userId.toString()) !== -1 : true
const userHofAllowed = (userId: number) =>
  allowedHofUsers ? allowedHofUsers.indexOf(userId.toString()) !== -1 : true
const chatHofAllowed = (chatId: number) =>
  allowedHofChats ? allowedHofChats.indexOf(chatId.toString()) !== -1 : true

const bot = new Telegraf(token)
// Generate list from Pikachu
bot.hears(/^\/?(go|gg|lista?|invito|vamos|dale)$/i, (ctx) => {
  if (chatAllowed(ctx.chat.id) && ctx.message.reply_to_message) {
    generateGoList(ctx, ctx.message.reply_to_message)
  }
})

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
bot.command('createboss', async (ctx) => {
  if (chatAllowed(ctx.chat.id) && userAllowed(ctx.from.id)) {
    const params = ctx.message.text.split(' ')
    if (params.length > 1) {
      db.insertRaidBoss({
        name: params[1],
        image: params[2],
      })
    }
    await ctx.reply(`Agregado ${params[1]}`, {
      reply_to_message_id: ctx.message.message_id,
    })
  }
  await ctx.deleteMessage(ctx.message.message_id)
})
bot.command('createform', async (ctx) => {
  if (chatAllowed(ctx.chat.id) && userAllowed(ctx.from.id)) {
    const params = ctx.message.text.split(' ')
    if (params.length > 1) {
      const type = params[1]
      for (let i = 2; i < params.length; i += 1) {
        db.createForm({
          type: Number(type),
          description: params[i],
          subtype: i - 1,
          isAvailable: true,
        })
      }
    }
    await ctx.reply(`Agregada forma ${params[1]}`, {
      reply_to_message_id: ctx.message.message_id,
    })
  }
  await ctx.deleteMessage(ctx.message.message_id)
})
bot.command('setform', async (ctx) => {
  if (chatAllowed(ctx.chat.id) && userAllowed(ctx.from.id)) {
    const params = ctx.message.text.split(' ')
    if (params.length > 1) {
      const boss = params[1]
      const form = params[2]
      db.setBossForm(boss, Number(form))
    }
    await ctx.reply(`Agregada forma ${params[2]} a ${params[1]}`, {
      reply_to_message_id: ctx.message.message_id,
    })
  }
  await ctx.deleteMessage(ctx.message.message_id)
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
bot.action(/getlist-(\w+)-(\d*)/, (ctx) => {
  getFormList(ctx, bot)
})

// Hofs
bot.command('hof', (ctx) => {
  if (
    chatAllowed(ctx.chat.id) &&
    ctx.message.reply_to_message &&
    (userHofAllowed(ctx.from.id) ||
      ctx.from.id === ctx.message.reply_to_message.from?.id)
  ) {
    startHof(ctx, ctx.message.reply_to_message)
  }
  ctx.deleteMessage(ctx.message.message_id)
})
bot.action(/verify-hof-(\d+)/, (ctx) => {
  verifyHof(ctx)
})
bot.action(/cancel-hof-(\d+)/, (ctx) => {
  verifyHof(ctx)
})
bot.on('photo', (ctx, next) => {
  if (ctx.message.caption?.match(/^#?hof.*/i)) {
    startHof(ctx, ctx.message)
  }
  next()
})
bot.action(/legendary-hof-(\d+)-0/, (ctx) => {
  setHofLegendary(ctx, false)
})
bot.action(/legendary-hof-(\d+)-1/, (ctx) => {
  setHofLegendary(ctx, true)
})
bot.action(/shiny-hof-(\d+)-0/, (ctx) => {
  setHofShiny(ctx, false)
})
bot.action(/shiny-hof-(\d+)-1/, (ctx) => {
  setHofShiny(ctx, true)
})
bot.command('type', (ctx, next) => {
  if (chatHofAllowed(ctx.chat.id)) {
    const params = ctx.message.text.split(' ')
    const param =
      params.length > 1 ? ctx.message.text.slice(params[0].length).trim() : ''
    setHofType(ctx, ctx.message.reply_to_message, param)
    ctx.deleteMessage()
  } else {
    next()
  }
})
bot.command('boss', (ctx, next) => {
  if (chatHofAllowed(ctx.chat.id)) {
    const params = ctx.message.text.split(' ')
    const param = params.length > 1 ? params[1] : ''
    setHofBoss(ctx, ctx.message.reply_to_message, param)
    ctx.deleteMessage()
  } else {
    next()
  }
})
bot.command('value', (ctx, next) => {
  if (chatHofAllowed(ctx.chat.id)) {
    const params = ctx.message.text.split(' ')
    const param = params.length > 1 ? params[1] : ''
    setHofValue(ctx, ctx.message.reply_to_message, param)
    ctx.deleteMessage()
  } else {
    next()
  }
})
bot.command('ign', (ctx, next) => {
  if (chatHofAllowed(ctx.chat.id)) {
    const params = ctx.message.text.split(' ')
    const param = params.length > 1 ? params[1] : ''
    setHofNick(ctx, ctx.message.reply_to_message, param)
    ctx.deleteMessage()
  } else {
    next()
  }
})
bot.action(/confirm-hof-(\d+)/, (ctx) => {
  confirmHof(ctx)
})
bot.action(/delete-hof-(\d+)/, (ctx) => {
  invalidateHof(ctx)
})

// Statistics
bot.command('raidstoday', async (ctx) => {
  if (chatAllowed(ctx.chat.id) && userAllowed(ctx.from.id)) {
    ctx.deleteMessage(ctx.message.message_id)
    ctx.reply(await getRaidsMessage(new Date().toDateString()))
  }
  ctx.deleteMessage(ctx.message.message_id)
})
bot.command('raidsyesterday', async (ctx) => {
  if (chatAllowed(ctx.chat.id) && userAllowed(ctx.from.id)) {
    const date = new Date()
    date.setDate(date.getDate() - 1)
    ctx.deleteMessage(ctx.message.message_id)
    ctx.reply(await getRaidsMessage(date.toDateString()))
  }
  ctx.deleteMessage(ctx.message.message_id)
})
bot.command('enfermos', async (ctx) => {
  if (chatAllowed(ctx.chat.id) && userAllowed(ctx.from.id)) {
    ctx.deleteMessage(ctx.message.message_id)
    ctx.reply(await getEnfermosMessage(new Date().toDateString()))
  }
  ctx.deleteMessage(ctx.message.message_id)
})
bot.command('enfermosayer', async (ctx) => {
  if (chatAllowed(ctx.chat.id) && userAllowed(ctx.from.id)) {
    const date = new Date()
    date.setDate(date.getDate() - 1)
    ctx.deleteMessage(ctx.message.message_id)
    ctx.reply(await getEnfermosMessage(date.toDateString()))
  }
  ctx.deleteMessage(ctx.message.message_id)
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
