import { Telegraf } from "telegraf";
import db from "./database";
import { generateGoList } from "./generateGoList";
import cron from 'node-cron'
import { getEnfermosMessage, getRaidsMessage } from "./dailyStatistics";

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
bot.hears(/^\/?(go|gg|lista|invito|vamos|dale)$/i, (ctx) => {
  if (chatAllowed(ctx.chat.id) && ctx.message.reply_to_message) {
    generateGoList(ctx, ctx.message.reply_to_message as any)
  }
});
bot.command('raidstoday', async (ctx) => {
  if (chatAllowed(ctx.chat.id) && userAllowed(ctx.message.from.id)) {
    const raids = await db.getRaids(new Date(Date.now()).toDateString())
    ctx.deleteMessage(ctx.message.message_id)
    ctx.reply(await getRaidsMessage(new Date(Date.now()).toDateString()))
  }
})
bot.command('enfermos', async (ctx) => {
  if (chatAllowed(ctx.chat.id) && userAllowed(ctx.message.from.id)) {
    ctx.deleteMessage(ctx.message.message_id)
    ctx.reply(await getEnfermosMessage(new Date(Date.now()).toDateString()))
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