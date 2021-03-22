import Store from './store'
import Robot from './robot'

class Trader {
  constructor() {
    this.store = Store
    const rob = this
    rob.store.events.subscribe('threshold', async (payload) => {
      await rob.store.dispatch('threshold', payload)
    })
  }

  async initTrade(trade_options, user,  settings, today) {
    await this.store.dispatch('trade', {
      trade_options: trade_options,
      user: user,
      settings: settings,
      today: today
    })
    return
  }

  async initRevoke(deriv_token) {
    await this.store.dispatch('revoke', deriv_token)
    return
  }

  async resetRobots() {
    for (const token in this.store.getters.robots) {
      await this.store.dispatch('threshold', { token: token })
    }
  }
}

export default Trader
