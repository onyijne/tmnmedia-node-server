import { messaging } from './firebaseInit'
import axios from 'axios'

const isEmpty = (value) => {
  // eslint-disable-next-line valid-typeof
  if (typeof (value) === 'array') return value.length === 0
  return !value || Object.keys(value).length === 0
}

export const sendSupportNotification = (message) => {
  // Send a message to the device corresponding to the provided
  // registration token.
  messaging
    .sendMulticast(message)
    .then(response => {
      // console.log(`Notifications sent: ${successes} successful, ${failures} failed`)
      // Response is an object of the form { responses: [] }
      /* const successes = response.responses.filter(r => r.success === true)
        .length
      const failures = response.responses.filter(r => r.success === false)
        .length

       axios.post(`https://api.tmnmedia.com.ng/v1/site/send-message`, {
          message: `Notifications sent: ${successes} successful, ${failures} failed`
        }) */
       return response
    })
    .catch(error => {
      axios.post(`https://api.tmnmedia.com.ng/v1/site/send-message`, {
          message: `Error sending multi-message: : ${error}`
        })
       return error
    })
}

export const sendSignalNotification = (message) => {
  messaging
    .send(message)
    .then(async response => {
       return response
    })
    .catch( error => {
      axios.post(`https://api.tmnmedia.com.ng/v1/site/send-message`, {
          message: `Error sending message: : ${error}`
        })
       return error
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
      /* const successes = response.responses.filter(r => r.success === true)
        .length
      const failures = response.responses.filter(r => r.success === false)
        .length

       axios.post(`https://api.tmnmedia.com.ng/v1/site/send-message`, {
          message: `Notifications sent: ${successes} successful, ${failures} failed`
        }) */
       return response
    })
    .catch(error => {
      axios.post(`https://api.tmnmedia.com.ng/v1/site/send-message`, {
          message: `Error sending multi-message: : ${error}`
        })
       return error
    })
}
