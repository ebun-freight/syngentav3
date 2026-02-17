import React, { useState, useRef } from 'react'
import { IoClose } from 'react-icons/io5'
import { MdKeyboardArrowDown, MdAdd } from 'react-icons/md'
import { useSettingsContext } from '../../contexts/SettingsContext'

function SystemSettingsPage () {
  const {
    settings,
    isLoadingSettings,
    isAdding,
    isRemoving,
    addOption,
    removeOption
  } = useSettingsContext()

  // Form state
  const [formData, setFormData] = useState({
    category: 'trucksDrivers',
    field: 'truckType',
    value: ''
  })

  // Ref for input field
  const inputRef = useRef(null)

  const handleChange = e => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleCategoryChange = e => {
    const category = e.target.value
    const defaultField = category === 'trucksDrivers' ? 'truckType' : 'hybrid'
    setFormData({
      category,
      field: defaultField,
      value: ''
    })
  }

  const handleAddOption = async e => {
    e.preventDefault()

    if (!formData.value.trim()) return

    const success = await addOption({
      category: formData.category,
      field: formData.field,
      value: formData.value
    })

    if (success) {
      setFormData(prev => ({ ...prev, value: '' }))
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  const handleDeleteOption = async (category, field, value) => {
    await removeOption({ category, field, value })
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

  const renderOptionsList = (category, field, fieldLabel, options) => (
    <div className=''>
      <h4 className='uppercase text-xs text-gray-500 font-semibold mb-2'>
        {fieldLabel}
      </h4>
      <div className='flex flex-wrap gap-2'>
        {options.length === 0 ? (
          <p className='text-sm text-gray-400 italic font-light'>
            No options available
          </p>
        ) : (
          options.map((option, index) => (
            <div
              key={index}
              className='flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-1.5 rounded text-sm border border-gray-200 capitalize'
            >
              <span>{option}</span>
              <button
                type='button'
                onClick={() => handleDeleteOption(category, field, option)}
                disabled={isRemoving}
                className='text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50'
              >
                <IoClose className='text-lg' />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )

  if (isLoadingSettings) {
    return (
      <div className='flex-1 flex items-center justify-center'>
        <span className='loading loading-spinner loading-lg'></span>
      </div>
    )
  }

  return (
    <div className='flex-1 flex flex-col'>
      <div className='flex-1 flex flex-col'>
        <div className='mb-8'>
          <h1 className='text-2xl font-semibold text-gray-900'>
            System Settings
          </h1>
          <p className='text-sm text-gray-500 mt-1'>
            Manage form options for trucks, drivers, and deployments
          </p>
        </div>

        <div className='flex gap-6 flex-1'>
          {/* Add New Option Form */}
          <div className='max-w-[25%] w-full'>
            <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8'>
              <h2 className='text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide'>
                Add New Option
              </h2>

              <form
                onSubmit={handleAddOption}
                className='flex flex-col gap-y-4'
              >
                {/* Category Select */}
                <label className='flex flex-col gap-1'>
                  <span className='uppercase text-xs text-gray-500 font-semibold'>
                    Category
                  </span>
                  <div className='relative'>
                    <select
                      name='category'
                      value={formData.category}
                      onChange={handleCategoryChange}
                      disabled={isAdding}
                      className='outline outline-gray-300 px-3 py-2 rounded focus:outline-1 focus:outline-gray-400 appearance-none w-full disabled:opacity-50'
                    >
                      <option value='trucksDrivers'>Trucks & Drivers</option>
                      <option value='deployments'>Deployments</option>
                    </select>
                    <MdKeyboardArrowDown className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 text-lg pointer-events-none' />
                  </div>
                </label>

                {/* Field Select */}
                <label className='flex flex-col gap-1'>
                  <span className='uppercase text-xs text-gray-500 font-semibold'>
                    Field
                  </span>
                  <div className='relative'>
                    <select
                      name='field'
                      value={formData.field}
                      onChange={handleChange}
                      disabled={isAdding}
                      className='outline outline-gray-300 px-3 py-2 rounded focus:outline-1 focus:outline-gray-400 appearance-none w-full disabled:opacity-50'
                    >
                      {getCategoryOptions().map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <MdKeyboardArrowDown className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 text-lg pointer-events-none' />
                  </div>
                </label>

                {/* Value Input */}
                <label className='flex flex-col gap-1'>
                  <span className='uppercase text-xs text-gray-500 font-semibold'>
                    Option Value
                  </span>
                  <input
                    ref={inputRef}
                    type='text'
                    name='value'
                    value={formData.value}
                    onChange={handleChange}
                    placeholder='Enter new option'
                    required
                    disabled={isAdding}
                    className='outline outline-gray-300 px-3 py-2 rounded focus:outline-1 focus:outline-gray-400 disabled:opacity-50 capitalize'
                  />
                </label>

                {/* Submit Button */}
                <button
                  type='submit'
                  disabled={isAdding}
                  className='w-full mt-3 bg-linear-to-b from-emerald-500 to-emerald-600 text-white px-4 py-2.5 uppercase text-sm font-semibold rounded flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {isAdding ? (
                    <>
                      <span className='loading loading-spinner loading-xs'></span>
                      Adding...
                    </>
                  ) : (
                    <>
                      <MdAdd className='text-xl' />
                      Add Option
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Current Options Display */}
          <div className='flex-1 flex gap-6'>
            {/* Trucks & Drivers Section */}
            <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex-1 flex flex-col'>
              <h2 className='text-sm font-semibold text-gray-700 mb-6 uppercase tracking-wide'>
                Trucks & Drivers Options
              </h2>
              <div className='relative flex-1 overflow-y-auto'>
                <div className='absolute top-0 left-0 right-0 flex flex-col gap-6'>
                  {renderOptionsList(
                    'trucksDrivers',
                    'truckType',
                    'Truck Type',
                    settings.trucksDrivers.truckType
                  )}
                  {renderOptionsList(
                    'trucksDrivers',
                    'status',
                    'Status',
                    settings.trucksDrivers.status
                  )}
                  {renderOptionsList(
                    'trucksDrivers',
                    'subcon',
                    'Subcon',
                    settings.trucksDrivers.subcon
                  )}
                </div>
              </div>
            </div>

            {/* Deployments Section */}
            <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex-1 flex flex-col'>
              <h2 className='text-sm font-semibold text-gray-700 mb-6 uppercase tracking-wide'>
                Deployments Options
              </h2>
              <div className='relative flex-1 overflow-y-auto'>
                <div className='absolute top-0 left-0 right-0 flex flex-col gap-6'>
                  {renderOptionsList(
                    'deployments',
                    'hybrid',
                    'Hybrid',
                    settings.deployments.hybrid
                  )}
                  {renderOptionsList(
                    'deployments',
                    'territory',
                    'Territory',
                    settings.deployments.territory
                  )}
                  {renderOptionsList(
                    'deployments',
                    'flagging',
                    'Flagging',
                    settings.deployments.flagging
                  )}
                  {renderOptionsList(
                    'deployments',
                    'destination',
                    'Destination',
                    settings.deployments.destination
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SystemSettingsPage
