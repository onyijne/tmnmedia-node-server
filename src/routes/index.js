import express from 'express';
import { messagesPage, addMessage } from '../controllers';
import { modifyMessage } from '../middleware';

const supportRouter = express.Router();
supportRouter.get('/messages', messagesPage);
supportRouter.post('/messages', modifyMessage, addMessage);

export default supportRouter;
