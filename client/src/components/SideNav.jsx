import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { ebun_logo_light } from '../consts/images'
import clsx from 'clsx'
import APP_CONFIG from '../config/version'
import { getNavItemsByRole } from '../consts/sidebarItems'
import { useUserContext } from '../contexts/UserContext'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { useUIContext } from '../contexts/UIContext'
import axios from 'axios'
import { API_CHAT } from '../utils/APIRoutes'
import socket from '../config/socket'

/* ─── Decorative SVG dot pattern (matches Login/Signup) ─────────────────── */
const DotPattern = () => (
  <svg
    className='absolute inset-0 w-full h-full opacity-10 pointer-events-none'
    xmlns='http://www.w3.org/2000/svg'
  >
    <defs>
      <pattern
        id='dots-sidenav'
        x='0'
        y='0'
        width='24'
        height='24'
        patternUnits='userSpaceOnUse'
      >
        <circle cx='2' cy='2' r='1.5' fill='white' />
      </pattern>
    </defs>
    <rect width='100%' height='100%' fill='url(#dots-sidenav)' />
  </svg>
)

function SideNav () {
  const location = useLocation()
  const { userData } = useUserContext()
  const { isSideBarOpen, setIsSideBarOpen } = useUIContext()
  const [chatUnreadCount, setChatUnreadCount] = useState(0)

  const filteredSidebar = getNavItemsByRole(userData.data.role)
  const isAdmin = ['head_admin', 'admin'].includes(userData.data.role)
  const isOnChatPage = location.pathname === '/secure/live-chat'

  const handleNavigate = () => {
    if (window.innerWidth < 1024) {
      setIsSideBarOpen(false)
    }
  }

  // Fetch unread chat count for admins
  const fetchUnreadCount = async () => {
    if (!isAdmin) return
    try {
      const token = sessionStorage.getItem('userToken')
      const res = await axios.get(`${API_CHAT}/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setChatUnreadCount(res.data.unreadCount ?? 0)
    } catch {
      // silently ignore
    }
  }

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
      easing: 'ease-out-cubic'
    })
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    fetchUnreadCount()
    socket.on('unread-count-updated', fetchUnreadCount)
    return () => socket.off('unread-count-updated', fetchUnreadCount)
  }, [isAdmin])

  // Clear badge while on chat page; re-fetch when leaving
  useEffect(() => {
    if (isOnChatPage) {
      setChatUnreadCount(0)
    } else {
      fetchUnreadCount()
    }
  }, [isOnChatPage])

  return (
    <>
      {/* Sidebar */}
      <div
        className={clsx(
          'w-full min-h-screen bg-linear-to-b from-primaryColor to-slate-950 shadow-card3 flex flex-col transition-all overflow-hidden z-50 absolute lg:static',
          {
            'max-w-56 sm:max-w-68': isSideBarOpen,
            'max-w-0': !isSideBarOpen
          }
        )}
      >
        {/* Dot pattern over entire sidebar */}
        <DotPattern />

        {/* ── Logo Section ──────────────────────────────────────────────── */}
        <div
          className='relative flex items-center justify-center gap-3 p-4 sm:p-6 border-b border-white/10 overflow-hidden'
          style={{
            background:
              'linear-gradient(155deg, #020617 0%, #001e36 55%, #0f172a 100%)'
          }}
        >
          {/* Radial glow top-right */}
          <div
            className='absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-15 pointer-events-none'
            style={{
              background: 'radial-gradient(circle, #475569 0%, transparent 70%)'
            }}
          />
          {/* Radial glow bottom-left */}
          <div
            className='absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-10 pointer-events-none'
            style={{
              background: 'radial-gradient(circle, #334155 0%, transparent 70%)'
            }}
          />

          {/* Logo content */}
          <div className='relative z-10 flex items-center justify-center gap-3'>
            <img src={ebun_logo_light} alt='' className='w-10 sm:w-14' />
            <div>
              <h1 className='font-semibold text-3xl sm:text-4xl tracking-widest text-white uppercase'>
                EBUN
              </h1>
              <p className='max-sm:text-xs text-white -mt-1.5 uppercase tracking-widest sm:tracking-wider sm:ml-0.5 text-nowrap whitespace-nowrap'>
                Freight OPC
              </p>
            </div>
          </div>
        </div>

        {/* ── Nav Items ─────────────────────────────────────────────────── */}
        <div className='flex-1 flex flex-col overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/30 [scrollbar-color:rgba(255,255,255,0.2)_transparent] scrollbar-thin'>
          <div className='flex flex-col mt-4 mb-4 px-4'>
            {filteredSidebar.map((content, index) => {
              if (content.type === 'header') {
                return (
                  <p
                    key={index}
                    className='uppercase text-xxs sm:text-xs font-semibold px-6 py-3 text-white/30 not-first:mt-4 text-nowrap whitespace-nowrap'
                  >
                    {content.name}
                  </p>
                )
              }

              return (
                <Link
                  key={index}
                  to={content.path}
                  onClick={handleNavigate}
                  className={clsx(
                    'flex items-center gap-4 px-4 sm:px-6 py-2 sm:py-3 active:scale-95 transition-transform rounded-xl',
                    {
                      'bg-white/90 text-primaryColor font-medium':
                        location.pathname === content.path ||
                        location.pathname.includes(content.path),
                      'hover:bg-white/5 text-white/80':
                        !location.pathname === content.path ||
                        !location.pathname.includes(content.path)
                    }
                  )}
                >
                  <p className='text-lg sm:text-xl'>{content.icon}</p>
                  <p className='text-xs sm:text-sm text-nowrap whitespace-nowrap'>
                    {content.name}
                  </p>
                  {/* Live chat unread badge for admin */}
                  {content.path === '/secure/live-chat' && chatUnreadCount > 0 && !isOnChatPage && (
                    <span className='ml-auto text-[11px] bg-red-500 text-white rounded-full px-2 py-0.5 font-semibold'>
                      {chatUnreadCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {isSideBarOpen && (
        <div
          onClick={() => setIsSideBarOpen(false)}
          className='absolute bg-black/40 inset-0 z-40 backdrop-blur-xs lg:hidden h-screen'
        />
      )}
    </>
  )
}

export default SideNav
