import Store from '../store'
import TraderRobot from '../trader-robot'

class TraderBot {
  constructor() {
    this.tstore = Store
    const trade = this

    trade.tstore.subscribe('threshold', async (payload) => {
      await trade.tstore.dispatch('traderThreshold', payload)
    })

    trade.tstore.subscribe('closeConnections', async (payload) => {
      await trade.tstore.dispatch('traderCloseConnections', payload)
    })

    trade.tstore.subscribe('tradeCount', async (payload) => {
      await trade.tstore.dispatch('traderTradeCount', payload)
    })

    trade.tstore.subscribe('sendMail', async (payload) => {
      await trade.tstore.dispatch('sendMail', payload)
    })
  }

  async initTraderWaker( user, settings) {
    try {
      if (!user.deriv_account || user.is_trading !== 'signals') return
      let rob = undefined
      rob = this.tstore.getters.signalRobots[user.deriv_account]
      if (rob === undefined) {
        rob = new TraderRobot({
          user: user,
          settings: settings,
          today: settings.today
        })
      }
      rob = await rob.setup({}, user, settings, settings.today)
      setTimeout(async() => {
        await rob.checkThreshold(rob)
      }, 2000)
      await this.tstore.commit(rob.savePath, rob)
      return {
        status: 'success',
        message: 'done'
      }
    } catch (err) {
      return {
        status: 'error',
        message: err.message
      }
    }
  }

  async initTrader(trade_options, user, settings, today) {
    await this.tstore.dispatch('trader', {
      trade_options: trade_options,
      user: user,
      settings: settings,
      today: today,
    })
    return
  }

  async initTraderRevoke(user, settings) {
    await this.tstore.dispatch('traderRevoke', {
      user: user,
      settings: settings,
    })
    return
  }

  async resetTraderRobots(settings, trade_options, digit_users, signal_users) {
    try {
      for (let i = digit_users.length - 1; i >= 0; i--) {
        await this.tstore.dispatch('traderWake', {
          trade_options: trade_options,
          user: digit_users[i],
          settings: settings
        })
      }
      for (let i = signal_users.length - 1; i >= 0; i--) {
        await this.tstore.dispatch('traderWake', {
          trade_options: {},
          user: signal_users[i],
          settings: settings
        })
      }
    } catch(err) {
      console.log(`${new Date()}: ${err.message} from resetTraderRobots method in TrdaerBot.js`)
    }
  }

  async resetTraderTestRobots(settings, trade_options, digit_users, signal_users) {
    for (const token in this.tstore.getters.testRobots) {
      await this.tstore.dispatch('traderThreshold', {
        deriv_account: token,
        namespace: 'test',
        settings: settings
      })
    }
  }

  

  async initTraderSleep(user, settings) {
    await this.tstore.dispatch('traderSleep', {
      user: user,
      settings: settings,
    })
    return
  }

  async initDigits(user, settings, trade_options) {
    return await this.tstore.dispatch('digits', {
      user: user,
      settings: settings,
      trade_options: trade_options
    })
  }
}

export default TraderBot
