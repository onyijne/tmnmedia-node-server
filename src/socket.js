import Model from './models/model'
import { sendSignalNotification } from './notify'

const isEmpty = (value) => {
  // eslint-disable-next-line valid-typeof
  if (typeof (value) === 'array') return value.length === 0
  return !value || Object.keys(value).length === 0
}

const signalData = [
  'Volatility 10 Index=/topics/10v1',
  'Volatility 25 Index=/topics/25v1',
  'Volatility 50 Index=/topics/50v1',
  'Volatility 75 Index=/topics/75v1',
  'Volatility 100 Index=/topics/100v1',
  'Volatility 10 (1s) Index=/topics/10sv1',
  'Volatility 25 (1s) Index=/topics/25sv1',
  'Volatility 50 (1s) Index=/topics/50sv1',
  'Volatility 75 (1s) Index=/topics/75sv1',
  'Volatility 100 (1s) Index=/topics/100sv1'
]

const topicMap = async (indexName) => {
  let topic   
  signalData.forEach(ele => {
    const name = ele.split('=')
    if (name[0] === indexName) {
      topic = name[1]
    }
  })
  return topic
}

const updateChat = async (chat, support_id) => {
  const messagesModel = new Model('messages')
  messagesModel.select('*', ' WHERE `support_id` = "'+support_id+'" AND `status` != "closed"')
    .then(query => {
      messagesModel.pool.query(query, (error, results, fields) => {
        if (error) {
          console.warn(error)
          return
        }
        if (!isEmpty(results)) {
          const support = JSON.parse(results[0].data)
          support.chats.push(chat)
          const columnsToValues = `\`data\` = '${JSON.stringify(support)}'`
          const clause = ' WHERE `id` = "'+results[0].id+'"'
          messagesModel.update(columnsToValues, clause)
        }
    })
  })
}

const publishSignal = (socket, data, signalVersion) => {
  // sendNotification(data)
  socket.broadcast.emit(signalVersion, data)
}

const sendNotification = async (signal) => {
  try {
    const topic = await topicMap(signal.name)
    const fcm = {
      notification: {
        title: signal.name,
        body: signal.type,
      },
      topic: topic,
      data: { "id": `${signal.id}` },
      android: {
        notification: {
          click_action: 'FCM_PLUGIN_ACTIVITY'
        }
      }
    }
    sendSignalNotification(fcm)
  } catch (err) {
    console.log(err)
  }
}

const createRoom = async (io, socket, data) => {
  try {
    /* const fcm = {
            notification: {
              title: 'New message',
              body: data.message,
            },
            topic: '/topics/support',
            android: {
              notification: {
                click_action: 'FCM_PLUGIN_ACTIVITY'
              }
            }
          }
    /sendSignalNotification(fcm) */

    socket.join(data.room)
    socket.broadcast.emit('supportWaiting', data)
  } catch (err) {
    console.warn(err)
  }
}

const getSavedMessages = (socket, data) => {
  const messagesModel = new Model('messages')
  messagesModel.select('*', ' WHERE `status` != "closed"')
    .then(query => {
      messagesModel.pool.query(query, (error, results, fields) => {
        if (error) {
          console.warn(error)
          return
        }
        if (!isEmpty(results)) {
          let supports = []
          results.forEach(result => {
            const support = JSON.parse(result.data)
            supports.push(support)
         })
          socket.emit('supports', supports)
        }
    })
  })
}

const joinRoom = async (io, socket, data) => {
  
  socket.join(data.room)
  io.sockets.to(data.room).emit('userJoined', data)
}

const sendMessageToUser = async (io, socket, data) => {
  const { time, sender, message, support_id } = data
  const chat = {
    message,
    sender,
    time
  }
  // await updateChat(chat, support_id)
  io.sockets.to(data.room).emit('messageRecieved', data)
}

const sendMessageToAdmin = async (io, socket, data) => {
  const { time, sender, message, support_id } = data
  const chat = {
    message,
    sender,
    time
  }
  // await updateChat(chat, support_id)
  io.sockets.to(data.room).emit('messageRecievedAdmin', data)
}

const leaveRoom = async (io, socket, data) => {
  socket.leave(data.room)
  if (['onasogafaith@gmail.com', 'samuelonyijne@gmail.com'].includes(data.sender)) return
  
  io.sockets.to(data.room).emit('userLeft', data.sender)
  socket.broadcast.emit('supportClose', data)
}

const closeConversation = async (io, socket, data) => {
  socket.leave(data.room)  
  io.sockets.to(data.room).emit('admimCloseSupport', data)
  socket.broadcast.emit('supportClose', data)
}

const socket = (server) => {
  const io = require("socket.io")(server, {
    cookie: false,
    handlePreflightRequest: (req, res) => {
      const headers = {
          "Access-Control-Allow-Headers": "Content-Type, Authorization, x-requested-with",
          "Access-Control-Allow-Origin": req.headers.origin, //or the specific origin you want to give access to,
          "Access-Control-Allow-Credentials": true
      }
      res.writeHead(200, headers)
      res.end()
    }
  })

  io.on("connection", (socket) => {
    // console.log("New client connected")
    signalData.forEach(ele => {
      const name = ele.split('=')
      socket.on(name[1], data => publishSignal(socket, data, name[1]))
    })
    socket.on('alert', data => publishSignal(socket, data, 'signalv1'))
    socket.on('init-support', data => createRoom(io, socket, data))
    socket.on('leave-support', data => leaveRoom(io, socket, data))
    socket.on('join-support', data => joinRoom(io, socket, data))
    socket.on('send-message', data => sendMessageToAdmin(io, socket, data))
    socket.on('send-message-admin', data => sendMessageToUser(io, socket, data))
    socket.on('get-supports', data => getSavedMessages(socket, data))
    socket.on('leave-conversation', data => closeConversation(io, socket, data))
    socket.on("disconnect", () => {
      // console.log("Client disconnected")
    })
  })
}

export default socket
