import fs from 'fs'
import Trader from '../trader'
import { logger } from '../utils/helpers'

fs.writeFile('/var/www/robot/web/reports/server/trader.txt', 'trader ok', function (err) {
      // if (err) throw err;
    })
fs.writeFile('/var/www/robot/web/reports/server/debug-tester.txt', 'trader ok', function (err) {
      // if (err) throw err;
    })
fs.writeFile('/var/www/robot/web/reports/server/debuger.txt', 'trader ok', function (err) {
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
    logger(`${new Date()}: ${err.stack}`, '/var/www/robot/web/reports/server/trade.txt')
    res.status(200).json({ message: err.stack })
  }
}

export const robotTrader = async (req, res) => {
  
  try {
    const { trade_options, today, settings, users } = req.body
    for (let i = users.length - 1; i >= 0; i--) {
      try {
        await DerivClient.store.dispatch('trader/trader', {
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
    logger(`${new Date()}: ${err.stack}`, '/var/www/robot/web/reports/server/trade.txt')
    res.status(200).json({ message: err.stack })
  }
}

export const clearTrader = async (req, res) => {
  const { task } = req.body
  try {
    if (task === 'routine-trade') {
      await DerivClient.resetTraderRobots()
    } else if (task === 'routine-trade-test') {
      await DerivClient.resetTraderTestRobots()
    }
    return res.status(200).json({ status: 'success' })
  } catch (err) {
    logger(`${new Date()}: ${err.stack}`, '/var/www/robot/web/reports/server/trader.txt')
    res.status(200).json({ message: err.stack })
  }
}
