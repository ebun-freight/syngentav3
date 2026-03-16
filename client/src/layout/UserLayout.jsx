import React from 'react'
import { Outlet } from 'react-router'
import Topbar from '../components/Topbar'
import SideNav from '../components/SideNav'
import clsx from 'clsx'
import { useUserContext } from '../contexts/UserContext'
import { useEffect } from 'react'
import AOS from 'aos'
import 'aos/dist/aos.css'
import LiveChatWidget from '../components/LiveChatWidget'

function UserLayout () {
  const { userData } = useUserContext()

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
      easing: 'ease-out-cubic'
    })
  }, [])

  return (
    <div className='h-dvh w-screen flex text-gray-800 bg-gray-50'>
      {/* sidenav */}
      <SideNav user={userData.data} />

      {/* main content div */}
      <div data-aos='fade-down' className='flex-1 flex flex-col'>
        {/* topbar */}
        <Topbar />

        {/* main content */}
        <div className='sm:m-8 flex-1 flex flex-col bg-white sm:rounded sm:shadow-card3 px-4 pb-4 sm:p-6 min-h-0 overflow-hidden'>
          <Outlet />
        </div>
      </div>

      {/* Live chat widget for non-admin users */}
      {userData.data.role !== 'head_admin' &&
        userData.data.role !== 'admin' && (
          <LiveChatWidget userId={userData.data._id} userRole={userData.data.role} />
        )}
    </div>
  )
}

export default UserLayout
