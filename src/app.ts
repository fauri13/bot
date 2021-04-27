import express, { Request, Response } from 'express'
import _ from 'underscore'
import bot from './bot'

const endpoint = process.env.BOT_URL
const path = process.env.BOT_PATH
const port = process.env.BOT_PORT
if (endpoint === undefined) {
  throw new Error('BOT_URL must be provided!')
}
if (port === undefined) {
  throw new Error('BOT_PORT must be provided!')
}

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

