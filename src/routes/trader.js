import express from 'express'

 import { robotWaker, robotRevoker, robotTrader, clearTrader, robotDigits, listClients } from '../controllers/trader'

const tradeRouter = express.Router()

tradeRouter.post('/wake', robotWaker)
tradeRouter.post('/revoke', robotRevoker)
tradeRouter.post('/trade', robotTrader)
tradeRouter.post('/reset-trades', clearTrader)
tradeRouter.post('/digits', robotDigits)
tradeRouter.get('/clients', listClients)

export default tradeRouter
