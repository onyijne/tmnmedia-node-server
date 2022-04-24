import express from 'express'

 import { robotWaker, robotRevoker, robotTrader, clearTrader, robotDigits,
    listClients, robotSleep, robotWakeAll, mt5 } from '../controllers/trader'

const tradeRouter = express.Router()

tradeRouter.post('/wake', robotWaker)
tradeRouter.post('/sleep', robotSleep)
tradeRouter.post('/revoke', robotRevoker)
tradeRouter.post('/trade', robotTrader)
tradeRouter.post('/reset-trades', clearTrader)
tradeRouter.post('/digits', robotDigits)
tradeRouter.get('/clients', listClients)
tradeRouter.post('/wake-all', robotWakeAll)
tradeRouter.post('/mt5', mt5)

export default tradeRouter
