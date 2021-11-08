import express from 'express'
import { testApp, handleEvents, websocket, listClients } from '../controllers/robot'
import { authBot } from '../middleware'

const robotRouter = express.Router()

const secretPath = `/telegraf/${process.env.BOT_TOKEN}`

//robotRouter.post('/add-account', addAccount)
//robotRouter.all('/connect', sendTrade)
robotRouter.get('/test', testApp)
robotRouter.post(secretPath, authBot, handleEvents)
robotRouter.all('/socket', websocket)
robotRouter.get('/list-clients', listClients)

export default robotRouter
