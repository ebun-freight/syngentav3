const express = require('express')
const cors = require('cors')
const http = require('http')
const { Server } = require('socket.io')
const connectDB = require('./config/db')
const {
  routeNotFoundHandler,
  globalErrorHandler
} = require('./middlewares/errorHandler')

require('dotenv').config()
require('colors')

const PORT = process.env.PORT || 5000

// connect to datebase
connectDB()

// middleware
const app = express()

const corsOptions = {
  origin: [
    'https://syngentav3-apg0u1g2b-ebun-freights-projects.vercel.app',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}

app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// ─── Socket.IO setup ────────────────────────────────────────────────
const server = http.createServer(app)
const io = new Server(server, { cors: corsOptions })

const ChatConversation = require('./models/chatModel')

// socketId -> { userId, role, conversationId }
const socketMeta = new Map()
// userId -> socketId
const userSockets = new Map()
// Set of admin userIds currently online
const onlineAdmins = new Set()

const broadcastAdminStatus = () => {
  io.emit('admin-status', {
    online: onlineAdmins.size > 0,
    count: onlineAdmins.size
  })
}

io.on('connection', socket => {
  // Register user with their userId and role
  socket.on('register', ({ userId, role }) => {
    socketMeta.set(socket.id, { userId, role, conversationId: null })
    userSockets.set(userId, socket.id)

    if (role === 'head_admin' || role === 'admin') {
      onlineAdmins.add(userId)
      broadcastAdminStatus()
    }

    // Tell the registering socket current admin status immediately
    socket.emit('admin-status', {
      online: onlineAdmins.size > 0,
      count: onlineAdmins.size
    })
  })

  // Join a conversation room
  socket.on('join-conversation', conversationId => {
    socket.join(`chat-${conversationId}`)
    const meta = socketMeta.get(socket.id)
    if (meta) meta.conversationId = conversationId
  })

  // Leave a conversation room
  socket.on('leave-conversation', conversationId => {
    socket.leave(`chat-${conversationId}`)
    const meta = socketMeta.get(socket.id)
    if (meta) meta.conversationId = null
  })

  // New message sent
  socket.on('send-message', data => {
    const { conversationId, message, conversation } = data
    socket
      .to(`chat-${conversationId}`)
      .emit('new-message', { conversationId, message })
    io.emit('conversation-updated', { conversation })
    io.emit('unread-count-updated')
  })

  // Admin marks a conversation as read — broadcast updated unread count
  socket.on('mark-conversation-read', () => {
    io.emit('unread-count-updated')
  })

  // Admin resolves/closes a conversation
  socket.on('resolve-conversation', async ({ conversationId }) => {
    try {
      await ChatConversation.findByIdAndUpdate(conversationId, {
        status: 'closed'
      })
    } catch (e) {
      /* ignore */
    }
    io.to(`chat-${conversationId}`).emit('chat-ended', {
      conversationId,
      reason: 'Admin resolved the conversation'
    })
    io.emit('conversation-removed', { conversationId })
  })

  // User explicitly ends chat on page unload
  socket.on('end-on-unload', async ({ conversationId }) => {
    if (!conversationId) return
    try {
      await ChatConversation.findByIdAndUpdate(conversationId, {
        status: 'closed'
      })
    } catch (e) {
      /* ignore */
    }
    socket.to(`chat-${conversationId}`).emit('chat-ended', {
      conversationId,
      reason: 'User left the session'
    })
    io.emit('conversation-removed', { conversationId })
  })

  // Typing indicators
  socket.on('typing', ({ conversationId, user }) => {
    socket.to(`chat-${conversationId}`).emit('user-typing', { user })
  })
  socket.on('stop-typing', ({ conversationId }) => {
    socket.to(`chat-${conversationId}`).emit('user-stop-typing')
  })

  socket.on('disconnect', async () => {
    const meta = socketMeta.get(socket.id)
    if (meta) {
      const { userId, role, conversationId } = meta
      userSockets.delete(userId)

      if (role === 'head_admin' || role === 'admin') {
        onlineAdmins.delete(userId)
        broadcastAdminStatus()
      } else if (conversationId) {
        // Non-admin user disconnected — end their conversation
        try {
          await ChatConversation.findByIdAndUpdate(conversationId, {
            status: 'closed'
          })
        } catch (e) {
          /* ignore */
        }
        socket.to(`chat-${conversationId}`).emit('chat-ended', {
          conversationId,
          reason: 'User left the session'
        })
        io.emit('conversation-removed', { conversationId })
      }

      socketMeta.delete(socket.id)
    }
  })
})

// routes
app.use('/api/user', require('./routes/userRoute'))
app.use('/api/driver', require('./routes/driverRoute'))
app.use('/api/truck', require('./routes/truckRoute'))
app.use('/api/deployment', require('./routes/deploymentRoute'))
app.use('/api/analytics', require('./routes/dashboardRoute'))
app.use('/api/activity-logs', require('./routes/activityLogRoute'))
app.use('/api/timeline-logs', require('./routes/timelineRoute'))
app.use('/api/system-settings', require('./routes/systemSettingsRoute'))
app.use('/api/ai', require('./routes/AiChatRoute'))
app.use('/api/chat', require('./routes/chatRoute'))
app.use('/api/pickup-fields', require('./routes/pickupFieldRoute'))

// error-handling middleware
app.use(routeNotFoundHandler)
app.use(globalErrorHandler)

console.log(new Date())

// start server
server.listen(PORT, () =>
  console.log(`Server running on port: ${PORT}`.yellow.underline)
)
