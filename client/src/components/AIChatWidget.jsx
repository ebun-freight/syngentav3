import React, { useState, useRef, useEffect } from 'react'
import { API_AI_CHAT } from '../utils/APIRoutes'
import { RiCloseLine, RiSendPlaneFill, RiMessage3Fill } from 'react-icons/ri'
import { ebun_logo_light } from '../consts/images'

/* ─── Typing indicator ───────────────────────────────────────────────────── */
const TypingDots = () => (
  <div className='flex items-center gap-1 px-3.5 py-2.5'>
    {[0, 1, 2].map(i => (
      <span
        key={i}
        className='w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce'
        style={{ animationDelay: `${i * 0.18}s`, animationDuration: '0.85s' }}
      />
    ))}
  </div>
)

/* ─── Chat bubble ────────────────────────────────────────────────────────── */
const Bubble = ({ role, text }) => {
  const isUser = role === 'user'
  return (
    <div
      className={`flex items-end gap-2 mb-3 ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {!isUser && (
        <div
          className='w-6 sm:w-8 aspect-square p-1 sm:p-1.5 rounded-lg shrink-0 flex items-center justify-center mb-0.5'
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)'
          }}
        >
          <img src={ebun_logo_light} alt='Logo' />
        </div>
      )}
      <div
        className={`max-w-[75%] px-3.5 py-2.5 text-xs leading-relaxed ${
          isUser
            ? 'text-white rounded-2xl rounded-br-sm'
            : 'bg-white text-gray-700 border border-gray-100 rounded-2xl rounded-bl-sm shadow-sm'
        }`}
        style={
          isUser
            ? {
                background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)'
              }
            : {}
        }
      >
        {text}
      </div>
    </div>
  )
}

/* ─── Suggestions ────────────────────────────────────────────────────────── */
const SUGGESTIONS = [
  'What does Ebun Freight do?',
  'How do I track a shipment?',
  'How do I reset my password?',
  'What services are available?'
]

const COOLDOWN_SECS = 5

/* ─── Main Widget ────────────────────────────────────────────────────────── */
export default function AIChatWidget () {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hi! I'm Ebun AI 👋 Ask me anything about the platform — tracking, your account, or how things work."
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pulse, setPulse] = useState(true)
  const [cooldown, setCooldown] = useState(0) // seconds remaining
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const textareaRef = useRef(null)
  const cooldownRef = useRef(null)

  useEffect(() => {
    if (open) setPulse(false)
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200)
  }, [open])

  // Auto-resize textarea whenever input changes (including clearing after send)
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 80) + 'px'
  }, [input])

  // Cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(cooldownRef.current)
  }, [cooldown > 0 && cooldown === COOLDOWN_SECS]) // only restart when a new cooldown begins

  const startCooldown = () => {
    clearInterval(cooldownRef.current)
    setCooldown(COOLDOWN_SECS)
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const sendMessage = async text => {
    const trimmed = (text ?? input).trim()
    if (!trimmed || loading || cooldown > 0) return

    const userMsg = { role: 'user', text: trimmed }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    startCooldown()

    const history = [...messages.slice(1), userMsg].map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.text
    }))

    try {
      const token = sessionStorage.getItem('userToken')
      const res = await fetch(API_AI_CHAT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({ messages: history })
      })

      const data = await res.json()

      if (!res.ok) {
        const errorMsg =
          data?.error || 'Something went wrong. Please try again.'
        setMessages(prev => [...prev, { role: 'assistant', text: errorMsg }])
        return
      }

      const reply =
        data.reply ||
        "I'm having trouble responding right now. Please try again shortly."
      setMessages(prev => [...prev, { role: 'assistant', text: reply }])
    } catch (err) {
      console.error('Chat error:', err)
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: "Can't reach the server. Please check your connection and try again."
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const isBlocked = loading || cooldown > 0
  const canSend = input.trim() && !isBlocked

  return (
    <>
      {/* ── Chat Panel ── */}
      <div
        className={`fixed bottom-20 right-5 z-50 w-80 sm:w-88 flex flex-col
                    rounded-2xl overflow-hidden shadow-2xl
                    transition-all duration-300 ease-out origin-bottom-right
                    ${
                      open
                        ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
                    }`}
        style={{ maxHeight: '58vh' }}
      >
        {/* ── Header ── */}
        <div
          className='flex items-center gap-2.5 px-4 py-3 shrink-0'
          style={{
            background:
              'linear-gradient(135deg, #0a0f1e 0%, #0f2744 70%, #0a1628 100%)'
          }}
        >
          {/* Avatar */}
          <div className='relative shrink-0'>
            <div
              className='w-8 sm:w-10 aspect-square text-white p-1 rounded-xl flex items-center justify-center'
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)'
              }}
            >
              <img src={ebun_logo_light} alt='Logo' />
            </div>
            {/* Online dot */}
            <span className='absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0f2744]' />
          </div>

          {/* Title */}
          <div className='flex-1 min-w-0'>
            <p className='text-white text-sm font-semibold leading-tight tracking-tight'>
              Ebun AI
            </p>
            <p className='text-emerald-400 text-xxs mt-0.5 font-medium'>
              Online
            </p>
          </div>

          {/* Close */}
          <button
            onClick={() => setOpen(false)}
            className='w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all duration-150'
          >
            <RiCloseLine className='w-4 h-4' />
          </button>
        </div>

        {/* ── Messages ── */}
        <div
          className='flex-1 overflow-y-auto scrollbar-thin sm:scrollbar-none px-3.5 pt-3.5 pb-2 min-h-0'
          style={{ background: '#f8fafc' }}
        >
          {messages.map((m, i) => (
            <Bubble key={i} role={m.role} text={m.text} />
          ))}

          {/* Typing indicator — always shown while loading */}
          {loading && (
            <div className='flex items-end gap-2 mb-3'>
              <div
                className='w-6 sm:w-8 aspect-square p-1 sm:p-1.5 rounded-lg shrink-0 flex items-center justify-center'
                style={{
                  background:
                    'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)'
                }}
              >
                <img src={ebun_logo_light} alt='Logo' />
              </div>
              <div className='bg-white border border-gray-100 rounded-2xl rounded-bl-sm shadow-sm'>
                <TypingDots />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Suggestions (first load only) ── */}
        {messages.length === 1 && (
          <div
            className='px-3.5 pb-2 pt-1.5 flex flex-wrap gap-1.5 border-t border-gray-100'
            style={{ background: '#f8fafc' }}
          >
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className='text-[11px] px-2.5 py-1 rounded-full border border-gray-200 bg-white
                           text-gray-500 hover:text-slate-800 hover:border-slate-400
                           transition-all duration-150 shadow-sm'
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* ── Input Bar ── */}
        <div className='bg-white border-t border-gray-100 px-3 py-2.5 flex items-end gap-2 shrink-0'>
          <textarea
            ref={el => {
              inputRef.current = el
              textareaRef.current = el
            }}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder='Ask me anything…'
            rows={1}
            className='flex-1 resize-none text-xs text-gray-800 placeholder-gray-400 bg-gray-50
                       border border-gray-200 rounded-xl px-3 py-2 focus:outline-none
                       focus:border-slate-500 focus:ring-2 focus:ring-slate-500/10
                       transition-all duration-150 overflow-y-auto scrollbar-none'
            style={{ lineHeight: '1.5', maxHeight: '80px' }}
          />

          {/* Send button — fixed size, swaps icon ↔ countdown internally */}
          <button
            onClick={() => sendMessage()}
            disabled={!canSend}
            className='w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mb-0.5
                       transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed
                       hover:brightness-110 active:scale-90'
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)'
            }}
          >
            {/* Both children always rendered; visibility toggled via opacity/scale so size never shifts */}
            <span
              className={`absolute transition-all duration-150 ${
                cooldown > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
              }`}
            >
              <span
                className='text-white font-semibold'
                style={{ fontSize: '11px', lineHeight: 1 }}
              >
                {cooldown}s
              </span>
            </span>
            <span
              className={`absolute transition-all duration-150 ${
                cooldown > 0 ? 'opacity-0 scale-75' : 'opacity-100 scale-100'
              }`}
            >
              <RiSendPlaneFill className='w-3.5 h-3.5 text-white' />
            </span>
          </button>
        </div>
      </div>

      {/* ── FAB Button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className='fixed bottom-5 right-5 z-50 rounded-2xl shadow-lg
                   flex items-center justify-center
                   hover:scale-105 active:scale-95 transition-all duration-200'
        style={{
          width: '52px',
          height: '52px',
          background:
            'linear-gradient(135deg, #0a0f1e 0%, #0f2744 60%, #0a1628 100%)'
        }}
        aria-label='Toggle Ebun AI chat'
      >
        {/* Ping ring */}
        {pulse && (
          <span className='absolute inset-0 rounded-2xl animate-ping opacity-20 bg-slate-500' />
        )}

        {/* Chat icon */}
        <RiMessage3Fill
          className={`w-5 h-5 text-white absolute transition-all duration-200 ${
            open
              ? 'opacity-0 scale-75 rotate-90'
              : 'opacity-100 scale-100 rotate-0'
          }`}
        />

        {/* Close icon */}
        <RiCloseLine
          className={`w-5 h-5 text-white absolute transition-all duration-200 ${
            open
              ? 'opacity-100 scale-100 rotate-0'
              : 'opacity-0 scale-75 -rotate-90'
          }`}
        />

        {/* Notification badge */}
        {pulse && (
          <span
            className='absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full
                           text-[9px] font-bold text-white flex items-center justify-center shadow-md'
          >
            1
          </span>
        )}
      </button>
    </>
  )
}
