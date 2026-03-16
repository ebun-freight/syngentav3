import React, { useState, useRef, useEffect } from 'react'
import {
  RiCloseLine,
  RiSendPlaneFill,
  RiCustomerService2Fill
} from 'react-icons/ri'
import { ebun_logo_light } from '../consts/images'
import { API_CHAT } from '../utils/APIRoutes'
import socket from '../config/socket'
import axios from 'axios'

/* ─── tokens ── */
const T = {
  black: '#0A0A0A',
  white: '#FFFFFF',
  surface: '#F7F6F3',
  blue: '#2563EB',
  border: '#E4E2DD',
  muted: '#9A9690',
  text: '#1A1918',
  green: '#16a34a',
  red: '#DC2626',
  mono: "'DM Mono', 'Courier New', monospace",
  display: "'Syne', system-ui, sans-serif"
}

/* ─── typing dots ── */
const TypingDots = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '10px 14px' }}>
    {[0, 1, 2].map(i => (
      <span
        key={i}
        style={{
          width: 5, height: 5, borderRadius: '50%', background: T.blue,
          display: 'inline-block',
          animation: 'lc-bounce 0.9s ease-in-out infinite',
          animationDelay: `${i * 0.18}s`
        }}
      />
    ))}
  </div>
)

/* ─── bubble ── */
const Bubble = ({ message, currentUserId, isSystem }) => {
  if (isSystem) {
    return (
      <div
        style={{
          textAlign: 'center', margin: '8px 0', padding: '6px 14px',
          fontSize: 11, color: T.muted, fontFamily: T.mono,
          background: 'rgba(0,0,0,0.04)', borderRadius: 20
        }}
      >
        {message.text}
      </div>
    )
  }

  const isMe = message.sender?._id === currentUserId
  const time = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-end', gap: 8,
        marginBottom: 10,
        justifyContent: isMe ? 'flex-end' : 'flex-start'
      }}
    >
      {!isMe && (
        <div
          style={{
            width: 28, height: 28, background: T.black, borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 5, flexShrink: 0, marginBottom: 14
          }}
        >
          <img src={ebun_logo_light} alt='Admin' style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      )}
      <div>
        {!isMe && (
          <p style={{ margin: '0 0 2px 2px', fontSize: 10, color: T.muted, fontFamily: T.mono }}>
            {message.sender?.firstname || 'Admin'}
          </p>
        )}
        <div
          style={{
            maxWidth: 240, padding: '9px 13px', fontSize: 12.5, lineHeight: 1.6,
            borderRadius: isMe ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
            ...(isMe
              ? { background: T.blue, color: T.white, fontFamily: T.mono }
              : { background: T.white, color: T.text, border: `0.5px solid ${T.border}`, borderLeft: `2.5px solid ${T.blue}` })
          }}
        >
          {message.text}
        </div>
        {time && (
          <p style={{ margin: '3px 4px 0', fontSize: 9, color: T.muted, fontFamily: T.mono, textAlign: isMe ? 'right' : 'left' }}>
            {time}
          </p>
        )}
      </div>
    </div>
  )
}

/* ─── main widget ── */
export default function LiveChatWidget ({ userId, userRole }) {
  const [open, setOpen] = useState(false)
  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [pulse, setPulse] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [unread, setUnread] = useState(0)
  const [adminOnline, setAdminOnline] = useState(false)
  const [chatEnded, setChatEnded] = useState(false)
  const [endReason, setEndReason] = useState('')

  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const typingTimeout = useRef(null)
  const convRef = useRef(null)
  convRef.current = conversation

  const token = sessionStorage.getItem('userToken')
  const headers = { Authorization: `Bearer ${token}` }

  /* ── socket setup ── */
  useEffect(() => {
    if (!userId) return
    if (!socket.connected) socket.connect()

    socket.emit('register', { userId, role: userRole })

    socket.on('admin-status', ({ online }) => setAdminOnline(online))

    socket.on('new-message', ({ conversationId, message }) => {
      if (convRef.current && conversationId === convRef.current._id) {
        setMessages(prev => [...prev, message])
        if (!open) {
          setUnread(prev => prev + 1)
          setPulse(true)
        }
      }
    })

    socket.on('user-typing', () => setIsTyping(true))
    socket.on('user-stop-typing', () => setIsTyping(false))

    socket.on('chat-ended', ({ conversationId, reason }) => {
      if (convRef.current && conversationId === convRef.current._id) {
        setChatEnded(true)
        setEndReason(reason || 'Chat session ended')
        setMessages(prev => [
          ...prev,
          { _id: 'sys-end', text: `✓ Session ended: ${reason || 'Chat resolved by admin'}`, _system: true }
        ])
        if (!open) {
          setPulse(true)
          setUnread(prev => prev + 1)
        }
      }
    })

    // Close conversation on page unload/refresh
    const handleUnload = () => {
      if (convRef.current?._id) {
        socket.emit('end-on-unload', { conversationId: convRef.current._id })
      }
    }
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      window.removeEventListener('beforeunload', handleUnload)
      socket.off('admin-status')
      socket.off('new-message')
      socket.off('user-typing')
      socket.off('user-stop-typing')
      socket.off('chat-ended')
      if (convRef.current?._id) socket.emit('leave-conversation', convRef.current._id)
    }
  }, [userId, userRole])

  /* ── open panel ── */
  useEffect(() => {
    if (open) {
      setPulse(false)
      setUnread(0)
      if (!conversation) fetchConversation()
    }
  }, [open])

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

  const fetchConversation = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_CHAT}/my-conversation`, { headers })
      const conv = res.data.conversation
      setConversation(conv)
      setMessages(conv.messages || [])
      setChatEnded(conv.status === 'closed')
      socket.emit('join-conversation', conv._id)
    } catch (err) {
      console.error('Failed to fetch conversation:', err)
    } finally {
      setLoading(false)
    }
  }

  const startNewChat = async () => {
    // Leave old room
    if (convRef.current?._id) socket.emit('leave-conversation', convRef.current._id)
    setChatEnded(false)
    setEndReason('')
    setConversation(null)
    setMessages([])
    await fetchConversation()
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || sending || !conversation || chatEnded) return

    setSending(true)
    setInput('')

    try {
      const res = await axios.post(
        `${API_CHAT}/send`,
        { conversationId: conversation._id, text },
        { headers }
      )
      const { message, conversation: updatedConv } = res.data
      setMessages(prev => [...prev, message])
      setConversation(updatedConv)

      socket.emit('send-message', { conversationId: conversation._id, message, conversation: updatedConv })
      socket.emit('stop-typing', { conversationId: conversation._id })
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setSending(false)
    }
  }

  const handleTyping = () => {
    if (!conversation || chatEnded) return
    socket.emit('typing', { conversationId: conversation._id, user: { _id: userId } })
    clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      socket.emit('stop-typing', { conversationId: conversation._id })
    }, 2000)
  }

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const canSend = input.trim() && !sending && !chatEnded

  const openingMsg = adminOnline
    ? 'Our support team is online and ready to help you.'
    : "Admin is not online right now. You can still leave a message and we'll get back to you shortly."

  return (
    <>
      <style>{`
        @keyframes lc-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: .5; }
          40%            { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes lc-in {
          from { opacity: 0; transform: scale(.96) translateY(6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes lc-ping {
          0%   { transform: scale(1);   opacity: .35; }
          70%  { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .lc-fab:hover  { transform: scale(1.06) !important; }
        .lc-fab:active { transform: scale(.94)  !important; }
        .lc-send:hover:not(:disabled) { background: ${T.blue} !important; }
        .lc-textarea:focus { outline: none; border-color: ${T.blue} !important; box-shadow: 0 0 0 2px ${T.blue}22 !important; }
        .lc-close:hover { background: rgba(255,255,255,.1) !important; }
        .lc-msgs::-webkit-scrollbar { width: 3px; }
        .lc-msgs::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }

        /* ── responsive positioning ── */
        .lc-fab {
          position: fixed;
          bottom: 76px;
          right: 16px;
        }
        .lc-panel {
          position: fixed;
          bottom: 134px;
          right: 8px;
          width: calc(100vw - 16px);
          max-height: 55vh;
        }
        @media (min-width: 640px) {
          .lc-fab {
            bottom: 20px;
            right: 80px;
          }
          .lc-panel {
            bottom: 78px;
            right: 80px;
            width: 360px;
            max-height: 60vh;
          }
        }
      `}</style>

      {/* ══ CHAT PANEL ══ */}
      <div
        className='lc-panel'
        style={{
          zIndex: 9998,
          display: 'flex', flexDirection: 'column',
          borderRadius: 12, overflow: 'hidden',
          border: `1px solid ${T.border}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.10)',
          transformOrigin: 'bottom right',
          transition: 'opacity .25s ease, transform .25s ease',
          opacity: open ? 1 : 0,
          transform: open ? 'scale(1) translateY(0)' : 'scale(.95) translateY(6px)',
          pointerEvents: open ? 'auto' : 'none',
          animation: open ? 'lc-in .25s ease' : 'none'
        }}
      >
        {/* Header */}
        <div
          style={{
            background: T.black, padding: '13px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
            flexShrink: 0,
            borderBottom: `2px solid ${adminOnline ? T.blue : '#4B5563'}`
          }}
        >
          <div
            style={{
              width: 34, height: 34, border: '1px solid rgba(255,255,255,.15)',
              borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 6, flexShrink: 0
            }}
          >
            <img src={ebun_logo_light} alt='Ebun' style={{ width: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontFamily: T.display, fontWeight: 700, fontSize: 14, color: T.white, letterSpacing: '-0.2px', lineHeight: 1.2 }}>
              Live Support
            </p>
            <p
              style={{
                margin: '2px 0 0', fontFamily: T.mono, fontSize: 10,
                color: adminOnline ? T.green : '#9CA3AF',
                letterSpacing: 1.2, textTransform: 'uppercase'
              }}
            >
              {adminOnline ? '● Admin is Online' : '○ Admin is Offline'}
            </p>
          </div>
          <button
            className='lc-close'
            onClick={() => setOpen(false)}
            style={{
              width: 28, height: 28, borderRadius: 5, border: 'none',
              background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background .15s', flexShrink: 0
            }}
          >
            <RiCloseLine style={{ color: 'rgba(255,255,255,.5)', width: 16, height: 16 }} />
          </button>
        </div>

        {/* Messages */}
        <div
          className='lc-msgs'
          style={{ flex: 1, overflowY: 'auto', background: T.surface, padding: '14px 12px 8px', minHeight: 200 }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: 30, color: T.muted, fontFamily: T.mono, fontSize: 12 }}>
              Loading...
            </div>
          ) : (
            <>
              {/* Opening status message */}
              <div
                style={{
                  background: adminOnline ? '#EFF6FF' : '#F3F4F6',
                  border: `1px solid ${adminOnline ? '#BFDBFE' : '#E5E7EB'}`,
                  borderRadius: 8, padding: '10px 12px', marginBottom: 14,
                  fontSize: 12, color: adminOnline ? '#1D4ED8' : '#6B7280',
                  fontFamily: T.mono, lineHeight: 1.6
                }}
              >
                {openingMsg}
              </div>

              {messages.map((m, i) => (
                <Bubble key={m._id || i} message={m} currentUserId={userId} isSystem={!!m._system} />
              ))}

              {isTyping && (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 10 }}>
                  <div
                    style={{
                      width: 28, height: 28, background: T.black, borderRadius: 4,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: 5, flexShrink: 0
                    }}
                  >
                    <img src={ebun_logo_light} alt='Admin' style={{ width: '100%', objectFit: 'contain' }} />
                  </div>
                  <div
                    style={{
                      background: T.white, border: `0.5px solid ${T.border}`,
                      borderLeft: `2.5px solid ${T.blue}`, borderRadius: '10px 10px 10px 2px'
                    }}
                  >
                    <TypingDots />
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Chat-ended banner */}
        {chatEnded && (
          <div
            style={{
              background: '#FEF2F2', borderTop: '1px solid #FECACA',
              padding: '10px 14px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: 8, flexShrink: 0
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: T.red, fontFamily: T.mono }}>
                Chat session ended
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9CA3AF', fontFamily: T.mono }}>
                {endReason}
              </p>
            </div>
            <button
              onClick={startNewChat}
              style={{
                fontSize: 11, fontFamily: T.mono, fontWeight: 600,
                padding: '5px 12px', background: T.black, color: T.white,
                border: 'none', borderRadius: 6, cursor: 'pointer',
                whiteSpace: 'nowrap', flexShrink: 0
              }}
            >
              New Chat
            </button>
          </div>
        )}

        {/* Input */}
        {!chatEnded && (
          <div
            style={{
              background: T.white, borderTop: `1px solid ${T.border}`,
              padding: '10px 10px 10px 12px',
              display: 'flex', alignItems: 'flex-end', gap: 8, flexShrink: 0
            }}
          >
            <textarea
              ref={textareaRef}
              className='lc-textarea'
              value={input}
              onChange={e => { setInput(e.target.value); handleTyping() }}
              onKeyDown={handleKey}
              placeholder={adminOnline ? 'Type your message…' : 'Leave a message…'}
              rows={1}
              style={{
                flex: 1, resize: 'none', fontSize: 12.5, fontFamily: T.mono, color: T.text,
                background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: 6, padding: '8px 10px', lineHeight: 1.5,
                maxHeight: 80, overflowY: 'auto', transition: 'border-color .15s, box-shadow .15s'
              }}
            />
            <button
              className='lc-send'
              onClick={sendMessage}
              disabled={!canSend}
              style={{
                width: 34, height: 34, borderRadius: 6, border: 'none',
                background: canSend ? T.black : T.border,
                cursor: canSend ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginBottom: 1, transition: 'background .15s'
              }}
            >
              <RiSendPlaneFill style={{ color: canSend ? T.white : T.muted, width: 13, height: 13 }} />
            </button>
          </div>
        )}
      </div>

      {/* ══ FAB ══ */}
      <button
        className='lc-fab'
        onClick={() => setOpen(o => !o)}
        aria-label='Chat with support'
        style={{
          zIndex: 9998,
          width: 50, height: 50, borderRadius: 10, border: 'none',
          background: T.blue, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform .2s ease',
          boxShadow: '0 4px 20px rgba(37,99,235,0.35)'
        }}
      >
        {pulse && (
          <span
            style={{
              position: 'absolute', inset: 0, borderRadius: 10, background: T.blue,
              animation: 'lc-ping 1.8s cubic-bezier(0,0,.2,1) infinite'
            }}
          />
        )}
        <RiCustomerService2Fill
          style={{
            position: 'absolute', width: 22, height: 22, color: T.white,
            transition: 'opacity .2s, transform .2s',
            opacity: open ? 0 : 1,
            transform: open ? 'scale(.7) rotate(90deg)' : 'scale(1) rotate(0)'
          }}
        />
        <RiCloseLine
          style={{
            position: 'absolute', width: 20, height: 20, color: T.white,
            transition: 'opacity .2s, transform .2s',
            opacity: open ? 1 : 0,
            transform: open ? 'scale(1) rotate(0)' : 'scale(.7) rotate(-90deg)'
          }}
        />
        {unread > 0 && !open && (
          <span
            style={{
              position: 'absolute', top: -5, right: -5, minWidth: 16, height: 16, padding: '0 4px',
              background: '#EF4444', borderRadius: '50%',
              fontSize: 9, fontFamily: T.mono, fontWeight: 600, color: T.white,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 2px #fff'
            }}
          >
            {unread}
          </span>
        )}
        {/* Offline dot indicator on FAB */}
        {!adminOnline && !open && (
          <span
            style={{
              position: 'absolute', bottom: -3, right: -3,
              width: 12, height: 12, background: '#6B7280',
              borderRadius: '50%', border: '2px solid #fff'
            }}
          />
        )}
      </button>
    </>
  )
}
