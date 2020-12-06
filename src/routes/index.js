import express from 'express';
import { messagesPage, addMessage } from '../controllers';
import { modifyMessage, performAsyncAction } from '../middleware';

const supportRouter = express.Router();
supportRouter.get('/messages', messagesPage);
supportRouter.post('/messages', modifyMessage, performAsyncAction, addMessage);

export default supportRouter;
