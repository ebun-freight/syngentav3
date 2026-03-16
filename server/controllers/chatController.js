const ChatConversation = require('../models/chatModel')
const createError = require('http-errors')

// Get or create a conversation for the current user
const getMyConversation = async (req, res, next) => {
  try {
    let conversation = await ChatConversation.findOne({
      user: req.user._id,
      status: 'open'
    })
      .populate('user', 'firstname lastname email role profileImage')
      .populate('admin', 'firstname lastname email role profileImage')
      .populate('messages.sender', 'firstname lastname role profileImage')

    if (!conversation) {
      conversation = await ChatConversation.create({
        user: req.user._id,
        messages: []
      })
      conversation = await ChatConversation.findById(conversation._id)
        .populate('user', 'firstname lastname email role profileImage')
        .populate('admin', 'firstname lastname email role profileImage')
        .populate('messages.sender', 'firstname lastname role profileImage')
    }

    // Reset unread count for user
    conversation.unreadByUser = 0
    await conversation.save()

    res.status(200).json({ conversation })
  } catch (error) {
    next(error)
  }
}

// Get all open conversations (for admin)
const getAllConversations = async (req, res, next) => {
  try {
    const conversations = await ChatConversation.find({ status: 'open' })
      .populate('user', 'firstname lastname email role profileImage')
      .populate('admin', 'firstname lastname email role profileImage')
      .sort({ lastMessageAt: -1 })

    res.status(200).json({ conversations })
  } catch (error) {
    next(error)
  }
}

// Get a specific conversation by ID (for admin)
const getConversationById = async (req, res, next) => {
  try {
    const conversation = await ChatConversation.findById(req.params.id)
      .populate('user', 'firstname lastname email role profileImage')
      .populate('admin', 'firstname lastname email role profileImage')
      .populate('messages.sender', 'firstname lastname role profileImage')

    if (!conversation) {
      throw createError(404, 'Conversation not found')
    }

    // Reset unread count for admin
    conversation.unreadByAdmin = 0
    await conversation.save()

    res.status(200).json({ conversation })
  } catch (error) {
    next(error)
  }
}

// Send a message (works for both user and admin)
const sendMessage = async (req, res, next) => {
  try {
    const { conversationId, text } = req.body

    if (!text || !text.trim()) {
      throw createError(400, 'Message text is required')
    }

    const conversation = await ChatConversation.findById(conversationId)

    if (!conversation) {
      throw createError(404, 'Conversation not found')
    }

    const isAdmin =
      req.user.role === 'head_admin' || req.user.role === 'admin'

    // If admin is replying and no admin assigned yet, assign them
    if (isAdmin && !conversation.admin) {
      conversation.admin = req.user._id
    }

    conversation.messages.push({
      sender: req.user._id,
      text: text.trim()
    })

    conversation.lastMessage = text.trim().substring(0, 100)
    conversation.lastMessageAt = new Date()

    if (isAdmin) {
      conversation.unreadByUser += 1
    } else {
      conversation.unreadByAdmin += 1
    }

    await conversation.save()

    // Get the populated conversation
    const populated = await ChatConversation.findById(conversation._id)
      .populate('user', 'firstname lastname email role profileImage')
      .populate('admin', 'firstname lastname email role profileImage')
      .populate('messages.sender', 'firstname lastname role profileImage')

    const newMessage = populated.messages[populated.messages.length - 1]

    res.status(200).json({ message: newMessage, conversation: populated })
  } catch (error) {
    next(error)
  }
}

// Close a conversation
const closeConversation = async (req, res, next) => {
  try {
    const conversation = await ChatConversation.findByIdAndUpdate(
      req.params.id,
      { status: 'closed' },
      { new: true }
    )

    if (!conversation) {
      throw createError(404, 'Conversation not found')
    }

    res.status(200).json({ message: 'Conversation closed', conversation })
  } catch (error) {
    next(error)
  }
}

// Get total unread count for admin
const getUnreadCount = async (req, res, next) => {
  try {
    const result = await ChatConversation.aggregate([
      { $match: { status: 'open' } },
      { $group: { _id: null, total: { $sum: '$unreadByAdmin' } } }
    ])

    const total = result.length > 0 ? result[0].total : 0
    res.status(200).json({ unreadCount: total })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getMyConversation,
  getAllConversations,
  getConversationById,
  sendMessage,
  closeConversation,
  getUnreadCount
}
