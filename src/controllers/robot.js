import fs from 'fs'
import { logger } from '../utils/helpers'
import Store from '../store/telegram'
import WebsocketServer from '../websocket'

/*fs.writeFile('/var/www/robot/web/reports/server/robot.txt', 'ok', function (err) {
      // if (err) throw err;
    })*/

const ws = new WebsocketServer()

export const testApp = (req, res) => {
  try {
    res.status(200).json({ status: 'online' })
  } catch (err) {
    logger(`${new Date()}: ${err.stack}`, '/var/www/robot/web/reports/server/test.txt')
    res.status(200).json({ message: err.message })
  }
}
// NOT IN USE YET
export const addAccount = async (req, res) => {
  try {
    res.status(200).json({ status: 'done' })
  } catch (err) {
    logger(`${new Date()}: ${err.stack}`, '/var/www/robot/web/reports/server/robot.txt')
    res.status(200).json({ message: err.stack })
  }
}
// NOT IN USE YET
export const sendTrade = async (req, res) => {
  
  try {
    const { trade_options, today, settings, users } = req.body
    for (let i = users.length - 1; i >= 0; i--) {
      try {
        //await DerivClient.initTrade(trade_options, users[i],  settings, today)
      } catch(err) {
        await logger(err)
      }
    }
    res.status(200).json({ response: 'done' })
  } catch (err) {
    logger(`${new Date()}: ${err.stack}`, '/var/www/robot/web/reports/server/robot.txt')
    res.status(200).json({ message: err.stack })
  }
}

export const handleEvents = (req, res) => {
  try{
    const message = req.body.message
    Store.publish('botMessaged', message)
    res.status(200).json({ status: 'ok' })
  } catch (err) {
    logger(`${new Date()}: ${err.stack}`, '/var/www/robot/web/reports/server/robot.txt')
    res.status(200).json({ message: err.stack })
  }
}

export const websocket = (req, res) => {
  ws.run()
  res.status(200).json({ status: 'ok' })
}

export const listClients = (req, res) => {
  try{
    res.status(200).json({ clients: Store.getters.robots })
  } catch (err) {
    logger(`${new Date()}: ${err.stack}`, '/var/www/robot/web/reports/server/robot.txt')
    res.status(200).json({ message: err.stack })
  }
}
