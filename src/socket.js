import Model from './models/model'
import { topicMap, indexData, isEmpty, logger } from './utils/helpers'
import axios from 'axios'

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

const publishSignal = (socket, data, event) => {
  socket.broadcast.emit(event, data)
}

const createRoom = async (io, socket, data) => {
  try {
    socket.join(data.room)
    socket.broadcast.emit('supportWaiting', data)
    /*await axios.post(`https://api.tmnmedia.com.ng/v1/site/support`, data, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic  fallback`
      }
    })*/
  } catch (err) {
    await logger(err.stack, '/var/www/app/web/reports/logs.json')
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
    message: message,
    sender: sender,
    time: time
  }
  // await updateChat(chat, support_id)
  io.sockets.to(data.room).emit('messageRecieved', data)
}

const sendMessageToAdmin = async (io, socket, data) => {
  const { time, sender, message, support_id } = data
  const chat = {
    message: message,
    sender: sender,
    time: time
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
    const regex = /\//gi
    indexData.forEach(ele => {
      const name = ele.split('=')
      const event = name[1].replace(regex, '')
      socket.on(event, data => publishSignal(socket, data, event))
    })
    socket.on('alert', data => publishSignal(socket, data, 'signalv1')) // deprecte in next release
    socket.on('init-support', data => createRoom(io, socket, data))
    socket.on('leave-support', data => leaveRoom(io, socket, data))
    socket.on('join-support', data => joinRoom(io, socket, data))
    socket.on('send-message', data => sendMessageToAdmin(io, socket, data))
    socket.on('send-message-admin', data => sendMessageToUser(io, socket, data))
    socket.on('get-supports', data => getSavedMessages(socket, data))
    socket.on('leave-conversation', data => closeConversation(io, socket, data)) // init by admin
    socket.on("disconnect", () => {
      // console.log("Client disconnected")
    })
  })
}

export default socket
