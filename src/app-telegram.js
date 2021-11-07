import cors from 'cors'
import logger from 'morgan'
import express from 'express'
import helmet from "helmet"
// var cookie = require('cookie')
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'

import robotRouter from './routes/robot'
import Telegram from './telegram'

dotenv.config()

const app = express();

const corsOptions = {
  origin: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-requested-with"],
  credentials: true
}

app.use(helmet()); // Add Helmet as a middleware
app.use(cors(corsOptions))
//app.options('*', cors(corsOptions)) // include before other routes
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(bodyParser.raw())
app.use(logger('dev'))
app.use(cookieParser())

const tele = new Telegram()
// Set the bot API endpoint
app.use(tele.bot.webhookCallback(tele.secretPath))

app.use('/v2/robot', robotRouter)

// process all responses to add ed25519
app.use(function(req, res, next) {
  const oldResJson = res.json
  res.json = function(body) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
    oldResJson.call(res, body)
  }
  next()
})

app.use((err, req, res, next) => {
  res.status(400).json({ error: err.stack });
});

export default app;
