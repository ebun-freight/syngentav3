import axios from 'axios'
import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import { API_USER } from '../../utils/APIRoutes'
import { toast } from 'react-toastify'
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild
} from '@headlessui/react'
import { IoClose } from 'react-icons/io5'
import { TbLogout } from 'react-icons/tb'
import { MdWarning } from 'react-icons/md'

function LogoutModal ({ isOpen, onClose }) {
  const navigate = useNavigate()
  const [isLogoutLoading, setIsLogoutLoading] = useState(false)

  const handleLogout = async () => {
    setIsLogoutLoading(true)
    const token = sessionStorage.getItem('userToken')
    try {
      const response = await axios.post(
        `${API_USER}/logout`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success(response.data.message || 'Logged out successfully')
      sessionStorage.removeItem('userToken')
      navigate('/')
    } catch (error) {
      console.log(error)
      toast.success('Logged out successfully')
      sessionStorage.removeItem('userToken')
      navigate('/')
    } finally {
      setIsLogoutLoading(false)
    }
  }

  const handleCloseModal = () => {
    if (isLogoutLoading) return
    onClose()
  }

  return (
    <Dialog open={isOpen} onClose={handleCloseModal} className='relative z-50'>
      <TransitionChild
        enter='ease-out duration-300'
        enterFrom='opacity-0'
        enterTo='opacity-100'
        leave='ease-in duration-200'
        leaveFrom='opacity-100'
        leaveTo='opacity-0'
      >
        <DialogBackdrop className='fixed inset-0 bg-black/40 backdrop-blur-sm' />
      </TransitionChild>

      <div className='fixed inset-0 flex items-center justify-center p-4 max-sm:p-2'>
        <TransitionChild
          enter='ease-out duration-300'
          enterFrom='opacity-0 scale-95'
          enterTo='opacity-100 scale-100'
          leave='ease-in duration-200'
          leaveFrom='opacity-100 scale-100'
          leaveTo='opacity-0 scale-95'
        >
          <DialogPanel className='font-poppins w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden'>
            {/* Header */}
            <div className='flex items-center justify-between px-6 pt-5 pb-4 max-sm:px-4 max-sm:pt-4 max-sm:pb-3 border-b border-gray-100'>
              <div>
                <h2 className='text-gray-900 font-bold text-lg max-sm:text-base'>
                  Confirm Logout
                </h2>
                <p className='text-gray-400 text-xs mt-0.5'>
                  Your current session will be ended.
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                disabled={isLogoutLoading}
                className='text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg text-xl transition-all cursor-pointer disabled:opacity-40 shrink-0 ml-4'
              >
                <IoClose />
              </button>
            </div>

            {/* Body */}
            <div className='px-6 py-6 max-sm:px-4 max-sm:py-4'>
              <div className='flex items-start gap-3 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3.5 max-sm:px-3 max-sm:py-3 mb-4'>
                <MdWarning className='text-orange-400 text-xl mt-0.5 shrink-0' />
                <p className='text-sm max-sm:text-xs text-orange-700 leading-relaxed'>
                  You are about to sign out of your account. Any unsaved changes
                  will be lost and you will need to log in again to continue.
                </p>
              </div>
              <p className='text-xs text-gray-400'>
                If you're not done yet, click{' '}
                <span className='font-semibold text-gray-500'>Cancel</span> to
                stay in your session.
              </p>
            </div>

            {/* Actions */}
            <div className='px-6 pb-5 pt-4 max-sm:px-4 max-sm:pb-4 border-t border-gray-100'>
              <div className='flex gap-3 max-sm:gap-2'>
                <button
                  type='button'
                  onClick={handleCloseModal}
                  disabled={isLogoutLoading}
                  className='px-8 py-2.5 rounded-xl font-semibold text-sm max-sm:text-xs uppercase tracking-wide bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
                >
                  Cancel
                </button>
                <button
                  type='button'
                  onClick={handleLogout}
                  disabled={isLogoutLoading}
                  className='px-8 py-2.5 rounded-xl font-semibold text-white text-sm max-sm:text-xs uppercase tracking-wide shadow-md hover:shadow-lg cursor-pointer active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2'
                  style={{
                    background:
                      'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  }}
                >
                  {isLogoutLoading ? (
                    <>
                      <span className='loading loading-spinner loading-xs sm:loading-sm' />
                      <span>Logging out...</span>
                    </>
                  ) : (
                    <>
                      <TbLogout className='text-base shrink-0' />
                      <span>Logout</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  )
}

export default LogoutModal
