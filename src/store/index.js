import Store from '../utils/store'
import actions from './actions.js'
import mutations from './mutations.js'
import state from './state.js'
import getters from './getters.js'

export default new Store({
  actions,
  mutations,
  state,
  getters,
})
