/**
 * AIChatWidget — Redesigned
 * Aesthetic: Industrial Precision / Freight Terminal
 * Fonts: Syne (display) + DM Mono (labels) — add to your index.html:
 *   <link href="https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
 */

import React, { useState, useRef, useEffect } from 'react'
import { RiCloseLine, RiSendPlaneFill, RiMessage3Fill } from 'react-icons/ri'
import { ebun_logo_light } from '../consts/images'

/* ─────────────────────────────────────────────────────── tokens ── */
const T = {
  black: '#0A0A0A',
  white: '#FFFFFF',
  surface: '#F7F6F3', // warm off-white message area
  amber: '#D97706', // sole accent
  amberLt: '#FEF3C7', // amber tint for suggestion hover
  border: '#E4E2DD',
  muted: '#9A9690',
  text: '#1A1918',
  mono: "'DM Mono', 'Courier New', monospace",
  display: "'Syne', system-ui, sans-serif"
}

/* ─────────────────────────────────────────────────────── typing ── */
const TypingDots = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      padding: '10px 14px'
    }}
  >
    {[0, 1, 2].map(i => (
      <span
        key={i}
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: T.amber,
          display: 'inline-block',
          animation: 'ebun-bounce 0.9s ease-in-out infinite',
          animationDelay: `${i * 0.18}s`
        }}
      />
    ))}
  </div>
)

/* ─────────────────────────────────────────────────────── bubble ── */
const Bubble = ({ role, text }) => {
  const isUser = role === 'user'
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 8,
        marginBottom: 10,
        justifyContent: isUser ? 'flex-end' : 'flex-start'
      }}
    >
      {!isUser && (
        <div
          style={{
            width: 28,
            height: 28,
            background: T.black,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 5,
            flexShrink: 0,
            marginBottom: 2
          }}
        >
          <img
            src={ebun_logo_light}
            alt='Ebun'
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>
      )}

      <div
        style={{
          maxWidth: '73%',
          padding: '9px 13px',
          fontSize: 12.5,
          lineHeight: 1.6,
          borderRadius: isUser ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
          ...(isUser
            ? {
                background: T.black,
                color: T.white,
                fontFamily: T.mono,
                letterSpacing: 0.1
              }
            : {
                background: T.white,
                color: T.text,
                borderLeft: `2.5px solid ${T.amber}`,
                border: `0.5px solid ${T.border}`,
                borderLeft: `2.5px solid ${T.amber}`
              })
        }}
      >
        {text}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────── consts ── */
const SUGGESTIONS = [
  'What does Ebun Freight do?',
  'How do I track a shipment?',
  'How do I reset my password?',
  'What services are available?'
]

const COOLDOWN_SECS = 5

const SYSTEM_DETAILS =
  'System details: I can explain Ebun Freight features and workflows based on public product info and your inputs. I do not have access to internal databases, live shipment records, or private customer data.'

const getHardcodedReply = rawText => {
  const text = (rawText || '').toLowerCase()

  if (text.includes('track')) {
    return 'To track a shipment, open your dashboard, go to Tracking, and enter the shipment or reference number. You can also use the tracking link sent in your confirmation email.'
  }

  if (text.includes('reset') || text.includes('password')) {
    return 'To reset your password, click “Forgot password” on the sign-in screen and follow the email verification steps. If the email doesn’t arrive, check spam or wait a few minutes before retrying.'
  }

  if (text.includes('services') || text.includes('available')) {
    return 'Ebun Freight provides shipment booking, tracking, status notifications, and document management. Additional services may include customs support and multi-leg coordination depending on your account.'
  }

  if (
    text.includes('what does') ||
    text.includes('ebun') ||
    text.includes('freight')
  ) {
    return 'Ebun Freight is a logistics platform that helps you book, track, and manage shipments in one place, with status updates and account tools for teams.'
  }

  return 'I can help with tracking, account access, and service details. Try one of the suggested questions below or ask in your own words.'
}

/* ─────────────────────────────────────────────────── main widget ── */
export default function AIChatWidget () {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hi — I'm Ebun AI. Ask me anything about tracking, your account, or how the platform works. ${SYSTEM_DETAILS}`
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pulse, setPulse] = useState(true)
  const [cooldown, setCooldown] = useState(0)
  const [usedSuggestions, setUsedSuggestions] = useState(new Set())

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

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 80) + 'px'
  }, [input])

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

    const reply = getHardcodedReply(trimmed)

    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: `${reply} ${SYSTEM_DETAILS}`
        }
      ])
      setLoading(false)
    }, 500)
  }

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const isBlocked = loading || cooldown > 0
  const canSend = input.trim() && !isBlocked
  const remainingSuggestions = SUGGESTIONS.filter(s => !usedSuggestions.has(s))

  return (
    <>
      {/* ── Keyframes injected once ── */}
      <style>{`
        @keyframes ebun-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: .5; }
          40%            { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes ebun-panel-in {
          from { opacity: 0; transform: scale(.96) translateY(6px); }
          to   { opacity: 1; transform: scale(1)   translateY(0); }
        }
        @keyframes ebun-fab-ping {
          0%   { transform: scale(1);   opacity: .35; }
          70%  { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .ebun-fab:hover  { transform: scale(1.06) !important; }
        .ebun-fab:active { transform: scale(.94)  !important; }
        .ebun-send:hover:not(:disabled) { background: ${T.amber} !important; }
        .ebun-send:active:not(:disabled) { transform: scale(.9); }
        .ebun-suggestion:hover { background: ${T.amberLt} !important; border-color: ${T.amber} !important; color: ${T.black} !important; }
        .ebun-textarea:focus { outline: none; border-color: ${T.amber} !important; box-shadow: 0 0 0 2px ${T.amber}22 !important; }
        .ebun-close:hover { background: rgba(255,255,255,.1) !important; }
        .ebun-msgs::-webkit-scrollbar { width: 3px; }
        .ebun-msgs::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }
      `}</style>

      {/* ══════════════════════ CHAT PANEL ══════════════════════ */}
      <div
        style={{
          position: 'fixed',
          bottom: 78,
          right: 20,
          zIndex: 9999,
          width: 340,
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: '58vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 12,
          overflow: 'hidden',
          border: `1px solid ${T.border}`,
          boxShadow:
            '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.10)',
          transformOrigin: 'bottom right',
          transition: 'opacity .25s ease, transform .25s ease',
          opacity: open ? 1 : 0,
          transform: open
            ? 'scale(1) translateY(0)'
            : 'scale(.95) translateY(6px)',
          pointerEvents: open ? 'auto' : 'none',
          animation: open ? 'ebun-panel-in .25s ease' : 'none'
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            background: T.black,
            padding: '13px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
            borderBottom: `2px solid ${T.amber}`
          }}
        >
          {/* Logo mark */}
          <div
            style={{
              width: 34,
              height: 34,
              border: '1px solid rgba(255,255,255,.15)',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 6,
              flexShrink: 0
            }}
          >
            <img
              src={ebun_logo_light}
              alt='Ebun'
              style={{ width: '100%', objectFit: 'contain' }}
            />
          </div>

          {/* Title block */}
          <div style={{ flex: 1 }}>
            <p
              style={{
                margin: 0,
                fontFamily: T.display,
                fontWeight: 700,
                fontSize: 14,
                color: T.white,
                letterSpacing: '-0.2px',
                lineHeight: 1.2
              }}
            >
              Ebun AI
            </p>
            <p
              style={{
                margin: '2px 0 0',
                fontFamily: T.mono,
                fontSize: 10,
                color: T.amber,
                letterSpacing: 1.2,
                textTransform: 'uppercase'
              }}
            >
              ● Online
            </p>
          </div>

          {/* Close */}
          <button
            className='ebun-close'
            onClick={() => setOpen(false)}
            style={{
              width: 28,
              height: 28,
              borderRadius: 5,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background .15s',
              flexShrink: 0
            }}
          >
            <RiCloseLine
              style={{ color: 'rgba(255,255,255,.5)', width: 16, height: 16 }}
            />
          </button>
        </div>

        {/* ── Messages ── */}
        <div
          className='ebun-msgs'
          style={{
            flex: 1,
            overflowY: 'auto',
            background: T.surface,
            padding: '14px 12px 8px',
            minHeight: 0
          }}
        >
          {messages.map((m, i) => (
            <Bubble key={i} role={m.role} text={m.text} />
          ))}

          {loading && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 8,
                marginBottom: 10
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  background: T.black,
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 5,
                  flexShrink: 0
                }}
              >
                <img
                  src={ebun_logo_light}
                  alt='Ebun'
                  style={{ width: '100%', objectFit: 'contain' }}
                />
              </div>
              <div
                style={{
                  background: T.white,
                  borderLeft: `2.5px solid ${T.amber}`,
                  border: `0.5px solid ${T.border}`,
                  borderRadius: '10px 10px 10px 2px'
                }}
              >
                <TypingDots />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Suggestions ── */}
        {!loading && remainingSuggestions.length > 0 && (
          <div
            style={{
              background: T.surface,
              borderTop: `1px solid ${T.border}`,
              padding: '8px 12px 10px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6
            }}
          >
            {remainingSuggestions.map(s => (
              <button
                key={s}
                className='ebun-suggestion'
                onClick={() => {
                  if (isBlocked) return
                  setUsedSuggestions(prev => {
                    const next = new Set(prev)
                    next.add(s)
                    return next
                  })
                  sendMessage(s)
                }}
                style={{
                  fontSize: 10.5,
                  fontFamily: T.mono,
                  padding: '4px 10px',
                  border: `1px solid ${T.border}`,
                  borderRadius: 20,
                  background: T.white,
                  color: T.muted,
                  cursor: 'pointer',
                  transition: 'all .15s',
                  letterSpacing: 0.2
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* ── Input Bar ── */}
        <div
          style={{
            background: T.white,
            borderTop: `1px solid ${T.border}`,
            padding: '10px 10px 10px 12px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: 8,
            flexShrink: 0
          }}
        >
          <textarea
            ref={el => {
              inputRef.current = el
              textareaRef.current = el
            }}
            className='ebun-textarea'
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder='Ask me anything…'
            rows={1}
            style={{
              flex: 1,
              resize: 'none',
              fontSize: 12.5,
              fontFamily: T.mono,
              color: T.text,
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              padding: '8px 10px',
              lineHeight: 1.5,
              maxHeight: 80,
              overflowY: 'auto',
              transition: 'border-color .15s, box-shadow .15s'
            }}
          />

          {/* Send / Cooldown button */}
          <button
            className='ebun-send'
            onClick={() => sendMessage()}
            disabled={!canSend}
            style={{
              width: 34,
              height: 34,
              borderRadius: 6,
              border: 'none',
              background: canSend ? T.black : T.border,
              cursor: canSend ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginBottom: 1,
              position: 'relative',
              transition: 'background .15s'
            }}
          >
            {cooldown > 0 ? (
              <span
                style={{
                  fontFamily: T.mono,
                  fontSize: 10,
                  fontWeight: 500,
                  color: T.muted,
                  letterSpacing: 0.5
                }}
              >
                {cooldown}s
              </span>
            ) : (
              <RiSendPlaneFill
                style={{
                  color: canSend ? T.white : T.muted,
                  width: 13,
                  height: 13
                }}
              />
            )}
          </button>
        </div>
      </div>

      {/* ══════════════════════ FAB BUTTON ══════════════════════ */}
      <button
        className='ebun-fab'
        onClick={() => setOpen(o => !o)}
        aria-label='Toggle Ebun AI chat'
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 9999,
          width: 50,
          height: 50,
          borderRadius: 10,
          border: 'none',
          background: T.black,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform .2s ease',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)'
        }}
      >
        {/* Ping ring */}
        {pulse && (
          <span
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 10,
              background: T.black,
              animation: 'ebun-fab-ping 1.8s cubic-bezier(0,0,.2,1) infinite'
            }}
          />
        )}

        {/* Chat icon */}
        <RiMessage3Fill
          style={{
            position: 'absolute',
            width: 20,
            height: 20,
            color: T.white,
            transition: 'opacity .2s, transform .2s',
            opacity: open ? 0 : 1,
            transform: open ? 'scale(.7) rotate(90deg)' : 'scale(1) rotate(0)'
          }}
        />

        {/* Close icon */}
        <RiCloseLine
          style={{
            position: 'absolute',
            width: 20,
            height: 20,
            color: T.white,
            transition: 'opacity .2s, transform .2s',
            opacity: open ? 1 : 0,
            transform: open ? 'scale(1) rotate(0)' : 'scale(.7) rotate(-90deg)'
          }}
        />

        {/* Badge */}
        {pulse && (
          <span
            style={{
              position: 'absolute',
              top: -5,
              right: -5,
              width: 16,
              height: 16,
              background: T.amber,
              borderRadius: '50%',
              fontSize: 9,
              fontFamily: T.mono,
              fontWeight: 600,
              color: T.white,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 0 2px #fff'
            }}
          >
            1
          </span>
        )}
      </button>
    </>
  )
}
