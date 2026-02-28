import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild
} from '@headlessui/react'
import { IoClose } from 'react-icons/io5'
import { FaSave } from 'react-icons/fa'
import { MdKeyboardArrowDown } from 'react-icons/md'

function CreateOptionModal ({ isOpen, onClose, onCreate, isLoading }) {
  const [formData, setFormData] = useState({
    category: 'trucksDrivers',
    field: 'truckType',
    value: ''
  })

  useEffect(() => {
    if (!isOpen) {
      setFormData({ category: 'trucksDrivers', field: 'truckType', value: '' })
    }
  }, [isOpen])

  const handleChange = e => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleCategoryChange = e => {
    const category = e.target.value
    const defaultField = category === 'trucksDrivers' ? 'truckType' : 'hybrid'
    setFormData({ category, field: defaultField, value: '' })
  }

  const getCategoryOptions = () => {
    if (formData.category === 'trucksDrivers') {
      return [
        { value: 'truckType', label: 'Truck Type' },
        { value: 'status', label: 'Status' },
        { value: 'subcon', label: 'Subcon' }
      ]
    }
    return [
      { value: 'hybrid', label: 'Hybrid' },
      { value: 'territory', label: 'Territory' },
      { value: 'flagging', label: 'Flagging' },
      { value: 'destination', label: 'Destination' }
    ]
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!formData.value.trim()) return
    const success = await onCreate(formData)
    if (success) onClose()
  }

  const handleClose = () => {
    setFormData({ category: 'trucksDrivers', field: 'truckType', value: '' })
    onClose()
  }

  const SelectField = ({ label, name, value, onChange, options, disabled }) => (
    <div>
      <label className='block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5'>
        {label} <span className='text-red-400'>*</span>
      </label>
      <div className='relative group flex items-center bg-white border border-gray-200 rounded-xl px-4 py-3 focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20 transition-all duration-200 shadow-sm'>
        <select
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className='w-full appearance-none bg-transparent text-sm text-gray-800 focus:outline-none disabled:opacity-50 capitalize'
        >
          {options.map((opt, i) => (
            <option key={i} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <MdKeyboardArrowDown className='absolute right-4 text-gray-400 group-focus-within:text-primaryColor text-lg pointer-events-none transition-colors' />
      </div>
    </div>
  )

  return (
    <Dialog open={isOpen} onClose={handleClose} className='relative z-50'>
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
          enterFrom='opacity-0 scale-95'
          enterTo='opacity-100 scale-100'
          leave='ease-in duration-200'
          leaveFrom='opacity-100 scale-100'
          leaveTo='opacity-0 scale-95'
        >
          <DialogPanel className='font-poppins w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden'>
            {/* ── Header ── */}
            <div className='flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100'>
              <div>
                <h2 className='text-gray-900 font-bold text-xl'>
                  Add New Option
                </h2>
                <p className='text-gray-500 text-sm mt-0.5'>
                  Extend a dropdown list in the system.
                </p>
              </div>
              <button
                onClick={handleClose}
                className='text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg text-xl transition-all cursor-pointer'
              >
                <IoClose />
              </button>
            </div>

            {/* ── Form body ── */}
            <div className='px-6 py-6'>
              <form onSubmit={handleSubmit} className='space-y-4'>
                {/* Category */}
                <SelectField
                  label='Category'
                  name='category'
                  value={formData.category}
                  onChange={handleCategoryChange}
                  disabled={isLoading}
                  options={[
                    { value: 'trucksDrivers', label: 'Trucks & Drivers' },
                    { value: 'deployments', label: 'Deployments' }
                  ]}
                />

                {/* Field */}
                <SelectField
                  label='Field'
                  name='field'
                  value={formData.field}
                  onChange={handleChange}
                  disabled={isLoading}
                  options={getCategoryOptions()}
                />

                {/* Value */}
                <div>
                  <label className='block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5'>
                    Option Value <span className='text-red-400'>*</span>
                  </label>
                  <div className='flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20 transition-all duration-200 shadow-sm'>
                    <input
                      type='text'
                      name='value'
                      value={formData.value}
                      onChange={handleChange}
                      placeholder='Enter new option...'
                      required
                      disabled={isLoading}
                      autoFocus
                      className='flex-1 text-sm text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none capitalize disabled:opacity-50'
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  type='submit'
                  disabled={isLoading}
                  className='w-full py-3 mt-6 rounded-xl font-semibold text-white text-sm
                             bg-emerald-500 hover:bg-emerald-600
                             shadow-md hover:shadow-lg active:scale-[0.99]
                             transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed
                             flex items-center justify-center gap-2.5 cursor-pointer'
                >
                  {isLoading ? (
                    <>
                      <span className='loading loading-spinner loading-sm' />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <FaSave className='text-md' />
                      <span className='uppercase'>Add Option </span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  )
}

export default CreateOptionModal
