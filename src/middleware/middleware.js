import axios from 'axios'
import { sendSignalNotification } from '../notify'
import Model from '../models/model'
import { topicMap } from '../utils/helpers'

export const modifyMessage = (req, res, next) => {
  req.body.message = `SAYS: ${req.body.message}`;
  next();
};

export const authBot = (req, res, next) => {
  req.body.settings = 1608124132
  next();
};

export const prepareSub = (req, res, next) => {
  req.body.settings.today = 1608124132
  next();
};

export const emitSignal = async (req, res, next) => {
  try {
    const { signal, settings } = req.body
    function onError(err){
      console.log(err)
    }
    
    if (settings.public_signal == signal.type) {
      const topic = await topicMap(signal.name)
      const regex = /\//gi
      const event = topic.replace(regex, '')
      const io = require('socket.io-emitter')({ host: '127.0.0.1', port: 6379 })
      io.redis.on('error', onError)
      io.emit(event, signal)
    }

    next()
  } catch (err) {
    next(err)
  }
};

export const notification = async (req, res, next) => {
  const { signal } = req.body
  const topic = await topicMap(signal.name)
  const message = {
      notification: {
        title: 'Indicator',
        body: signal.name,
      },
      topic: topic,
      data: { "id": `${signal.id}` },
      android: {
        notification: {
          click_action: 'FCM_PLUGIN_ACTIVITY'
        }
      }
    }
  sendSignalNotification(message)
  next();
};
