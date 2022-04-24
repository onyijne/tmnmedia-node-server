import { logger } from '../utils/helpers'

const mutations = {
  addRobot: (state, robot) => {
    try {
      const robots = state.robots
      robots[robot.user.deriv_token] = robot
      state.robots = robots
    } catch (err) {
      logger(err)
    }
  },
  removeRobot: (state, deriv_token) => {
    try {
      const robots = state.robots
      delete robots[deriv_token]
      state.robots = robots
    } catch (err) {
      logger(err)
    }
  },
  resetRobots: (state, payload) => {
    state.robots = payload
  },
  addBotUser: (state, botUser) => {
    try {
      const botUsers = state.botUsers
      botUsers[botUser.user.id] = botUser
      state.botUsers = botUsers
    } catch (err) {
      logger(err)
    }
  },
  removeBotUser: (state, id) => {
    try {
      const botUsers = state.botUsers
      delete botUsers[id]
      state.botUsers = botUsers
    } catch (err) {
      logger(err)
    }
  },
  resetBotUsers: (state, payload) => {
    state.botUsers = payload
  },
  addTestRobot: (state, robot) => {
    try {
      const robots = state.testRobots
      robots[robot.user.deriv_token] = robot
      state.testRobots = robots
    } catch (err) {
      logger(err)
    }
  },
  removeTestRobot: (state, deriv_token) => {
    try {
      const robots = state.testRobots
      delete robots[deriv_token]
      state.testRobots = robots
    } catch (err) {
      logger(err)
    }
  },
  resetTestRobots: (state, payload) => {
    state.testRobots = payload
  },
  addTraderRobot: (state, robot) => {
    try {
      const robots = state.traderRobots
      robots[robot.user.deriv_account] = robot
      state.traderRobots = robots
    } catch (err) {
      logger(err)
    }
  },
  removeTraderRobot: (state, deriv_account) => {
    try {
      const robots = state.traderRobots
      delete robots[deriv_account]
      state.traderRobots = robots
    } catch (err) {
      logger(err)
    }
  },
  resetTraderRobots: (state, payload) => {
    state.traderRobots = payload
  },
  addTraderRobotSig: (state, robot) => {
    try {
      const robots = state.traderRobotsSig
      robots[robot.user.deriv_account] = robot
      state.traderRobotsSig = robots
    } catch (err) {
      logger(err)
    }
  },
  removeTraderRobotSig: (state, deriv_account) => {
    try {
      const robots = state.traderRobotsSig
      delete robots[deriv_account]
      state.traderRobotsSig = robots
    } catch (err) {
      logger(err)
    }
  },
  resetTraderRobotsSig: (state, payload) => {
    state.traderRobotsSig = payload
  },
  addSignalRobot: (state, robot) => {
    try {
      const robots = state.signalRobots
      robots[robot.user.deriv_account] = robot
      state.signalRobots = robots
    } catch (err) {
      logger(err)
    }
  },
  removeSignalRobot: (state, deriv_account) => {
    try {
      const robots = state.signalRobots
      delete robots[deriv_account]
      state.signalRobots = robots
    } catch (err) {
      logger(err)
    }
  },
  resetSignalRobots: (state, payload) => {
    state.signalRobots = payload
  },
  updateDigitsData(state, data) {
    // state.streamDigitData = data.tickSpotData || state.streamDigitData
    const robots = state.traderRobots
    robots[robot.user.deriv_account] = robot
    state.digits = { ...state.digits, ...data }
    // Vue.set(state, "digits", { ...state.digits, ...data });
  },
}
export default mutations
