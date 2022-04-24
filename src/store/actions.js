import axios from 'axios'
import Robot from '../robot'
import TraderRobot from '../trader-robot'
import { logger, isEmpty } from '../utils/helpers'
import BotUser from '../bot-user'

const telegramErrLog = '/var/www/robot/web/reports/server/telegram.txt'
const tradeErrLog = '/var/www/robot/web/reports/server/trade.txt'
const traderErrLog = '/var/www/robot/web/reports/server/trader.txt'

const actions = {
  trade: async (store, payload) => {
    try {
      const { settings, trade_options, user, today } = payload
      //const { getters, commit } = store
      if (!user.deriv_token || user.deriv_token === null) return
      let rob =
        settings.namespace === 'test'
          ? store.getters.testRobots[user.deriv_token]
          : store.getters.robots[user.deriv_token]
      if (rob === undefined) {
        rob = new Robot({
          user: user,
          trade_options: trade_options,
          settings: settings,
          today: today,
          seconds_to_cancel: parseFloat(trade_options.seconds_to_cancel),
        })
      }
      await rob.initTrade(trade_options, user, settings, today)
    } catch (err) {
      logger(`${new Date()}: ${err.message}`, tradeErrLog)
    }
  },
  revoke: async (store, payload) => {
    try {
      const { deriv_token, settings } = payload
      let rob =
        settings.namespace === 'test'
          ? store.getters.testRobots[deriv_token]
          : store.getters.robots[deriv_token]
      if (rob === undefined) {
        const params = {
          app_id: settings.app_id,
          user: { deriv_token: deriv_token },
          settings: settings,
        }
        rob = new Robot(params)
      } else {
        rob = await rob.connect()
      }
      await rob.initRevoke()
      store.commit(rob.deletePath, deriv_token)
    } catch (err) {
      logger(`${new Date()}: ${err.message}`, tradeErrLog)
    }
  },
  threshold: async (store, payload) => {
    try {
      let rob =
        payload.namespace === 'test'
          ? store.getters.testRobots[payload.token]
          : store.getters.robots[payload.token]
      if (rob === undefined) {
        return
      }
      if (payload.reached != undefined) {
        await rob.sendMail(payload.message)
        rob.close()
        rob.threshold = payload.reached
        if (
          rob.settings.threshold_email === rob.user.email &&
          rob.settings.action === 'auto'
        ) {
          axios.post(`${rob.api_url}/robot/trade-max`, {
            reached: payload.reached,
            reason: payload.reason,
            env: payload.namespace,
          })
          setTimeout(
            () => {
              store.events.publish('closeConnections', {
                namespace: payload.namespace,
              })
            },
            140000,
            store
          )
        }
        rob.debug(rob, `${new Date()}: threshold reached`)
      } else {
        rob.threshold = 0
        rob.trading = false
        rob = await rob.connect()
      }
      store.commit(rob.savePath, rob)
    } catch (err) {
      logger(`${new Date()}: ${err.message}`, tradeErrLog)
    }
  },
  closeConnections: async (store, payload) => {
    try {
      let robs =
        payload.namespace === 'test'
          ? store.getters.testRobots
          : store.getters.robots
      for (const token in robs) {
        let robot = robs[token]
        if (robot !== undefined) {
          robot.threshold = 1
          robot.trading === true ? robot.closeLater() : robot.close()
          store.commit(robot.savePath, robot)
        }
      }
    } catch (err) {
      logger(`${new Date()}: ${err.message}`, tradeErrLog)
    }
  },
  sendMail: ({ getters }, payload) => {
    try {
      const { message, email } = payload
      axios.post(`${getters.apiUrl}/api2/v2/robot/send-message`, {
        to: email,
        message: message,
        copy: 0,
      })
    } catch (err) {
      logger(`${new Date()}: ${err.message}`, tradeErrLog)
    }
  },
  wake: async (store, payload) => {
    try {
      const { settings, trade_options, user, today } = payload
      //const { getters, commit } = store
      if (!user.deriv_token) return
      let rob =
        settings.namespace === 'test'
          ? store.getters.testRobots[user.deriv_token]
          : store.getters.robots[user.deriv_token]
      if (rob === undefined) {
        rob = new Robot({
          app_id: settings.app_id,
          user: user,
          trade_options: trade_options,
          settings: settings,
          today: today,
          seconds_to_cancel: parseFloat(trade_options.seconds_to_cancel),
        })
      } else {
        rob = await rob.setup(trade_options, user, settings, today)
      }
      await store.commit(rob.savePath, rob)
    } catch (err) {
      logger(`${new Date()}: ${err.message}`, telegramErrLog)
    }
  },
  tradeCount: ({ getters }, payload) => {
    try {
      const { email, namespace } = payload
      axios.post(`${getters.apiUrl}/api2/v2/robot/trade-count`, {
        email: email,
        env: namespace,
      })
    } catch (err) {
      logger(`${new Date()}: ${err.message}`, tradeErrLog)
    }
  },
  //copy
  copyStart: async (store, payload) => {
    try {
      const { copy_options, user, settings } = payload
      if (!user.deriv_token || user.deriv_token === null) return
      let rob =
        settings.namespace === 'test'
          ? store.getters.testRobots[user.deriv_token]
          : store.getters.robots[user.deriv_token]
      if (rob === undefined) {
        rob = new Robot({
          app_id: settings.app_id,
          user: user,
          copy_options: copy_options,
          settings: settings,
        })
        //await rob.setupCopy(copy_options, user,  settings)
      } else {
        rob = await rob.setupCopy(copy_options, user, settings)
      }
      setTimeout(
        async () => {
          await rob.startCopy()
        },
        3000,
        rob
      )
    } catch (err) {
      logger(`${new Date()}: ${err.message}`, tradeErrLog)
    }
  },
  copyEnd: async (store, payload) => {
    try {
      const { user, settings } = payload
      if (!user.deriv_token || user.deriv_token === null) return
      let rob =
        settings.namespace === 'test'
          ? store.getters.testRobots[user.deriv_token]
          : store.getters.robots[user.deriv_token]
      if (rob === undefined) {
        rob = new Robot({
          app_id: settings.app_id,
          user: user,
          settings: settings,
        })
      } else {
        rob = await rob.setupCopy(null, user, settings)
      }
      setTimeout(
        async () => {
          await rob.stopCopy()
        },
        3000,
        rob
      )
    } catch (err) {
      logger(`${new Date()}: ${err.message}`, tradeErrLog)
    }
  },
  copyStatistics: async (store, payload) => {
    try {
      const { user, settings } = payload
      if (!user.deriv_token || user.deriv_token === null) return
      let rob =
        settings.namespace === 'test'
          ? store.getters.testRobots[user.deriv_token]
          : store.getters.robots[user.deriv_token]
      if (rob === undefined) {
        rob = new Robot({
          user: user,
          settings: settings,
        })
      } else {
        rob = await rob.setupCopy(null, user, settings)
      }
      setTimeout(
        async () => {
          await rob.copyStatistics()
        },
        2000,
        rob
      )
    } catch (err) {
      logger(`${new Date()}: ${err.message}`, tradeErrLog)
    }
  },
  copyList: async (store, payload) => {
    try {
      const { user, settings } = payload
      if (!user.deriv_token || user.deriv_token === null) return
      let rob =
        settings.namespace === 'test'
          ? store.getters.testRobots[user.deriv_token]
          : store.getters.robots[user.deriv_token]
      if (rob === undefined) {
        rob = new Robot({
          user: user,
          settings: settings,
        })
      } else {
        rob = await rob.setupCopy(null, user, settings)
      }
      setTimeout(
        async () => {
          await rob.copiers()
        },
        2000,
        rob
      )
    } catch (err) {
      logger(`${new Date()}: ${err.message}`, tradeErrLog)
    }
  },
  //trader section
  trader: async (store, payload) => {
    try {
      const { settings, trade_options, user, today } = payload
      if (!user.deriv_account || user.deriv_account === null) return
      let rob = store.getters.traderRobotsSig[user.deriv_account]
      if (rob === undefined) {
        rob = new TraderRobot({
          user: user,
          settings: settings,
          today: today,
          savePath: 'addTraderRobotSig',
          deletePath: 'removeTraderRobotSig',
        })
      }
      await rob.initTrade(trade_options, user, settings, today)
    } catch (err) {
      logger(`${new Date()}: ${err.message}`, tradeErrLog)
    }
  },

  digits: async (store, payload) => {
    try {
      const { user, settings, trade_options } = payload
      //const { getters, commit } = store
      if (!user.deriv_account || user.deriv_account === null) return
      let rob = store.getters.traderRobots[user.deriv_account]
      if (rob === undefined) {
        rob = new TraderRobot({
          user: user,
          settings: settings,
          today: settings.today,
          savePath: 'addTraderRobot',
          deletePath: 'removeTraderRobot',
        })
      }
      rob = await rob.setupDigit(user, settings, trade_options)
      await rob.checkThreshold()
      let ti = 5000
      if (isEmpty(rob.trade)) {
        ti = 5000
      }
      setTimeout(() => {
        rob.initDigit(trade_options.symbol)
      }, ti)
    } catch (err) {
      logger(`${new Date()}: ${err.message}`, tradeErrLog)
    }
  },

  traderRevoke: async (store, payload) => {
    try {
      const { user, settings } = payload
      let rob = {}
      if (user.is_trading === undefined) {
        rob = store.getters.testRobots[user.deriv_account]
      } else if (user.is_trading === 'digits') {
        rob = store.getters.traderRobots[user.deriv_account]
      } else {
        rob = store.getters.traderRobotsSig[user.deriv_account]
      }
      if (rob === undefined) {
        const params = {
          app_id: settings.app_id,
          user: user,
          settings: settings,
          savePath:
            user.is_trading === 'digits'
              ? 'addTraderRobot'
              : 'addTraderRobotSig',
          deletePath:
            user.is_trading === 'digits'
              ? 'removeTraderRobot'
              : 'removeTraderRobotSig',
        }
        rob = new TraderRobot(params)
      } else {
        rob = await rob.connect()
      }
      setTimeout(async () => {
        await rob.initRevoke()
        store.commit(rob.deletePath, user.deriv_account)
      }, 3000)
    } catch (err) {
      logger(`${new Date()}: ${err.message}`, tradeErrLog)
    }
  },
  traderThreshold: async (store, payload) => {
    try {
      let rob = undefined
      if (payload.type === undefined) {
        rob = store.getters.testRobots[payload.deriv_account]
      } else if (payload.type === 'digits') {
        rob = store.getters.traderRobots[payload.deriv_account]
      } else {
        rob = store.getters.traderRobotsSig[payload.deriv_account]
      }
      if (rob === undefined) {
        return
      }
      if (payload.reached !== undefined) {
        await rob.sendMail(payload.message, rob.settings.threshold_email)
        rob.trade.threshold = payload.reached
        rob.close()
        if (
          rob.settings.threshold_email === rob.user.email &&
          rob.settings.action === 'auto'
        ) {
          axios.post(`${rob.api_url}/indexes/trade-max`, {
            reached: payload.reached,
            reason: payload.reason,
            env: payload.namespace,
          })
          /*setTimeout(
            () => {
              store.events.publish('closeConnections', {
                namespace: payload.namespace,
              })
            },
            140000
          )*/
        }
        // rob.debug(rob, `${new Date()}: threshold reached`)
      } else {
        rob.trade.threshold = 0
        rob.trading = false
        if (payload.type === 'digits' && rob.digits.tradeOptions.symbol) {
          await rob.setupDigit(rob.user, payload.settings, {})
          setTimeout(() => {
            rob.initDigit(rob.digits.tradeOptions.symbol)
          }, 3000)
        } else if (payload.type === 'signals') {
          rob = await rob.connect()
        }
      }
      store.commit(rob.savePath, rob)
    } catch (err) {
      logger(`${new Date()}: ${err.message}`, tradeErrLog)
    }
  },
  traderCloseConnections: async (store, payload) => {
    try {
      let robs = {}
      if (payload.user.is_trading === undefined) {
        robs = store.getters.testRobots
      } else if (payload.user.is_trading === 'digits') {
        robs = store.getters.traderRobots
      } else {
        robs = store.getters.traderRobotsSig
      }
      for (const token in robs) {
        let robot = robs[token]
        if (robot !== undefined) {
          robot.threshold = 1
          robot.trading === true ? robot.closeLater() : robot.close()
          store.commit(robot.savePath, robot)
        }
      }
    } catch (err) {
      logger(`${new Date()}: ${err.message}`, tradeErrLog)
    }
  },
  traderWake: async (store, payload) => {
    try {
      const { settings, user, trade_options } = payload
      if (!user.deriv_account) return
      let rob = undefined
      if (user.is_trading === undefined) {
        rob = store.getters.testRobots[user.deriv_account]
      } else if (user.is_trading === 'signals') {
        rob = store.getters.traderRobotsSig[user.deriv_account]
      } else if (user.is_trading === 'digits') {
        rob = store.getters.traderRobots[user.deriv_account]
      }
      if (rob === undefined) {
        rob = new TraderRobot({
          app_id: settings.deriv_app_id,
          user: user,
          settings: settings,
          today: settings.today,
          savePath:
            user.is_trading === 'digits'
              ? 'addTraderRobot'
              : 'addTraderRobotSig',
          deletePath:
            user.is_trading === 'digits'
              ? 'removeTraderRobot'
              : 'removeTraderRobotSig',
        })
      }
      rob.trade.threshold = 0
      rob.trading = false
      rob.trade.message = ''
      if (user.is_trading === 'signals') {
        rob = await rob.setup({}, user, settings, settings.today)
      } else if (user.is_trading === 'digits') {
        rob = await rob.setupDigit(user, settings, trade_options)
        setTimeout(async () => {
          await rob.checkThreshold()
          if (rob.digits.subscribe_id) {
            rob.task = 'forget'
            rob.next = 'end'
            const data = {
              forget: rob.digits.subscribe_id,
              passthrough: {
                next: 'end',
              },
            }
            await rob.send(data)
            delete this.digits.subscribe_id
          }
          if (trade_options.symbol !== undefined) {
            rob.initDigit(trade_options.symbol)
          }
        }, 3000) // wait for connection to complete
      }
    } catch (err) {
      logger(`${new Date()}: ${err.message}`, traderErrLog)
    }
  },
  traderSleep: async (store, payload) => {
    try {
      const { settings, user } = payload
      //const { getters, commit } = store
      if (!user.deriv_account) return
      let rob = undefined
      if (user.is_trading === 'signals') {
        rob = store.getters.traderRobotsSig[user.deriv_account]
      } else if (user.is_trading === 'digits') {
        rob = store.getters.traderRobots[user.deriv_account]
      } else {
        rob = store.getters.testRobots[user.deriv_account]
      }
      if (rob === undefined) {
        return
      }
      if (rob.trading === true) {
        setTimeout(async () => {
          await rob.close()
        }, 5 * 1000 * 60) //wait for 5 minutes to ensre trade has ended
      } else {
        await rob.close()
      }
      return true
    } catch (err) {
      console.log(err.message)
    }
  },
  async sendMessage(store, payload) {
    axios.post(`${store.getters.traderApiUrl}/site/send-message`, payload, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
    process.env.NODE_ENV !== 'production' ? console.log(payload) : ""
  },
  async updateUserBalance(store, payload) {
    payload.platform = 'web'
    payload.type = 'trader'
    // const token = getters.user.access_token;
    axios
      .post(
        `${store.getters.traderApiUrl}/indexes/update-user-balance`,
        payload,
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            //Authorization: `Basic ${getters.user.access_token}`
          },
        }
      )
      .catch(async (error) => {
        await logger(error.message)
      })
  },
  async mt5(store, payload) {
    try {
      const { action, wait_time, start_url } = payload
      if (action != 'restart' || Number.isNaN(wait_time)) {
        process.env.NODE_ENV !== 'production' ? console.log(`${action} - ${wait_time}`) : ''
        return
      }
      setTimeout(() => {
        axios.post(start_url, {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        })
      }, wait_time * 1000 * 60)
    } catch (error) {
      console.log(error.message)
    }
  },
}

export default actions
