import Store from './store/trade'
import tStore from './store/trader'

class Trader {
  constructor() {
    this.store = Store
    this.tstore = tStore
    const trade = this
    trade.store.subscribe('threshold', async (payload) => {
      await trade.store.dispatch('threshold', payload)
    })

    trade.store.subscribe('closeConnections', async (payload) => {
      await trade.store.dispatch('closeConnections', payload)
    })

    trade.store.subscribe('tradeCount', async (payload) => {
      await trade.store.dispatch('tradeCount', payload)
    })

    trade.store.subscribe('sendMail', async (payload) => {
      await trade.store.dispatch('sendMail', payload)
    })
    //trader
    trade.tstore.subscribe('threshold', async (payload) => {
      await trade.tstore.dispatch('trader/traderThreshold', payload)
    })

    trade.tstore.subscribe('closeConnections', async (payload) => {
      await trade.tstore.dispatch('trader/traderCloseConnections', payload)
    })

    trade.tstore.subscribe('tradeCount', async (payload) => {
      await trade.tstore.dispatch('trader/traderTradeCount', payload)
    })

    trade.tstore.subscribe('sendMail', async (payload) => {
      await trade.tstore.dispatch('trader/sendMail', payload)
    })
  }

  async initTrade(trade_options, user, settings, today) {
    await this.store.dispatch('trade', {
      trade_options: trade_options,
      user: user,
      settings: settings,
      today: today,
    })
    return
  }

  async initWake(trade_options, user, settings, today) {
    await this.store.dispatch('wake', {
      trade_options: trade_options,
      user: user,
      settings: settings,
      today: today,
    })
    return
  }

  async initRevoke(deriv_token, settings) {
    await this.store.dispatch('revoke', {
      deriv_token: deriv_token,
      settings: settings,
    })
    return
  }

  async resetRobots() {
    for (const token in this.store.getters.robots) {
      await this.store.dispatch('threshold', { token: token, namespace: '' })
    }
  }

  async resetTestRobots() {
    for (const token in this.store.getters.testRobots) {
      await this.store.dispatch('threshold', {
        token: token,
        namespace: 'test',
      })
    }
  }

  async startCopy(copy_options, user, settings) {
    await this.store.dispatch('copyStart', {
      copy_options: copy_options,
      user: user,
      settings: settings,
    })
    return 'ok'
  }

  async endCopy(user, settings) {
    await this.store.dispatch('copyEnd', {
      user: user,
      settings: settings,
    })
    return 'ok'
  }

  async copyStatistics(user, settings) {
    const res = await this.store.dispatch('copyStatistics', {
      user: user,
      settings: settings,
    })
    return res
  }

  async copyList(user, settings) {
    const res = await this.store.dispatch('copyList', {
      user: user,
      settings: settings,
    })
    return res
  }

  async initTrader(trade_options, user, settings, today) {
    await this.tstore.dispatch('trader/trader', {
      trade_options: trade_options,
      user: user,
      settings: settings,
      today: today,
    })
    return
  }

  async initTraderRevoke(user, settings) {
    await this.tstore.dispatch('trader/traderRevoke', {
      user: user,
      settings: settings,
    })
    return
  }

  async resetTraderRobots(settings) {
    for (const token in this.tstore.getters.signalRobots) {
      await this.tstore.dispatch('trader/traderThreshold', {
        deriv_account: token,
        namespace: '',
        type: 'signals',
        settings: settings
      })
    }
    for (const token in this.tstore.getters.traderRobots) {
      await this.tstore.dispatch('trader/traderThreshold', {
        deriv_account: token,
        namespace: '',
        type: 'digits',
        settings: settings
      })
    }
  }

  async resetTraderTestRobots(settings) {
    for (const token in this.tstore.getters.testRobots) {
      await this.tstore.dispatch('trader/traderThreshold', {
        deriv_account: token,
        namespace: 'test',
        settings: settings
      })
    }
  }

  async initTraderWaker(trade_options, user, settings, today) {
    await this.store.dispatch('trader/traderWake', {
      trade_options: trade_options,
      user: user,
      settings: settings,
      today: today,
    })
    return
  }

  async initDigits(user, settings, trade_options) {
    await this.store.dispatch('trader/digits', {
      user: user,
      settings: settings,
      trade_options: trade_options
    })
    return
  }
}

export default Trader
