import React from 'react'
import { Link, useLocation } from 'react-router'
import { ebun_logo_light } from '../consts/images'
import clsx from 'clsx'
import APP_CONFIG from '../config/version'
import { getNavItemsByRole } from '../consts/sidebarItems'
import { useUserContext } from '../contexts/UserContext'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { useEffect } from 'react'
import { useUIContext } from '../contexts/UIContext'

function SideNav () {
  const location = useLocation()
  const { userData } = useUserContext()
  const { isSideBarOpen, setIsSideBarOpen } = useUIContext()

  const filteredSidebar = getNavItemsByRole(userData.data.role)

  const handleNavigate = () => {
    setIsSideBarOpen(false)
  }

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
      easing: 'ease-out-cubic'
    })
  }, [])

  return (
    <>
      {/* big screen */}
      <div
        className={clsx(
          'w-full min-h-screen bg-linear-to-b from-primaryColor to-slate-950 shadow-card3 flex flex-col transition-all overflow-hidden z-50 absolute lg:static',
          {
            'max-w-68': isSideBarOpen,
            'max-w-0': !isSideBarOpen
          }
        )}
      >
        <div className='flex items-center justify-center gap-3 p-6 border-b border-white/10'>
          <img src={ebun_logo_light} alt='' className='w-14  scale-x-[-1]' />
          <div>
            <h1 className='font-semibold text-4xl tracking-widest text-white uppercase'>
              EBUN
            </h1>
            <p className='text-white -mt-1.5 uppercase tracking-wider ml-0.5 text-nowrap whitespace-nowrap'>
              Freight OPC
            </p>
          </div>
        </div>

        <div className='flex-1 flex flex-col overflow-y-auto'>
          <div className='flex flex-col mt-4 mb-4 px-4'>
            {filteredSidebar.map((content, index) => {
              if (content.type === 'header') {
                return (
                  <p
                    key={index}
                    className='uppercase text-xs font-semibold px-6 py-3 text-white/30 not-first:mt-4 text-nowrap whitespace-nowrap'
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
                    'flex items-center gap-4 px-6 py-3 active:scale-95 transition-transform rounded-sm ',
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
                  <p className='text-xl'>{content.icon}</p>
                  <p className='text-sm text-nowrap whitespace-nowrap'>
                    {content.name}
                  </p>
                </Link>
              )
            })}
          </div>

          {/* footer */}
          <div className='p-4 border-t border-white/10  mt-auto'>
            <p className='text-xs text-white/60 text-center leading-relaxed uppercase text-nowrap whitespace-nowrap'>
              © {APP_CONFIG.year} {APP_CONFIG.name}
              <br />
              All rights reserved
            </p>
            <p className='text-xs text-white/40 text-center mt-1 text-nowrap whitespace-nowrap'>
              Version {APP_CONFIG.version}
            </p>
          </div>
        </div>
      </div>

      {isSideBarOpen && (
        <div
          onClick={() => setIsSideBarOpen(false)}
          className='absolute bg-black/40 inset-0 z-40 backdrop-blur-xs lg:hidden'
        ></div>
      )}
    </>
  )
}

export default SideNav
