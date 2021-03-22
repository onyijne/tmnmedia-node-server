import fs from 'fs'
import { sendSignalMulticast } from '../notify'
import Trader from '../trader'
import { messaging } from '../firebaseInit'
import { isEmpty, logger } from '../utils/helpers'

fs.writeFile('/var/www/app/web/reports/robot.txt', `${new Date()}: Server Started!`, function (err) {
  // if (err) throw err;
})

fs.writeFile('/var/www/app/web/reports/logs.json', JSON.stringify({ 'drill': 'started' }), function (err) {
  // if (err) throw err;
})

fs.writeFile('/var/www/app/web/reports/results.json', JSON.stringify({ 'drill': 'started' }), function (err) {
  // if (err) throw err;
})


var DerivClient = new Trader()

export const robotRevoke = async (req, res) => {
  const { token, app_id } = req.body
  try {
    if (!token) {
      return res.status(200).json({ response: 'null' })
    }
    await DerivClient.initRevoke(token)
    res.status(200).json({ status: 'done' })
  } catch (err) {
    await logger(err, '/var/www/app/web/reports/console-err-new.txt')
    res.status(200).json({ message: err.stack })
  }
}

export const robotTrade = async (req, res) => {
  
  try {
    const { trade_options, today, settings, users } = req.body
    for (let i = users.length - 1; i >= 0; i--) {
      try {
        await DerivClient.initTrade(trade_options, users[i],  settings, today)
      } catch(err) {
        await logger(err)
      }
    }
    res.status(200).json({ response: 'done' })
  } catch (err) {
    await logger(err, '/var/www/app/web/reports/console-err-new.txt')
    res.status(200).json({ message: err.stack })
  }
}

export const clearTrades = async (req, res) => {
  const { task } = req.body
  try {
    if (task === 'routine') {
      await DerivClient.resetRobots()
    }    
    res.status(200).json({ response: 'done' });
  } catch (err) {
    await logger(err, '/var/www/app/web/reports/console-err-new.txt')
    res.status(200).json({ message: err.stack })
  }
}

export const sendNotification = async (req, res) => {
  const { message } = req.body
  try {
    if (!isEmpty(message.tokens)) {
      sendSignalMulticast(message)
    }
    res.status(200).json({ response: 'done' })
  } catch (err) {
    await logger(err, '/var/www/app/web/reports/console-err-new.txt')
    res.status(200).json({ message: err.stack })
  }
}

/*

export const subscribe = async (req, res) => {
  const { tokens, topic } = req.body
  try {
    const response = await messaging.subscribeToTopic([tokens], topic)
    res.status(200).json({ message: response })
  } catch (err) {
    res.status(200).json({ message: err.stack })
  }
}
export const unsubscribe = async (req, res) => {
  const { tokens, topic } = req.body
  try {
    const response = await messaging.unsubscribeFromTopic([tokens], topic)
    res.status(200).json({ message: response })
  } catch (err) {
    res.status(200).json({ message: err.stack })
  }
}
*/
