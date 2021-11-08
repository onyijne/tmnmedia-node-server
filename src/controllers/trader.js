import fs from 'fs'
import Trader from '../trader'
import { logger } from '../utils/helpers'

fs.writeFile('/var/www/robot/web/reports/tader/trader.txt', 'trader ok', function (err) {
      // if (err) throw err;
    })
fs.writeFile('/var/www/robot/web/reports/trader/debug-tester.txt', 'trader ok', function (err) {
      // if (err) throw err;
    })
fs.writeFile('/var/www/robot/web/reports/trader/debuger.txt', 'trader ok', function (err) {
      // if (err) throw err;
    })

var DerivClient = new Trader()

export const robotRevoker = async (req, res) => {
  const { token, settings } = req.body
  try {
    if (!token) {
      return res.status(200).json({ response: 'null' })
    }
    await DerivClient.initTraderRevoke(token, settings)
    res.status(200).json({ status: 'done' })
  } catch (err) {
    logger(`${new Date()}: ${err.stack}`, '/var/www/robot/web/reports/trader/trade.txt')
    res.status(200).json({ message: err.stack })
  }
}

export const robotTrader = async (req, res) => {
  
  try {
    const { trade_options, today, settings, users } = req.body
    for (let i = users.length - 1; i >= 0; i--) {
      try {
        await DerivClient.initTrader({
          trade_options: trade_options,
          user: users[i],
          settings: settings,
          today: today
        })
      } catch(err) {
        await logger(err)
      }
    }
    res.status(200).json({ response: 'done' })
  } catch (err) {
    logger(`${new Date()}: ${err.stack}`, '/var/www/robot/web/reports/trader/trade.txt')
    res.status(200).json({ message: err.stack })
  }
}

export const clearTrader = async (req, res) => {
  const { task, settings } = req.body
  try {
    if (task === 'routine-trader') {
      await DerivClient.resetTraderRobots(settings)
    } else if (task === 'routine-trader-test') {
      await DerivClient.resetTraderTestRobots(settings)
    }
    return res.status(200).json({ status: 'success' })
  } catch (err) {
    logger(`${new Date()}: ${err.stack}`, '/var/www/robot/web/reports/trader/trader.txt')
    res.status(200).json({ message: err.stack })
  }
}

export const robotWaker = async (req, res) => {
  
  try {
    const { trade_options, today, settings, users } = req.body
    for (let i = users.length - 1; i >= 0; i--) {
      try {
        await DerivClient.initTraderWaker(trade_options, users[i],  settings, today)
      } catch(err) {
        await logger(err)
      }
    }
    res.status(200).json({ response: 'done' })
  } catch (err) {
    logger(`${new Date()}: ${err.stack}`, '/var/www/robot/web/reports/trader/trade.txt')
    res.status(200).json({ message: err.stack })
  }
}

export const robotDigits = async (req, res) => {
  
  try {
    const { trade_options, settings, users } = req.body
    for (let i = users.length - 1; i >= 0; i--) {
      try {
        await DerivClient.initDigits({
          user: users[i],
          settings: settings,
          trade_options: trade_options
        })
      } catch(err) {
        await logger(err)
      }
    }
    res.status(200).json({ response: 'done' })
  } catch (err) {
    logger(`${new Date()}: ${err.stack}`, '/var/www/robot/web/reports/trader/trade.txt')
    res.status(200).json({ message: err.stack })
  }
}

export const listClients = (req, res) => {
  try{
    res.status(200).json({ clients: {
      digits: DerivClient.tstore.getters.traderRobots,
      signals: DerivClient.tstore.getters.signalRobots
    } })
  } catch (err) {
    logger(`${new Date()}: ${err.stack}`, '/var/www/robot/web/reports/trader/robot.txt')
    res.status(200).json({ message: err.stack })
  }
}
