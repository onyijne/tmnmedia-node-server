import express from 'express'
import { robotRevoke, robotTrade, sendNotification, clearTrades} from '../controllers/signal'
import { emitSignal, notification, prepareSub } from '../middleware'

const signalRouter = express.Router()

//const tradeWear = [notification, robotTrade]
signalRouter.post('/revoke', robotRevoke)
signalRouter.post('/trade', robotTrade)
signalRouter.post('/notify', sendNotification)
signalRouter.post('/clear-trades', clearTrades)

// signalRouter.post('/subscribe', prepareSub, subscribe)
// signalRouter.post('/unsubscribe', prepareSub, unsubscribe)

export default signalRouter
