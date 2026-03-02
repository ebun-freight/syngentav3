import React from 'react'
import { empty_illustration, error_illustration } from '../consts/images'

export const TableLoading = ({ message = 'Loading content...' }) => (
  <div className='flex-1 flex items-center justify-center'>
    <div className='flex flex-col items-center gap-4 text-center'>
      <span className='loading loading-spinner loading-lg text-primaryColor' />
      <p className='text-gray-500 text-sm font-medium'>{message}</p>
    </div>
  </div>
)

export const TableError = ({
  title = 'Something went wrong',
  message = 'We encountered an unexpected error. Please try again later.',
  onRetry
}) => (
  <div className='flex-1 flex justify-center items-center'>
    <div className='flex flex-col items-center gap-4 text-center px-4'>
      <img src={error_illustration} alt='error' className='w-52' />
      <div>
        <h1 className='text-lg font-semibold text-gray-700'>{title}</h1>
        <p className='text-gray-400 text-sm mt-1 max-w-md leading-relaxed'>
          {message}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className='mt-4 px-6 py-2.5 rounded-xl font-semibold text-white text-sm uppercase tracking-wide shadow-md hover:shadow-lg cursor-pointer active:scale-[0.99] transition-all'
            style={{
              background:
                'linear-gradient(135deg, #020617 0%, #001e36 60%, #0f172a 100%)'
            }}
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  </div>
)

export const TableEmpty = ({
  title = 'Nothing to show here',
  message,
  isFiltered = false,
  onCreate,
  createLabel = 'Get Started'
}) => {
  const defaultMessage = isFiltered
    ? 'Try adjusting your search terms or filters to see more results.'
    : 'Get started by adding your first record to the system.'

  return (
    <div className='flex-1 flex justify-center items-center'>
      <div className='flex flex-col items-center gap-4 text-center px-4'>
        <img src={empty_illustration} alt='empty' className='w-52' />
        <div>
          <h1 className='text-lg font-semibold text-gray-700'>{title}</h1>
          <p className='text-gray-400 text-sm mt-1 max-w-md leading-relaxed'>
            {message ?? defaultMessage}
          </p>
          {onCreate && !isFiltered && (
            <button
              onClick={onCreate}
              className='mt-4 px-6 py-2.5 rounded-xl font-semibold text-white text-sm uppercase tracking-wide shadow-md hover:shadow-lg cursor-pointer active:scale-[0.99] transition-all'
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              }}
            >
              {createLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
