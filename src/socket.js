import Model from './models/model'
import { topicMap, indexData, isEmpty, logger } from './utils/helpers'
import axios from 'axios'

const saveMessage = (data, action) => {
  try {
    axios.post(`https://api.tmnmedia.com.ng/v2/site/${action}`, data, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic fallback`
      }
    })
  } catch (err) {
    logger(err.stack)
  }
}

const closeMessage = (data) => {
  try {
    axios.post(`https://api.tmnmedia.com.ng/v2/site/close-support`, data, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic fallback`
      }
    })
  } catch (err) {
    logger(err.stack)
  }
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

const publishSignal = (socket, dat, event) => {
  try {
    if (typeof(dat) !== 'string') return socket.broadcast.emit(event, dat)
    const data = JSON.parse(dat)
    if (Array.isArray(data.trade_robots)) {
      data.trade_robots.forEach(robot => {
        const ev = `${event}${robot.amount}`
        socket.broadcast.emit(ev, {
          robot: robot,
          options: data.trade_options,
          settings: data.settings
        })
      })
    } else {
      socket.broadcast.emit(event, dat)
    }
    // if (process.env.NODE_ENV !== 'production') console.log(console.log(event))
  } catch (error) {
    logger(error.message)
  }
}

const createRoom = (io, socket, data) => {
  try {
    socket.join(data.room)
    socket.broadcast.emit('supportWaiting', data)
  } catch (err) {
    logger(err.message)
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

const joinRoom = (io, socket, data) => {
  socket.join(data.room)
  io.sockets.to(data.room).emit('userJoined', data)
}

const sendMessageToUser = (io, socket, data) => {
  /*const { time, sender, message, support_id } = data
  const chat = {
    message: message,
    sender: sender,
    time: time
  }
  // await updateChat(chat, support_id)*/
  io.sockets.to(data.room).emit('messageRecieved', data)
  //saveMessage(data, 'admin-support')
}

const sendMessageToAdmin = (io, socket, data) => {
  /*const { time, sender, message, support_id } = data
  const chat = {
    message: message,
    sender: sender,
    time: time
  }*/
  // await updateChat(chat, support_id)
  io.sockets.to(data.room).emit('messageRecievedAdmin', data)
  //saveMessage(data, 'user-support')
}

const leaveRoom = (io, socket, data) => {
  socket.leave(data.room)
  if (data.isAdmin === true) return
  
  io.sockets.to(data.room).emit('userLeft', data.sender)
  socket.broadcast.emit('supportClose', data)
  //closeMessage(data)
}

const closeConversation = (io, socket, data) => {
  socket.leave(data.room)  
  io.sockets.to(data.room).emit('admimCloseSupport', data)
  socket.broadcast.emit('supportClose', data) // for other admins to get
}

const publishLogin = (socket, data) => {
  if (data.username) {
    const regex = '.'
    const event = data.username.replace(regex, '')
    socket.broadcast.emit(event, data)
  }
  if (data.login_token) {
    socket.broadcast.emit(data.login_event, data)
  }
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
      const traderEvent = name[0].replace(/ /gi, '').toLowerCase()
     // if (process.env.NODE_ENV !== 'production') console.log(console.log(`${traderEvent}webt`))  
      socket.on(event, data => publishSignal(socket, data, event))
      socket.on(`${event}ext`, data => publishSignal(socket, data, `${event}ext`))
      socket.on(`test${event}`, data => publishSignal(socket, data, `test${event}`))
      socket.on(`test${event}ext`, data => publishSignal(socket, data, `test${event}ext`))
      socket.on(`${traderEvent}webt`, data => publishSignal(socket, data, `${traderEvent}webt`))
      socket.on(`${traderEvent}extt`, data => publishSignal(socket, data, `${traderEvent}extt`))
    })
    //socket.on('alert', data => publishSignal(socket, data, 'signalv1')) // deprected, remove in next release
    socket.on('init-support', data => createRoom(io, socket, data))
    socket.on('leave-support', data => leaveRoom(io, socket, data))
    socket.on('join-support', data => joinRoom(io, socket, data))
    socket.on('send-message', data => sendMessageToAdmin(io, socket, data))
    socket.on('send-message-admin', data => sendMessageToUser(io, socket, data))
    socket.on('get-supports', data => getSavedMessages(socket, data))
    socket.on('leave-conversation', data => closeConversation(socket, data)) // init by admin
    socket.on('new_login', data => publishLogin(socket, data))
    socket.on('resetwebt', data => socket.broadcast.emit('resetwebt', data))
    socket.on("disconnect", () => {
      // console.log("Client disconnected")
    })
  })
}

export default socket
