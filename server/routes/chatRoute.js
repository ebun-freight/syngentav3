const express = require('express')
const router = express.Router()
const authenticateToken = require('../middlewares/auth')
const {
  getMyConversation,
  getAllConversations,
  getConversationById,
  sendMessage,
  closeConversation,
  getUnreadCount
} = require('../controllers/chatController')

// All routes require authentication
router.use(authenticateToken)

// User routes
router.get('/my-conversation', getMyConversation)

// Admin routes 
router.get('/conversations', getAllConversations)
router.get('/conversations/:id', getConversationById)
router.get('/unread-count', getUnreadCount)

// Shared routes
router.post('/send', sendMessage)

// Admin - close conversation
router.patch('/conversations/:id/close', closeConversation)

module.exports = router
