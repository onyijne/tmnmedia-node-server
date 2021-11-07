import fs from 'fs'
import Trader from '../trader'
import { logger } from '../utils/helpers'

fs.writeFile('/var/www/robot/web/reports/server/trade.txt', 'ok', function (err) {
      // if (err) throw err;
    })
fs.writeFile('/var/www/robot/web/reports/server/debug-test.txt', 'ok', function (err) {
      // if (err) throw err;
    })
fs.writeFile('/var/www/robot/web/reports/server/debug.txt', 'ok', function (err) {
      // if (err) throw err;
    })

var DerivClient = new Trader()

export const robotRevoke = async (req, res) => {
  const { token, settings } = req.body
  try {
    if (!token) {
      return res.status(200).json({ response: 'null' })
    }
    await DerivClient.initRevoke(token, settings)
    res.status(200).json({ status: 'done' })
  } catch (err) {
    logger(`${new Date()}: ${err.stack}`, '/var/www/robot/web/reports/server/trade.txt')
    res.status(200).json({ message: err.stack })
  }
}

export const robotTrade = async (req, res) => {
  
  try {
    const { trade_options, today, settings, users } = req.body
    for (let i = users.length - 1; i >= 0; i--) {
      try {
        await DerivClient.store.dispatch('trade', {
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

export const clearTrades = async (req, res) => {
  const { task } = req.body
  try {
    if (task === 'routine') {
      await DerivClient.resetRobots()
    } else if (task === 'routine-test') {
      await DerivClient.resetTestRobots()
    }
    return res.status(200).json({ status: 'success' })
  } catch (err) {
    logger(`${new Date()}: ${err.stack}`, '/var/www/robot/web/reports/server/trade.txt')
    res.status(200).json({ message: err.stack })
  }
}

export const robotWake = async (req, res) => {
  
  try {
    const { trade_options, today, settings, users } = req.body
    for (let i = users.length - 1; i >= 0; i--) {
      try {
        await DerivClient.initWake(trade_options, users[i],  settings, today)
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

export const copyStart = async (req, res) => {
  const { copy_options, user, settings } = req.body
  try {
    if (!user.deriv_token) return res.status(200)
      .json({ status: 'error', message: 'invalid token' })
    const msg = await DerivClient.startCopy(copy_options, user, settings)
    res.status(200).json({ status: 'done', message: msg })
  } catch (err) {
    logger(`${new Date()}: ${err.stack}`, '/var/www/robot/web/reports/server/trade.txt')
    res.status(200).json({ message: err.stack })
  }
}

export const copyEnd = async (req, res) => {
  const { user, settings } = req.body
  try {
    if (!user.deriv_token) return res.status(200)
      .json({ status: 'error', message: 'invalid token' })
    const msg = await DerivClient.endCopy(user, settings)
    return res.status(200).json({ status: 'success', message: msg })
  } catch (err) {
    logger(`${new Date()}: ${err.stack}`, '/var/www/robot/web/reports/server/trade.txt')
    res.status(200).json({ message: err.stack })
  }
}

export const copyStatistics = async (req, res) => {
  const { user, settings } = req.body
  try {
    if (!settings.deriv_account_id) return res.status(200)
      .json({ status: 'error', message: 'invalid account ID' })
    const msg = await DerivClient.copyStatistics(user, settings)
    res.status(200).json({ status: 'success', message: msg })
  } catch (err) {
    logger(`${new Date()}: ${err.stack}`, '/var/www/robot/web/reports/server/trade.txt')
    res.status(200).json({ message: err.stack })
  }
}

export const copyList = async (req, res) => {
  const { user, settings } = req.body
  try {
    if (!settings.deriv_account_id) return res.status(200)
      .json({ status: 'error', message: 'invalid account ID' })
    const msg = await DerivClient.copyList(user, settings)
    res.status(200).json({ status: 'success', message: msg })
  } catch (err) {
    logger(`${new Date()}: ${err.stack}`, '/var/www/robot/web/reports/server/trade.txt')
    res.status(200).json({ message: err.stack })
  }
}

export const testApp = (req, res) => {
  try {
    res.status(200).json({ status: 'online' })
  } catch (err) {
    logger(`${new Date()}: ${err.stack}`, '/var/www/robot/web/reports/server/trade.txt')
    res.status(200).json({ message: err.stack })
  }
}
