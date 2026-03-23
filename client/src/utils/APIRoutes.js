// environment
const ENV = import.meta.env.MODE || 'development'

// host
export const LOCAL = 'http://localhost:5000'
export const LIVE = 'https://syngentav3.onrender.com'

const BASE = ENV === 'production' ? LIVE : LOCAL

// truck
export const API_TRUCK = `${BASE}/api/truck`

// driver
export const API_DRIVER = `${BASE}/api/driver`

// admin
export const API_USER = `${BASE}/api/user`

// tool
export const API_TOOL = `${BASE}/api/tool`

// deployment
export const API_DEPLOYMENT = `${BASE}/api/deployment`

// analytics
export const API_ANALYTICS = `${BASE}/api/analytics`

// access
export const API_CLIENT = `${BASE}/api/client`

// activity logs
export const API_ACTIVITY_LOGS = `${BASE}/api/activity-logs`

// timeline logs
export const API_TIMELINE_LOGS = `${BASE}/api/timeline-logs`

// system settings
export const API_SYSTEM_SETTINGS = `${BASE}/api/system-settings`

// ai chat
export const API_AI_CHAT = `${BASE}/api/ai/chat`

// live chat
export const API_CHAT = `${BASE}/api/chat`

// pickup fields
export const API_PICKUP_FIELDS = `${BASE}/api/pickup-fields`
