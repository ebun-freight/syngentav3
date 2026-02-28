import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild
} from '@headlessui/react'
import axios from 'axios'
import React, { useState } from 'react'
import { FaTrash, FaTruck } from 'react-icons/fa'
import { IoClose } from 'react-icons/io5'
import { MdWarning } from 'react-icons/md'
import { toast } from 'react-toastify'
import { API_TRUCK } from '../../utils/APIRoutes'

const DotPattern = () => (
  <svg
    className='absolute inset-0 w-full h-full opacity-10 pointer-events-none'
    xmlns='http://www.w3.org/2000/svg'
  >
    <defs>
      <pattern
        id='dots-delete-truck'
        x='0'
        y='0'
        width='20'
        height='20'
        patternUnits='userSpaceOnUse'
      >
        <circle cx='2' cy='2' r='1.2' fill='white' />
      </pattern>
    </defs>
    <rect width='100%' height='100%' fill='url(#dots-delete-truck)' />
  </svg>
)

function DeleteTruckModal ({ truck, isOpen, onClose, onDelete }) {
  const [isDeleteLoading, setIsDeleteLoading] = useState(false)

  const handleDeleteTruck = async () => {
    setIsDeleteLoading(true)
    try {
      const token = sessionStorage.getItem('userToken')
      const response = await axios.delete(
        `${API_TRUCK}/soft-delete/${truck._id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      toast.success(response.data.message)
      onDelete(truck._id)
      onClose()
    } catch (error) {
      toast.error(error.response.data.message || 'Something went wrong!')
    } finally {
      setIsDeleteLoading(false)
    }
  }

  const handleCloseModal = () => {
    if (isDeleteLoading) return
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

      <div className='fixed inset-0 flex items-center justify-center p-4'>
        <TransitionChild
          enter='ease-out duration-300'
          enterFrom='opacity-0 scale-95'
          enterTo='opacity-100 scale-100'
          leave='ease-in duration-200'
          leaveFrom='opacity-100 scale-100'
          leaveTo='opacity-0 scale-95'
        >
          <DialogPanel className='font-poppins w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col sm:flex-row'>
            {/* ── Left Panel ─────────────────────────────────────────────────── */}
            <div
              className='relative flex flex-col items-center justify-center overflow-hidden sm:w-52 shrink-0 p-8'
              style={{
                background:
                  'linear-gradient(155deg, #1a0000 0%, #3b0000 55%, #1c0a0a 100%)'
              }}
            >
              <DotPattern />
              <div
                className='absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-15 pointer-events-none'
                style={{
                  background:
                    'radial-gradient(circle, #ef4444 0%, transparent 70%)'
                }}
              />
              <div
                className='absolute -bottom-12 -left-12 w-44 h-44 rounded-full opacity-10 pointer-events-none'
                style={{
                  background:
                    'radial-gradient(circle, #dc2626 0%, transparent 70%)'
                }}
              />

              <div className='relative z-10 flex flex-col items-center gap-4'>
                <div className='w-20 h-20 rounded-2xl bg-red-500/20 border-2 border-red-400/30 flex items-center justify-center'>
                  <FaTruck className='text-red-400 text-3xl' />
                </div>
                <div className='text-center'>
                  <p className='text-white/40 text-xxs uppercase tracking-wider font-semibold mb-1'>
                    Action
                  </p>
                  <p className='text-red-300 font-bold text-sm uppercase tracking-wide'>
                    Delete Truck
                  </p>
                </div>
                <div className='w-full h-px bg-white/10' />
                <div className='flex items-center gap-2 bg-red-500/20 border border-red-400/30 rounded-xl px-3 py-2 w-full'>
                  <span className='w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse shrink-0' />
                  <p className='text-red-300 text-xs font-semibold uppercase tracking-wide whitespace-nowrap'>
                    Irreversible
                  </p>
                </div>
              </div>
            </div>

            {/* ── Right Panel ─────────────────────────────────────────────────── */}
            <div className='grow min-w-0'>
              <div className='flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100'>
                <div>
                  <h2 className='text-gray-900 font-bold text-lg'>
                    Delete Truck
                  </h2>
                  <p className='text-gray-400 text-xs mt-0.5'>
                    This action cannot be undone.
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  disabled={isDeleteLoading}
                  className='text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg text-xl transition-all cursor-pointer disabled:opacity-40 shrink-0 ml-4'
                >
                  <IoClose />
                </button>
              </div>

              <div className='px-6 py-6'>
                <div className='flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3.5 mb-4'>
                  <MdWarning className='text-red-400 text-xl mt-0.5 shrink-0' />
                  <p className='text-sm text-red-700 leading-relaxed'>
                    You are about to permanently delete truck{' '}
                    <span className='font-bold uppercase tracking-wide'>
                      {truck?.plateNo}
                    </span>
                    {truck?.truckType && (
                      <span className='font-normal capitalize'>
                        {' '}
                        ({truck.truckType})
                      </span>
                    )}
                    . Once deleted, this record will no longer be accessible.
                  </p>
                </div>
                <p className='text-xs text-gray-400'>
                  If you're unsure, click{' '}
                  <span className='font-semibold text-gray-500'>Cancel</span> to
                  go back safely.
                </p>
              </div>

              <div className='px-6 pb-5 pt-4 border-t border-gray-100'>
                <div className='flex gap-3'>
                  <button
                    type='button'
                    onClick={onClose}
                    disabled={isDeleteLoading}
                    className='px-8 py-2.5 rounded-xl font-semibold text-sm uppercase tracking-wide bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
                  >
                    Cancel
                  </button>
                  <button
                    type='button'
                    onClick={handleDeleteTruck}
                    disabled={isDeleteLoading}
                    className='px-8 py-2.5 rounded-xl font-semibold text-white text-sm uppercase tracking-wide shadow-md hover:shadow-lg cursor-pointer active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2'
                    style={{
                      background:
                        'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                    }}
                  >
                    {isDeleteLoading ? (
                      <>
                        <span className='loading loading-spinner loading-sm' />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <FaTrash className='text-sm shrink-0' />
                        <span>Delete</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  )
}

export default DeleteTruckModal
