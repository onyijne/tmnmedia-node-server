import express from 'express'
import { robotRevoke, robotTrade, clearTrades, robotWake, testApp,
 copyStart, copyEnd, copyStatistics, copyList } from '../controllers/trade'

const tradeRouter = express.Router()

tradeRouter.post('/revoke', robotRevoke)
tradeRouter.post('/trade', robotTrade)
tradeRouter.post('/clear-trades', clearTrades)
tradeRouter.get('/test', testApp)
tradeRouter.post('/wake', robotWake)
tradeRouter.post('/copy-start', copyStart)
tradeRouter.post('/copy-end', copyEnd)
tradeRouter.post('/copy-statistics', copyStatistics)
tradeRouter.post('/copy-list', copyList)

export default tradeRouter
