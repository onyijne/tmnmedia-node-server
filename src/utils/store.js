import PubSub from './pubSub'

function isEmpty (value) {
  // eslint-disable-next-line valid-typeof
  if (typeof (value) === 'array') return value.length === 0
  return !value || Object.keys(value).length === 0
}

export default class Store {
  events = new PubSub()
  status = 'idle'
  actions = {}
  mutations = {}
  getters = {}
  constructor (params, namespaces = ['/']) {  
    this.namespaces = namespaces
    //this.events = new PubSub()
    for (var i = namespaces.length - 1; i >= 0; i--) {
      const namespace = namespaces[i]
      this[namespace] = {}
      this[namespace]['actions'] = params.actions || {}
      this[namespace]['mutations'] = params.mutations || {}
    }
    
    let rob = this

    rob.state = new Proxy(params.state || {}, {
      set: function (state, key, value) {
        state[key] = value
        rob.publish('stateChange', rob.state)
        if (rob.status !== 'mutation') {
          console.warn(`You should use a mutation to set ${key}`) // inform the develper to use mutation
        }
        rob.status = 'idle'
        return true
      }
    })

    rob.setGetters(params.getters || {}, rob.state)

    rob.subscribe('stateChange', async function(state) {
      //console.log(`stateChange event called`)
      await rob.setGetters(params.getters || {}, state)
    })
    
    //(params.getters) ? this.setGetters(params.getters) : ''
  }

  async dispatch (actionKey, payload) {
    const hasNamespace = actionKey.includes('/')
    if (hasNamespace) {
      const params = actionKey.split('/')
      return await this.actionWithNamespace(params[0], params[1], payload)
    }
    return await this.actionWithNamespace('/', actionKey, payload)
  }

  async commit (mutationKey, payload) {
    const hasNamespace = mutationKey.includes('/')
    if (hasNamespace) {
      const params = mutationKey.split('/')
      return await this.mutationWithNamespace(params[0], params[1], payload)
    }
    return await this.mutationWithNamespace('/', mutationKey, payload)
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

  /** do not call directly **/
  async actionWithNamespace(namespace, actionKey, payload) {
    if (typeof this[namespace].actions[actionKey] !== 'function') {
      console.error(`Action "${actionKey} doesn't exist.`)
      return false
    }
    
    console.groupCollapsed(`ACTION: ${actionKey}`)

    this.status = 'action'

    await this[namespace].actions[actionKey](this, payload)

    console.groupEnd()

    return true
  }

  /** do not call directly **/
  async mutationWithNamespace(namespace, mutationKey, payload) {
    if (typeof this[namespace].mutations[mutationKey] !== 'function') {
      console.log(`Mutation "${mutationKey}" doesn't exist`)
      return false
    }

    this.status = 'mutation'

    const newState = await this[namespace].mutations[mutationKey](this.state, payload)

    this.state = Object.assign(this.state, newState)

    return true
  }

  async subscribe (event, callback) {
    await this.events.subscribe(event, callback)
  }

  async publish (event, data = {}) {
    await this.events.publish(event, data)
  }

  async unSubscribe (event) {
    await this.events.unSubscribe(event)
  }
}