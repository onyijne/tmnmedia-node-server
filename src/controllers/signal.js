import fs from 'fs'
import { sendSignalMulticast } from '../notify'
import { messaging } from '../firebaseInit'
import { isEmpty, logger } from '../utils/helpers'

/*fs.writeFile('/var/www/robot/web/reports/server/signal.txt', 'ok', function (err) {
      // if (err) throw err;
    })*/

export const sendNotification = async (req, res) => {
  const { message } = req.body
  try {
    let response = ''
    if (!isEmpty(message.tokens)) {
      response = sendSignalMulticast(message)
    }
    res.status(200).json({ response: response })
  } catch (err) {
    logger(`${new Date()}: ${err.stack}`, '/var/www/robot/web/reports/server/signal.txt')
    res.status(200).json({ message: err.message})
  }
}

export const testApp = (req, res) => {
  try {
    res.status(200).json({ status: 'online' })
  } catch (err) {
    logger(`${new Date()}: ${err.stack}`, '/var/www/robot/web/reports/server/test.txt')
    res.status(200).json({ message: err.message})
  }
}

/*

export const subscribe = async (req, res) => {
  const { tokens, topic } = req.body
  try {
    const response = await messaging.subscribeToTopic([tokens], topic)
    res.status(200).json({ message: response })
  } catch (err) {
    res.status(200).json({ message: err.message})
  }
}
export const unsubscribe = async (req, res) => {
  const { tokens, topic } = req.body
  try {
    const response = await messaging.unsubscribeFromTopic([tokens], topic)
    res.status(200).json({ message: response })
  } catch (err) {
    res.status(200).json({ message: err.message})
  }
}
*/
