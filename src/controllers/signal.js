// import Model from '../models/model'
import { messaging } from '../firebaseInit'
import { sendSignalNotification } from '../notify'

export const alert = async (req, res) => {
  const { message } = req.body
  try {
    // const tokens = []
    // const strArray = data.split("|")
    const resp = sendSignalNotification(message)
    res.status(200).json({ response: resp })
  } catch (err) {
    res.status(200).json({ message: err.stack })
  }
}

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
