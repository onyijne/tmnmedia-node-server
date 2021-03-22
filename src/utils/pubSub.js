
/* eslint-disable no-prototype-builtins */
export default class PubSub {
  constructor () {
    this.events = {}
  }

  async subscribe (event, callback) {
    const self = this
    if (!self.events.hasOwnProperty(event)) {
      self.events[event] = []
    }
    return self.events[event].push(callback)
  }

  async publish (event, data = {}) {
    const self = this
    if (!self.events.hasOwnProperty(event)) {
      return []
    }
    return self.events[event].map(callback => callback(data))
  }

  async unSubscribe (event) {
    if (this.events.hasOwnProperty(event)) {
      delete this.events[event]
    }
  }
}