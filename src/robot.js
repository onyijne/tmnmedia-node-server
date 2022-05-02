import WebSocket from 'isomorphic-ws'
import axios from 'axios'
var bc = require('locutus/php/bc')
import Store from './store/trade'
import { isEmpty, logger } from './utils/helpers'

class Robot {
  constructor(param) {
    this.store = Store
    this.connected = false
    this.app_id = param.app_id || this.store.getters.appId
    this.ws = ''
    this.api_url = `${this.store.getters.apiUrl}/api2/v2`
    this.today = param.today || Date.now()
    this.next = null
    this.user = param.user || {}
    this.settings = param.settings || {}
    this.trade_options = param.trade_options || {}
    this.copy_options = param.copy_options || {}
    this.timeoutId = null
    this.task = 'idle'
    this.nData = {}
    this.time_entered = param.time_entered || 0
    this.copytrading_list = {}
    this.copytrading_statistics = {}
    this.streamData = {}
    this.tickSpotData = {}
    this.status = 'run'
    /*if (param.user) {
      this.req_id = `${this.user.id}${Date.now()}`
    } else {
      this.req_id = Date.now()
    }*/
    if (this.settings.namespace === 'test') {
      this.savePath = 'addTestRobot'
      this.deletePath = 'removeTestRobot'
      this.logFileTxt = '/var/www/robot/web/reports/server/trade-test.txt'
      this.logFileJson = '/var/www/robot/web/reports/server/trade-test.json'
      this.debugFile = '/var/www/robot/web/reports/server/debug-test.txt'
    } else {
      this.savePath = 'addRobot'
      this.deletePath = 'removeRobot'
      this.logFileTxt = '/var/www/robot/web/reports/server/trade.txt'
      this.logFileJson = '/var/www/robot/web/reports/server/trade.json'
      this.debugFile = '/var/www/robot/web/reports/server/debug.txt'
    }
    this.cancelRetry = 0
    this.retry = 0
    this.trading = false
    this.seconds_to_cancel = 0
    this.threshold = 0
    this.checking_profit = false
    if (this.user.deriv_token === '' || this.user.deriv_token === undefined) {
      return
    }
    this.skipped = 0
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
    //const id = (this.user) ? this.user.email : 0
    //await this.debug(this, `${new Date()}: (${this.task}) robot session initiated for ${id}`, this.logFileTxt)
    return this
  }

  async setup(trade_options, user, settings, today) {
    if (this.trading == true) {
      return this
    }
    this.app_id = settings.app_id || this.store.getters.appId
    this.today = today
    this.user = user
    this.settings = settings
    this.trade_options = trade_options
    this.seconds_to_cancel = parseFloat(trade_options.seconds_to_cancel)
    this.cancelRetry = 0
    if (this.timeoutId) {
      clearInterval(this.timeoutId)
    }
    this.timeoutId = null
    return await this.connect()
  }

  async setupCopy(copy_options, user, settings) {
    this.app_id = settings.app_id
    this.user = user
    this.settings = settings
    this.copy_options = copy_options || this.copy_options
    return await this.connect()
  }

  async init() {
    try {
      let timeoutId = null
      //this.timeoutId = null
      const rob = this
      rob.ws = new WebSocket(
        `wss://ws.binaryws.com/websockets/v3?app_id=${this.app_id}`
      )
      //const arr = []
      // arr.push(rob)
      rob.ws.onopen = async function open() {
        rob.connected = true
        rob.trading = false
        rob.status = 'run'
        rob.store.commit(rob.savePath, rob)
        const id = rob.user ? rob.user.email : 0
        await logger(
          `${new Date()}: (${rob.task}) Deriv connection started for ${id}.`,
          rob.logFileTxt
        )
        timeoutId = setInterval(rob.keepAlive, 20000, rob)
      }
      rob.ws.onclose = async function close() {
        rob.connected = false
        rob.trading = false
        //rob.threshold = 0
        rob.task = 'idle'
        rob.checking_profit = false
        rob.store.commit(rob.savePath, rob)
        const id = rob.user ? rob.user.email : 0
        if (timeoutId) {
          clearInterval(timeoutId)
        }
        await logger(
          `${new Date()}: (${rob.task}) Deriv connection closed for ${id}.`,
          rob.logFileTxt
        )
      }
      rob.ws.onmessage = async function incoming(message) {
        try {
          const data = JSON.parse(message.data)
          if (data.hasOwnProperty('error')) {
            rob.trading = false
            rob.store.commit(rob.savePath, rob)
            const id = rob.user ? rob.user.email : 0
            const msg = `${new Date()}: ${data.msg_type} -> ${
              data.error.code
            }: ${data.error.message} for ${id}`
            await rob.sendMail(msg)
            logger(msg, rob.logFileTxt)
            //if (timeoutId) { clearInterval(timeoutId) }
            return
          }
          if (!['ping', 'api_token'].includes(data.msg_type)) {
            await rob.recieveReply(data)
          }
        } catch (error) {
          logger(error.message, rob.logFileTxt)
        }
      }
      this.ws = rob.ws
      this.connected = rob.connected
      this.trading = rob.trading
      //this.timeoutId = rob.timeoutId
    } catch (err) {
      await logger(err.message, this.logFileTxt)
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
      passthrough: data.passthrough,
      //req_id: this.req_id
    }
    const trade_options = rob.trade_options
    switch (data.passthrough.next) {
      case 'profit_table':
        passData.profit_table = 1
        passData.description = 0
        passData.date_from = rob.today
        passData.passthrough.next =
          rob.checking_profit === false ? 'buy' : 'end'
        break
      case 'buy':
        delete trade_options.trade_option
        delete trade_options.seconds_to_cancel
        delete trade_options.seconds_to_trade
        delete trade_options.seconds_to_wait
        delete trade_options.platform_to_trade
        delete trade_options.id
        delete trade_options.signal_type
        passData.buy = 1
        passData.price = trade_options.amount
        passData.parameters = trade_options
        passData.passthrough.next = 'portfolio'
        break
      case 'portfolio':
        passData.portfolio = 1
        passData.contract_type = [trade_options.contract_type]
        passData.passthrough.next = 'sell'
        break
      case 'sell':
        passData.sell = data.portfolio.contracts[0]
          ? data.portfolio.contracts[0].contract_id
          : ''
        passData.price = 0
        passData.passthrough.next = 'ilde'
        break
      case 'api_token':
        passData.api_token = 1
        passData.delete_token = rob.user.deriv_token
        passData.passthrough.next = 'idle'
        break
      case 'ticks':
        passData.ticks = data.passthrough.ticks
        passData.subscribe = 1
        passData.passthrough.next = 'end'
        break
      case 'copy_start':
        passData.copy_start = rob.settings.copy_start
        passData.assets = rob.copy_options.indexes
        passData.max_trade_stake = rob.copy_options.max_stake
        passData.min_trade_stake = rob.copy_options.min_stake
        passData.passthrough.next = 'end'
        break
      case 'copy_stop':
        passData.copy_stop = rob.settings.copy_start
        passData.passthrough.next = 'end'
        break
      case 'copytrading_statistics':
        passData.copytrading_statistics = 1
        passData.trader_id = rob.settings.deriv_account_id
        passData.passthrough.next = 'end'
        break
      case 'copytrading_list':
        passData.copytrading_list = 1
        passData.passthrough.next = 'end'
        break
      default:
        ''
    }
    rob.nData = passData
    rob.task = data.passthrough.next
    rob.next = passData.passthrough.next
    rob.store.commit(rob.savePath, rob)
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
        lmax: parseFloat(data.passthrough.lmax),
      }
      for (const transaction of data.profit_table.transactions) {
        if (transaction.purchase_time >= rob.today) {
          counter.buy_price = bc.bcadd(
            transaction.buy_price,
            counter.buy_price,
            2
          )
          counter.sell_price = bc.bcadd(
            transaction.sell_price,
            counter.sell_price,
            2
          )
        }
      }
      counter.pl = parseFloat(
        bc.bcsub(counter.sell_price, counter.buy_price, 2)
      )
      const di = parseFloat(counter.pl / rob.trade_options.amount)
      const per = bc.bcmul(di, 100, 2)
      counter.percent = parseFloat(per.replace('-', ''))
      /*if (rob.user.email === rob.settings.test_email) {
        logger(counter, rob.logFileJson)
      }*/
      if (per >= counter.pmax && counter.pmax > 0) {
        const msg = `${new Date()}: ${data.msg_type}  ${
          rob.user.email
        }: has reached ${counter.pmax}% profits`
        rob.store.dispatch('threshold', {
          reached: per,
          reason: 'profit',
          token: rob.user.deriv_token,
          message: msg,
          namespace: rob.settings.namespace,
        })

        //logger(msg, rob.logFileTxt)
      } else if (counter.percent >= counter.lmax && counter.lmax > 0) {
        const msg = `${new Date()}: ${data.msg_type} ${
          rob.user.email
        }: has reached ${counter.lmax}% losses.`
        rob.store.dispatch('threshold', {
          reached: per,
          reason: 'loss',
          token: rob.user.deriv_token,
          message: msg,
          namespace: rob.settings.namespace,
        })
        //logger(msg, rob.logFileTxt)
      } else {
        if (rob.checking_profit == true) {
          rob.checking_profit = false
          rob.trading = false
          rob.store.commit(rob.savePath, rob)
          return
        }
        if (rob.trading == true) {
          await logger(
            `${new Date()}: (${rob.task}) trading currently on, skipping.`,
            rob.logFileTxt
          )
          return rob
        }
        rob.trading = true
        rob.store.commit(rob.savePath, rob)
        await rob.send(authData)
        await rob.send(rob.nData)
        // await logger(`${new Date()}: (${rob.task}) trade session ran for ${rob.user.email}`, rob.logFileTxt)
      }
    } catch (err) {
      await logger(err.message, this.logFileTxt)
    }
  }

  async recieveReply(data) {
    try {
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
          next: null,
        },
      }

      switch (data.msg_type) {
        case 'authorize':
          await rob.send(rob.nData)
          break
        case 'profit_table':
          await rob.profitLossPercent(data, authData)
          break
        case 'buy':
          await rob.afterTrade(data)
          await rob.count(rob)
          break
        case 'portfolio':
          if (!isEmpty(data.portfolio.contracts)) {
            //authData.passthrough.next = action
            await rob.send(authData)
            await rob.send(rob.nData)
            //rob.debug(rob, `${new Date()}: cancel request sent`)
          }
          break
        case 'sell':
          rob.trading = false
          //rob.debug(rob, `${new Date()}: sold trade`)
          if (rob.timeoutId) {
            clearInterval(rob.timeoutId)
          }
          rob.timeoutId = null
          rob.store.commit(rob.savePath, rob)
          break
        case 'api_token':
          await rob.close()
          break
        case 'ticks':
          await this.checkPrediction(data.tick)
          break
        case 'copy_start':
          this.streamData = data.copy_start
          break
        case 'copy_stop':
          this.streamData = data.copy_stop
          break
        case 'copytrading_list':
          await this.copytradingList(data.copytrading_list)
          break
        case 'copy_statistics':
          await this.statisticsData(data.copytrading_statistics)
          break
        default:
          ''
      }
    } catch (err) {
      await logger(err.message, this.logFileTxt)
    }
  }

  async checkPrediction(tickSpotData) {
    this.tickSpotData = tickSpotData
  }

  async copytradingList(copytradingList) {
    this.copytrading_list = copytradingList
  }

  async statisticsData(statisticsData) {
    this.copytrading_statistics = statisticsData
  }

  async send(data) {
    try {
      if (isEmpty(data)) return
      if (this.retry >= 60) {
        this.trading = false
        this.retry = 0
        this.store.commit(this.savePath, this)
        return
      }
      if (
        this.ws._readyState !== undefined &&
        this.ws._readyState === this.ws.OPEN
      ) {
        this.ws.send(JSON.stringify(data))
        this.retry = 0
      } else {
        await this.connect()
        if (Number(this.retry) === 0) {
          let msg = ''
          const id = this.user ? this.user.email : 0
          if (this.ws._readyState === undefined) {
            msg = `${new Date()} (${
              this.task
            }): request not sent, deriv connection not found. 
            will retry for 2 minutes. ${id}`
          } else {
            const msg = `${new Date()} (${
              this.task
            }): request not sent, deriv connection is off.
            will retry for 2 minutes. ${id}`
          }
          this.sendMail(msg)
        }
        this.retry += 1
        const rob = this
        setTimeout(() => {
          rob.send(data)
        }, 2000)
      }
    } catch (err) {
      await logger(err.message, this.logFileTxt)
    }
    return
  }

  async sendMail(message) {
    if (isEmpty(this.settings)) {
      return
    }
    if (this.user.email === this.settings.test_email) {
      return
    }
    axios.post(`${this.api_url}/robot/send-message`, {
      to: this.settings.email,
      message: message,
    })
  }

  async initTrade(trade_options, user, settings, today) {
    if (this.trading === true || this.threshold !== 0) {
      let reason = 'skipped '
      this.skipped = this.skipped + 1
      if (this.trading === true) {
        if (this.skipped >= 1) {
          this.trading = false
        }
        reason = `${reason} : trade ongoing`
      }
      if (this.threshold !== 0) {
        reason = `${reason} - ${this.threshold} threshold reached`
        if (this.today != today) {
          this.threshold = 0
        }
      }
      this.store.commit(this.savePath, this)
      this.sendMail(`${new Date()}: ${reason} for ${this.user.email}`)
      this.debug(this, `${new Date()}: ${reason}`)
      return this
    }
    const rob = await this.setup(trade_options, user, settings, today)
    rob.skipped = 0
    rob.checking_profit = false
    rob.task = 'authorize'
    rob.next = 'profit_table'
    //this.req_id = `${this.user.id}${Date.now()}`
    const data = {
      authorize: rob.user.deriv_token,
      passthrough: {
        next: rob.next,
        pmax: rob.settings.profit_max,
        lmax: rob.settings.loss_max,
        suc: rob.seconds_to_cancel,
      },
      //req_id: this.req_id
    }
    rob.store.commit(rob.savePath, rob)
    await rob.send(data)
    return rob
  }

  async afterTrade(data) {
    try {
      const rob = this
      if (rob.time_entered !== 0) {
        const msg = `signal came at ${
          rob.time_entered
        } and traded at ${new Date()}`
        rob.sendMail(msg)
      }
      const ca = parseFloat(data.passthrough.suc - 2)
      //rob.seconds_to_cancel = ca
      const cancel = parseFloat(ca * 1000)

      if (cancel === 'NaN' || cancel < 2000) {
        const msg = `${new Date()}: (${
          rob.task
        }) trade not cancelled ${ca} seconds (${cancel} miliseconds)`
        logger(msg, rob.logFileTxt)
        rob.trading = false
        rob.timeoutId = null
        rob.store.commit(rob.savePath, rob)
        rob.debug(rob, `${new Date()}: trade ended`)
        return
      }
      //logger(`${new Date()}: (${rob.task}) trade will sell at market after ${ca} seconds (${cancel} miliseconds) for ${rob.user.id}`)
      setTimeout(rob.initCancel, cancel, rob)
      const log = `${new Date()}: trade sent - will sell at market after ${ca} seconds `
      rob.debug(rob, log)
    } catch (err) {
      logger(err.message, this.logFileTxt)
    }
  }

  async initCancel(rob) {
    try {
      rob.cancelRetry = 0
      rob.tried = 0
      if (rob.timeoutId) {
        clearInterval(rob.timeoutId)
      }
      rob.timeoutId = setInterval(rob.retryPortfolio, 2000, rob)
    } catch (err) {
      logger(err.message, rob.logFileTxt)
    }
  }

  async retryPortfolio(rob) {
    try {
      if (rob.cancelRetry === 5)
        rob.sendMail(`first set of sell retry finished for ${rob.user.email}`)
      if (rob.cancelRetry > 5 && rob.cancelRetry < 10) return
      if (rob.cancelRetry > 15) {
        rob.trading = false
        //rob.timeoutId = null
        if (rob.timeoutId) {
          clearInterval(rob.timeoutId)
          rob.timeoutId = null
        }
        rob.store.commit(rob.savePath, rob)
        rob.debug(rob, `${new Date()}: trade ended`)
        return
      }
      const authData = {
        authorize: rob.user.deriv_token,
        passthrough: {
          next: 'portfolio',
        },
      }
      rob.cancelRetry = rob.cancelRetry + 1
      await rob.store.commit(rob.savePath, rob)
      await rob.send(authData)
    } catch (err) {
      rob.trading = false
      rob.timeoutId = null
      rob.store.commit(rob.savePath, rob)
      await logger(err.message, rob.logFileTxt)
    }
  }

  async checkThreshold(rob) {
    rob.task = 'authorize'
    rob.next = 'profit_table'
    rob.checking_profit = true
    const data = {
      authorize: rob.user.deriv_token,
      passthrough: {
        next: rob.next,
      },
    }
    await rob.store.commit(rob.savePath, rob)
    await rob.send(data)
    return
  }

  async keepAlive(rob) {
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
      authorize: this.user.deriv_token,
      passthrough: {
        next: 'api_token',
      },
    }
    await this.store.commit('this.savePath', this)
    await this.send(data)
    return
  }

  async count(rob) {
    if (rob.user.email === rob.settings.threshold_email) {
      if (rob.settings.action === 'auto') {
        rob.store.dispatch('tradeCount', {
          namespace: rob.settings.namespace,
          email: rob.settings.threshold_email,
        })
      }
      setTimeout(rob.checkThreshold, 60000, rob)
    }
  }

  async debug(rob, msg) {
    const log = `${msg} for ${rob.user.email}`
    if (rob.settings.debug === 1) logger(log, rob.debugFile)
  }

  async closeLater() {
    const rob = this
    setTimeout(this.close, 80000)
  }

  async startCopy() {
    this.task = 'authorize'
    this.next = 'copy_start'
    const data = {
      authorize: this.user.deriv_token,
      passthrough: {
        next: 'copy_start',
      },
    }
    await this.store.commit('this.savePath', this)
    await this.send(data)
    return
  }

  async stopCopy() {
    this.task = 'authorize'
    this.next = 'copy_stop'
    const data = {
      authorize: this.user.deriv_token,
      passthrough: {
        next: this.next,
      },
    }

    await this.store.commit(this.savePath, this)
    await this.send(data)
    return
  }

  async copiers() {
    this.task = 'authorize'
    this.next = 'copytrading_list'
    const data = {
      authorize: this.user.deriv_token,
      passthrough: {
        next: this.next,
      },
    }
    this.$store.commit(this.savePath, this)
    await this.send(data)
  }

  async copyStatistics() {
    this.task = 'authorize'
    this.next = 'copytrading_statistics'
    const data = {
      authorize: this.user.deriv_token,
      passthrough: {
        next: this.next,
      },
    }
    this.$store.commit(this.savePath, this)
    await this.send(data)
  }
}

export default Robot
