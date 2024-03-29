import WebSocket from 'isomorphic-ws'
import axios from 'axios'
var bc = require('locutus/php/bc')
import Store from './store/trader'
import { isEmpty, logger } from './utils/helpers'

class TraderRobot {
  constructor(param) {
    this.store = Store
    this.connected = false
    this.app_id = 30004
    this.ws = ''
    this.api_url = this.store.getters.traderApiUrl
    this.today = param.today || Date.now()
    this.next = null
    this.user = param.user || {}
    this.savePath = param.savePath || 'addTraderRobot'
    this.deletePath = param.deletePath || 'removeTraderRobot'
    this.logFileTxt = '/var/www/robot/web/reports/trader/trader.txt'
    this.logFileJson = '/var/www/robot/web/reports/trader/trader.json'
    this.debugFile = '/var/www/robot/web/reports/trader/debug.txt'
    this.trade = {
      threshold: 0,
      thresholdStatus: null,
      totalBuy: 0,
      totalSell: 0,
      pl: 0,
      per: '0',
      percent: 0,
      message: '',
    }
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
    this.digits = {
      predictionTwo: '',
      predictionTwoAppears: 0,
      predictionDigit: '',
      predictionDigitAppears: 0,
      predictionThree: '',
      predictionThreeAppears: 0,
      predictionType: '',
      tradeOptions: {},
      mainAmount: 0,
      id: 0,
      subscribe_id: null,
      tickText: 'Start Tick',
      tickSpotData: { quote: 0, pip_size: 0 },
    }
    this.reports = {
      threshold_mail_sent: false,
      max_trade_mail_sent: false,
    }
    this.subscribe = 0
    this.riseFallFields = ['risefall', 'PUT', 'CALL', 'CALLE', 'PUTE']
    this.digitsFields = [
      'DIGITDIFF',
      'DIGITMATCH',
      'DIGITOVER',
      'DIGITUNDER',
      'DIGITODD',
      'DIGITEVEN',
    ]
    this.status = 'run'
    this.cancelRetry = 0
    this.retry = 0
    this.trading = false
    this.riseFall = {}
    this.options = {
      id: 0,
      seconds_to_cancel: 0,
      end_loss_percent: 0,
      take_profit_percent: 0,
      spot_diff: 0,
      spot_diff_multiplier: 0,
      mon_bf_sell_sec: 0,
      mon_bf_sell_per: 0,
      mon_bf_sell_add_sec: 0,
      mon_per_sec: 0,
      reached_monitor_sec: false,
      sec_left_to_cancel: 0,
      tick_spot: 0,
      entry_spot: 0,
      subscribe_id: null,
      contract_id: null,
    }
    this.checking_profit = false
    this.tradingOptions = [
      'contract_type',
      'currency',
      'symbol',
      'amount',
      'barrier',
      'barrier2',
      'barrier_range',
      'basis',
      'cancellation',
      'date_expiry',
      'date_start',
      'duration',
      'duration_unit',
      'limit_order',
      'multiplier',
      'product_type',
      'selected_tick',
      'trading_period_start',
    ]
    if (this.user.deriv_token === '' || this.user.deriv_token === undefined) {
      return
    }
    this.amount = 0
    this.skipped = 0
    this.intervalId = null
    this.init()
  }

  async connect() {
    if ([this.ws.CLOSING, this.ws.CLOSED].includes(this.ws._readyState)) {
      await this.init()
      if ([this.ws.CLOSING, this.ws.CLOSED].includes(this.ws._readyState)) {
        this.connected = false
        await this.store.commit(this.savePath, this)
        return this
      }
    }
    if (this.ws._readyState === this.ws.CONNECTING) {
      this.connected = false
    } else {
      this.connected = true
    }
    await this.store.commit(this.savePath, this)
    return this
  }

  async setup(trade_options, user, settings, today) {
    this.today = today
    this.user = user
    this.settings = settings
    if (!isEmpty(trade_options)) {
      this.trade_options = {}
      this.options = {
        reached_monitor_sec: false,
        sec_left_to_cancel: 0,
        subscribe_id: null,
        contract_id: null,
        entry_spot: 0,
      }
      for (const key in trade_options) {
        if (this.tradingOptions.includes(key)) {
          this.trade_options[key] = trade_options[key]
        } else {
          this.options[key] = trade_options[key]
        }
      }
      await this.getAmount()
      this.options.mon_bf_sell_per = Number(`-${this.options.mon_bf_sell_per}`)
      this.options.end_loss_percent = Number(
        `-${this.options.end_loss_percent}`
      )
    }
    if (this.timeoutId) {
      clearInterval(this.timeoutId)
    }
    this.timeoutId = null
    this.cancelRetry = 0
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
        if (process.env.NODE_ENV !== 'production') console.log('connected')
        rob.store.commit(rob.savePath, rob)
        const id = rob.user ? rob.user.deriv_account : 0
        await rob.debug(
          rob,
          `${new Date()}: (${rob.task}) Deriv connection started for ${id}.`
        )
        rob.intervalId = setInterval(rob.keepAlive, 20000, rob)
      }
      rob.ws.onclose = async function close() {
        try {
          rob.connected = false
          rob.trading = false
          rob.task = 'idle'
          rob.checking_profit = false
          if (process.env.NODE_ENV !== 'production') console.log('disonnected')
          const id = rob.user ? rob.user.deriv_account : 0
          if (rob.intervalId) {
            clearInterval(rob.intervalId)
          }
          await rob.debug(
            rob,
            `${new Date()}: (${rob.task}) Deriv connection closed for ${id}.`
          )
          rob.store.commit(rob.savePath, rob)
        } catch (error) {
          const msg = `${error.message} from onclose method in trader-robot.js`
          await rob.sendMail(msg, rob.settings.dev_email)
          //console.log(msg)
        }
      }
      rob.ws.onmessage = async function incoming(message) {
        try {
          const data = JSON.parse(message.data)
          if (data.hasOwnProperty('error')) {
            rob.trading = false
            rob.store.commit(rob.savePath, rob)
            const id = rob.user ? rob.user.deriv_account : 0
            const msg = `${new Date()}: ${data.msg_type} -> ${
              data.error.code
            }: ${data.error.message} for ${id}`
            if (data.msg_type === 'forget') {
              rob.forgetConnection()
            }
            if (process.env.NODE_ENV !== 'production') {
              console.log(data)
            } else {
              await rob.sendMail(msg, rob.settings.dev_email)
            }
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

  async closeConnection(payload) {
    try {
      if (this.connected === false) return
      if (
        this.settings.threshold_email === this.user.email &&
        this.settings.action === 'auto'
      ) {
        axios.post(`${this.api_url}/indexes/trade-max`, {
          reached: payload.percent,
          reason: payload.thresholdStatus,
          env: this.settings.namespace,
        })
      }

      await this.sendMail(payload.message, this.settings.threshold_email)
      if (this.user.is_trading === 'digits') {
        await this.closeDigit()
      } else if (this.user.is_trading === 'signals') {
        await this.closeSignal()
      }
    } catch (error) {
      this.debug(
        this,
        error.message,
        `${error.message} from closeConnection method in trader-robot.js`
      )
    }
  }

  async closeDigit(rob = '') {
    if (this.timeoutId) {
      clearInterval(this.timeoutId)
    }
    this.timeoutId = null
    if (this.digits.subscribe_id) {
      this.task = 'forget'
      this.next = 'end'
      await this.send({
        forget: this.digits.subscribe_id,
        passthrough: {
          next: 'end',
        },
      })
    }
    this.status = 'close'
    return
  }

  async closeSignal() {
    this.status = 'close'
    await this.close()
    return
  }

  async closeLater(rob) {
    if (rob.user.is_trading === 'digits') {
      await rob.closeDigit()
    } else {
      setTimeout(async () => {
        await rob.closeSignal()
      }, 40000)
    }
  }

  async close() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }
    this.status = 'close'
    await this.ws.close()
  }

  async getAmount() {
    this.trade_options.amount = Number.isNaN(this.trade_options.amount)
      ? 0
      : Number(this.trade_options.amount)
    if (this.trade_options.amount === 0) {
      const staking_percent = bc.bcdiv(this.settings.staking_percent, 100, 2)
      this.trade_options.amount = Number(
        bc.bcmul(staking_percent, this.user.balance, 2)
      )
    }
  }

  async forgetConnection() {
    if (this.user.is_trading !== 'digits') return
    if (this.connected === false) return
    this.digits = {
      ...this.digits,
      ...{
        tickSpotData: { quote: 0, pip_size: 0 },
        tickText: 'Start Tick',
        subscribe_id: null,
      },
    }
    //app_store.commit("updateDigitsData", this.digits);
    await this.close()
    return
  }

  async setData(data) {
    try {
      const rob = this
      let passData = {
        passthrough: data.passthrough,
        //req_id: rob.req_id
      }
      switch (data.passthrough.next) {
        case 'profit_table':
          passData.profit_table = 1
          passData.description = 0
          passData.date_from = rob.today
          passData.passthrough.next =
            rob.checking_profit === true ? 'end' : 'buy'
          break
        case 'buy':
          //passData.buy = data.proposal.id
          passData.buy = 1
          passData.price = rob.trade_options.amount
          passData.parameters = rob.trade_options
          rob.options.subscribe === 1 ? passData.subscribe = 1 : ''
          passData.passthrough.next = 'end'
          break
        case 'proposal':
          passData.proposal = 1
          passData = { ...rob.trade_options, ...passData }
          passData.passthrough.next = 'buy'
          break
        case 'portfolio':
          passData.portfolio = 1
          passData.contract_type = [rob.trade_options.contract_type]
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
      rob.task = passData.passthrough.next
      rob.next = passData.passthrough.next
      //rob.store.commit(rob.savePath, rob)
      return rob
    } catch (error) {
      this.debug(
        this,
        error.message,
        `${error.message} from setData method in trader-robot.js`
      )
      return this
    }
  }

  async profitLossPercent(data, authData) {
    try {
      const rob = this

      //await rob.getAmount();
      const trade = {
        deriv_account: rob.user.deriv_account,
        threshold: 0,
        thresholdStatus: null,
        totalBuy: 0,
        totalSell: 0,
        pl: 0,
        per: '',
        percent: 0,
        pmax: parseFloat(rob.settings.profit_max),
        lmax: parseFloat(rob.settings.loss_max),
        message: '',
      }
      const today_transactions = data.profit_table.transactions.filter(
        (transaction) => transaction.purchase_time >= rob.today
      )
      today_transactions.forEach((transaction) => {
        trade.totalBuy = bc.bcadd(transaction.buy_price, trade.totalBuy, 2)
        trade.totalSell = bc.bcadd(transaction.sell_price, trade.totalSell, 2)
      })
      let amount = 0
      if (rob.user.is_trading == 'digits') {
        amount =
        Number(rob.amount) === 0 ? trade.totalBuy : rob.amount
      } else {
        amount =
        Number(rob.trade_options.amount) === 0 ? trade.totalBuy : rob.trade_options.amount
      }
      trade.pl = parseFloat(bc.bcsub(trade.totalSell, trade.totalBuy, 2))
      const di = parseFloat(trade.pl / amount)
      trade.per = bc.bcmul(di, 100, 2)
      trade.percent = parseFloat(trade.per.replace('-', ''))

      if (rob.checking_profit == true) {
        rob.checking_profit = false
        rob.trading = false
      } else if (Number(trade.per) >= trade.pmax && trade.pmax > 0) {
        trade.threshold = trade.percent
        trade.message = `${new Date()}: ${rob.user.deriv_account}: reached ${
          trade.per
        }% profits.`
        trade.thresholdStatus = 'profit'
        rob.trade.threshold = trade.threshold
        rob.closeConnection(trade)
      } else if (trade.percent >= trade.lmax && trade.lmax > 0) {
        trade.threshold = trade.percent
        trade.message = `${new Date()}: ${rob.user.deriv_account}: reached ${
          trade.percent
        }% losses.`
        trade.thresholdStatus = 'loss'
        rob.trade.threshold = trade.threshold
        rob.closeConnection(trade)
      } else {
        rob.trading = true
        ///await rob.send(authData)
        await rob.send(rob.nData)
      }
      // await logger(`${new Date()}: (${rob.task}) trade session ran for ${rob.user.email}`, rob.logFileTxt)

      //rob.store.commit(rob.savePath, rob);
      rob.setThreshold(trade)
      axios.post(`${rob.api_url}/trades/update-history`, {
        deriv_account: trade.deriv_account,
        transactions: today_transactions,
        email: rob.settings.email,
      })
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.log(error)
      this.debug(
        this,
        error.message,
        `${error.message} : from profit_and_loss in trader-robot.js`
      )
    }
  }

  async recieveReply(data) {
    try {
      let rob = this
      let action = null
      const authData = {
        authorize: rob.user.deriv_token,
        passthrough: {
          next: null,
        },
      }
      if (data.passthrough !== undefined) {
        action = data.passthrough.next
        if (action == null || action === undefined) {
          return
        }
        rob = await rob.setData(data)
      }

      switch (data.msg_type) {
        case 'authorize':
          if (['profit_table'].includes(action)) {
            rob.user.balance = data.authorize.balance
            rob.store.dispatch('updateUserBalance', {
              balance: data.authorize.balance,
              deriv_account: data.authorize.loginid,
              url: `${this.api_url}/indexes/update-user-balance`,
              env: rob.settings.namespace,
            })
          }
          await rob.send(rob.nData)
          break
        case 'profit_table':
          await rob.profitLossPercent(data, authData)
          break
        case 'buy':
          await rob.afterTrade(data)
          break
        case 'proposal':
          await rob.send(rob.nData)
          break

        case 'portfolio':
          if (!isEmpty(data.portfolio.contracts)) {
            //authData.passthrough.next = action
            await rob.send(authData)
            await rob.send(rob.nData)
            // rob.debug(rob, `${new Date()}: cancel request sent`)
          }
          break
        case 'sell':
          await rob.sold()
          break
        case 'api_token':
          await rob.close()
          break
        case 'tick':
          await rob.checkPrediction(data.tick)
          break
        case 'forget':
          await rob.forgetConnection()
          break
        case 'copy_start':
          rob.streamData = data.copy_start
          break
        case 'copy_stop':
          rob.streamData = data.copy_stop
          break
        case 'copytrading_list':
          await rob.copytradingList(data.copytrading_list)
          break
        case 'copytrading_statistics':
          await rob.statisticsData(data.copytrading_statistics)
          break
        case 'api_token':
          await rob.close()
          break
        case 'proposal_open_contract':
          await rob.monitorPercentage(data.proposal_open_contract, rob)
          break
        default:
          ''
      }
    } catch (err) {
      await logger(err.message, this.logFileTxt)
    }
  }

  async send(data) {
    try {
      if (isEmpty(data)) return
      if (this.retry >= 60) {
        this.trading = false
        this.retry = 0
        if (this.timeoutId) {
          clearInterval(this.timeoutId)
        }
        this.timeoutId = null
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
          const id = this.user ? this.user.deriv_account : 0
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
      await this.debug(
        this,
        err.message,
        `${err.message} from send method in trader-robot.js`
      )
    }
    return
  }

  async sendMail(message, email = null) {
    const to = !email ? this.settings.email : email
    axios.post(`${this.api_url}/site/send-message`, {
      to: to,
      message: message,
    })
  }

  async initTrade(trade_options, user, settings, today) {
    try {
      if (this.trading === true || this.trade.threshold !== 0) {
        if (process.env.NODE_ENV !== 'production') console.log('skipped')
        let reason = 'skipped '
        this.skipped = this.skipped + 1
        if (this.trading === true) {
          if (this.skipped >= 1) {
            this.trading = false
          }
          reason = `${reason} : trade ongoing`
        }
        if (this.trade.threshold !== 0) {
          reason = `${reason} - ${this.trade.threshold} threshold reached`
          if (this.today != today) {
            this.trade.threshold = 0
          }
        }
        this.store.commit(this.savePath, this)
        this.sendMail(
          `${new Date()}: ${reason} for ${this.user.deriv_account}`,
          this.settings.threshold_email
        )
        // this.debug(this, `${new Date()}: ${reason}`)
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
        },
        //req_id: this.req_id
      }
      rob.store.commit(rob.savePath, rob)
      await rob.send(data)
      return rob
    } catch (error) {
      console.log(error.message)
    }
  }

  async afterTrade(data) {
    try {
      // const rob = this
      const ct = this.trade_options.contract_type
      if (this.digitsFields.includes(ct)) {
        await this.countDigit()
      } else {
        this.options.subscribe != 1
          ? this.prepareTakeProfit(data)
          : this.monitor(data)
        await this.count()
      }
      if (this.settings.namespace === 'test') return
      const tradeData = {
        ...this.trade_options,
        ...data.buy,
      }
      tradeData.email = this.settings.email
      tradeData.user_id = this.user.id
      tradeData.deriv_id = this.user.deriv_account
      axios.post(`${this.api_url}/trades/add-new`, tradeData)
    } catch (err) {
      this.debug(
        this,
        err.message,
        `${err.message} from afterTrade in trader-robot`
      )
    }
  }

  async prepareTakeProfit(data) {
    const ca = parseFloat(this.options.seconds_to_cancel - 2)
    const cancel = parseFloat(ca * 1000)
    let msg = ''
    if (this.timeoutId) {
      clearInterval(this.timeoutId)
    }
    this.timeoutId = null
    if (Number.isNaN(cancel) || cancel < 2000) {
      this.trading = false
      this.store.commit(this.savePath, this)
    } else {
      setTimeout(this.initCancel, cancel, this)
      //msg = `${new Date()}: trade sent - will sell at market after ${ca} seconds `
      //this.debug(this, msg)
    }
  }

  async monitor(data) {
    try {
      this.options.subscribe_id = data.subscription
        ? data.subscription.id
        : null
      setTimeout(
        this.enablePercentageMonitor,
        this.options.mon_per_sec * 1000,
        this
      )
    } catch (error) {
      this.debug(
        this,
        error.message,
        `${error.message} from monitor method in trader-robot.js`
      )
    }
  }
  async enablePercentageMonitor(rob) {
    rob.options.reached_monitor_sec = true
  }


  async monitorCancelSeconds(rob) {
    if (rob.options.sec_left_to_cancel == 2) {
      if (rob.options.subscribe_id) {
        rob.send({
          forget: rob.options.subscribe_id,
          passthrough: {
            next: 'end',
          },
        })
      }
      clearInterval(rob.timeoutId)
      rob.timeoutId = setInterval(rob.retryPortfolio, 2000, rob)
    } else {
      rob.options.sec_left_to_cancel = rob.options.sec_left_to_cancel - 1
    }
  }

  async chectSpotDiff() {
    try {
      const diff = parseFloat(this.options.tick_spot - this.options.entry_spot)
      if (diff >= this.options.spot_diff) {
        this.options.seconds_to_cancel =
          this.options.seconds_to_cancel * this.options.spot_diff_multiplier
        this.settings.debug == 1
          ? this.sendMail(
              `Seconds to cancel was multiplied by ${this.options.spot_diff_multiplier}`,
              this.settings.threshold_email
            )
          : ''
      }
      if (this.timeoutId) {
        clearInterval(this.timeoutId)
      }
      this.options.sec_left_to_cancel = this.options.seconds_to_cancel
      if ([0, undefined].includes(this.options.sec_left_to_cancel)) return
      this.timeoutId = setInterval(this.monitorCancelSeconds, 1000, this)
      if (process.env.NODE_ENV !== 'production' && diff >= this.options.spot_diff) {
        console.log(
          `Signal Spot: ${this.options.tick_spot} - Entry Spot: ${this.options.entry_spot} = ${diff}`
        )
      }
    } catch (error) {
      this.debug(
        this,
        error.message,
        `${error.message} from chectSpotDiff method in trader-robot.js`
      )
    }
  }
  
  async monitorPercentage(data, rob) {
    try {
      //rob.streamData = data
      if ([0, undefined].includes(rob.options.entry_spot)) {
        if (data.entry_spot === undefined) return
        rob.options.entry_spot = data.entry_spot
        rob.chectSpotDiff()
      }
      const percent = data.profit_percentage
      if (percent == -100) return
      if (
        rob.options.sec_left_to_cancel <= rob.options.mon_bf_sell_sec &&
        ![0, undefined].includes(rob.options.sec_left_to_cancel)
      ) {
        if (percent < 0 && percent >= rob.options.mon_bf_sell_per) {
          rob.options.sec_left_to_cancel =
            rob.options.sec_left_to_cancel + rob.options.mon_bf_sell_add_sec
          rob.settings.debug == 1
            ? rob.sendMail(
                `Added: ${rob.options.mon_bf_sell_add_sec} seconds to cancel time`,
                rob.settings.threshold_email
              )
            : ''
        }
      }
      //if (rob.options.sec_left_to_cancel == 3) return
      const loss = rob.options.end_loss_percent
      const profit = rob.options.take_profit_percent

      if (rob.options.reached_monitor_sec != true) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(
            `waiting for percentage monitor - ${rob.options.reached_monitor_sec}`
          )
        }
      } else if (percent >= profit || percent <= loss) {
        await rob.sellOut(data, rob)
      }
      //console.log(percent + ' - l: ' + loss + ' p: ' + profit)
    } catch (error) {
      rob.debug(
        rob,
        error.message,
        `${error.message} from monitorPercentage method in trader-robot.js`
      )
    }
  }

  async sellOut(data, rob) {
    rob.task = 'sell'
    rob.next = 'end'
    await rob.send({
      sell: data.contract_id,
      price: 0,
      passthrough: {
        next: rob.next,
      },
    })
    await rob.send({
      forget: data.id,
      passthrough: {
        next: 'end',
      },
    })
    await rob.sold()
    //app_store.commit("updateStreamData", {});
    const msg = `Trade was closed at ${data.profit_percentage} percent`
    if (process.env.NODE_ENV !== 'production') {
      console.log(msg)
    } else if (Number(rob.settings.debug) === 1) {
      rob.sendMail(msg, rob.settings.dev_email)
    }
  }

  async sold() {
    this.trading = false
    if (this.timeoutId) {
      clearInterval(this.timeoutId)
    }
    this.timeoutId = null
    this.cancelRetry = 0
    this.streamData = {}
    this.store.commit(this.savePath, this)
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
        rob.sendMail(
          `first set of sell retry finished for ${rob.user.deriv_account}`
        )
      if (rob.cancelRetry > 5 && rob.cancelRetry < 10) return
      if (rob.cancelRetry > 15) {
        rob.trading = false
        if (rob.timeoutId) {
          clearInterval(rob.timeoutId)
        }
        rob.timeoutId = null
        rob.store.commit(rob.savePath, rob)
        //rob.debug(rob, `${new Date()}: trade ended`)
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
      if (rob.timeoutId) {
        clearInterval(rob.timeoutId)
      }
      rob.timeoutId = null
      rob.store.commit(rob.savePath, rob)
      await rob.debug(
        rob,
        err.message,
        `${err.message} from retryPortfolio in trader-robot.js`
      )
    }
  }

  async checkThreshold() {
    this.task = 'authorize'
    this.next = 'profit_table'
    this.checking_profit = true
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

  async setThreshold(data) {
    const rob = this
    try {
      const tra =
        rob.user.is_trading === 'digits'
          ? rob.store.getters.traderRobots[rob.user.deriv_account]
          : rob.store.getters.traderRobotsSig[rob.user.deriv_account]
      if (tra !== undefined) {
        rob.trade = tra.trade
      }
      let trades = {
        threshold: data.threshold,
        thresholdStatus: data.thresholdStatus,
        totalBuy: data.totalBuy || rob.trade.totalBuy,
        totalSell: data.totalSell || rob.trade.totalSell,
        percent: 0,
        pmax: Number(rob.settings.profit_max),
        lmax: Number(rob.settings.loss_max),
        message: data.message || '',
      }
      if (data.today) {
        trades.traded = 0
        trades.today = data.today
        trades.message = ''
        rob.trade.threshold = 0
        rob.reports = {
          threshold_mail_sent: false,
          max_trade_mail_sent: false,
        }
      } else {
        trades = { ...trades, ...data }
        if (
          rob.user.is_trading === 'signals' &&
          Number(rob.settings.trades) >= Number(rob.settings.trades_per_day)
        ) {
          trades.message = `${new Date()}: maximum signal trades reached.`
          rob.reports.max_trade_mail_sent = true
        }
        if (rob.user.is_trading === 'digits') {
          if (
            Number(rob.settings.digits_trades) >=
            Number(rob.settings.digits_trades_per_day)
          ) {
            trades.message = `${new Date()}: maximum digits trades reached.`
            trades.thresholdStatus = 'count'
          } else if (Number(trades.per) >= trades.pmax && trades.pmax > 0) {
            trades.threshold = trades.percent
            trades.message = `${new Date()}: ${
              rob.user.deriv_account
            }: reached ${trades.per}% profits.`
            trades.thresholdStatus = 'profit'
            //rob.trade.threshold = trades.threshold
          } else if (trades.percent >= trades.lmax && trades.lmax > 0) {
            trades.threshold = trades.percent
            trades.message = `${new Date()}: ${
              rob.user.deriv_account
            }: reached ${trades.percent}% losses.`
            trades.thresholdStatus = 'loss'
            //rob.trade.threshold = trades.threshold
          }
        }
      }
      rob.trade = trades
      rob.store.commit(rob.savePath, rob)
      //app_store.commit("updateTradeUser", trades);
      if (['profit', 'loss', 'count'].includes(trades.thresholdStatus)) {
        rob.closeConnection(trades)
      }
      if (process.env.NODE_ENV !== 'production') console.log(trades)
    } catch (error) {
      this.debug(
        this,
        error.message,
        `${error.message} from setThreshold method in trader-robot.js`
      )
    }
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
    await this.store.commit(this.savePath, this)
    await this.send(data)
    return
  }

  async count() {
    try {
      // app_store.dispatch("tradeAlert", "traded digits");
      if (this.settings.namespace === 'test') return
      const res = await axios.post(`${this.api_url}/trades/count-signals`, {
        email: this.settings.threshold_email,
        env: this.settings.namespace,
      })
      const data = await res.data
      this.settings = { ...this.settings, ...data.info }
      // await this.getAmount()
      this.store.commit(this.savePath, this)
      const rob = this
      setTimeout(() => {
        rob.checkThreshold()
      }, 5 * 1000 * 60)
    } catch (error) {
      this.debug(this, error.message, error.message)
    }
  }

  async countDigit() {
    try {
      // app_store.dispatch("tradeAlert", "traded digits");
      const res = await axios.post(`${this.api_url}/trades/count-digits`, {
        email: this.settings.email,
        env: this.settings.namespace,
      })
      const data = await res.data
      this.settings = { ...this.settings, ...data.info }
      //app_store.commit("setApp", { info: data.info });
      await this.checkThreshold()
      await this.store.commit(this.savePath, this)
    } catch (error) {
      this.debug(
        this,
        error.message,
        `${error.message} from countDigit method in trader-robot.js`
      )
    }
  }

  async debug(rob, msg, mail = '') {
    try {
      const log = `${msg} for ${rob.user.deriv_account}`
      if (rob.settings.debug === 1) logger(log, this.logFileTxt)
      if (mail !== '') {
        this.store.dispatch('sendMessage', {
          to: rob.settings.dev_email,
          message: mail,
        })
      }
    } catch (error) {
      console.log(error.message)
    }
  }

  async getDigitAmount() {
    this.amount = parseFloat(this.digits.mainAmount)
    if (Number(this.amount) === 0 || Number.isNaN(this.amount)) {
      const staking_percent = bc.bcdiv(this.settings.staking_percent, 100, 2)
      const tradeOptions = {
        amount: parseFloat(bc.bcmul(staking_percent, this.user.balance, 2)),
      }
      ///app_store.commit("updateDigitsData", { tradeOptions: tradeOptions });
      this.amount = tradeOptions.amount
    }
    this.digits.tradeOptions.amount = this.amount
    return this.amount
  }

  async setupDigit(user, settings, form) {
    this.today = settings.today
    this.user = user
    this.settings = settings
    this.digits.subscribe_id = null
    if (isEmpty(form)) {
      return await this.connect()
    }
    const amount = form.amount === undefined ? 0 : form.amount
    this.digits.tradeOptions = {
      contract_type: form.contract_type,
      amount: parseFloat(amount),
      basis: 'stake',
      currency: form.currency,
      duration_unit: form.duration_unit,
      duration: form.duration,
      symbol: form.symbol,
      barrier: Number(form.prediction),
    }
    this.digits.mainAmount = amount
    this.digits.id = form.id
    this.digits.predictionDigit = Number(form.pre_prediction_digit)
    this.digits.predictionTwo = Number(form.pre_prediction_two)
    this.digits.predictionThree = Number(form.pre_prediction_three)
    if (form.pre_prediction_three !== undefined) {
      this.digits.predictionType = 'three'
    } else if (
      form.pre_prediction_two !== undefined &&
      form.pre_prediction_three === undefined
    ) {
      this.digits.predictionType = 'double'
    } else {
      this.digits.predictionType = 'single'
    }
    await this.getDigitAmount()
    return await this.connect()
  }

  async initDigit(symbol) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('init digits')
    }
    if (Number(this.trade.threshold) !== 0) {
      await this.sendMail(
        'digit trade not started, threshold reached',
        this.settings.threshold_email
      )
      if (process.env.NODE_ENV !== 'production') {
        console.log(`not started ${Number(this.trade.threshold)}`)
        console.log(this.trade)
      }
      return {
        status: 'success',
        message: 'digit trade not started, threshold reached',
      }
    }

    await this.ticks(symbol)
    if (process.env.NODE_ENV !== 'production') {
      console.log(symbol)
    }
    return {
      status: 'success',
      message: 'digit trade started',
    }
  }

  async ticks(symbol) {
    let data = {}
    let msg = `${new Date()}: Digits trade for ${this.user.deriv_account} `
    if (this.digits.subscribe_id) {
      this.task = 'forget'
      this.next = 'end'
      data = {
        forget: this.digits.subscribe_id,
        passthrough: {
          next: 'end',
        },
      }
      msg = `${msg} was stopped`
    } else {
      this.task = 'authorize'
      this.next = 'ticks'
      this.checking_profit = false
      this.trade_options = { ticks: symbol }
      data = {
        authorize: this.user.deriv_token,
        passthrough: {
          next: this.next,
          ticks: symbol,
        },
      }
      msg = `${msg} started`
    }
    this.store.commit(this.savePath, this)
    if (process.env.NODE_ENV !== 'production') {
      console.log(this.digits)
    } else {
      this.sendMail(msg, this.settings.dev_email)
    }
    await this.send(data)
  }

  async digit() {
    if (Number.isNaN(this.amount)) return
    this.task = 'buy'
    this.next = 'end'
    // this.store.commit(this.savePath, this)
    await this.send({
      buy: 1,
      price: this.amount,
      parameters: this.digits.tradeOptions,
      passthrough: {
        next: this.next,
      },
    })
    if (process.env.NODE_ENV !== 'production') {
      console.log(this.digits.tradeOptions)
    }
  }

  async getLastDigit(tickSpotData) {
    const decimal = parseFloat(tickSpotData.quote)
      .toFixed(tickSpotData.pip_size)
      .split('.')[1]
    return Number(decimal.split('')[Number(tickSpotData.pip_size - 1)])
  }

  async digitSingle(lastDigit) {
    if (lastDigit === Number(this.digits.predictionDigit)) {
      this.send({
        authorize: this.user.deriv_token,
        passthrough: { next: null },
      })
      //this.trade_options = this.digits.tradeOptions
      this.digit()
    }
  }

  async digitDouble(lastDigit) {
    if (
      lastDigit === this.digits.predictionDigit &&
      this.digits.predictionDigitAppears === 0
    ) {
      this.digits.predictionDigitAppears = 1
    } else if (
      lastDigit === this.digits.predictionTwo &&
      this.digits.predictionDigitAppears === 1
    ) {
      this.send({
        authorize: this.user.deriv_token,
        passthrough: { next: null },
      })
      //this.trade_options = this.digits.tradeOptions
      this.digit()
      this.digits.predictionDigitAppears = 0
    } else {
      this.digits.predictionDigitAppears = 0
    }
  }

  async digitThree(lastDigit) {
    if (
      lastDigit === this.digits.predictionDigit &&
      this.digits.predictionDigitAppears === 0
    ) {
      this.digits.predictionDigitAppears = 1
    } else if (
      lastDigit === this.digits.predictionTwo &&
      this.digits.predictionDigitAppears === 1 &&
      this.digits.predictionTwoAppears === 0
    ) {
      this.digits.predictionTwoAppears = 1
    } else {
      if (
        lastDigit === this.digits.predictionThree &&
        this.digits.predictionTwoAppears === 1
      ) {
        this.send({
          authorize: this.user.deriv_token,
          passthrough: { next: null },
        })
        //this.trade_options = this.digits.tradeOptions
        this.digit()
        this.digits.predictionDigitAppears = 0
        this.digits.predictionTwoAppears = 0
      } else {
        this.digits.predictionDigitAppears = 0
        this.digits.predictionTwoAppears = 0
      }
    }
  }

  async checkPrediction(tickSpotData) {
    try {
      const lastDigit = await this.getLastDigit(tickSpotData)
      switch (this.digits.predictionType) {
        case 'single':
          await this.digitSingle(lastDigit)
          break
        case 'double':
          await this.digitDouble(lastDigit)
          break
        case 'three':
          await this.digitThree(lastDigit)
          break
        default:
          break
      }

      if (!this.digits.subscribe_id) {
        this.digits = {
          ...this.digits,
          ...{
            tickSpotData: tickSpotData,
            tickText: 'Stop Ticks',
            subscribe_id: tickSpotData.id,
          },
        }
        //app_store.commit("updateDigitsData", this.digits);
        this.store.commit(this.savePath, this)
      } else {
        //app_store.commit("updateTickData", tickSpotData);
        //console.log(req.app.io)
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(error.message)
      } else {
        this.debug(
          this,
          error.message,
          `${error.message} from checkPrediction method in trader-robot.js`
        )
      }
    }
  }
}

export default TraderRobot
