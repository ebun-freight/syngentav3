import React, { useState, useEffect, useRef } from 'react'
import { useUserContext } from '../../contexts/UserContext'
import { API_CHAT } from '../../utils/APIRoutes'
import socket from '../../config/socket'
import axios from 'axios'
import {
  TbSend,
  TbMessage,
  TbCircleCheck,
  TbArrowLeft,
  TbCircleFilled
} from 'react-icons/tb'
import { no_image } from '../../consts/images'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { toast } from 'react-toastify'

dayjs.extend(relativeTime)

export default function LiveChatPage () {
  const { userData } = useUserContext()
  const [conversations, setConversations] = useState([])
  const [selectedConv, setSelectedConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [mobileShowChat, setMobileShowChat] = useState(false)
  const [resolving, setResolving] = useState(false)

  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const typingTimeout = useRef(null)
  const selectedRef = useRef(null)
  selectedRef.current = selectedConv

  const token = sessionStorage.getItem('userToken')
  const headers = { Authorization: `Bearer ${token}` }

  /* ── socket ── */
  useEffect(() => {
    if (!userData?.data?._id) return
    if (!socket.connected) socket.connect()
    socket.emit('register', { userId: userData.data._id, role: userData.data.role })

    fetchConversations()

    socket.on('conversation-updated', ({ conversation }) => {
      setConversations(prev => {
        const exists = prev.find(c => c._id === conversation._id)
        if (exists) {
          return prev
            .map(c => (c._id === conversation._id ? conversation : c))
            .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
        }
        // New conversation appeared — show toast
        toast.info(`New chat from ${conversation.user?.firstname || 'user'}`, {
          toastId: conversation._id
        })
        return [conversation, ...prev]
      })
    })

    socket.on('conversation-removed', ({ conversationId }) => {
      setConversations(prev => prev.filter(c => c._id !== conversationId))
      if (selectedRef.current?._id === conversationId) {
        setSelectedConv(null)
        setMessages([])
        setMobileShowChat(false)
      }
    })

    socket.on('new-message', ({ conversationId, message }) => {
      if (selectedRef.current && conversationId === selectedRef.current._id) {
        setMessages(prev => [...prev, message])
      }
    })

    socket.on('user-typing', () => setIsTyping(true))
    socket.on('user-stop-typing', () => setIsTyping(false))

    return () => {
      socket.off('conversation-updated')
      socket.off('conversation-removed')
      socket.off('new-message')
      socket.off('user-typing')
      socket.off('user-stop-typing')
      if (selectedRef.current) socket.emit('leave-conversation', selectedRef.current._id)
    }
  }, [userData])

  /* ── scroll ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  /* ── textarea resize ── */
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 80) + 'px'
  }, [input])

  const fetchConversations = async () => {
    try {
      const res = await axios.get(`${API_CHAT}/conversations`, { headers })
      setConversations(res.data.conversations)
    } catch (err) {
      console.error('Failed to fetch conversations:', err)
    } finally {
      setLoading(false)
    }
  }

  const selectConversation = async conv => {
    if (selectedRef.current) socket.emit('leave-conversation', selectedRef.current._id)
    setSelectedConv(conv)
    setMobileShowChat(true)

    try {
      const res = await axios.get(`${API_CHAT}/conversations/${conv._id}`, { headers })
      const data = res.data.conversation
      setMessages(data.messages || [])
      setSelectedConv(data)
      socket.emit('join-conversation', conv._id)

      // Clear unread badge locally
      setConversations(prev =>
        prev.map(c => (c._id === conv._id ? { ...c, unreadByAdmin: 0 } : c))
      )
    } catch (err) {
      console.error('Failed to fetch conversation:', err)
    }
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || sending || !selectedConv) return

    setSending(true)
    setInput('')

    try {
      const res = await axios.post(
        `${API_CHAT}/send`,
        { conversationId: selectedConv._id, text },
        { headers }
      )
      const { message, conversation } = res.data
      setMessages(prev => [...prev, message])
      setSelectedConv(conversation)

      setConversations(prev =>
        prev
          .map(c => (c._id === conversation._id ? conversation : c))
          .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
      )

      socket.emit('send-message', {
        conversationId: selectedConv._id,
        message,
        conversation
      })
      socket.emit('stop-typing', { conversationId: selectedConv._id })
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setSending(false)
    }
  }

  const resolveConversation = async () => {
    if (!selectedConv || resolving) return
    setResolving(true)

    try {
      // Emit via socket — this closes it in DB and notifies user
      socket.emit('resolve-conversation', { conversationId: selectedConv._id })

      toast.success(`Chat with ${selectedConv.user?.firstname} resolved`)
    } catch (err) {
      console.error('Failed to resolve:', err)
    } finally {
      setResolving(false)
    }
  }

  const handleTyping = () => {
    if (!selectedConv) return
    socket.emit('typing', {
      conversationId: selectedConv._id,
      user: { _id: userData.data._id, firstname: userData.data.firstname }
    })
    clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      socket.emit('stop-typing', { conversationId: selectedConv._id })
    }, 2000)
  }

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadByAdmin || 0), 0)

  return (
    <div className='flex flex-col h-full min-h-0 overflow-hidden -m-2 sm:-m-0'>
      <div className='flex items-center gap-3 mb-3'>
        <TbMessage className='text-blue-600 text-xl' />
        <h1 className='text-lg font-bold text-gray-800'>Live Chat Support</h1>
        {totalUnread > 0 && (
          <span className='ml-1 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full'>
            {totalUnread}
          </span>
        )}
      </div>

      <div className='flex flex-1 min-h-0 border border-gray-200 rounded-lg overflow-hidden bg-white'>
        {/* ── Conversation List ── */}
        <div
          className={`w-full sm:w-80 border-r border-gray-200 flex flex-col bg-gray-50 ${
            mobileShowChat ? 'hidden sm:flex' : 'flex'
          }`}
        >
          <div className='p-3 border-b border-gray-200 bg-white'>
            <p className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>
              Open Conversations ({conversations.length})
            </p>
          </div>

          <div className='flex-1 overflow-y-auto'>
            {loading ? (
              <div className='p-4 text-center text-gray-400 text-sm'>Loading...</div>
            ) : conversations.length === 0 ? (
              <div className='p-8 text-center text-gray-400 text-sm'>
                <TbMessage className='mx-auto text-3xl mb-2 opacity-40' />
                No active conversations
              </div>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv._id}
                  onClick={() => selectConversation(conv)}
                  className={`flex items-center gap-3 px-3 py-3 cursor-pointer border-b border-gray-100 transition-colors hover:bg-blue-50 ${
                    selectedConv?._id === conv._id
                      ? 'bg-blue-50 border-l-2 border-l-blue-600'
                      : ''
                  }`}
                >
                  <div className='relative flex-shrink-0'>
                    <img
                      src={conv.user?.profileImage || no_image}
                      alt={conv.user?.firstname}
                      className='w-9 h-9 rounded-full object-cover border border-gray-200'
                    />
                    <TbCircleFilled className='absolute -bottom-0.5 -right-0.5 text-green-500 text-xs bg-white rounded-full' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center justify-between'>
                      <p className='text-sm font-semibold text-gray-800 truncate'>
                        {conv.user?.firstname} {conv.user?.lastname}
                      </p>
                      <span className='text-[10px] text-gray-400 whitespace-nowrap ml-2'>
                        {dayjs(conv.lastMessageAt).fromNow()}
                      </span>
                    </div>
                    <div className='flex items-center justify-between mt-0.5'>
                      <p className='text-xs text-gray-500 truncate'>
                        {conv.lastMessage || 'No messages yet'}
                      </p>
                      {conv.unreadByAdmin > 0 && (
                        <span className='ml-2 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0'>
                          {conv.unreadByAdmin}
                        </span>
                      )}
                    </div>
                    <p className='text-[10px] text-gray-400 mt-0.5 capitalize'>{conv.user?.role}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Chat Area ── */}
        <div className={`flex-1 flex flex-col ${!mobileShowChat ? 'hidden sm:flex' : 'flex'}`}>
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className='flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white'>
                <button
                  onClick={() => setMobileShowChat(false)}
                  className='sm:hidden text-gray-500 hover:text-gray-800 p-1'
                >
                  <TbArrowLeft className='text-lg' />
                </button>
                <img
                  src={selectedConv.user?.profileImage || no_image}
                  alt=''
                  className='w-8 h-8 rounded-full object-cover border border-gray-200'
                />
                <div className='flex-1'>
                  <p className='text-sm font-semibold text-gray-800'>
                    {selectedConv.user?.firstname} {selectedConv.user?.lastname}
                  </p>
                  <p className='text-[10px] text-gray-400 capitalize'>
                    {selectedConv.user?.role} &middot; {selectedConv.user?.email}
                  </p>
                </div>
                <button
                  onClick={resolveConversation}
                  disabled={resolving}
                  className='flex items-center gap-1.5 text-xs text-emerald-600 border border-emerald-300 hover:bg-emerald-50 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 font-medium'
                >
                  <TbCircleCheck className='text-sm' />
                  {resolving ? 'Resolving…' : 'Resolve'}
                </button>
              </div>

              {/* Messages */}
              <div className='flex-1 overflow-y-auto p-4 bg-gray-50 space-y-1'>
                {messages.length === 0 && (
                  <div className='text-center text-gray-400 text-sm py-8'>
                    No messages yet.
                  </div>
                )}
                {messages.map((msg, i) => {
                  const isMe = msg.sender?._id === userData.data._id
                  const time = dayjs(msg.createdAt).format('h:mm A')
                  return (
                    <div
                      key={msg._id || i}
                      className={`flex items-end gap-2 mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isMe && (
                        <img
                          src={msg.sender?.profileImage || no_image}
                          alt=''
                          className='w-6 h-6 rounded-full object-cover border border-gray-200 mb-4'
                        />
                      )}
                      <div className={isMe ? 'text-right' : 'text-left'}>
                        {!isMe && (
                          <p className='text-[10px] text-gray-400 ml-1 mb-0.5'>
                            {msg.sender?.firstname}
                          </p>
                        )}
                        <div
                          className={`inline-block max-w-xs px-3 py-2 rounded-xl text-sm leading-relaxed ${
                            isMe
                              ? 'bg-blue-600 text-white rounded-br-sm'
                              : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                          }`}
                        >
                          {msg.text}
                        </div>
                        <p className='text-[9px] text-gray-400 mt-0.5 mx-1'>{time}</p>
                      </div>
                    </div>
                  )
                })}

                {isTyping && (
                  <div className='flex items-center gap-2'>
                    <div className='bg-white border border-gray-200 rounded-xl px-3 py-2'>
                      <div className='flex gap-1'>
                        {[0, 1, 2].map(i => (
                          <span
                            key={i}
                            className='w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce'
                            style={{ animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className='border-t border-gray-200 bg-white px-3 py-2.5 flex items-end gap-2'>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => { setInput(e.target.value); handleTyping() }}
                  onKeyDown={handleKey}
                  placeholder='Type a reply…'
                  rows={1}
                  className='flex-1 resize-none text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-gray-50 max-h-20'
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className={`p-2.5 rounded-lg transition-colors ${
                    input.trim() && !sending
                      ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <TbSend className='text-base' />
                </button>
              </div>
            </>
          ) : (
            <div className='flex-1 flex items-center justify-center text-gray-400'>
              <div className='text-center'>
                <TbMessage className='mx-auto text-5xl mb-3 opacity-30' />
                <p className='text-sm'>Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
