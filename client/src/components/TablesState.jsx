import React from 'react'
import { empty_illustration, error_illustration } from '../consts/images'

/* ══════════════════════════════════════════════════════════════════════════════
   TABLE LOADING
══════════════════════════════════════════════════════════════════════════════ */
export const TableLoading = ({ message = 'Loading content...' }) => (
  <div className='flex-1 flex items-center justify-center p-6 min-h-[280px] sm:min-h-[340px]'>
    <div className='flex flex-col items-center gap-4 text-center'>
      {/* Spinner ring */}
      <div className='relative w-12 h-12 sm:w-14 sm:h-14'>
        <svg
          className='absolute inset-0 w-full h-full animate-spin'
          style={{ animationDuration: '1.1s' }}
          viewBox='0 0 56 56'
          fill='none'
        >
          <circle cx='28' cy='28' r='22' stroke='#e5e7eb' strokeWidth='4' />
          <circle
            cx='28'
            cy='28'
            r='22'
            stroke='url(#lg)'
            strokeWidth='4'
            strokeLinecap='round'
            strokeDasharray='90 50'
          />
          <defs>
            <linearGradient id='lg' x1='0%' y1='0%' x2='100%' y2='0%'>
              <stop offset='0%' stopColor='#10b981' />
              <stop offset='100%' stopColor='#059669' stopOpacity='0.2' />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div>
        <p className='text-gray-700 font-semibold text-sm'>{message}</p>
        <p className='text-gray-400 text-xs mt-0.5'>Please wait a moment</p>
        <div className='flex items-center justify-center gap-1 mt-2'>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className='w-1 h-1 rounded-full bg-gray-300 animate-bounce'
              style={{
                animationDelay: `${i * 0.18}s`,
                animationDuration: '0.9s'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  </div>
)

/* ══════════════════════════════════════════════════════════════════════════════
   TABLE ERROR
══════════════════════════════════════════════════════════════════════════════ */
export const TableError = ({
  title = 'Something went wrong',
  message = 'We encountered an unexpected error. Please try again later.',
  onRetry
}) => (
  <div className='flex-1 flex justify-center items-center p-6 min-h-[280px] sm:min-h-[340px]'>
    <div className='flex flex-col items-center gap-4 text-center'>
      <img
        src={error_illustration}
        alt='error'
        className='w-40 sm:w-52 opacity-90'
      />

      <div>
        <h1 className='text-base sm:text-lg font-bold text-gray-700'>
          {title}
        </h1>
        <p className='text-gray-400 text-xs sm:text-sm mt-1 max-w-xs leading-relaxed'>
          {message}
        </p>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className='flex items-center gap-2 mt-1 px-6 py-2.5 rounded-xl font-semibold text-white text-sm
                     uppercase tracking-wide shadow-md hover:shadow-lg
                     hover:brightness-110 active:scale-[0.98] transition-all duration-200'
          style={{
            background:
              'linear-gradient(135deg, #020617 0%, #001e36 60%, #0f172a 100%)'
          }}
        >
          <svg
            className='w-3.5 h-3.5'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
            strokeWidth={2.5}
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99'
            />
          </svg>
          Try Again
        </button>
      )}
    </div>
  </div>
)

/* ══════════════════════════════════════════════════════════════════════════════
   TABLE EMPTY
══════════════════════════════════════════════════════════════════════════════ */
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
    <div className='flex-1 flex justify-center items-center p-6 min-h-[280px] sm:min-h-[340px]'>
      <div className='flex flex-col items-center gap-4 text-center'>
        <img
          src={empty_illustration}
          alt='empty'
          className='w-40 sm:w-52 opacity-90'
        />

        <div>
          <h1 className='text-base sm:text-lg font-bold text-gray-700'>
            {title}
          </h1>
          <p className='text-gray-400 text-xs sm:text-sm mt-1 max-w-xs leading-relaxed'>
            {message ?? defaultMessage}
          </p>
        </div>

        {onCreate && !isFiltered && (
          <button
            onClick={onCreate}
            className='flex items-center gap-2 mt-1 px-6 py-2.5 rounded-xl font-semibold text-white text-sm
                       uppercase tracking-wide shadow-md hover:shadow-lg
                       hover:brightness-110 active:scale-[0.98] transition-all duration-200'
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
            }}
          >
            <svg
              className='w-3.5 h-3.5'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              strokeWidth={2.5}
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M12 4.5v15m7.5-7.5h-15'
              />
            </svg>
            {createLabel}
          </button>
        )}
      </div>
    </div>
  )
}
