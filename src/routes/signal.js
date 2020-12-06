import express from 'express'
import { alert, subscribe, unsubscribe } from '../controllers/signal'
import { prepareSignal, prepareSub } from '../middleware'

const signalRouter = express.Router()
signalRouter.post('/notify', prepareSignal, alert)
signalRouter.post('/subscribe', prepareSub, subscribe)
signalRouter.post('/unsubscribe', prepareSub, unsubscribe)

export default signalRouter
