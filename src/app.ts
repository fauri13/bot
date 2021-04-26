import express, { Request, Response } from 'express'
import { Telegraf } from 'telegraf'
import { Message, MessageEntity } from 'telegraf/typings/core/types/typegram'
import _ from 'underscore'
import { generateGoList } from './generateGoList'
import { sendMessage } from './sendMessage'

const token = '1598274294:AAFpwCEtW7hNsUemf15HaiEuuI3NZ5sSzJI'
if (token === undefined) {
  throw new Error('BOT_TOKEN must be provided!')
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
bot.telegram.setWebhook('https://tricky-cat-27.loca.lt/some-path')

const app = express()
app.get('/', (req: Request, res: Response) => res.send('Hello World!'))
// Set the bot API endpoint
app.use(bot.webhookCallback('/some-path'))
app.listen(3002, () => {
  console.log('Example app listening on port 3000!')
})

// No need to call bot.launch()