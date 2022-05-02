import Store from '../store/trade'

class SignalBot {
  constructor() {
    this.store = Store
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
  }

  async initTrade(trade_options, user, settings, today) {
    this.store.dispatch('trade', {
      trade_options,
      user,
      settings,
      today,
    })
    return
  }

  async initWake(trade_options, user, settings, today) {
    this.store.dispatch('wake', {
      trade_options,
      user,
      settings,
      today,
    })
    return
  }

  async initRevoke(deriv_token, settings) {
    this.store.dispatch('revoke', {
      deriv_token,
      settings,
    })
    return
  }

  async resetRobots() {
    for (const token in this.store.getters.robots) {
      this.store.dispatch('threshold', { token: token, namespace: '' })
    }
  }

  async resetTestRobots() {
    for (const token in this.store.getters.testRobots) {
      this.store.dispatch('threshold', {
        token,
        namespace: 'test',
      })
    }
  }
}

export default SignalBot
