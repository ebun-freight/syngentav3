import React from 'react'
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild
} from '@headlessui/react'
import { FaTrash } from 'react-icons/fa'
import { IoClose } from 'react-icons/io5'
import { MdWarning } from 'react-icons/md'

const DotPattern = () => (
  <svg
    className='absolute inset-0 w-full h-full opacity-10 pointer-events-none'
    xmlns='http://www.w3.org/2000/svg'
  >
    <defs>
      <pattern
        id='dots-delete'
        x='0'
        y='0'
        width='20'
        height='20'
        patternUnits='userSpaceOnUse'
      >
        <circle cx='2' cy='2' r='1.2' fill='white' />
      </pattern>
    </defs>
    <rect width='100%' height='100%' fill='url(#dots-delete)' />
  </svg>
)

function DeleteOptionModal ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  isDeleting
}) {
  const handleClose = () => {
    if (isDeleting) return
    onClose()
  }

  return (
    <Dialog open={isOpen} onClose={handleClose} className='relative z-50'>
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
          <DialogPanel className='font-poppins w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col sm:flex-row'>
            {/* ── Left Panel ─────────────────────────────────────────────────── */}
            <div
              className='relative flex flex-col items-center justify-center overflow-hidden sm:w-52 shrink-0 p-8 max-sm:p-5 max-sm:flex-row max-sm:justify-start max-sm:gap-4'
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

              {/* Icon */}
              <div className='relative z-10 w-20 h-20 rounded-2xl bg-red-500/20 border-2 border-red-400/30 flex items-center justify-center shrink-0 max-sm:w-12 max-sm:h-12 max-sm:rounded-xl'>
                <FaTrash className='text-red-400 text-3xl max-sm:text-xl' />
              </div>

              {/* Label — desktop */}
              <div className='relative z-10 text-center mt-4 max-sm:hidden'>
                <p className='text-white/40 text-xxs uppercase tracking-wider font-semibold mb-1'>
                  Action
                </p>
                <p className='text-red-300 font-bold text-sm uppercase tracking-wide'>
                  Delete
                </p>
              </div>

              {/* Label — mobile inline */}
              <div className='relative z-10 sm:hidden'>
                <p className='text-white/40 text-xxs uppercase tracking-wider font-semibold mb-0.5'>
                  Action
                </p>
                <p className='text-red-300 font-bold text-sm uppercase tracking-wide'>
                  Delete
                </p>
              </div>

              {/* Divider + Irreversible badge — desktop only */}
              <div className='relative z-10 w-full h-px bg-white/10 my-4 max-sm:hidden' />
              <div className='relative z-10 flex items-center gap-2 bg-red-500/20 border border-red-400/30 rounded-xl px-3 py-2 w-full max-sm:hidden'>
                <span className='w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse shrink-0' />
                <p className='text-red-300 text-xs font-semibold uppercase tracking-wide whitespace-nowrap'>
                  Irreversible
                </p>
              </div>

              {/* Irreversible badge — small screen corner */}
              <div className='absolute -top-1 -right-1 z-10 flex items-center gap-1.5 bg-red-500/20 border border-red-400/30 rounded-bl-xl pl-3 pb-1 pt-2.5 pr-3 sm:hidden'>
                <span className='w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse shrink-0' />
                <p className='text-red-300 text-xxs font-semibold uppercase tracking-wide whitespace-nowrap'>
                  Irreversible
                </p>
              </div>
            </div>

            {/* ── Right Panel ─────────────────────────────────────────────────── */}
            <div className='grow min-w-0'>
              <div className='flex items-center justify-between px-6 pt-5 pb-4 max-sm:px-4 max-sm:pt-4 max-sm:pb-3 border-b border-gray-100'>
                <div>
                  <h2 className='text-gray-900 font-bold text-lg max-sm:text-base'>
                    Confirm Deletion
                  </h2>
                  <p className='text-gray-400 text-xs mt-0.5'>
                    This action cannot be undone.
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isDeleting}
                  className='text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg text-xl transition-all cursor-pointer disabled:opacity-40 shrink-0 ml-4'
                >
                  <IoClose />
                </button>
              </div>

              <div className='px-6 py-6 max-sm:px-4 max-sm:py-4'>
                <div className='flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3.5 max-sm:px-3 max-sm:py-3 mb-4'>
                  <MdWarning className='text-red-400 text-xl mt-0.5 shrink-0' />
                  <p className='text-sm max-sm:text-xs text-red-700 leading-relaxed'>
                    You are about to permanently delete{' '}
                    <span className='font-bold capitalize'>"{itemName}"</span>.
                    Once deleted, this record will no longer be accessible.
                  </p>
                </div>
                <p className='text-xs text-gray-400'>
                  If you're unsure, click{' '}
                  <span className='font-semibold text-gray-500'>Cancel</span> to
                  go back safely.
                </p>
              </div>

              <div className='px-6 pb-5 pt-4 max-sm:px-4 max-sm:pb-4 border-t border-gray-100'>
                <div className='flex gap-3 max-sm:gap-2'>
                  <button
                    type='button'
                    onClick={handleClose}
                    disabled={isDeleting}
                    className='px-8 py-2.5 rounded-xl font-semibold text-sm max-sm:text-xs uppercase tracking-wide bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
                  >
                    Cancel
                  </button>
                  <button
                    type='button'
                    onClick={onConfirm}
                    disabled={isDeleting}
                    className='px-8 py-2.5 rounded-xl font-semibold text-white text-sm max-sm:text-xs uppercase tracking-wide shadow-md hover:shadow-lg cursor-pointer active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2'
                    style={{
                      background:
                        'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                    }}
                  >
                    {isDeleting ? (
                      <>
                        <span className='loading loading-spinner loading-xs sm:loading-sm' />
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

export default DeleteOptionModal
