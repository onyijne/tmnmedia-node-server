import Model from './model'
import { sendSignalNotification } from '../notify'

  async function joinRoom () {
    const messagesModel = new Model('messages')
    messagesModel.select('id', ' WHERE `support_id` = "'+data.support_id+'" AND `status` != "closed"')
      .then(query => {
        messagesModel.pool.query(query, async (error, results, fields) => {
          if (error) {
            console.warn(error)
            return
          }
          if (!isEmpty(results)) {
            const columnsToValues = `\`status\`= "active", \`data\` = '${JSON.stringify(data)}'`
            const clause = ' WHERE `id` = "'+results[0].id+'"'
            await messagesModel.update(columnsToValues, clause)
          }
      })
    })
  }

  async function leaveRoom () {
    const messagesModel = new Model('messages')
	  const columnsToValues = '`status` = "closed"'
	  const clause = ' WHERE `status` != "closed" AND `support_id` = "'+data.support_id+'"'
	  await messagesModel.update(columnsToValues, clause)
  }

  async function createChat () {
    const messagesModel = new Model('messages')
    messagesModel.select('*', ' WHERE `user_id` = "'+data.creator.id+'" AND `status` != "closed"')
    .then(query => {
      messagesModel.pool.query(query, async (error, results, fields) => {
        if (error) {
          console.warn(error)
          return
        }
        if (isEmpty(results)) {
          const columns = 'support_id, user_id, data, status'
          const values = `'${support_id}', '${data.creator.id}', '${JSON.stringify(data)}', 'pending'`
          await  messagesModel.insert(columns, values)
          
        } else {
          const support = JSON.parse(results[0].data)
          const chat = {
            message,
            sender,
            time
          }
          support.chats.push(chat)
          const columnsToValues = `\`data\` = '${JSON.stringify(support)}'`
          const clause = ' WHERE `id` = "'+results[0].id+'"'
          await messagesModel.update(columnsToValues, clause)
        }
      })
    })
  }

  async function notify () {
    const userModel = new Model('user')

    const { message, room, support_id, time, sender } = data
    //const rec = await messagesModel.insertWithReturn(columns, values)
    const emails = `("onasogafaith@gmail.com", "samuelonyijne@gmail.com")`
    userModel.select('fcm_token', ' WHERE `email` IN '+emails)
    .then(query => {
      userModel.pool.query(query, (error, results, fields) => {
        if (error) {
          console.warn(error)
          return
        }
        if (!isEmpty(results)) {
          let registrationTokens = ''
          results.forEach((result , idx)=> {
            if (idx === 0) {
              registrationTokens += `"${result.fcm_token}"`
            } else {
              registrationTokens += `, "${result.fcm_token}"`
            }
          })
          const fcm = {
            notification: {
              title: 'New message',
              body: message,
            },
            tokens: [registrationTokens],
            android: {
              notification: {
                click_action: 'FCM_PLUGIN_ACTIVITY'
              }
            }
          }
        sendSupportNotification(fcm)
        }
      })
    })
  }