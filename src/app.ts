import express, { Request, Response } from 'express'
import { Telegraf } from 'telegraf'
import _ from 'underscore'
import db from './database'
import { generateGoList } from './generateGoList'

const token = process.env.BOT_TOKEN
const endpoint = process.env.BOT_URL
const path = process.env.BOT_PATH
const port = process.env.BOT_PORT
const allowedChats = process.env.ALLOWED_CHATS
if (token === undefined) {
  throw new Error('BOT_TOKEN must be provided!')
}
if (endpoint === undefined) {
  throw new Error('BOT_URL must be provided!')
}
if (port === undefined) {
  throw new Error('BOT_PORT must be provided!')
}

const chatAllowed = (chatId: number) => allowedChats ? allowedChats.indexOf(chatId.toString()) !== -1 : true

const bot = new Telegraf(token)
bot.hears(/^\/?(go|gg|lista|invito|vamos|dale)$/i, (ctx) => {
  if (chatAllowed(ctx.chat.id) && ctx.message.reply_to_message) {
    generateGoList(ctx, ctx.message.reply_to_message as any)
  }
});
bot.command('raidstoday', async (ctx) => {
  if (chatAllowed(ctx.chat.id)) {
    const raids = await db.getRaids(new Date(Date.now()).toDateString())
    ctx.deleteMessage(ctx.message.message_id)
    ctx.reply(`Hoy se ha${raids > 1 ? 'n' : ''} hecho ${raids} raid${raids > 1 ? 's' : ''})`)
  }
})
bot.command('enfermos', async (ctx) => {
  if (chatAllowed(ctx.chat.id)) {
    const enfermos = await db.getTopRaidParticipants(new Date(Date.now()).toDateString())
    ctx.deleteMessage(ctx.message.message_id)
    if (enfermos && enfermos.length) {
      ctx.reply(`Los enfermos de hoy son:${enfermos.map((e, index) => `\n${index + 1}. ${e.participant} (${e.count})`).join('')}`)
    } else {
      ctx.reply('No hay enfermos hoy 😳')
    }
  }
})

// No need to call bot.launch()
// Set telegram webhook
// npm install -g localtunnel && lt --port 3000
bot.telegram.setWebhook(endpoint)

const app = express()

app.get('/', (req: Request, res: Response) => res.send('It works!'))
// Set the bot API endpoint
app.use(bot.webhookCallback(path))
app.listen(Number.parseInt(port), () => {
  console.log(`Bot listening on port ${port}`)
})

