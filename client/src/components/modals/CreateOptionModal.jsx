import React, { useState, useEffect } from 'react'
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild
} from '@headlessui/react'
import { IoClose } from 'react-icons/io5'
import { MdAdd, MdKeyboardArrowDown } from 'react-icons/md'
import { FaSave } from 'react-icons/fa'
import clsx from 'clsx'

function CreateOptionModal ({ isOpen, onClose, onCreate, isLoading }) {
  const [formData, setFormData] = useState({
    category: 'trucksDrivers',
    field: 'truckType',
    value: ''
  })

  // For field combobox
  const [fieldQuery, setFieldQuery] = useState('')

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        category: 'trucksDrivers',
        field: 'truckType',
        value: ''
      })
      setFieldQuery('')
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
    setFieldQuery('')
  }

  const getCategoryOptions = () => {
    if (formData.category === 'trucksDrivers') {
      return [
        { value: 'truckType', label: 'Truck Type' },
        { value: 'status', label: 'Status' },
        { value: 'subcon', label: 'Subcon' }
      ]
    } else {
      return [
        { value: 'hybrid', label: 'Hybrid' },
        { value: 'territory', label: 'Territory' },
        { value: 'flagging', label: 'Flagging' },
        { value: 'destination', label: 'Destination' }
      ]
    }
  }

  // Filter field options based on query
  const filteredFields = getCategoryOptions().filter(field =>
    field.label.toLowerCase().includes(fieldQuery.toLowerCase())
  )

  const handleSubmit = async e => {
    e.preventDefault()
    if (!formData.value.trim()) return

    const success = await onCreate(formData)
    if (success) {
      onClose()
    }
  }

  const handleClose = () => {
    setFormData({
      category: 'trucksDrivers',
      field: 'truckType',
      value: ''
    })
    setFieldQuery('')
    onClose()
  }

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
          enterFrom='opacity-0 -translate-y-8'
          enterTo='opacity-100 translate-y-0'
          leave='ease-in duration-200'
          leaveFrom='opacity-100 translate-y-0'
          leaveTo='opacity-0 -translate-y-8'
        >
          <DialogPanel className='font-poppins text-gray-900 w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden relative'>
            {/* close button */}
            <button
              onClick={handleClose}
              className='absolute top-4 right-4 hover:bg-gray-100 p-1 rounded-full text-2xl text-gray-600 cursor-pointer transition-all z-10'
            >
              <IoClose />
            </button>

            {/* content */}
            <div className='bg-white px-6 py-8'>
              <h2 className='text-lg font-semibold'>Add New Option</h2>

              <form
                onSubmit={handleSubmit}
                className='mt-6 flex flex-col gap-4'
              >
                {/* Category */}
                <div className='flex flex-col gap-1'>
                  <span className='uppercase text-xs text-gray-500 font-semibold'>
                    Category <span className='text-red-500'>*</span>
                  </span>
                  <div className='relative'>
                    <select
                      name='category'
                      value={formData.category}
                      onChange={handleCategoryChange}
                      disabled={isLoading}
                      className='w-full outline outline-gray-300 px-3 py-2 rounded focus:outline-1 focus:outline-gray-400 appearance-none disabled:opacity-50 disabled:bg-gray-50'
                    >
                      <option value='trucksDrivers'>Trucks & Drivers</option>
                      <option value='deployments'>Deployments</option>
                    </select>
                    <MdKeyboardArrowDown className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 text-lg pointer-events-none' />
                  </div>
                </div>

                {/* Field - Combobox like in CreateSubconModal */}
                <div className='flex flex-col gap-1'>
                  <span className='uppercase text-xs text-gray-500 font-semibold'>
                    Field <span className='text-red-500'>*</span>
                  </span>
                  <Combobox
                    value={formData.field}
                    onChange={value => {
                      const selectedField = getCategoryOptions().find(
                        f => f.value === value
                      )
                      setFormData(prev => ({ ...prev, field: value }))
                      setFieldQuery('')
                    }}
                  >
                    <div className='relative'>
                      <ComboboxInput
                        className='w-full outline outline-gray-300 px-3 py-2 rounded focus:outline-1 focus:outline-gray-400'
                        displayValue={() => {
                          const field = getCategoryOptions().find(
                            f => f.value === formData.field
                          )
                          return field ? field.label : ''
                        }}
                        onChange={event => setFieldQuery(event.target.value)}
                        placeholder='Select field'
                        required
                        autoComplete='off'
                        disabled={isLoading}
                      />
                      <ComboboxButton className='absolute inset-y-0 right-0 flex items-center px-2 hover:bg-gray-100 rounded-sm'>
                        <MdKeyboardArrowDown className='h-5 w-5 text-gray-400' />
                      </ComboboxButton>
                      <ComboboxOptions className='absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white outline-1 outline-gray-300 py-1 text-base shadow-sm focus:outline-none sm:text-sm'>
                        {filteredFields.length === 0 ? (
                          <div className='relative cursor-default select-none px-4 py-2 text-gray-700'>
                            Nothing found.
                          </div>
                        ) : (
                          filteredFields.map((field, index) => (
                            <ComboboxOption
                              key={index}
                              value={field.value}
                              className={({ focus }) =>
                                `relative cursor-default select-none py-2 px-4 text-base ${
                                  focus ? 'bg-gray-50' : 'text-gray-900'
                                } ${
                                  formData.field === field.value
                                    ? 'bg-gray-100'
                                    : ''
                                }`
                              }
                            >
                              <span className='block truncate capitalize'>
                                {field.label}
                              </span>
                            </ComboboxOption>
                          ))
                        )}
                      </ComboboxOptions>
                    </div>
                  </Combobox>
                </div>

                {/* Value */}
                <div className='flex flex-col gap-1'>
                  <span className='uppercase text-xs text-gray-500 font-semibold'>
                    Option Value <span className='text-red-500'>*</span>
                  </span>
                  <input
                    type='text'
                    name='value'
                    value={formData.value}
                    onChange={handleChange}
                    placeholder='Enter new option'
                    required
                    disabled={isLoading}
                    autoFocus
                    className='outline outline-gray-300 px-3 py-2 rounded focus:outline-1 focus:outline-gray-400 disabled:opacity-50 disabled:bg-gray-50 capitalize'
                  />
                </div>

                {/* Actions */}
                <div className='flex gap-3 mt-6'>
                  <button
                    type='submit'
                    disabled={isLoading}
                    className='bg-linear-to-b from-emerald-500 to-emerald-600 text-white px-8 py-2 uppercase text-sm font-semibold rounded flex items-center gap-2 cursor-pointer active:scale-95 transition-all hover:brightness-95'
                  >
                    {isLoading ? (
                      <>
                        <span className='loading loading-spinner loading-xs'></span>
                        Adding
                      </>
                    ) : (
                      <>
                        <FaSave className='text-base -mt-0.5' />
                        Add Option
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  )
}

export default CreateOptionModal
