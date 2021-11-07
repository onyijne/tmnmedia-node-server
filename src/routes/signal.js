import express from 'express'
import { sendNotification, testApp } from '../controllers/signal'
// import { emitSignal, notification, prepareSub } from '../middleware'

const signalRouter = express.Router()

//const tradeWear = [notification, robotTrade]
signalRouter.post('/notify', sendNotification)
signalRouter.get('/test', testApp)

// signalRouter.post('/subscribe', prepareSub, subscribe)
// signalRouter.post('/unsubscribe', prepareSub, unsubscribe)

export default signalRouter
