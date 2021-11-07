import axios from 'axios'
import Robot from '../robot'
import TraderRobot from '../trader-robot'
import { logger } from '../utils/helpers'
import BotUser from '../bot-user'

const telegramErrLog = '/var/www/robot/web/reports/server/telegram.txt'
const tradeErrLog = '/var/www/robot/web/reports/server/trade.txt'
const traderErrLog = '/var/www/robot/web/reports/server/trader.txt'

const actions = {
	trade: async (store, payload) => {
		try{
		  const { settings, trade_options, user, today } = payload
			//const { getters, commit } = store
          if (!user.deriv_token || user.deriv_token === null) return
		    let rob = (settings.namespace === 'test') ?
		     store.getters.testRobots[user.deriv_token] : store.getters.robots[user.deriv_token]
			if (rob === undefined) {
				rob = new Robot({
				  user: user,
				  trade_options: trade_options,
				  settings: settings,
				  today: today,
				  seconds_to_cancel: parseFloat(trade_options.seconds_to_cancel)
				})
			} else {
				rob = await rob.setup(trade_options, user,  settings, today)
			}
		  await	rob.initTrade(trade_options, user,  settings, today)
		} catch(err){
			logger(`${new Date()}: ${err.message}`, tradeErrLog)
		}
	},
	revoke: async (store, payload) => {
		try {
			const { deriv_token, settings } = payload
      let rob = (settings.namespace === 'test') ?
		     store.getters.testRobots[deriv_token] : store.getters.robots[deriv_token]
			if (rob === undefined) {
				const params = {
					app_id: settings.app_id,
					user: { deriv_token: deriv_token },
					settings: settings
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
		try{
		  let rob = (payload.namespace === 'test') ?
		     store.getters.testRobots[payload.token] : store.getters.robots[payload.token]
			if (rob === undefined) {
				return
			}
			if (payload.reached != undefined) {
			  await rob.sendMail(payload.message)
				rob.close()
				rob.threshold = payload.reached
        if (rob.settings.threshold_email === rob.user.email && rob.settings.action === 'auto') {
          axios.post(`${rob.api_url}/robot/trade-max`, {
            reached: payload.reached,
            reason: payload.reason,
            env: payload.namespace
          })
          setTimeout(() => {
          	store.events.publish('closeConnections', { namespace: payload.namespace })
          }, 140000, store)
        }
        rob.debug(rob, `${new Date()}: threshold reached`)
      } else {
			  rob.threshold = 0
	      rob.trading = false
			  rob = await rob.connect()
			}
			store.commit(rob.savePath, rob)
		} catch(err){
			logger(`${new Date()}: ${err.message}`, tradeErrLog)
		}	
	},
	closeConnections: async (store, payload) => {
	  try {
	  	let robs = (payload.namespace === 'test') ?
		     store.getters.testRobots : store.getters.robots
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
          copy: 0
        })
      } catch (err) {
        logger(`${new Date()}: ${err.message}`, tradeErrLog)
      }
  },
  wake: async (store, payload) => {
	  try{
	  const { settings, trade_options, user, today } = payload
		//const { getters, commit } = store
       if (!user.deriv_token) return
	   let rob = (settings.namespace === 'test') ?
		     store.getters.testRobots[user.deriv_token] : store.getters.robots[user.deriv_token]
		if (rob === undefined) {
			rob = new Robot({
				app_id: settings.app_id,
			  user: user,
			  trade_options: trade_options,
			  settings: settings,
			  today: today,
			  seconds_to_cancel: parseFloat(trade_options.seconds_to_cancel)
			})
		} else {
			rob = await rob.setup(trade_options, user,  settings, today)
		}
	  await	store.commit(rob.savePath, rob)
	  } catch(err){
		  logger(`${new Date()}: ${err.message}`, telegramErrLog)
	  }	
  },
  tradeCount: ({ getters }, payload) => {
      try {
      	const { email, namespace } = payload
        axios.post(`${getters.apiUrl}/api2/v2/robot/trade-count`, {
          email: email,
          env: namespace
        })
      } catch (err) {
        logger(`${new Date()}: ${err.message}`, tradeErrLog)
      }
  },
  copyStart: async (store, payload) => {
		try{
		  const { copy_options, user, settings } = payload
          if (!user.deriv_token || user.deriv_token === null) return
		    let rob = (settings.namespace === 'test') ?
		     store.getters.testRobots[user.deriv_token] : store.getters.robots[user.deriv_token]
			if (rob === undefined) {
				rob = new Robot({
				  app_id: settings.app_id,
				  user: user,
				  copy_options: copy_options,
				  settings: settings
				})
				//await rob.setupCopy(copy_options, user,  settings)
			} else {
				rob = await rob.setupCopy(copy_options, user,  settings)
			}
			setTimeout(async () => {
				await rob.startCopy()
			}, 3000, rob)
		} catch(err){
			logger(`${new Date()}: ${err.message}`, tradeErrLog)
		}
	},
	copyEnd: async (store, payload) => {
		try{
		  const { user, settings } = payload
          if (!user.deriv_token || user.deriv_token === null) return
		    let rob = (settings.namespace === 'test') ?
		     store.getters.testRobots[user.deriv_token] : store.getters.robots[user.deriv_token]
			if (rob === undefined) {
				rob = new Robot({
				  app_id: settings.app_id,
				  user: user,
				  settings: settings
				})
			} else {
				rob = await rob.setupCopy(null, user,  settings)
			}
			setTimeout(async () => {
				await rob.stopCopy()
			}, 3000, rob)
		} catch(err){
			logger(`${new Date()}: ${err.message}`, tradeErrLog)
		}
	},
	copyStatistics: async (store, payload) => {
		try{
		  const { user, settings } = payload
          if (!user.deriv_token || user.deriv_token === null) return
		    let rob = (settings.namespace === 'test') ?
		     store.getters.testRobots[user.deriv_token] : store.getters.robots[user.deriv_token]
			if (rob === undefined) {
				rob = new Robot({
				  user: user,
				  settings: settings
				})
			} else {
				rob = await rob.setupCopy(null, user,  settings)
			}
			setTimeout(async () => {
				await rob.copyStatistics()
			}, 2000, rob)
		} catch(err){
			logger(`${new Date()}: ${err.message}`, tradeErrLog)
		}
	},
	copyList: async (store, payload) => {
		try{
		  const { user, settings } = payload
          if (!user.deriv_token || user.deriv_token === null) return
		    let rob = (settings.namespace === 'test') ?
		     store.getters.testRobots[user.deriv_token] : store.getters.robots[user.deriv_token]
			if (rob === undefined) {
				rob = new Robot({
				  user: user,
				  settings: settings
				})
			} else {
				rob = await rob.setupCopy(null, user,  settings)
			}
			setTimeout(async () => {
				await rob.copiers()
			}, 2000, rob)
		} catch(err){
			logger(`${new Date()}: ${err.message}`, tradeErrLog)
		}
	},

	trader: async (store, payload) => {
		try{
		  const { settings, trade_options, user, today } = payload
			//const { getters, commit } = store
          if (!user.deriv_token || user.deriv_token === null) return
		    let rob = (settings.namespace === 'test') ?
		     store.getters.traderTestRobots[user.deriv_token] : store.getters.traderRobots[user.deriv_token]
			if (rob === undefined) {
				rob = new TraderRobot({
				  user: user,
				  trade_options: trade_options,
				  settings: settings,
				  today: today,
				  seconds_to_cancel: parseFloat(trade_options.seconds_to_cancel)
				})
			} else {
				rob = await rob.setup(trade_options, user,  settings, today)
			}
		  await	rob.initTrade(trade_options, user,  settings, today)
		} catch(err){
			logger(`${new Date()}: ${err.message}`, tradeErrLog)
		}
	},

	traderRevoke: async (store, payload) => {
		try {
			const { deriv_token, settings } = payload
      let rob = (settings.namespace === 'test') ?
		     store.getters.traderTestRobots[deriv_token] : store.getters.traderRobots[deriv_token]
			if (rob === undefined) {
				const params = {
					app_id: settings.app_id,
					user: { deriv_token: deriv_token },
					settings: settings
				}
				rob = new TraderRobot(params)
			} else {
				rob = await rob.connect()
			}
			await rob.initRevoke()
			store.commit(rob.deletePath, deriv_token)
    } catch (err) {
      logger(`${new Date()}: ${err.message}`, tradeErrLog)
    }
	},
	traderThreshold: async (store, payload) => {
		try{
		  let rob = (payload.namespace === 'test') ?
		     store.getters.traderTestRobots[payload.token] : store.getters.traderTobots[payload.token]
			if (rob === undefined) {
				return
			}
			if (payload.reached != undefined) {
			  await rob.sendMail(payload.message)
				rob.close()
				rob.threshold = payload.reached
        if (rob.settings.threshold_email === rob.user.email && rob.settings.action === 'auto') {
          axios.post(`${rob.api_url}/indexes/trade-max`, {
            reached: payload.reached,
            reason: payload.reason,
            env: payload.namespace
          })
          setTimeout(() => {
          	store.events.publish('closeConnections', { namespace: payload.namespace })
          }, 140000, store)
        }
        rob.debug(rob, `${new Date()}: threshold reached`)
      } else {
			  rob.threshold = 0
	      rob.trading = false
			  rob = await rob.connect()
			}
			store.commit(rob.savePath, rob)
		} catch(err){
			logger(`${new Date()}: ${err.message}`, tradeErrLog)
		}	
	},
	traderCloseConnections: async (store, payload) => {
	  try {
	  	let robs = (payload.namespace === 'test') ?
		     store.getters.traderTestRobots : store.getters.traderRobots
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
}

export default actions