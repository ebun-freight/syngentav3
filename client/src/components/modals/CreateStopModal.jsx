import React, { useState } from 'react'
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild
} from '@headlessui/react'
import { IoClose } from 'react-icons/io5'
import { TbMapPinFilled } from 'react-icons/tb'
import clsx from 'clsx'
import { NumericFormat } from 'react-number-format'
import { toast } from 'react-toastify'
import useCreatePickupField from '../../hooks/UseCreatePickupField'

const defaultValue = {
  pickupSite: '',
  municipality: '',
  scheduledPickupTime: '',
  estimatedWeightKg: '',
  fieldContactPerson: '',
  fieldContactPersonNo: '',
  fieldId: '',
  growerName: '',
  areaHectares: ''
}

const DotPattern = () => (
  <svg
    className='absolute inset-0 w-full h-full opacity-10 pointer-events-none'
    xmlns='http://www.w3.org/2000/svg'
  >
    <defs>
      <pattern
        id='dots-create-stop'
        x='0'
        y='0'
        width='20'
        height='20'
        patternUnits='userSpaceOnUse'
      >
        <circle cx='2' cy='2' r='1.2' fill='white' />
      </pattern>
    </defs>
    <rect width='100%' height='100%' fill='url(#dots-create-stop)' />
  </svg>
)

/* ── Copied exactly from CreateDeploymentModal ───────────────────────────── */
const InputField = ({
  colSpan = 1,
  mobileColSpan,
  label,
  placeholder = '',
  type,
  name,
  value,
  onChange,
  disabled,
  maxLength,
  isRequired = true
}) => {
  const colSpanClass = {
    1: 'sm:col-span-1',
    2: 'sm:col-span-2',
    3: 'sm:col-span-3'
  }
  const mobileColSpanClass = {
    1: 'max-sm:col-span-1',
    2: 'max-sm:col-span-2',
    3: 'max-sm:col-span-3'
  }

  return (
    <label
      className={clsx(
        mobileColSpan ? mobileColSpanClass[mobileColSpan] : '',
        colSpanClass[colSpan] ?? 'sm:col-span-1',
        'flex flex-col gap-1.5'
      )}
    >
      <span className='text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider'>
        {label} {isRequired && <span className='text-red-400'>*</span>}
      </span>
      <div
        className={clsx(
          'flex items-center bg-white border border-gray-200 rounded-xl px-4 py-3 max-sm:px-3 max-sm:py-2.5 overflow-hidden',
          'focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20',
          'transition-all duration-200 shadow-sm',
          { 'opacity-60 cursor-not-allowed': disabled }
        )}
      >
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={isRequired}
          placeholder={placeholder}
          maxLength={maxLength || 50}
          className={clsx(
            'flex-1 min-w-0 text-sm max-sm:text-xs text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none',
            { capitalize: type !== 'datetime-local' }
          )}
        />
      </div>
    </label>
  )
}

function CreateStopModal ({ isOpen, onClose, onCreate }) {
  const [formData, setFormData] = useState(defaultValue)
  const { createPickupFieldFunction, isLoading } = useCreatePickupField()

  const handleClose = () => {
    onClose()
    setFormData(defaultValue)
  }

  const handleChange = e => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const { data, error } = await createPickupFieldFunction(formData)
    if (error) {
      toast.error(error)
      return
    }
    toast.success('Pickup field created successfully!')
    onCreate(data.pickupField)
    handleClose()
  }

  const summaryStats = [
    { label: 'Site', value: formData.pickupSite || '—' },
    { label: 'Municipality', value: formData.municipality || '—' },
    { label: 'Field ID', value: formData.fieldId || '—' },
    { label: 'Grower', value: formData.growerName || '—' },
    {
      label: 'Est. Weight',
      value: formData.estimatedWeightKg
        ? `${Number(formData.estimatedWeightKg).toLocaleString()} kg`
        : '—'
    }
  ]

  return (
    <Dialog
      open={isOpen}
      onClose={isLoading ? () => {} : handleClose}
      className='relative z-50'
    >
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
          enterFrom='opacity-0 scale-95 translate-y-2'
          enterTo='opacity-100 scale-100 translate-y-0'
          leave='ease-in duration-200'
          leaveFrom='opacity-100 scale-100'
          leaveTo='opacity-0 scale-95'
        >
          <DialogPanel className='font-poppins text-gray-900 w-full max-w-5xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col lg:flex-row max-h-[85vh]'>
            {/* ══ LEFT PANEL ════════════════════════════════════════════════ */}
            <div
              className='relative flex flex-col overflow-hidden lg:w-72 shrink-0 max-sm:p-5 max-sm:pb-4'
              style={{
                background:
                  'linear-gradient(155deg, #020617 0%, #001e36 55%, #0f172a 100%)'
              }}
            >
              <DotPattern />
              <div
                className='absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-10 pointer-events-none'
                style={{
                  background:
                    'radial-gradient(circle, #475569 0%, transparent 70%)'
                }}
              />
              <div
                className='absolute -bottom-12 -left-12 w-44 h-44 rounded-full opacity-10 pointer-events-none'
                style={{
                  background:
                    'radial-gradient(circle, #334155 0%, transparent 70%)'
                }}
              />

              <div className='relative z-10 flex flex-col items-center gap-3 p-8 pb-4 max-lg:flex-row max-sm:gap-4 max-sm:p-0'>
                <div className='w-20 h-20 rounded-2xl flex items-center justify-center border-2 border-dashed border-white/40 max-sm:w-14 max-sm:h-14 max-sm:rounded-xl shrink-0 bg-white/5'>
                  <TbMapPinFilled className='text-white/60 text-4xl max-sm:text-2xl' />
                </div>
                <div className='text-center max-sm:text-left'>
                  <p className='text-white font-bold text-base max-sm:text-sm leading-tight'>
                    New Stop
                  </p>
                  <span className='inline-flex mt-1.5 px-3 py-1 rounded-full text-xxs font-semibold border bg-gray-100 text-gray-600 border-gray-200'>
                    Not Done
                  </span>
                </div>
              </div>

              <div className='relative z-10 w-full h-px bg-white/10 my-4 max-sm:my-3' />

              <div className='relative z-10 px-8 max-sm:px-0 max-sm:mt-3 sm:max-lg:pb-4'>
                <div className='hidden sm:flex lg:flex-col justify-between gap-1'>
                  {summaryStats.map(stat => (
                    <div
                      key={stat.label}
                      className='flex items-center justify-between gap-2'
                    >
                      <span className='text-white/40 text-xxs uppercase tracking-wider font-semibold shrink-0'>
                        {stat.label}
                      </span>
                      <span className='text-white/70 text-xs font-medium text-right truncate max-w-28 capitalize'>
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
                <div className='sm:hidden flex flex-wrap justify-between gap-x-4 gap-y-2.5'>
                  {summaryStats.map(stat => (
                    <div key={stat.label} className='flex flex-col gap-0.5'>
                      <span className='text-white/40 text-xxs uppercase tracking-wider font-semibold'>
                        {stat.label}
                      </span>
                      <span className='text-white/70 text-xxs font-medium truncate capitalize'>
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className='relative z-10 w-full h-px bg-white/10 my-4 mx-auto max-lg:hidden' />

              <div className='relative z-10 max-lg:hidden px-8'>
                <p className='text-white/40 text-xxs uppercase tracking-wider font-semibold mb-1'>
                  Instructions
                </p>
                <p className='text-white/50 text-xs leading-relaxed'>
                  Fill in all the necessary fields to create a stop. Make sure
                  all required fields marked with{' '}
                  <span className='text-red-400 font-bold'>*</span> are filled
                  in correctly before submitting. Double check the details
                  before saving to avoid errors.
                </p>
              </div>
            </div>

            {/* ══ RIGHT PANEL ═══════════════════════════════════════════════ */}
            <div className='flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden'>
              {/* Header */}
              <div className='flex items-start justify-between px-6 pt-5 pb-4 max-sm:px-4 max-sm:pt-4 max-sm:pb-3 border-b border-gray-100 shrink-0'>
                <div>
                  <h2 className='text-gray-900 font-bold text-lg max-sm:text-base'>
                    Create a Pickup Stop
                  </h2>
                  <p className='text-gray-400 text-xs mt-0.5'>
                    Fill in the pickup stop details.
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isLoading}
                  className='text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg text-xl transition-all cursor-pointer disabled:opacity-40 shrink-0 ml-4'
                >
                  <IoClose />
                </button>
              </div>

              {/* Form body */}
              <div className='flex-1 overflow-y-auto scrollbar-thin min-h-0'>
                <form id='create-stop-form' onSubmit={handleSubmit}>
                  {/* ── Section header — same sticky style as deployment modal ── */}
                  <div className='sticky top-0 z-10 flex items-center bg-white px-6 py-3 max-sm:px-4 border-b border-gray-100'>
                    <h3 className='text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                      Pickup Details
                    </h3>
                  </div>

                  {/* ── Stop card — copied exactly from deployment modal stops ── */}
                  <div className='flex flex-col gap-4 px-6 pt-4 pb-6 max-sm:px-4'>
                    <div className='border border-gray-200 rounded-xl p-4 max-sm:p-3 relative bg-gray-50/50'>
                      <div className='grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4'>
                        <InputField
                          label='Pick-up Site'
                          type='text'
                          name='pickupSite'
                          placeholder='Pick-up Site'
                          value={formData.pickupSite}
                          onChange={handleChange}
                        />
                        <InputField
                          label='Municipality'
                          type='text'
                          name='municipality'
                          placeholder='Municipality'
                          value={formData.municipality}
                          onChange={handleChange}
                        />
                        <InputField
                          label='Scheduled Pickup Time'
                          type='datetime-local'
                          name='scheduledPickupTime'
                          value={formData.scheduledPickupTime}
                          onChange={handleChange}
                          isRequired={false}
                        />

                        {/* Est. Weight */}
                        <div className='flex flex-col gap-1.5'>
                          <span className='text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                            Est. Weight (kg){' '}
                            <span className='text-red-400'>*</span>
                          </span>
                          <div className='flex items-center bg-white border border-gray-200 rounded-xl px-4 py-3 max-sm:px-3 max-sm:py-2.5 focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20 transition-all duration-200 shadow-sm'>
                            <NumericFormat
                              thousandSeparator
                              decimalScale={2}
                              allowNegative={false}
                              value={formData.estimatedWeightKg}
                              onValueChange={values =>
                                setFormData(prev => ({
                                  ...prev,
                                  estimatedWeightKg: values.floatValue || ''
                                }))
                              }
                              placeholder='Estimated Weight'
                              required
                              className='flex-1 text-sm max-sm:text-xs text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none'
                            />
                          </div>
                        </div>

                        <InputField
                          label='Field Contact Person'
                          type='text'
                          name='fieldContactPerson'
                          placeholder='Field Contact Person'
                          value={formData.fieldContactPerson}
                          onChange={handleChange}
                        />
                        <InputField
                          label='Field Contact No.'
                          type='tel'
                          name='fieldContactPersonNo'
                          placeholder='Contact Number'
                          value={formData.fieldContactPersonNo}
                          onChange={handleChange}
                          maxLength={11}
                        />

                        <InputField
                          label='Field ID'
                          type='text'
                          name='fieldId'
                          placeholder='Field ID'
                          value={formData.fieldId}
                          onChange={handleChange}
                          isRequired={false}
                        />
                        <InputField
                          label='Grower Name'
                          type='text'
                          name='growerName'
                          placeholder='Grower Name'
                          value={formData.growerName}
                          onChange={handleChange}
                          isRequired={false}
                        />

                        {/* Area (ha) */}
                        <div className='flex flex-col gap-1.5'>
                          <span className='text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                            Area (ha)
                          </span>
                          <div className='flex items-center bg-white border border-gray-200 rounded-xl px-4 py-3 max-sm:px-3 max-sm:py-2.5 focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20 transition-all duration-200 shadow-sm'>
                            <NumericFormat
                              thousandSeparator
                              decimalScale={4}
                              allowNegative={false}
                              value={formData.areaHectares}
                              onValueChange={values =>
                                setFormData(prev => ({
                                  ...prev,
                                  areaHectares: values.floatValue || ''
                                }))
                              }
                              required={false}
                              placeholder='Area in Hectares'
                              className='flex-1 text-sm max-sm:text-xs text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none'
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              {/* Action bar */}
              <div className='flex items-center gap-3 px-6 py-4 border-t border-gray-100 shrink-0'>
                <button
                  type='submit'
                  form='create-stop-form'
                  disabled={isLoading}
                  className='px-8 py-2.5 rounded-xl font-semibold text-white text-sm uppercase tracking-wide shadow-md hover:shadow-lg active:scale-[0.99] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 cursor-pointer'
                  style={{
                    background:
                      'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  }}
                >
                  {isLoading ? (
                    <>
                      <span className='loading loading-spinner loading-xs sm:loading-sm' />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <TbMapPinFilled className='text-base' />
                      <span>Create Stop</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  )
}

export default CreateStopModal
