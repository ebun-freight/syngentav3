const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: [true, 'Message text is required'],
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters']
    }
  },
  { timestamps: true }
)

const chatConversationSchema = new mongoose.Schema(
  {
    // The user (visitor/subcon) who initiated the chat
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // The admin handling the conversation (null until an admin joins)
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    messages: [messageSchema],
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open'
    },
    // Track unread counts for each side
    unreadByAdmin: {
      type: Number,
      default: 0
    },
    unreadByUser: {
      type: Number,
      default: 0
    },
    lastMessage: {
      type: String,
      default: ''
    },
    lastMessageAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
)

module.exports = mongoose.model('ChatConversation', chatConversationSchema)
