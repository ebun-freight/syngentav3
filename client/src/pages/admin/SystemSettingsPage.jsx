import React, { useState, useRef } from 'react'
import { IoClose } from 'react-icons/io5'
import { MdKeyboardArrowDown, MdAdd } from 'react-icons/md'
import { useSettingsContext } from '../../contexts/SettingsContext'
import { HiOutlineTruck, HiOutlineDocumentText } from 'react-icons/hi'

function SystemSettingsPage () {
  const {
    settings,
    isLoadingSettings,
    isAdding,
    isRemoving,
    addOption,
    removeOption
  } = useSettingsContext()

  const [formData, setFormData] = useState({
    category: 'trucksDrivers',
    field: 'truckType',
    value: ''
  })

  const inputRef = useRef(null)

  const handleChange = e => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleCategoryChange = e => {
    const category = e.target.value
    const defaultField = category === 'trucksDrivers' ? 'truckType' : 'hybrid'
    setFormData({ category, field: defaultField, value: '' })
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
    <div>
      <div className='flex items-center justify-between mb-2.5'>
        <h4 className='text-xs font-semibold text-gray-500 uppercase tracking-widest'>
          {fieldLabel}
        </h4>
        <span className='text-xs text-gray-500 tabular-nums'>
          {options.length}
        </span>
      </div>
      <div className='flex flex-wrap gap-2'>
        {options.length === 0 ? (
          <p className='text-sm text-gray-300 italic self-center'>
            No options yet
          </p>
        ) : (
          options.map((option, index) => (
            <div
              key={index}
              className='flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-700 rounded text-sm font-medium capitalize group pl-2.5'
            >
              <span>{option}</span>
              <button
                type='button'
                onClick={() => handleDeleteOption(category, field, option)}
                disabled={isRemoving}
                className='text-gray-300 hover:text-gray-600 transition-colors disabled:opacity-40 px-2 py-1 border-l border-gray-200 hover:bg-gray-100 cursor-pointer'
              >
                <IoClose className='text-base' />
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
      {/* Page Header */}
      <div className='mb-8'>
        <h1 className='text-2xl font-semibold text-gray-900'>
          System Settings
        </h1>
        <p className='text-sm text-gray-500 mt-1'>
          Manage form options for trucks, drivers, and deployments
        </p>
      </div>

      <div className='flex gap-6 flex-1 min-h-0'>
        {/* ── Sidebar Form ── */}
        <div className='max-w-82 w-full shrink-0'>
          <div className='bg-white rounded-xl border border-gray-200 sticky top-8'>
            <div className='px-5 py-4 border-b border-gray-100'>
              <h2 className='font-semibold text-gray-700'>Add New Option</h2>
            </div>

            <form
              onSubmit={handleAddOption}
              className='p-5 flex flex-col gap-4'
            >
              {/* Category */}
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

              {/* Field */}
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

              {/* Value */}
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

              <div className='border-t border-gray-100' />

              <button
                type='submit'
                disabled={isAdding}
                className='w-full bg-linear-to-b from-emerald-500 to-emerald-600 text-white px-4 py-2.5 uppercase text-sm font-semibold rounded flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed'
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

        {/* ── Options Panels ── */}
        <div className='flex-1 flex gap-5 min-h-0'>
          {/* Trucks & Drivers */}
          <div className='flex-1 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden'>
            <div className='px-6 py-4 border-b border-gray-100 flex items-center gap-2.5 shrink-0'>
              <div>
                <h2 className=' font-semibold text-gray-800'>
                  Trucks & Drivers
                </h2>
                <p className='text-sm text-gray-500 mt-0.5'>
                  Options for truck and driver forms
                </p>
              </div>
              <span className='ml-auto text-sm text-gray-500 tabular-nums'>
                {Object.values(settings.trucksDrivers).flat().length} options
              </span>
            </div>

            <div className='flex-1 overflow-y-auto px-6 py-5'>
              <div className='flex flex-col gap-6'>
                {renderOptionsList(
                  'trucksDrivers',
                  'truckType',
                  'Truck Type',
                  settings.trucksDrivers.truckType
                )}
                <div className='border-t border-gray-100' />
                {renderOptionsList(
                  'trucksDrivers',
                  'status',
                  'Status',
                  settings.trucksDrivers.status
                )}
                <div className='border-t border-gray-100' />
                {renderOptionsList(
                  'trucksDrivers',
                  'subcon',
                  'Subcon',
                  settings.trucksDrivers.subcon
                )}
              </div>
            </div>
          </div>

          {/* Deployments */}
          <div className='flex-1 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden'>
            <div className='px-6 py-4 border-b border-gray-100 flex items-center gap-2.5 shrink-0'>
              <div>
                <h2 className='font-semibold text-gray-800'>Deployments</h2>
                <p className='text-sm text-gray-500 mt-0.5'>
                  Options used in deployment forms
                </p>
              </div>
              <span className='ml-auto text-sm text-gray-500 tabular-nums'>
                {Object.values(settings.deployments).flat().length} options
              </span>
            </div>

            <div className='flex-1 overflow-y-auto px-6 py-5'>
              <div className='flex flex-col gap-6'>
                {renderOptionsList(
                  'deployments',
                  'hybrid',
                  'Hybrid',
                  settings.deployments.hybrid
                )}
                <div className='border-t border-gray-100' />
                {renderOptionsList(
                  'deployments',
                  'territory',
                  'Territory',
                  settings.deployments.territory
                )}
                <div className='border-t border-gray-100' />
                {renderOptionsList(
                  'deployments',
                  'flagging',
                  'Flagging',
                  settings.deployments.flagging
                )}
                <div className='border-t border-gray-100' />
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
  )
}

export default SystemSettingsPage
