import PubSub from './pubSub'

export default class Store {
  constructor (params) {
    this.actions = params.actions || {}
    this.mutations = params.mutations || {}
    this.getters = {}
    this.status = 'idle'
    this.events = new PubSub()

    
    let rob = this

    rob.state = new Proxy(params.state || {}, {
      set: function (state, key, value) {
        state[key] = value

        rob.events.publish('stateChange', rob.state)

        if (rob.status !== 'mutation') {
          console.warn(`You should use a mutation to set ${key}`) // inform the develper to use mutation
        }

        rob.status = 'idle'

        return true
      }
    })

    rob.setGetters(params.getters || {}, this.state)

    rob.events.subscribe('stateChange', async function(state) {
      //console.log(`stateChange event called`)
      await rob.setGetters(params.getters || {}, state)
    })
    
    //(params.getters) ? this.setGetters(params.getters) : ''
  }

  async dispatch (actionKey, payload) {
    if (typeof this.actions[actionKey] !== 'function') {
      console.error(`Action "${actionKey} doesn't exist.`)
      return false
    }

    console.groupCollapsed(`ACTION: ${actionKey}`)

    this.status = 'action'

    await this.actions[actionKey](this, payload)

    console.groupEnd()

    return true
  }

  async commit (mutationKey, payload) {
    if (typeof this.mutations[mutationKey] !== 'function') {
      console.log(`Mutation "${mutationKey}" doesn't exist`)
      return false
    }

    this.status = 'mutation'

    const newState = await this.mutations[mutationKey](this.state, payload)

    this.state = Object.assign(this.state, newState)

    return true
  }

  setGetters (getters, state) {
    for (const getterKey in getters) {
      if (typeof getters[getterKey] !== 'function') {
        console.error(`Getter "${getterKey} isn't a function.`)
        return false
      }
      this.getters[getterKey] = getters[getterKey](state)
    }
  }
}