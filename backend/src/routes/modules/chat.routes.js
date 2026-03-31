const express = require('express');
const { auth } = require('../../middleware/auth');
const chatController = require('../../controllers/chat.controller');

const router = express.Router();

router.get('/conversations', auth, chatController.getConversations);
router.post('/conversations', auth, chatController.createConversation);
router.get('/conversations/:id/messages', auth, chatController.getMessages);

// Session-style aliases from architecture document
router.get('/sessions', auth, chatController.getConversations);
router.get('/sessions/:id/messages', auth, chatController.getMessages);

module.exports = router;
