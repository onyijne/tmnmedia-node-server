#!/usr/bin/env node
/**
 * Module dependencies.
 */
// const debug = require('debug')('quick-credit:server')
// const fs = require('fs')
// import debug from 'debug'
import http from 'http'
import app from '../app-signal'
import socket from '../socket'


 /* const sslOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/tmnmedia.com.ng/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/tmnmedia.com.ng/fullchain.pem'),
  dhparam: fs.readFileSync("/var/www/socket/dh.pem"),
  requestCert: true,
  rejectUnauthorized: false
} */
/**
 * Normalize a port into a number, string, or false.
 */
const normalizePort = val => {
  const port = parseInt(val, 10)
  if (Number.isNaN(port)) {
    // named pipe
    return val
  }
  if (port >= 0) {
    // port number
    return port
  }
  return false
}

/**
 * Get port from environment and store in Express.
 */
const port = normalizePort(process.env.SIGNAL_PORT || '2021')
app.set('port', port)
/**
 * Create HTTP server.
 */
const server = http.createServer(app)

socket(server)

/**
 * Event listener for HTTP server "error" event.
 */
const onError = error => {
  if (error.syscall !== 'listen') {
    throw error
  }
  const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`
  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.log(`${bind} requires elevated privileges`)
      process.exit(1)
      break
    case 'EADDRINUSE':
      console.log(`${bind} is already in use`)
      process.exit(1)
      break
    default:
      throw error
  }
}
/**
 * Event listener for HTTP server "listening" event.
 */
const onListening = () => {
  const addr = server.address()
  const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`
  const date = new Date()
  console.log(`Listening on ${bind} at ${date}`)
}
/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port)
server.on('error', onError)
server.on('listening', onListening)
