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
	}
}
export default mutations