import React from 'react'
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild
} from '@headlessui/react'
import { IoClose } from 'react-icons/io5'
import { MdDelete } from 'react-icons/md'

function DeleteOptionModal ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  isDeleting
}) {
  return (
    <Dialog open={isOpen} onClose={onClose} className='relative z-50'>
      {/* Backdrop */}
      <TransitionChild
        enter='ease-out duration-300'
        enterFrom='opacity-0'
        enterTo='opacity-100'
        leave='ease-in duration-200'
        leaveFrom='opacity-100'
        leaveTo='opacity-0'
      >
        <DialogBackdrop className='fixed inset-0 bg-black/30 backdrop-blur-sm' />
      </TransitionChild>

      {/* Modal container */}
      <div className='fixed inset-0 flex items-center justify-center p-4'>
        <TransitionChild
          enter='ease-out duration-300'
          enterFrom='opacity-0 -translate-y-8'
          enterTo='opacity-100 translate-y-0'
          leave='ease-in duration-200'
          leaveFrom='opacity-100 translate-y-0'
          leaveTo='opacity-0 -translate-y-8'
        >
          <DialogPanel className='bg-white font-poppins rounded-2xl max-w-lg w-full text-gray-900 p-6 shadow relative'>
            {/* close button */}
            <div
              onClick={onClose}
              className='absolute top-4 right-4 hover:bg-gray-100 p-1 rounded-full text-2xl text-gray-600 cursor-pointer transition-all'
            >
              <IoClose />
            </div>

            <header className='border-b border-gray-300 pb-3 font-semibold text-xl'>
              Confirm Deletion
            </header>

            <p className='mt-3'>
              Are you sure you want to delete{' '}
              <span className='font-semibold underline capitalize'>
                "{itemName}"
              </span>
              ?
              <br />
              This action cannot be undone.
            </p>

            <div className='flex mt-12 justify-end gap-2'>
              <button
                onClick={onClose}
                disabled={isDeleting}
                className='bg-gray-200 text-gray-600 rounded py-2 px-8 font-semibold uppercase active:scale-95 transition-all text-sm max-sm:flex-1 cursor-pointer hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                Cancel
              </button>

              <button
                onClick={onConfirm}
                disabled={isDeleting}
                className='bg-red-500 text-white rounded py-2 px-8 font-semibold uppercase active:scale-95 transition-all text-sm cursor-pointer hover:brightness-95 flex gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {isDeleting ? (
                  <>
                    <span className='loading loading-spinner loading-xs'></span>
                    Deleting...
                  </>
                ) : (
                  <>
                    <MdDelete className='text-xl' />
                    Delete
                  </>
                )}
              </button>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  )
}

export default DeleteOptionModal
