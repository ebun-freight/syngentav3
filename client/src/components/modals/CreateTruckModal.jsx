import React, { useState } from 'react'
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild
} from '@headlessui/react'
import { IoClose } from 'react-icons/io5'
import { MdKeyboardArrowDown } from 'react-icons/md'
import { RiFolderUploadLine } from 'react-icons/ri'
import { FaSave } from 'react-icons/fa'
import { NumericFormat } from 'react-number-format'
import { toast } from 'react-toastify'
import clsx from 'clsx'
import useCreateTruck from '../../hooks/useCreateTruck'
import { useSettingsContext } from '../../contexts/SettingsContext'
import { no_image } from '../../consts/images'

/* ─── Status badge colours ──────────────────────────────────────────────── */
const statusStyles = {
  available: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  deployed: 'bg-blue-50 text-blue-500 border-blue-100',
  unavailable: 'bg-red-50 text-red-500 border-red-100'
}

/* ─── Decorative dot pattern ────────────────────────────────────────────── */
const DotPattern = () => (
  <svg
    className='absolute inset-0 w-full h-full opacity-10 pointer-events-none'
    xmlns='http://www.w3.org/2000/svg'
  >
    <defs>
      <pattern
        id='dots-create-truck'
        x='0'
        y='0'
        width='20'
        height='20'
        patternUnits='userSpaceOnUse'
      >
        <circle cx='2' cy='2' r='1.2' fill='white' />
      </pattern>
    </defs>
    <rect width='100%' height='100%' fill='url(#dots-create-truck)' />
  </svg>
)

function CreateTruckModal ({ isOpen, onClose, onCreate }) {
  const { settings } = useSettingsContext()

  const [formData, setFormData] = useState({
    plateNo: '',
    truckType: '',
    status: 'available',
    subcon: '',
    maxLoad: '',
    image: {}
  })

  const [previewImage, setPreviewImage] = useState(null)
  const { createTruckFunction, isLoading } = useCreateTruck()

  const handleClose = () => {
    if (previewImage) URL.revokeObjectURL(previewImage)
    onClose()
    setPreviewImage(null)
    setFormData({
      plateNo: '',
      truckType: '',
      status: 'available',
      subcon: '',
      maxLoad: '',
      image: {}
    })
  }

  const handleChange = e => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = e => {
    const file = e.target.files[0]
    if (file) {
      setPreviewImage(URL.createObjectURL(file))
      setFormData(prev => ({ ...prev, image: file }))
    } else {
      setPreviewImage(null)
      setFormData(prev => ({ ...prev, image: null }))
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const result = await createTruckFunction(formData)
    if (result.truck) {
      toast.success(result.message)
      onCreate(result.truck)
      handleClose()
    } else {
      toast.error(result)
    }
  }

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
          <DialogPanel className='font-poppins w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col sm:flex-row max-h-[95vh] sm:max-h-none'>
            {/* ══ LEFT PANEL ══════════════════════════════════════════════════════ */}
            <div
              className='relative flex flex-col overflow-hidden sm:w-72 shrink-0 p-8 pb-10 max-sm:p-5 max-sm:pb-5'
              style={{
                background:
                  'linear-gradient(155deg, #020617 0%, #001e36 55%, #0f172a 100%)'
              }}
            >
              <DotPattern />

              {/* Radial glows */}
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

              {/* Image Upload — vertical on desktop, horizontal on mobile */}
              <div className='relative z-10 flex flex-col items-center gap-3 max-sm:flex-row max-sm:gap-4'>
                <div className='w-32 h-32 rounded-2xl overflow-hidden relative border-2 border-dashed border-white/40 hover:border-white/70 cursor-pointer group transition-all max-sm:w-16 max-sm:h-16 max-sm:rounded-xl shrink-0'>
                  <img
                    src={previewImage || no_image}
                    alt='Preview'
                    className={clsx(
                      'w-full h-full object-cover object-center transition-opacity',
                      { 'opacity-10': !previewImage }
                    )}
                  />
                  <div className='absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white gap-1'>
                    <RiFolderUploadLine className='text-2xl max-sm:text-base' />
                    <span className='text-xs font-medium max-sm:hidden'>
                      Upload Photo
                    </span>
                  </div>
                  <input
                    type='file'
                    accept='image/*'
                    onChange={handleFileChange}
                    className='absolute inset-0 opacity-0 cursor-pointer'
                  />
                </div>

                <div className='text-center max-sm:text-left'>
                  <h3 className='text-white font-bold text-base max-sm:text-sm leading-tight uppercase tracking-widest'>
                    {formData.plateNo || 'New Truck'}
                  </h3>
                  <span
                    className={clsx(
                      'inline-flex mt-1.5 px-3 py-1 rounded-full text-xxs font-semibold border capitalize',
                      statusStyles[formData.status] || statusStyles.available
                    )}
                  >
                    {formData.status || 'available'}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className='relative z-10 w-full h-px bg-white/10 my-4 max-sm:my-3 max-xs:hidden' />

              {/* Helper text */}
              <div className='relative z-10 max-xs:hidden'>
                <p className='text-white/40 text-xxs uppercase tracking-wider font-semibold mb-1'>
                  Instructions
                </p>
                <p className='text-white/50 text-xs leading-relaxed'>
                  Fill in the truck details on the right. Fields marked with{' '}
                  <span className='text-red-400 font-bold'>*</span> are
                  required.
                </p>
              </div>
            </div>

            {/* ══ RIGHT PANEL ═════════════════════════════════════════════════════ */}
            <div className='flex-1 flex flex-col min-w-0 overflow-y-auto'>
              {/* Header */}
              <div className='flex items-center justify-between px-6 pt-5 pb-4 max-sm:px-4 max-sm:pt-4 max-sm:pb-3 border-b border-gray-100 shrink-0'>
                <div>
                  <h2 className='text-gray-900 font-bold text-lg max-sm:text-base'>
                    Create New Truck
                  </h2>
                  <p className='text-gray-400 text-xs mt-0.5'>
                    Fill in the details to add a new truck.
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

              {/* Form */}
              <form onSubmit={handleSubmit} className='flex-1 flex flex-col'>
                <div className='flex-1 px-6 py-5 max-sm:px-4 max-sm:pt-4 grid grid-cols-2 gap-x-4 gap-y-4 max-sm:gap-x-3 max-sm:gap-y-3 content-start'>
                  {/* Plate No. */}
                  <InputField
                    label='Plate No.'
                    type='text'
                    name='plateNo'
                    placeholder='Plate No.'
                    value={formData.plateNo}
                    onChange={handleChange}
                    disabled={isLoading}
                    maxLength={7}
                    isUppercase
                  />

                  {/* Truck Type */}
                  <div className='flex flex-col gap-1.5'>
                    <span className='text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                      Type <span className='text-red-400'>*</span>
                    </span>
                    <div className='relative flex items-center bg-white border border-gray-200 rounded-xl px-4 py-3 max-sm:px-3 max-sm:py-2.5 focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20 transition-all shadow-sm'>
                      <select
                        name='truckType'
                        value={formData.truckType}
                        onChange={handleChange}
                        disabled={isLoading}
                        required
                        className='w-full appearance-none bg-transparent text-sm max-sm:text-xs text-gray-800 focus:outline-none capitalize'
                      >
                        <option value='' disabled>
                          Select type
                        </option>
                        {settings.trucksDrivers.truckType.map((item, i) => (
                          <option key={i} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <MdKeyboardArrowDown className='absolute right-4 max-sm:right-3 text-gray-400 text-lg pointer-events-none' />
                    </div>
                  </div>

                  {/* Max Load */}
                  <div className='flex flex-col gap-1.5'>
                    <span className='text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                      Max Load
                    </span>
                    <div className='flex items-center bg-white border border-gray-200 rounded-xl px-4 py-3 max-sm:px-3 max-sm:py-2.5 focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20 transition-all shadow-sm'>
                      <NumericFormat
                        thousandSeparator
                        decimalScale={0}
                        allowNegative={false}
                        value={formData.maxLoad}
                        onValueChange={values =>
                          handleChange({
                            target: {
                              name: 'maxLoad',
                              value: values.floatValue || ''
                            }
                          })
                        }
                        placeholder='Max Load (kg)'
                        disabled={isLoading}
                        className='flex-1 text-sm max-sm:text-xs text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none min-w-0'
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div className='flex flex-col gap-1.5'>
                    <span className='text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                      Status <span className='text-red-400'>*</span>
                    </span>
                    <div className='relative flex items-center bg-white border border-gray-200 rounded-xl px-4 py-3 max-sm:px-3 max-sm:py-2.5 focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20 transition-all shadow-sm'>
                      <select
                        name='status'
                        value={formData.status}
                        onChange={handleChange}
                        disabled={isLoading}
                        required
                        className='w-full appearance-none bg-transparent text-sm max-sm:text-xs text-gray-800 focus:outline-none capitalize'
                      >
                        {settings.trucksDrivers.status.map((item, i) => (
                          <option key={i} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <MdKeyboardArrowDown className='absolute right-4 max-sm:right-3 text-gray-400 text-lg pointer-events-none' />
                    </div>
                  </div>

                  {/* Subcon */}
                  <div className='col-span-2 flex flex-col gap-1.5'>
                    <span className='text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                      Subcon <span className='text-red-400'>*</span>
                    </span>
                    <div className='relative flex items-center bg-white border border-gray-200 rounded-xl px-4 py-3 max-sm:px-3 max-sm:py-2.5 focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20 transition-all shadow-sm'>
                      <select
                        name='subcon'
                        value={formData.subcon}
                        onChange={handleChange}
                        disabled={isLoading}
                        required
                        className='w-full appearance-none bg-transparent text-sm max-sm:text-xs text-gray-800 focus:outline-none capitalize'
                      >
                        <option value='' disabled>
                          Select subcon
                        </option>
                        {settings.trucksDrivers.subcon.map((item, i) => (
                          <option key={i} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <MdKeyboardArrowDown className='absolute right-4 max-sm:right-3 text-gray-400 text-lg pointer-events-none' />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className='px-6 pb-5 pt-4 max-sm:px-4 max-sm:pb-4 border-t border-gray-100 shrink-0'>
                  <div className='flex gap-3 max-sm:gap-2'>
                    <button
                      type='submit'
                      disabled={isLoading}
                      className='px-8 py-2.5 rounded-xl font-semibold text-white text-sm max-sm:text-xs uppercase tracking-wide
                                 shadow-md hover:shadow-lg cursor-pointer active:scale-[0.99]
                                 transition-all disabled:opacity-70 disabled:cursor-not-allowed
                                 flex items-center justify-center gap-2'
                      style={{
                        background:
                          'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      }}
                    >
                      {isLoading ? (
                        <>
                          <span className='loading loading-spinner loading-xs sm:loading-sm' />
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <FaSave className='text-sm shrink-0' />
                          <span>Create</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  )
}

/* ─── Reusable InputField ───────────────────────────────────────────────── */
const InputField = ({
  label,
  type,
  name,
  placeholder,
  value,
  onChange,
  disabled,
  maxLength,
  isRequired = true,
  isUppercase = false
}) => (
  <label className='flex flex-col gap-1.5'>
    <span className='text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider'>
      {label} {isRequired && <span className='text-red-400'>*</span>}
    </span>
    <div
      className={clsx(
        'flex items-center border rounded-xl px-4 py-3 max-sm:px-3 max-sm:py-2.5 transition-all duration-200 shadow-sm',
        disabled
          ? 'bg-gray-50 border-gray-200'
          : 'bg-white border-gray-200 focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20'
      )}
    >
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        minLength={2}
        maxLength={maxLength || 30}
        onChange={onChange}
        disabled={disabled}
        required={isRequired}
        className={clsx(
          'flex-1 text-sm max-sm:text-xs placeholder-gray-400 bg-transparent focus:outline-none min-w-0',
          disabled ? 'text-gray-500' : 'text-gray-800',
          isUppercase ? 'uppercase' : 'capitalize'
        )}
      />
    </div>
  </label>
)

export default CreateTruckModal
