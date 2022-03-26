import express, { Request, Response } from 'express'
import _ from 'underscore'
import bot from './bot'
import fs from 'fs'
import https from 'https'

const endpoint = process.env.BOT_URL
const path = process.env.BOT_PATH
const port = process.env.BOT_PORT
const announcesChatId = process.env.ANNOUNCES_CHAT_ID
const production = process.env.IS_PROD === 'true'
if (endpoint === undefined) {
  throw new Error('BOT_URL must be provided!')
}
if (port === undefined) {
  throw new Error('BOT_PORT must be provided!')
}

// No need to call bot.launch()
// Set telegram webhook
// npm install -g localtunnel && lt --port 3000
bot.telegram
  .setWebhook(endpoint)
  .then((v) => {
    console.log(`Registered to telegram ${v}`)
  })
  .catch((e) => {
    console.log(`Error ${e}`)
  })

const app = express()

app.get('/', (req: Request, res: Response) => res.send('It works!'))
app.post('/troll', (req, a) => {
  if (req.headers.authorization === 'Bearer asistenta' && announcesChatId) {
    bot.telegram.sendMessage(announcesChatId, req.body, {
      disable_web_page_preview: true,
      parse_mode: 'HTML',
    })
  }
})
// Set the bot API endpoint
app.use(bot.webhookCallback(path))

if (production) {
  const privateKey = fs.readFileSync('my_cert.key', 'utf8')
  const certificate = fs.readFileSync('my_cert.crt', 'utf8')

  const credentials = { key: privateKey, cert: certificate }

  const httpsServer = https.createServer(credentials, app)
  httpsServer.listen(port)
} else {
  app.listen(Number.parseInt(port), () => {
    console.log(`Bot listening on port ${port}`)
  })
}
