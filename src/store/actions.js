import axios from 'axios'
import Robot from '../robot'
import { logger } from '../utils/helpers'

const actions = {
	trade: async (store, payload) => {
		try{
		  const { settings, trade_options, user, today } = payload
			//const { getters, commit } = store
			let rob = store.getters.robots[user.deriv_token]
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
		  return
		} catch(err){
			logger(err)
		}	
	},
	revoke: async (store, deriv_token) => {
		let rob = store.getters.robots[deriv_token]
			if (rob === undefined) {
				rob = new Robot({
					user: { deriv_token: deriv_token }
				})
			} else {
				rob = await rob.connect()
			}
			await rob.initRevoke()
			store.commit('removeRobot', deriv_token)
	},
	threshold: async (store, payload) => {
		let rob = store.getters.robots[payload.token]
			if (rob === undefined) {
				return
			}
		if (payload.reached != undefined) {
			await rob.sendMail(payload.nessage)
			rob.close()
			rob.threshold = payload.reached
      //rob.trading = true
			axios.post(`${store.getters.apiUrl}/site/trade-max`, {
	      reached: payload.reached.replace('-', ''),
	      reason: payload.reason
	    })
		} else {
		  rob.threshold = 0
          rob.trading = false
		 // await rob.init()
		}
		store.commit('addRobot', rob)
	}
}

export default actions