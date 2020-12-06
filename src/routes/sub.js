import express from 'express'
import { sub } from '../controllers/signal'

const subRouter = express.Router()
subRouter.post('/sub-to-topic', sub)

subRouter.get('/test', async (req, res) => {
  try {
    // const data = await messagesModel.select('name, message');
    res.status(200).json({ messages: "okay" });
  } catch (err) {
    res.status(200).json({ messages: err.stack });
  }
})

export default subRouter
