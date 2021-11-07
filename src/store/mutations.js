import { logger } from '../utils/helpers'

const mutations = {
	addRobot: (state, robot) => {
		try{
			const robots = state.robots
			robots[robot.user.deriv_token] = robot
			state.robots = robots
		} catch(err){
			logger(err)
		}
	},
	removeRobot: (state, deriv_token) => {
		try{
			const robots = state.robots
			delete robots[deriv_token]
			state.robots = robots
		} catch(err){
			logger(err)
		}		
	},
	resetRobots: (state, payload) => {
		state.robots = payload
	},
	addBotUser: (state, botUser) => {
		try{
			const botUsers = state.botUsers
			botUsers[botUser.user.id] = botUser
			state.botUsers = botUsers
		} catch(err){
			logger(err)
		}
	},
	removeBotUser: (state, id) => {
		try{
			const botUsers = state.botUsers
			delete botUsers[id]
			state.botUsers = botUsers
		} catch(err){
			logger(err)
		}		
	},
	resetBotUsers: (state, payload) => {
		state.botUsers = payload
	},
	addTestRobot: (state, robot) => {
		try{
			const robots = state.testRobots
			robots[robot.user.deriv_token] = robot
			state.testRobots = robots
		} catch(err){
			logger(err)
		}
	},
	removeTestRobot: (state, deriv_token) => {
		try{
			const robots = state.testRobots
			delete robots[deriv_token]
			state.testRobots = robots
		} catch(err){
			logger(err)
		}		
	},
	resetTestRobots: (state, payload) => {
		state.testRobots = payload
	}
}
export default mutations