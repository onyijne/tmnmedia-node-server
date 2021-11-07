import axios from 'axios'
const WebSocket = require('ws');
import Model from './models/model'
import Store from './store'
import { topicMap, indexData, isEmpty, logger } from './utils/helpers'

const sock = new WebSocket.Server({ clientTracking: false, noServer: true }) 

class WebsocketServer {
  constructor() {
    this.store = Store 
    this.wss = sock
  }

  run() {
    this.wss.on('connection', this.connected)
  }

  connected(ws, request) {
    ws.on('message', this.incoming)
    ws.send('something')
  }

  incoming(message) {
    console.log('received: %s', message);
  }
}

export const upgrade = (server) => {
    server.on('upgrade', (request, socket, head) => {
      sock.handleUpgrade(request, socket, head, (ws) => {
          sock.emit('connection', ws, request)
        })
    })
  }

export default WebsocketServer
