import React, { useState } from 'react'
import LiveClock from './LiveClock'
import { Link } from 'react-router'
import { TbLogout, TbUserSquareRounded } from 'react-icons/tb'
import { useUserContext } from '../contexts/UserContext'
import LogoutModal from './modals/LogoutModal'
import { no_image } from '../consts/images'
import clsx from 'clsx'
import { HiOutlineMenuAlt2 } from 'react-icons/hi'
import { useUIContext } from '../contexts/UIContext'

function TopBar () {
  const { userData } = useUserContext()
  const { isSideBarOpen, setIsSideBarOpen } = useUIContext()

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)

  const handleOpenSideBar = () => {
    setIsSideBarOpen(prev => !prev)
  }

  return (
    <>
      <header className='bg-white py-2.5 px-3 sm:px-8 flex items-center sm:shadow-sm sm:border-b border-gray-100'>
        {/* Burger button */}
        <button
          onClick={handleOpenSideBar}
          className='hover:bg-gray-100 p-2 rounded-xl text-2xl  cursor-pointer text-gray-600 transition-colors -translate-x-2 max-sm:-translate-y-2.5'
        >
          <HiOutlineMenuAlt2 />
        </button>

        <LiveClock />

        {/* User profile */}
        <div className='ml-auto dropdown'>
          <div
            tabIndex={0}
            role='button'
            className='flex items-center gap-3 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors px-3 py-2 rounded-xl border border-gray-200'
          >
            <img
              src={userData.data.imageUrl || no_image}
              className={clsx(
                'w-7 sm:w-8 aspect-square mask mask-squircle object-cover object-center',
                {
                  'opacity-100': userData?.data?.imageUrl,
                  'opacity-10': !userData?.data?.imageUrl
                }
              )}
            />
            <div className='flex flex-col'>
              <p className='text-xs sm:text-sm font-semibold text-nowrap capitalize text-gray-800 leading-tight max-w-32 w-full truncate'>
                {userData.data._id
                  ? `${userData.data.firstname} ${userData.data.lastname}`
                  : ''}
              </p>
              <span className='text-xxs sm:text-xs capitalize text-gray-400'>
                {userData.data.role !== 'subcon'
                  ? userData?.data?.role?.replace('_', ' ')
                  : userData?.data?.subcon?.replace('_', ' ')}
              </span>
            </div>
            {/* Chevron */}
            <svg
              className='w-3.5 h-3.5 text-gray-400 ml-1 shrink-0'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              strokeWidth={2.5}
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M19 9l-7 7-7-7'
              />
            </svg>
          </div>

          <ul
            tabIndex={0}
            className='dropdown-content menu right-0 mt-2 bg-white shadow-md rounded-xl w-56 border border-gray-100 p-1.5'
          >
            <li>
              <Link
                to='/secure/my-profile'
                className='flex gap-3 items-center px-4 py-2.5 hover:bg-gray-50 rounded-xl transition-colors'
              >
                <TbUserSquareRounded className='text-xl text-gray-500' />
                <p className='text-sm text-gray-700'>My Profile</p>
              </Link>
            </li>
            <li>
              <button
                onClick={() => setIsLogoutModalOpen(true)}
                className='flex gap-3 items-center px-4 py-2.5 hover:bg-red-50 cursor-pointer rounded-xl transition-colors w-full'
              >
                <TbLogout className='text-xl text-red-400' />
                <p className='text-sm text-red-400'>Logout</p>
              </button>
            </li>
          </ul>
        </div>
      </header>

      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      />
    </>
  )
}

export default TopBar
