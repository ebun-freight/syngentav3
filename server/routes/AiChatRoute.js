// routes/AiChatRoute.js
const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const rateLimit = require('express-rate-limit')
const { ipKeyGenerator } = require('express-rate-limit')
const User = require('../models/userModel')
const publicKnowledge = require('../config/aiKnowledgeBase')
const adminKnowledge = require('../config/aiKnowledgeBaseAdmin')

// ─── Support Contact ──────────────────────────────────────────────────────────
const SUPPORT_CONTACT = {
  phone: '+639 9563 4027',
  email: 'support@ebunfreight.com' // update this to your real email
}

// ─── Rate Limiters ────────────────────────────────────────────────────────────

// Stricter limit for unauthenticated users (login page)
const publicRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 messages per 15 min
  keyGenerator: req => ipKeyGenerator(req),
  handler: (req, res) => {
    res.status(429).json({
      error:
        "You've sent too many messages. Please wait a few minutes and try again."
    })
  },
  standardHeaders: true,
  legacyHeaders: false
})

// More generous limit for authenticated users (inside the app)
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 40, // 40 messages per 15 min
  keyGenerator: req => req.user?._id?.toString() || ipKeyGenerator(req),
  handler: (req, res) => {
    res.status(429).json({
      error:
        "You've reached the message limit. Please wait a few minutes before continuing."
    })
  },
  standardHeaders: true,
  legacyHeaders: false
})

// ─── Optional Auth ────────────────────────────────────────────────────────────

// Attaches req.user if a valid token exists, but does NOT block if missing.
// This allows the chat to work on the login page (no token) and inside the app (with token).
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.id).select('-password')
      if (user) req.user = user
    }
  } catch (err) {
    // Invalid or expired token — just continue as unauthenticated (public)
  }
  next()
}

// ─── Dynamic Rate Limit ───────────────────────────────────────────────────────

// Apply the appropriate limiter based on whether the user is authenticated
const dynamicRateLimit = (req, res, next) => {
  const limiter = req.user ? authRateLimit : publicRateLimit
  return limiter(req, res, next)
}

// ─── Route ────────────────────────────────────────────────────────────────────

router.post('/chat', optionalAuth, dynamicRateLimit, async (req, res) => {
  const { messages } = req.body

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' })
  }

  // Use admin knowledge base if logged in as admin/head_admin, otherwise fall back to public
  const isAdmin = ['head_admin', 'admin'].includes(req.user?.role)
  const knowledge = isAdmin ? adminKnowledge : publicKnowledge

  // ─── Contact Support Snippet (injected into knowledge base) ───────────────
  const contactSnippet = `
-----------------------------------------------------------
CONTACT & SUPPORT
-----------------------------------------------------------
If you need direct assistance from the Ebun Freight team:
Phone: ${SUPPORT_CONTACT.phone}
Email: ${SUPPORT_CONTACT.email}

When Ebun AI is unavailable or cannot answer your question,
always direct the user to contact support using the above details.
`

  // Tailor the system prompt tone based on role
  const systemPrompt = isAdmin
    ? `You are Ebun AI, a knowledgeable internal assistant for the Ebun Freight OPC platform — used by admins and head admins.

Your job is to help with:
- Managing deployments (creating, updating, canceling, replacing trucks/drivers)
- Managing drivers and trucks (adding, editing, deleting, status changes)
- Managing user accounts (approving, updating, resetting passwords, roles)
- Activity logs and timeline logs
- Dashboard analytics and reports
- System settings (managing dropdown options)
- General platform navigation and how-to questions

RESPONSE RULES:
- Keep answers short and conversational (2–4 sentences) unless a step-by-step answer is genuinely needed
- For how-to questions, use a brief numbered list
- Always be clear, professional, and direct
- Only answer based on the knowledge base below — do not guess or make up details
- If a question is outside the knowledge base, say: "I don't have that detail — please check with the head admin or the Ebun support team."
- Never reveal sensitive data like API keys, JWT secrets, or database credentials

Use the following knowledge base to answer questions accurately:
${knowledge}
${contactSnippet}`
    : `You are Ebun AI, a friendly and helpful support assistant for Ebun Freight OPC — a technology-driven freight and logistics company in the Philippines (Est. 2026).

Your job is to help visitors and subcontractors with:
- Platform navigation (login, account, pages, features)
- Tracking shipments and understanding deployment statuses
- Viewing driver and truck information
- Account registration, login issues, and profile updates
- General FAQs about Ebun Freight and how the platform works

RESPONSE RULES:
- Keep answers short and conversational (2–4 sentences) unless a step-by-step answer is genuinely needed
- For how-to questions, use a brief numbered list
- Always be warm, professional, and helpful
- Only answer based on the knowledge base below — do not guess or make up details
- If a question is outside the knowledge base, say: "I don't have that detail — please contact the Ebun support team directly."
- Never discuss internal admin operations, user management, or system configurations

Use the following knowledge base to answer questions accurately:
${knowledge}
${contactSnippet}`

  try {
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 1000,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            ...messages
          ]
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('Groq error:', data)

      const groqMessage = data?.error?.message || ''

      // Groq rate limit (TPD/TPM) — hide internal details, show friendly message
      if (
        response.status === 429 ||
        groqMessage.toLowerCase().includes('rate limit')
      ) {
        return res.status(429).json({
          error: `Ebun AI is temporarily unavailable. For urgent concerns, contact us at ${SUPPORT_CONTACT.email} or call ${SUPPORT_CONTACT.phone}.`
        })
      }

      return res.status(500).json({
        error: `Ebun AI encountered an issue. Please try again shortly. If the problem persists, contact us at ${SUPPORT_CONTACT.email}.`
      })
    }

    const reply =
      data.choices?.[0]?.message?.content ||
      "I'm having trouble responding right now. Please try again shortly."

    res.json({ reply })
  } catch (err) {
    console.error('AI chat error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router
