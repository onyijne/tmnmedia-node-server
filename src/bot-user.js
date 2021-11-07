import axios from 'axios'
import { exec } from 'child_process'
import SocketIO from 'socket.io-client'
import { isEmpty, logger } from './utils/helpers'

class BotUser {
  constructor(param) {
    //this.store = Store
    this.created_at = Date.now()
    this.chat_id = param.chat_id
    this.connected = false
    this.user = param.user
    this.api_url = `${param.api_url}/api2/v2`
    this.settings = param.settings || {}
    this.logFileTxt = '/var/www/robot/web/reports/server/telegram.txt'
    this.logFileJson = '/var/www/robot/web/reports/server/telegram.json'
    this.loaded = false
    this.task = null
    this.form = {
      app: 'test'
    }
    this.message = param.message || '/login to start'
    this.timeOutId = null
    this.tradeClients = {}
    this.tradingData = {}
    this.socket = ''
    this.derivClients = {}
    this.app = 'test'
  }

  async loadUser(store) {
    try {
      await this.setToken()
      this.form.bot_id = this.chat_id
      const url = `${this.api_url}/robot/load-user`
      const res = await axios.post(url, this.form)
      const data = await res.data
      if (data.status === 'success') {
        this.loaded = true
        this.connected = true
        this.user = { ...this.user, ...data.user }
        store.commit('telegram/addBotUser', this)
      }
      return
    } catch (error) {
      logger(`${new Date()}: ${error.message}`, this.logFileTxt)
    }
  }

  async isActive(store) {
    if (!this.loaded) {
      await this.loadUser(store) // should the instance restart, this will load user from DB
    }
   // console.log(this)
    if (!this.user.access_token) {
      return false
    }
    return await this.validateAccessToken(store)
  }

  async validateAccessToken(store) {
    try {
      await this.setToken()
      this.form.token = this.user.access_token
      const res = await axios.post(`${this.api_url}/robot/validate-access-token`, this.form, {
        headers: {
          authorization: `Basic ${this.user.access_token}`
        }
      })
      const data = res.data
      let re = false
      if (data.status !== 'success') {
        this.user.access_token = null
        this.connected = false
        this.tradeClients = {}
        await store.commit('telegram/addBotUser', this)
        return false;
      } else if(data.user.id != 0) {
        this.connected = true
        re = true
      } else {
        this.connected = false
        this.tradeClients = {}
      }
      this.user = { ...this.user, ...data.user }
      this.message = data.message
      await store.commit('telegram/addBotUser', this)
      return re
    } catch (error) {
      logger(`${new Date()}: ${error.message}`, this.logFileTxt)
    }
  }

  async setToken () {
    const response = await axios.get(`${this.api_url}/site/get-token`)
    this.form.csrf_token = response.data
  }

  async auth(email, store) {
    try {
      await this.setToken()
      this.form.email = email
      const res = await axios.post(`${this.api_url}/robot/auth`, this.form, {
        headers: {
          authorization: `Basic ${this.user.access_token}`
        }
      })
      const data = await res.data
      if (!data.status) {
        let msg  = data.message ? data.message : data.data
        msg = msg ? msg : ''
        return `auth was not successful: ${msg}`
      }
      
      if (data.status === 'success') {
        this.task = 'login'
        this.user.email = email
        store.commit('telegram/addBotUser', this)
        return `authenticate with the token sent to ${email}`
      }
      let msg  = data.message ? data.message : data.data
      msg = msg ? msg : ''
      return `auth was not successful: ${msg}`
    } catch (error) {
      logger(`${new Date()}: ${error.message}`, this.logFileTxt)
      return error.message
    }
  }

  async login(token, store) {
    try {
      await this.setToken()
      this.form.auth_token_bot = token
      this.form.bot_id = this.chat_id
      const res = await axios.post(`${this.api_url}/robot/login`, this.form, {
        headers: {
          authorization: `Basic ${this.user.access_token}`
        }
      })
      const data = res.data
      if (data.status !== 'success') {
        const msg  = data.message ? data.message : ''
        return `auth was not successful: ${msg}`
      }
      this.task = ''
      this.connected = true
      this.user = { ...this.user, ...data.user }
     await store.commit('telegram/addBotUser', this)
      return data.message
    } catch (error) {
      logger(`${new Date()}: ${error.message}`, this.logFileTxt)
      return error.message
    }
  }

  async logout(store) {
    try {
      await this.setToken()
      this.form.email = this.user.email
      this.form.token = null
      const res = await axios.post(`${this.api_url}/robot/logout`, this.form, {
        headers: {
          authorization: `Basic ${this.user.access_token}`
        }
      })
      const data = await res.data
      if (data.status !== 'success') {
        const msg  = data.message ? data.message : ''
        return `logout was not successful: ${msg}`
      }
      this.task = ''
      this.connected = false
      this.user = {}
      await store.commit('telegram/removeBotUser', this.chat_id)
      return data.message
    } catch (error) {
      logger(`${new Date()}: ${error.message}`, this.logFileTxt)
      return error.message
    }
  }

  async listRobots(store, platform_to_trade) {
    try {
      const url = `/robot/list-trade-robots?platform_to_trade=${platform_to_trade}&app=${this.app}`
      const res = await axios.get(`${this.api_url}${url}`, {
        headers: {
          authorization: `Basic ${this.user.access_token}`
        }
      })
      const data = await res.data
      if (data.status !== 'success') {
        const msg  = data.message ? data.message : ''
        return `request was not successful: ${msg}`
      }
      this.tradeClients = data.clients
      await store.commit('telegram/addBotUser', this)
      return data.data
    } catch (error) {
      logger(`${new Date()}: ${error.message}`, this.logFileTxt)
      return error.message
    }
  }

  async preTrade(store, account_to_trade) {
    try {
      if (isEmpty(this.tradeClients)) {
        return `Robots not loaded, load the robots with /robots 
    type <code>/robots api</code> to list trade robots for api`
      }
      let bot = this
      // bot.socket = SocketIO('https://ws.tmnmedia.com.ng')
      bot.task = 'trade'
      const url = `/robot/get-trade-accounts?account_to_trade=${account_to_trade}&app=${this.app}`
      const res = await axios.get(`${bot.api_url}${url}`, {
        headers: {
          authorization: `Basic ${bot.user.access_token}`
        }
      })
      const data = await res.data
      if (data.status !== 'success') {
        const msg  = data.message ? data.message : ''
        bot.task = ''
        // bot.socket = ''
        bot.tradingData = {}
        store.commit('telegram/addBotUser', bot)
        return `request was not successful: ${msg}`
      }
      bot.tradingData = data.tradingData
      bot.timeOutId = setTimeout(() => {
        bot.task = ''
        // bot.socket = ''
        bot.tradingData = {}
        store.commit('telegram/addBotUser', bot)
      }, 12000);
      await store.commit('telegram/addBotUser', bot)
      return `In 12 seconds reply with the robot <b>ID</b> to execute`
    } catch (error) {
      logger(`${new Date()}: ${error.message}`, this.logFileTxt)
      return error.message
    }
  }

  async trade(id, store) {
    try {
      if (this.task !== 'trade') {
        return `Initialize with /trade use <code>/trade ${this.user.email}</code> to trade on that account alone`
      }
      const robot = this.tradeClients[id]
      if (robot === undefined) {
        return `Trade robot with ID ${id} not found reload the robots with /robots 
        use <code>/robots api</code> to list trade robots for API`
      }
      const platform_to_trade = robot.platform_to_trade 
      if (platform_to_trade === undefined) {
        return `Selected trade robot does not have platform_to_trade specified. Reload the robots with /robots 
        use <code>/robots api</code> to list trade robots for API`
      }
      //delete robot.platform_to_trade
      //delete robot.id
      //delete robot.signal_type
      this.tradingData.trade_options = robot
      if (platform_to_trade.toLowerCase() === 'api') {
        const url = 'https://wss.tmnmedia.com.ng/v2/trade/trade'
        
        const res = await axios.post(url, this.tradingData, {
          headers: {
            authorization: `Basic ${this.user.access_token}`
          }
        })
        const data = await res.data
        if (data.response === 'done') {
          this.task = ''
          this.tradingData = {}
          // this.socket = ''
          store.commit('telegram/addBotUser', this)
          return 'api trade request sent'
        }
        let msg  = data.message ? data.message : data.data
        msg = msg ? msg : ''
        return `request was not successful: ${msg}`
      } else {
        // this.socket.emit('extension-trade', robot)
        this.form = { id: id, account_to_trade: 'extension', app: this.app, platform: 'bot' }
       const res = await axios.post(`${this.api_url}/robot/send-trade`, this.form, {
        headers: {
          authorization: `Basic ${this.user.access_token}`
        }
      })
      const data = await res.data
      if (data.status === 'success') {
        this.task = ''
        this.tradingData = {}
        store.commit('telegram/addBotUser', this)
        return 'extension trade request sent'
      }
      let msg  = data.message ? data.message : data.data
      msg = msg ? msg : ''
      return `request was not successful: ${msg}`
      }
      
    } catch (error) {
      logger(`${new Date()}: ${error.message}`, this.logFileTxt)
      return error.message
    }
  }

  async preDeriv(store, email)
  {
    try {
      let bot = this
      bot.form.email = email
      const url = `/robot/wake-deriv`
      const res = await axios.post(`${bot.api_url}${url}`, bot.form, {
        headers: {
          authorization: `Basic ${bot.user.access_token}`
        }
      })
      const data = await res.data
      bot.form.email = ''
      if (data.status !== 'success') {
        const msg  = data.message ? data.message : ''
        bot.task = ''
        bot.derivClients = {}
        store.commit('telegram/addBotUser', bot)
        return `request was not successful: ${msg}`
      }
      bot.task = 'deriv'
      bot.derivClients = data.derivClients
      bot.timeOutId = setTimeout(() => {
        bot.task = ''
        bot.derivClients = {}
        store.commit('telegram/addBotUser', bot)
      }, 12000);
      await store.commit('telegram/addBotUser', bot)
      return `In 12 seconds reply with /confirm`
    } catch (error) {
      logger(`${new Date()}: ${error.message}`, this.logFileTxt)
      return error.message
    }
  }

  async deriv(store) {
    try {
      await this.setToken()
      const url = 'https://wss.tmnmedia.com.ng/v2/trade/wake'
      const res = await axios.post(url, this.derivClients, {
        headers: {
          authorization: `Basic ${this.user.access_token}`
        }
      })
      const data = await res.data
      this.task = ''
      store.commit('telegram/addBotUser', this)
      let re = ''
      if (data.response !== 'done') {
        let msg  = data.message ? data.message : data.data
        msg = msg ? msg : ''
        return `not successful: ${msg}`
      }
      return data.response
    } catch (error) {
      logger(`${new Date()}: ${error.message}`, this.logFileTxt)
      return error.message
    }
  }

  async toggleApp(store, app)
  {
    if (!app) {
        return `Active App is ${this.app.toUpperCase()}`
      }
      if (app.toLowerCase() !== 'live' && app.toLowerCase() !== 'test') {
        return `Active App is ${this.app.toUpperCase()}`
      }
      this.app = app
      this.form.app = app
      store.commit('telegram/addBotUser', this)
      return `Active App now ${this.app.toUpperCase()}`
  }

  async serverRefresh(server)
  {
    if (!['trade', 'signal'].includes(server)) {
      return '<b>trade or signal</b> server not specified'
    }
    let re = 'sent'
    exec(`node /var/www/robot/ws/server-${server}`, (err, stdout, stderr) => {
      if (err) {
        // node couldn't execute the command
        re = err.message;
      } else {
        re = `done: ${stdout}`
      }
    });
    return re
  }

}

export default BotUser;
