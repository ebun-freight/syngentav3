import { io } from 'socket.io-client'

const ENV = import.meta.env.MODE || 'development'
const LOCAL = 'http://localhost:5000'
const LIVE = 'https://ebun-monitoring-4fne.onrender.com'

const BASE = ENV === 'production' ? LIVE : LOCAL

const socket = io(BASE, {
  autoConnect: false,
  transports: ['websocket', 'polling']
})

export default socket
