import React from 'react'
import { error_404_illustration } from '../../consts/images'

function NotFoundPage () {
  return (
    <div className='w-full h-screen flex flex-col justify-center items-center p-6'>
      <img
        src={error_404_illustration}
        alt='Error 404 Page Not Found'
        className='max-w-96 aspect-square'
      />

      <div className='space-y-2'>
        <h1 className='text-xl font-semibold text-gray-700 text-center'>
          Lost Your Way?
        </h1>
        <p className='text-gray-500 max-w-md leading-relaxed text-center'>
          Sorry, we couldn't find what you were looking for.
        </p>
      </div>
    </div>
  )
}

export default NotFoundPage
