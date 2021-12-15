import fs from 'fs'
import TraderBot from '../bots//TraderBot'
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

var DerivClient = new TraderBot()

export const robotWaker = async (req, res) => {
  let response = {
    status: 'error',
    message: ''
  }
  try {
    const { settings, user } = req.body
    try {
      response = await DerivClient.initTraderWaker(user, settings)
    } catch(err) {
      await logger(err.stack)
      response.message = err.message
    }
    res.status(200).json(response)
  } catch (err) {
    logger(`${new Date()}: ${err.stack}`, '/var/www/robot/web/reports/trader/trade.txt')
    response.message = err.message
    res.status(200).json(response)
  }
}

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
    res.status(200).json({ message: err.message})
  }
}

export const robotTrader = async (req, res) => {
  
  try {
    const { today, settings, users, trade_options } = req.body
    for (let i = users.length - 1; i >= 0; i--) {
      try {
        await DerivClient.initTrader(
          trade_options,
          users[i],
          settings,
          today
        )
      } catch(err) {
        await logger(err)
      }
    }
    res.status(200).json({ response: 'done' })
  } catch (err) {
    logger(`${new Date()}: ${err.stack}`, '/var/www/robot/web/reports/trader/trade.txt')
    res.status(200).json({ message: err.message })
  }
}

export const clearTrader = async (req, res) => {
  const { task, settings, trade_options, digit_users, signal_users } = req.body
  try {
    if (task === 'routine-trader') {
      await DerivClient.resetTraderRobots(settings, trade_options, digit_users, signal_users)
    } else if (task === 'routine-trader-test') {
      await DerivClient.resetTraderTestRobots(settings, trade_options, digit_users, signal_users)
    }
    return res.status(200).json({ status: 'success' })
  } catch (err) {
    logger(`${new Date()}: ${err.stack}`, '/var/www/robot/web/reports/trader/trader.txt')
    res.status(200).json({ message: err.message})
  }
}

export const robotWakeAll = async (req, res) => {
  
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
    res.status(200).json({ message: err.message})
  }
}

export const robotSleep = async (req, res) => {
  try {
    const { settings, user } = req.body
    try {
      await DerivClient.initTraderSleep(user, settings)
    } catch(err) {
      await logger(err.message)
    }
    res.status(200).json({ message: 'done' })
  } catch (err) {
    logger(`${new Date()}: ${err.stack}`, '/var/www/robot/web/reports/trader/trade.txt')
    res.status(200).json({ message: err.stack, status: 'error' })
  }
}

export const robotDigits = async (req, res) => {
  let response = {
    status: 'error',
    message: ''
  }
  try {
    const { trade_options, settings, user } = req.body
    try {
      await DerivClient.initDigits(
       user,
       settings,
       trade_options
     )
     response.status ='success'
   } catch(err) {
     await logger(err)
     response.message = err.message
   }
    res.status(200).json(response)
  } catch (err) {
    logger(`${new Date()}: ${err.stack}`, '/var/www/robot/web/reports/trader/trade.txt')
    res.status(200).json({ message: err.message})
  }
}

export const listClients = (req, res) => {
  try{
    const dRobots = DerivClient.tstore.getters.traderRobots
    const sRobots = DerivClient.tstore.getters.signalRobots
    const dRobs = {}
    const sRobs = {}
    for (const key in dRobots) {
      if (Object.hasOwnProperty.call(dRobots, key)) {
        const rob = dRobots[key]
        dRobs[rob.user.deriv_account] = {
          connected: rob.connected,
          trade: rob.trade,
          digits: rob.digits
        }
      }
    }
    for (const key in sRobots) {
      const rob = sRobots[key]
        sRobs[rob.user.deriv_account] = {
          connected: rob.connected,
          trade: rob.trade
        }
    }
    res.status(200).json({ clients: {
      digits: dRobs,
      signals: sRobs
    } })
  } catch (err) {
    logger(`${new Date()}: ${err.stack}`, '/var/www/robot/web/reports/trader/robot.txt')
    res.status(200).json({ message: err.message})
  }
}
