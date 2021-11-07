import { messaging } from './firebaseInit'
import axios from 'axios'
import { isEmpty, logger } from './utils/helpers'

export const sendSupportNotification = (message) => {
  // Send a message to the device corresponding to the provided
  // registration token.
  messaging
    .sendMulticast(message)
    .then(response => {
      // console.log(`Notifications sent: ${successes} successful, ${failures} failed`)
      // Response is an object of the form { responses: [] }
      const successes = response.responses.filter(r => r.success === true)
        .length
      const failures = response.responses.filter(r => r.success === false)
        .length
       return `Notifications sent: ${successes} successful, ${failures} failed`
    })
    .catch(error => {
      axios.post(`https://api.tmnmedia.com.ng/api2/v2/site/send-message`, {
        message: `Error sending multi-message: : ${error}`
      })
       logger(error, '/var/www/robot/web/reports/server/fcm.txt')
    })
}

export const sendSignalNotification = (message) => {
  messaging
    .send(message)
    .then(async response => {
       return response
    })
    .catch( error => {
      axios.post(`https://api.tmnmedia.com.ng/api2/v2/site/send-message`, {
          message: `Error sending message: : ${error}`
        })
       logger(error, '/var/www/robot/web/reports/server/fcm.txt')
    })
}

export const sendSignalMulticast = (message) => {
 if (isEmpty(message.tokens)) {
  return 'empty tokens'
 }
  // Send a message to the device corresponding to the provided
  // registration token.
  messaging
    .sendMulticast(message)
    .then(response => {
      // console.log(`Notifications sent: ${successes} successful, ${failures} failed`)
      // Response is an object of the form { responses: [] }
      const successes = response.responses.filter(r => r.success === true)
        .length
      const failures = response.responses.filter(r => r.success === false)
        .length
       return `Notifications sent: ${successes} successful, ${failures} failed`
    })
    .catch(error => {
      axios.post(`https://api.tmnmedia.com.ng/api2/v2/site/send-message`, {
          message: `Error sending multi-message: : ${error}`
        })
       logger(error, '/var/www/robot/web/reports/server/fcm.txt')
    })
}
