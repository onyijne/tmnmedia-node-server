

export function publishSignal (socket, data) {
	socket.broadcast.emit('signal', data)
}

export function createRoom (socket, data) {
  
}