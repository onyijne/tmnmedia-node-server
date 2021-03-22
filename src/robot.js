import WebSocket from 'isomorphic-ws'
import axios from 'axios'
var bc = require('locutus/php/bc')
import Store from './store'
import { isEmpty, logger } from './utils/helpers'

class Robot {
  constructor(param) {
    this.connected = false
    this.app_id = param.app_id || 24146
    this.ws = ''
    this.api_url = 'https://api.tmnmedia.com.ng/v1'
    this.today = param.today || Date.now()
    this.next = null
    this.user = param.user || {}
    this.settings = param.settings || {}
    this.trade_options = param.trade_options || {}
    this.timeoutId = null
    this.task = 'idle'
    this.nData = {}
    if (param.user) {
      this.req_id = `${this.user.id}${Date.now()}`
    } else {
      this.req_id = Date.now()
    }
    this.cancelRetry = 0
    this.trading = false
    this.seconds_to_cancel = 0
    this.threshold = 0
    this.store = Store
    this.init()
  }

  async connect() {
    if ([this.ws.CLOSING, this.ws.CLOSED].includes(this.ws._readyState)) {
      await this.init()
      if ([this.ws.CLOSING, this.ws.CLOSED].includes(this.ws._readyState)) {
        this.connected = false
        return this
      }
    }
    if (this.ws._readyState === this.ws.CONNECTING) {
      this.connected = false
      return this
    }
    this.connected = true
    //const id = (this.user) ? this.user.id : 0
    //await logger(`${new Date()}: (${this.task}) robot session initiated for ${id}`)
    return this
  }

  async setup(trade_options, user,  settings, today) {
    if(this.trading == true) {return this}
    this.app_id = settings.app_id || 24146
    this.today = today
    this.user = user
    this.settings = settings
    this.trade_options = trade_options
    this.seconds_to_cancel = parseFloat(trade_options.seconds_to_cancel)
    return await this.connect()
  }

  async init() {
    try {
      let timeoutId = null
      //this.timeoutId = null
      const rob = this
      rob.ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${this.app_id}`)
      //const arr = []
     // arr.push(rob)
      rob.ws.onopen = async function open() {
        rob.connected = true
        const id = (rob.user) ? rob.user.id : 0
        (id == 1) ? '' : await logger(`${new Date()}: (${rob.task}) Deriv connection started for ${id}.`)
        timeoutId = setInterval(rob.keepAlive, 20000, rob)
      }
      rob.ws.onclose = async function close() {
        rob.connected = false
         rob.trading = false
         rob.task = 'idle'
         rob.store.commit('addRobot', rob)
         const id = (rob.user) ? rob.user.id : 0
        if (timeoutId) { clearInterval(timeoutId) }
        (id == 1) ? '' : await logger(`${new Date()}: (${rob.task}) Deriv connection closed for ${id}.`)
      }
      rob.ws.onmessage = async function incoming(message) {
        try {
          const data = JSON.parse(message.data)
          if (data.hasOwnProperty('error')) {
            rob.trading = false
            rob.store.commit('addRobot', rob)
            const id = (rob.user) ? rob.user.id : 0
            (id == 1) ? '' : await logger(`${new Date()}: (${rob.task}) ${data.msg_type} -> ${data.error.code}: ${data.error.message} for ${id}`)
            //if (timeoutId) { clearInterval(timeoutId) }
            return
          }
          if (!['ping', 'api_token'].includes(data.msg_type)) {
            await rob.recieveReply(data) 
          }
        } catch(error) {
          await logger(error, '/var/www/app/web/reports/console-err-new.txt')
        }
      }
      this.ws = rob.ws
      this.connected = rob.connected
      //this.timeoutId = rob.timeoutId
    } catch(err) {
      await logger(err, '/var/www/app/web/reports/console-err-new.txt')
    }
  }

  async ping() {
    this.send({ ping: 1 })
  }

  async close() {
    this.ws = ''
  }

  async setData(data) {
    const rob = this
    let passData = {
      passthrough:  data.passthrough
      //req_id: this.req_id
    }
    const trade_options = rob.trade_options
   // rob.seconds_to_cancel = trade_options.seconds_to_cancel
    switch(data.passthrough.next) {
      case 'profit_table':
        passData.profit_table = 1
        passData.description = 0
        passData.date_from = rob.today
       // passData.passthrough = data.passthrough
        passData.passthrough.next = 'buy'
        break;
      case 'buy':
        //rob.seconds_to_cancel = trade_options.seconds_to_cancel
        delete trade_options.trade_option
        delete trade_options.seconds_to_cancel
        delete trade_options.seconds_to_trade
        passData.buy = 1
        passData.price = trade_options.amount
        passData.parameters = trade_options
        passData.passthrough.next = 'portfolio'
       // passData.passthrough.suc = rob.seconds_to_cancel
        break;
      case 'aftertrade':
        passData.portfolio = 1
        passData.contract_type = [trade_options.contract_type]
        passData.passthrough.next = 'portfolio'
        break;
      case 'portfolio':
        passData.portfolio = 1
        passData.contract_type = [trade_options.contract_type]
        passData.passthrough.next = 'sell'
        break;
      case 'sell':
        passData.sell = data.portfolio.contracts[0].contract_id
        passData.price = 0
        passData.passthrough.next = 'end'
        break;
      case 'api_token':
        passData.api_token = 1
        passData.delete_token = rob.user.deriv_token
        passData.passthrough.next = 'end'
        break;
      default:
        ''
    }
    this.nData = passData
    this.task = data.passthrough.next
    this.next = passData.passthrough.next
    rob.store.commit('addRobot', this)
  }

  async profitLossPercent(data, authData) {
    try {
      const rob = this
      let counter = {
        buy_price: 0,
        sell_price: 0,
        pl: 0,
        percent: 0,
        pmax: parseFloat(data.passthrough.pmax),
        lmax: parseFloat(data.passthrough.lmax)
      }
      for (const transaction of data.profit_table.transactions) {
        if (transaction.purchase_time >= rob.today) {
          counter.buy_price = bc.bcadd(transaction.buy_price, counter.buy_price, 2)
          counter.sell_price = bc.bcadd(transaction.sell_price, counter.sell_price, 2)
        }
      }
      counter.pl = parseFloat(bc.bcsub(counter.sell_price, counter.buy_price, 2))
      const di = parseFloat(counter.pl / rob.trade_options.amount)
      const per = bc.bcmul(di, 100, 2)
      counter.percent = parseFloat(per.replace('-', ''))
      if (rob.user.email != 'samuelonyijne@gmail.com') {
        logger(counter, '/var/www/app/web/reports/results.json')
      }      
      if ( per >= counter.pmax && counter.pmax > 0) {
        const msg = `${data.msg_type} -> ${rob.user.email}: has reached ${counter.pmax}% profits (${new Date()})`
        rob.store.events.publish('threshold', {
          reached: per,
          reason: 'profit',
          token: rob.user.deriv_token,
          message: msg
        })
        
        //logger(msg)
      } else if (counter.percent >= counter.lmax && counter.lmax > 0) {
        const msg = `${new Date()}: ${data.msg_type} -> ${rob.user.email}: has reached ${counter.lmax}% losses.`
        rob.store.events.publish('threshold', {
          reached: per,
          reason: 'loss',
          token: rob.user.deriv_token,
          message: msg
        })
        //logger(msg)
      } else {
        if(rob.trading == true) {
          await logger(`${new Date()}: (${this.task}) trading currently on, skipping.`)
          return this
        }
        rob.trading = true
        await rob.send(authData)
        await rob.send(rob.nData)
        rob.store.commit('addRobot', rob)
        //logger(`${new Date()}: (${rob.task}) trade session ran for ${rob.user.id}`)
      }
    } catch(err) {
      await logger(err, '/var/www/app/web/reports/console-err-new.txt')
    }
  }

  async recieveReply(data) {
      try{
        const rob = this
        let action = data.passthrough.next
        if (action == null || action == undefined) {
         return
        }
        //let timeoutId = null
        await rob.setData(data)
        const authData = {
          authorize: rob.user.deriv_token,
          passthrough: {
            next: null
          }
        }
        
        switch (data.msg_type) {
          case 'authorize':
            await rob.send(rob.nData)
            break;
          case 'profit_table':
            await rob.profitLossPercent(data, authData)
            break;
          case 'buy':
            await rob.afterTrade(data)
            break;
          case 'portfolio':
            if (!isEmpty(data.portfolio.contracts)) {
              //authData.passthrough.next = action
              await rob.send(authData)
              await rob.send(rob.nData)
            }
            break;
          case 'sell':
            //await logger(`${new Date()}: (sell) trade sold at market for ${rob.user.id}`)
            if (rob.timeoutId) {
              clearInterval(rob.timeoutId)
            }
            rob.trading = false
            // await this.close()
            break;
          case 'api_token':
            await rob.close()
            break;
          default:
            ''
        }
      } catch(err) {
        await logger(err, '/var/www/app/web/reports/console-err-new.txt')
      }
  }

  async send(data) {
    try {
      if (isEmpty(data)) {return}
      if (this.ws._readyState === this.ws.OPEN) {
        this.ws.send(JSON.stringify(data))
      } else {
        await this.sendMail(`request not sent at ${new Date()} trade client is off`)
        logger(`${new Date()} ${this.task}: request not sent, trade client is off`)
      }
    } catch(err) {
      await logger(err, '/var/www/app/web/reports/console-err-new.txt')
    }
    return
  }

  async sendMail(message) {
    if (isEmpty(this.settings)) { return }
    if (this.user.email == 'samuelonyijne@gmail.com') {
      return
    }
    axios.post(`${this.api_url}/site/send-message`, {
      to: this.settings.email,
      message: message
    })
  }

  async initTrade(trade_options, user,  settings, today) {
    if(this.trading == true || this.threshold > 0){ 
      //await logger(`${new Date()}: (${this.task}) trading currently on, skipping.`)
      return this
    }
    const rob = await this.setup(trade_options, user,  settings, today)
   
    rob.task = 'authorize'
    rob.next = 'profit_table'
    //this.req_id = `${this.user.id}${Date.now()}`
    const data = {
      authorize: rob.user.deriv_token,
      passthrough: {
       next: rob.next,
       pmax: rob.settings.profit_max,
       lmax: rob.settings.loss_max,
       suc: rob.seconds_to_cancel
      },
      //req_id: this.req_id
    }
   // 
    await rob.send(data)
    rob.store.commit('addRobot', rob)
    return rob
  }

  async afterTrade(data) {
    try {
      const rob = this
      
      const ca = parseFloat(data.passthrough.suc - 2)
      //rob.seconds_to_cancel = ca
      const cancel = parseFloat(ca * 1000)
  
      if (cancel === 'NaN' || cancel < 2000) {
         logger(`${new Date()}: (${rob.task}) trade not cancelled ${ca} seconds (${cancel} miliseconds)`)
         return
      }
      //logger(`${new Date()}: (${rob.task}) trade will sell at market after ${ca} seconds (${cancel} miliseconds) for ${rob.user.id}`)
      setTimeout(rob.initCancel, cancel, rob)
    } catch(err) {
      logger(err, '/var/www/app/web/reports/console-err-new.txt')
    }
  }

  async initCancel(rob) {
    try {
      rob.cancelRetry = 0
     if (rob.timeoutId) { clearInterval(rob.timeoutId) }
      rob.timeoutId = setInterval(rob.retryPortfolio, 2000, rob)
    } catch(err) {
      logger(err, '/var/www/app/web/reports/console-err-new.txt')
    }
  }

  async retryPortfolio(rob) {
     try {
      if (rob.cancelRetry >= 6 && rob.timeoutId) {
        clearInterval(rob.timeoutId)
        rob.trading = false
        rob.store.commit('addRobot', rob)
        return
      }
      if (rob.cancelRetry >= 6) {
        rob.trading = false
        rob.store.commit('addRobot', rob)
        return
      }
      const authData = {
        authorize: rob.user.deriv_token,
        passthrough: {
          next: 'portfolio'
        }
        //req_id: this.req_id
      }
      /*if (rob.cancelRetry == 0) {
        await logger(`${new Date()}:(${rob.task}) auto sell at market initiated for ${rob.user.id}`)
      } else {
        await logger(`${new Date()}:(${rob.task})  retry auto cancel trade initiated for ${rob.user.id}`)
      }*/
      rob.cancelRetry = rob.cancelRetry + 1
      await rob.send(authData)      
    } catch(err) {
      await logger(err, '/var/www/app/web/reports/console-err-new.txt')
    }
    
  }

  async  keepAlive(rob) {
    await rob.ping()
  }

  async serverTime() {
    await this.send({ time: 1 })
    return
  }

  async initRevoke() {
    this.task = 'authorize'
    this.next = 'api_token'
    const data = {
      authorize: deriv_token,
      passthrough: {
        next: 'api_token'
      }
    }
    await this.send(data) 
    this.store.commit('addRobot', this)
    return
  }

}

export default Robot;
