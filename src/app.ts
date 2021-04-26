import express, { Request, Response } from 'express'
import { Telegraf } from 'telegraf'
import { Message, MessageEntity } from 'telegraf/typings/core/types/typegram'
import _ from 'underscore'
import { generateGoList } from './generateGoList'
import { sendMessage } from './sendMessage'

const token = process.env.BOT_TOKEN
const endpoint = process.env.BOT_URL
if (token === undefined) {
  throw new Error('BOT_TOKEN must be provided!')
}
if (endpoint === undefined) {
  throw new Error('BOT_URL must be provided!')
}

const bot = new Telegraf(token)
bot.hears(/^\/?(go|gg|lista|invito|vamos|dale)$/i, (ctx) => {
  if (ctx.message.reply_to_message) {
    generateGoList(ctx, ctx.message.reply_to_message as any)
  }
});
//bot.launch()
// Set telegram webhook
// npm install -g localtunnel && lt --port 3000
bot.telegram.setWebhook(token)

const app = express()
app.get('/', (req: Request, res: Response) => res.send('Hello World!'))
// Set the bot API endpoint
app.use(bot.webhookCallback('/some-path'))
app.listen(3002, () => {
  console.log('Example app listening on port 3000!')
})

// No need to call bot.launch()