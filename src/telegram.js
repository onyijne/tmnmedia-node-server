import { Telegraf } from 'telegraf'
const fs = require('fs')
import Store from './store/telegram'
import BotUser from './bot-user'
import { isEmpty, logger } from './utils/helpers'

class Telegram {
  constructor() {
    const token = process.env.BOT_TOKEN
    if (token === undefined) {
      throw new Error('BOT_TOKEN must be provided!')
    }
    this.identity = {}
    this.logFileTxt = '/var/www/robot/web/reports/telegram.txt'
    this.logFileJson = '/var/www/robot/web/reports/telegram.json'
    this.params = []
    this.store = Store
    this.bot = new Telegraf(token)
    this.secretPath = `/telegraf/${token}`
    // Set telegram webhook
    this.webhookUrl = `https://socket.tmnmedia.com.ng/v2/robot${this.secretPath}`
    this.registerCommands()
    this.bot.telegram.setWebhook(this.webhookUrl)
  }

  registerCommands() {
    this.bot.telegram.setMyCommands([
      {
        command: 'start',
        description: 'start the bot, clears current task if any.'
      },
      {
        command: 'help',
        description: 'display help messages'
      },
      {
        command: 'login',
        description: 'access your account on TMNmedia'
      },
      {
        command: 'logout',
        description: 'logout from TMNmedia'
      },
      {
        command: 'robots',
        description: 'List active robots (Admin)'
      },
      {
        command: 'trade',
        description: 'Send a trade request (Admin)'
      }
    ])
  	this.updates()
  }

  async updates () {
    const rob = this
    rob.store.subscribe('botMessaged', async (message) => {
        const { from, chat, text } = message
        try {
          await rob.setIdentity(from)
          const re = /\s/
          rob.params = (text) ? text.split(re) : []
          switch(rob.params[0]) {
            case '/start':
              await rob.handleStart(chat)
              break;
            case '/help':
              await rob.handleHelp(chat)
              break;
            case '/login':
              await rob.handleLogin(chat)
              break;
            case '/logout':
              await rob.handleLogout(chat)
              break;
            case '/confirm':
              await rob.handleConfirm(chat)
              break;
            case '/robots':
              await rob.handleListRobots(chat)
              break;
            case '/trade':
              await rob.handleTrade(chat)
              break;
            case '/deriv':
              await rob.handleDeriv(chat)
              break;
            case '/app':
              await rob.handleApp(chat)
              break;
            case '/server':
              await rob.handleServer(chat)
              break;
            default:
              await rob.handle(chat)
              break;
          }
        } catch(err){
          logger(err.message, this.logFileTxt)
        }
      })
  }

  async validateInput(value, type) {
    if (value === null || value === '') {
      return false
    }
    let re = false
    switch (type) {
      case 'email':
        re = this.validateEmail(this.params[0])
        break;
      case 'string':
        re = (typeof value === 'string') && value.length > 0
        break;
      case 'number':
        re = (typeof value === 'number')
        break;
      default:
        break;
    }
    return re
  }

  validateEmail(email) {
    /** eslint-disable-no-useless-escape */
    const re = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
    return re.test(String(email).toLowerCase())
  }

  async setIdentity(user) {
    this.identity = this.store.getters.botUser(user.id)
    if (this.identity === undefined) {
      this.identity = new BotUser({
        user,
        api_url: this.store.getters.apiUrl,
        chat_id: user.id
      })
      this.store.commit('telegram/addBotUser', this.identity)
    }
    return this.identity
  }

  async handle(chat) {
    const rob = this.identity
    const isActive = await rob.isActive(this.store)
    if (rob.task === 'trade') {
      if (!isActive) {
        return this.bot.telegram.sendMessage(chat.id, `Your session is inactive /login to continue.`)
      }
      const validToken = await this.validateInput(Number(this.params[0]), 'number')
      if (!validToken) {
        return this.bot.telegram.sendMessage(chat.id, 'Kindly enter a valid <b>ID</b>', {parse_mode: 'HTML'})
      }
      const response = await rob.trade(this.params[0], this.store)
      return this.bot.telegram.sendMessage(chat.id, response, {parse_mode: 'HTML'})
    }
  	if (rob.task === 'login-token') {
      if (isActive) {
        return this.bot.telegram.sendMessage(chat.id, `You are already logged-in`)
      }
      const validEmail = await this.validateInput(this.params[0], 'email')
      if (!validEmail) {
        return this.bot.telegram.sendMessage(chat.id, 'Kindly enter a valid email address')
      }
      const response = await rob.auth(this.params[0], this.store)
      return this.bot.telegram.sendMessage(chat.id, response, {parse_mode: 'HTML'})
    }
    if (rob.task === 'login') {
      if (isActive) {
        return this.bot.telegram.sendMessage(chat.id, `You are already logged-in`)
      }
      const validToken = await this.validateInput(this.params[0], 'string')
      if (!validToken) {
        return this.bot.telegram.sendMessage(chat.id, 'Kindly enter your token')
      }
      const response = await rob.login(this.params[0], this.store)
      return this.bot.telegram.sendMessage(chat.id, response, {parse_mode: 'HTML'})
    }
    
    this.bot.telegram.sendMessage(chat.id, '<b>Unknown command sent</b>', {parse_mode: 'HTML'})
  }

   async handleStart(chat) {
   	try {
      const rob = this.identity
      rob.task = ''
      this.store.commit('telegram/addBotUser', rob)
       // const message = `Hello ${chat.username}, kindly enter /login email-address to login`
      let msg = ''
      if (await rob.isActive(this.store)) {
        msg = `Hello <b>${chat.first_name}</b>, ${rob.message}`
      } else {
        msg = `Hello <b>${chat.first_name}</b>, welcome to TMNmedia Bot. Please /login to continue.`
      }
  	  this.bot.telegram.sendMessage(chat.id, msg , {parse_mode: 'HTML'})
     } catch (error) {
       logger(err.message, this.logFileTxt)
     }
  }

  async handleHelp(chat) {
    const rob = this.identity
    const help = `Hello <b>${chat.first_name}</b>, welcome to <a href="https://tmnmedia.com.ng/app">TMNmedia</a> Bot.
  Use the follwoing commands to interact with this bot.
  /help display this help screen
  /start initialize the bot, clears current task if any.
  /app to show the current active app (default is TEST).
    type <code>/app live</code> to switch to live app
    Switching between live/test account will require you login again
  /login link to your account
  /logout unlink from your account
  /robots load and list current active trade robots, 
    type <code>/robots extension</code> for only extension robots
  /trade execute a trade, 
    type <code>/trade email-address</code> to execute for just that account. Use comma to separate more than one email`
  	this.bot.telegram.sendMessage(chat.id, help, {parse_mode: 'HTML'})
  }

  async handleLogin(chat) {
    const rob = this.identity
    const isActive = await rob.isActive(this.store)
    if (isActive) {
      return this.bot.telegram.sendMessage(chat.id, `You are already logged-in`)
    }
    rob.task = 'login-token'
    this.store.commit('telegram/addBotUser', rob)
  	this.bot.telegram.sendMessage(chat.id, `Enter your email address`)
  }

  async handleLogout(chat) {
    const rob = this.identity
    const isActive = await rob.isActive(this.store)
    if (!isActive) {
      return this.bot.telegram.sendMessage(chat.id, `You are not currently logged-in`)
    }
    rob.task = 'logout'
    this.store.commit('telegram/addBotUser', rob)
  	return this.bot.telegram.sendMessage(chat.id, 'To confirm this reply with /confirm', {parse_mode: 'HTML'})
  }

  async handleConfirm(chat) {
    const rob = this.identity
    const isActive = await rob.isActive(this.store)
    if (rob.task === 'deriv') {
      if (!isActive) {
        return this.bot.telegram.sendMessage(chat.id, `Your session is inactive /login to continue.`)
      }
      const response = await rob.deriv(this.store)
      return this.bot.telegram.sendMessage(chat.id, response, {parse_mode: 'HTML'})
    }
    if (rob.task === 'logout') {
      if (!isActive) {
        return this.bot.telegram.sendMessage(chat.id, `You are not currently logged-in`)
      }
      rob.task = 'logout'
      const loggedOut = await rob.logout(this.store)
      return this.bot.telegram.sendMessage(chat.id, loggedOut)
    }
    
  }

  async handleAddRobot(chat) {
    const rob = this.identity
    const isActive = await rob.isActive(this.store)
    if (!isActive) {
      return this.bot.telegram.sendMessage(chat.id, `You are not currently logged-in`)
    }
  	this.bot.telegram.sendMessage(chat.id, `<b>COMING SOON</b>`, {parse_mode: 'HTML'})
  }

  async handleListRobots(chat) {
    const rob = this.identity
    const isActive = await rob.isActive(this.store)
    if (!isActive) {
      return this.bot.telegram.sendMessage(chat.id, `You are not currently logged-in`)
    }
    const platform_to_trade = this.params[1] || ''
    let response = ''
    if (!rob.user.permissions.includes('bot')) {
      response = 'You are not allowed to perform this action'
    } else {
      const account_to_trade = this.params[1] || ''
      response = await rob.listRobots(this.store, platform_to_trade)
    }
  	this.bot.telegram.sendMessage(chat.id, response, {parse_mode: 'HTML'})
  }

  async handleTrade(chat) {
    const rob = this.identity
    const isActive = await rob.isActive(this.store)
    if (!isActive) {
      return this.bot.telegram.sendMessage(chat.id, `You are not currently logged-in`)
    }
    let response = ''
    if (!rob.user.permissions.includes('bot')) {
      response = 'You are not allowed to perform this action'
    } else {
      const account_to_trade = this.params[1] || ''
      response = await rob.preTrade(this.store, account_to_trade)
    }
  	this.bot.telegram.sendMessage(chat.id, response, {parse_mode: 'HTML'})
  }

  async handleDeriv(chat) {
    const rob = this.identity
    const isActive = await rob.isActive(this.store)
    if (!isActive) {
      return this.bot.telegram.sendMessage(chat.id, `You are not currently logged-in`)
    }
    let response = ''
    if (!rob.user.permissions.includes('bot') || !rob.user.permissions.includes('manage')) {
      response = 'You are not allowed to perform this action'
    } else {
      const email = this.params[1] || ''
      response = await rob.preDeriv(this.store, email)
    }
    this.bot.telegram.sendMessage(chat.id, response, {parse_mode: 'HTML'})
  }

  async handleApp(chat) {
    const rob = this.identity
    const app = this.params[1] || ''
     const response = await rob.toggleApp(this.store, app)
  	this.bot.telegram.sendMessage(chat.id, response, {parse_mode: 'HTML'})
  }

  async handleServer(chat) {
    const rob = this.identity
    const isActive = await rob.isActive(this.store)
    if (!isActive) {
      return this.bot.telegram.sendMessage(chat.id, `You are not currently logged-in`)
    }
    
    let response = ''
    if (!rob.user.permissions.includes('manage')) {
      response = 'You are not allowed to perform this action'
    } else {
      const server = this.params[1] || ''
      response = await rob.serverRefresh(server)
    }
    this.bot.telegram.sendMessage(chat.id, response, {parse_mode: 'HTML'})
  }
}

export default Telegram
