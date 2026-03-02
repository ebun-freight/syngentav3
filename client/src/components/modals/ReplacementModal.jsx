import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild,
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  ComboboxButton
} from '@headlessui/react'
import { IoClose } from 'react-icons/io5'
import { MdKeyboardArrowDown } from 'react-icons/md'
import { toast } from 'react-toastify'
import { TRUCK_REPLACEMENT_REASONS } from '../../utils/generalOptions'
import clsx from 'clsx'
import { PiMapPinAreaFill } from 'react-icons/pi'
import { TbTruckReturn } from 'react-icons/tb'
import useUpdateDeployment from '../../hooks/useUpdateDeployment'
import { useSettingsContext } from '../../contexts/SettingsContext'

/* ─── Decorative dot pattern ────────────────────────────────────────────── */
const DotPattern = () => (
  <svg
    className='absolute inset-0 w-full h-full opacity-10 pointer-events-none'
    xmlns='http://www.w3.org/2000/svg'
  >
    <defs>
      <pattern
        id='dots-replacement'
        x='0'
        y='0'
        width='20'
        height='20'
        patternUnits='userSpaceOnUse'
      >
        <circle cx='2' cy='2' r='1.2' fill='white' />
      </pattern>
    </defs>
    <rect width='100%' height='100%' fill='url(#dots-replacement)' />
  </svg>
)

function ReplacementModal ({
  isOpen,
  onClose,
  deployment,
  drivers,
  trucks,
  updateSelectedDeployment,
  onUpdate
}) {
  const [formData, setFormData] = useState({
    truckId: '',
    driverId: '',
    truckType: '',
    helperCount: 0,
    replacedAt: '',
    reason: '',
    remarks: ''
  })

  const [truckQuery, setTruckQuery] = useState('')
  const [driverQuery, setDriverQuery] = useState('')

  const { updateDeploymentFunction, isLoading } = useUpdateDeployment()
  const { settings } = useSettingsContext()

  const filteredTrucks =
    trucks?.filter(
      truck =>
        truck.plateNo.toLowerCase().includes(truckQuery.toLowerCase()) &&
        truck.status === 'available' &&
        truck._id !== deployment?.truckId?._id
    ) || []

  const filteredDrivers =
    drivers?.filter(
      driver =>
        (driver.firstname.toLowerCase().includes(driverQuery.toLowerCase()) ||
          driver.lastname.toLowerCase().includes(driverQuery.toLowerCase())) &&
        driver.status === 'available' &&
        driver._id !== deployment?.driverId?._id
    ) || []

  const selectedTruck = trucks?.find(truck => truck._id === formData.truckId)
  const selectedDriver = drivers?.find(
    driver => driver._id === formData.driverId
  )

  const handleClose = () => {
    onClose()
    setTruckQuery('')
    setDriverQuery('')
  }

  const handleChange = e => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async e => {
    e.preventDefault()

    const replacement = {
      replacementTruckId: formData.truckId,
      replacementDriverId: formData.driverId,
      replacementTruckType: formData.truckType,
      replacementHelperCount: formData.helperCount,
      replacedAt: formData.replacedAt,
      reason: formData.reason,
      remarks: formData.remarks
    }

    const result = await updateDeploymentFunction(deployment._id, {
      replacement
    })

    if (result.success) {
      toast.success(result.data.message)
      onUpdate(result.data.deployment)
      handleClose()
    } else {
      toast.error(result.error)
    }
  }

  useEffect(() => {
    if (isOpen && deployment) {
      setFormData({
        truckId: '',
        driverId: '',
        truckType: '',
        helperCount: 0,
        replacedAt: '',
        reason: '',
        remarks: ''
      })
      setTruckQuery('')
      setDriverQuery('')
    }
  }, [isOpen, deployment])

  /* ── Left panel summary stats ── */
  const summaryStats = [
    { label: 'New Truck', value: selectedTruck ? selectedTruck.plateNo : '—' },
    {
      label: 'New Driver',
      value: selectedDriver
        ? `${selectedDriver.firstname} ${selectedDriver.lastname}`
        : '—'
    },
    { label: 'Truck Type', value: formData.truckType || '—' },
    { label: 'Helpers', value: formData.helperCount || '0' }
  ]

  return (
    <Dialog
      open={isOpen}
      onClose={isLoading ? () => {} : handleClose}
      className='relative z-50'
    >
      {/* Backdrop */}
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

      {/* Modal container */}
      <div className='fixed inset-0 flex items-center justify-center p-4 max-sm:p-2'>
        <TransitionChild
          enter='ease-out duration-300'
          enterFrom='opacity-0 scale-95 translate-y-2'
          enterTo='opacity-100 scale-100 translate-y-0'
          leave='ease-in duration-200'
          leaveFrom='opacity-100 scale-100'
          leaveTo='opacity-0 scale-95'
        >
          {/* ✅ lg:flex-row + max-h matching CreateDeploymentModal */}
          <DialogPanel className='font-poppins text-gray-900 w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col lg:flex-row max-h-[88vh] max-md:max-h-[80vh]'>
            {/* ══ LEFT PANEL ══════════════════════════════════════════════════ */}
            {/* ✅ lg:w-72, padding override only on max-sm */}
            <div
              className='relative flex flex-col overflow-hidden lg:w-72 shrink-0 max-sm:p-5 max-sm:pb-4'
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

              {/* ✅ Icon + title — vertical on desktop, horizontal on tablet/mobile (max-lg:flex-row) */}
              <div className='relative z-10 flex flex-col items-center gap-3 p-8 pb-4 max-lg:flex-row max-sm:gap-4 max-sm:p-0'>
                <div className='w-20 h-20 rounded-2xl flex items-center justify-center border-2 border-dashed border-white/40 max-sm:w-14 max-sm:h-14 max-sm:rounded-xl shrink-0 bg-white/5'>
                  <TbTruckReturn className='text-white/60 text-4xl max-sm:text-2xl' />
                </div>
                <div className='text-center max-lg:text-left'>
                  <p className='text-white font-bold text-base max-sm:text-sm leading-tight'>
                    Replacement Truck
                  </p>
                  <span className='inline-flex mt-1.5 px-3 py-1 rounded-full text-xxs font-semibold border bg-amber-50 text-amber-600 border-amber-100'>
                    In Progress
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className='relative z-10 w-full h-px bg-white/10 my-4 max-sm:my-3' />

              {/* ✅ Live summary stats — 3-tier pattern from CreateDeploymentModal */}
              <div className='relative z-10 px-8 max-sm:px-0 max-sm:mt-3 sm:max-lg:pb-4'>
                {/* sm–lg: horizontal row; lg+: stacked column */}
                <div className='hidden sm:flex lg:flex-col justify-between gap-1'>
                  {summaryStats.map(stat => (
                    <div
                      key={stat.label}
                      className='flex items-center justify-between gap-2'
                    >
                      <span className='text-white/40 text-xxs uppercase tracking-wider font-semibold shrink-0'>
                        {stat.label}
                      </span>
                      <span
                        className={clsx(
                          'text-white/70 text-xs font-medium text-right truncate max-w-28',
                          stat.label === 'New Truck'
                            ? 'uppercase'
                            : 'capitalize'
                        )}
                      >
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* xs: wrapped horizontal chips */}
                <div className='sm:hidden flex flex-wrap justify-between gap-x-4 gap-y-2.5'>
                  {summaryStats.map(stat => (
                    <div key={stat.label} className='flex flex-col gap-0.5'>
                      <span className='text-white/40 text-xxs uppercase tracking-wider font-semibold'>
                        {stat.label}
                      </span>
                      <span
                        className={clsx(
                          'text-white/70 text-xxs font-medium truncate',
                          stat.label === 'New Truck'
                            ? 'uppercase'
                            : 'capitalize'
                        )}
                      >
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className='relative z-10 w-full h-px bg-white/10 my-4 mx-auto max-lg:hidden' />

              {/* ✅ Instructions — max-lg:hidden (was max-sm:hidden) */}
              <div className='relative z-10 max-lg:hidden px-8'>
                <p className='text-white/40 text-xxs uppercase tracking-wider font-semibold mb-1'>
                  Instructions
                </p>
                <p className='text-white/50 text-xs leading-relaxed'>
                  Select a replacement truck and driver. Fields marked with{' '}
                  <span className='text-red-400 font-bold'>*</span> are
                  required.
                </p>
              </div>
            </div>

            {/* ══ RIGHT PANEL ═════════════════════════════════════════════════ */}
            {/* ✅ min-h-0 overflow-hidden with inner scrollable body */}
            <div className='flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden'>
              {/* Header */}
              <div className='flex items-start justify-between px-6 pt-5 pb-4 max-sm:px-4 max-sm:pt-4 max-sm:pb-3 border-b border-gray-100 shrink-0'>
                <div>
                  <h2 className='text-gray-900 font-bold text-lg max-sm:text-base'>
                    Replacement Truck
                  </h2>
                  <p className='text-gray-400 text-xs mt-0.5'>
                    Assign a new truck and driver to this deployment.
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

              {/* ✅ Scrollable form body */}
              <div className='flex-1 overflow-y-auto scrollbar-thin min-h-0'>
                <form
                  id='replacement-form'
                  onSubmit={handleSubmit}
                  className='px-6 py-5 max-sm:px-4 max-sm:py-4 flex flex-col gap-7'
                >
                  <div className='grid grid-cols-2 gap-x-4 gap-y-4 max-sm:gap-x-3 max-sm:gap-y-3'>
                    {/* Replacement Truck combobox */}
                    <ComboboxField
                      label='Replacement Truck'
                      value={formData.truckId}
                      onChange={value =>
                        setFormData(prev => ({ ...prev, truckId: value }))
                      }
                      displayValue={() =>
                        selectedTruck ? selectedTruck.plateNo.toUpperCase() : ''
                      }
                      onQueryChange={e => setTruckQuery(e.target.value)}
                      options={filteredTrucks.map(t => ({
                        value: t._id,
                        label: t.plateNo.toUpperCase()
                      }))}
                      placeholder='Search plate no.'
                      isUppercase
                    />

                    {/* Replacement Driver combobox */}
                    <ComboboxField
                      label='Replacement Driver'
                      value={formData.driverId}
                      onChange={value =>
                        setFormData(prev => ({ ...prev, driverId: value }))
                      }
                      displayValue={() =>
                        selectedDriver
                          ? `${selectedDriver.firstname} ${selectedDriver.lastname}`
                          : ''
                      }
                      onQueryChange={e => setDriverQuery(e.target.value)}
                      options={filteredDrivers.map(d => ({
                        value: d._id,
                        label: `${d.firstname} ${d.lastname}`
                      }))}
                      placeholder='Search driver name'
                    />

                    {/* Truck Type */}
                    <SelectField
                      label='Truck Type'
                      name='truckType'
                      value={formData.truckType}
                      onChange={handleChange}
                      options={settings.trucksDrivers.truckType}
                    />

                    {/* Helper Count */}
                    <InputField
                      label='Helper Count'
                      type='number'
                      name='helperCount'
                      placeholder='Helper Count'
                      value={formData.helperCount}
                      onChange={handleChange}
                    />

                    {/* Replaced At */}
                    <InputField
                      label='Replaced At'
                      type='datetime-local'
                      name='replacedAt'
                      value={formData.replacedAt}
                      onChange={handleChange}
                      isCapitalize={false}
                    />

                    {/* Reason */}
                    <SelectField
                      label='Reason'
                      name='reason'
                      value={formData.reason}
                      onChange={handleChange}
                      options={TRUCK_REPLACEMENT_REASONS}
                    />

                    {/* Remarks */}
                    <div className='col-span-2 flex flex-col gap-1.5'>
                      <span className='text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                        Remarks
                      </span>
                      <div className='flex items-start bg-white border border-gray-200 rounded-xl px-4 py-3 max-sm:px-3 max-sm:py-2.5 focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20 transition-all duration-200 shadow-sm'>
                        <textarea
                          name='remarks'
                          value={formData.remarks}
                          onChange={handleChange}
                          rows={3}
                          placeholder='Write a message here...'
                          className='flex-1 text-sm max-sm:text-xs text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none resize-none'
                        />
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              {/* ✅ Action bar — detached from form body, always visible at bottom */}
              <div className='flex items-center gap-3 px-6 py-4 border-t border-gray-100 shrink-0'>
                <button
                  type='submit'
                  form='replacement-form'
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
                      <span>Deploying...</span>
                    </>
                  ) : (
                    <>
                      <PiMapPinAreaFill className='text-base shrink-0' />
                      <span>Deploy Truck</span>
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

/* ─── ComboboxField ─────────────────────────────────────────────────────── */
const ComboboxField = ({
  label,
  value,
  onChange,
  displayValue,
  onQueryChange,
  options,
  placeholder,
  required = true,
  isUppercase = false
}) => (
  <div className='flex flex-col gap-1.5'>
    <span className='text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider'>
      {label} {required && <span className='text-red-400'>*</span>}
    </span>
    <Combobox value={value} onChange={onChange}>
      <div className='relative group flex items-center bg-white border border-gray-200 rounded-xl px-4 py-3 max-sm:px-3 max-sm:py-2.5 focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20 transition-all duration-200 shadow-sm'>
        <ComboboxInput
          className={clsx(
            'w-full bg-transparent text-sm max-sm:text-xs text-gray-800 placeholder-gray-400 focus:outline-none',
            isUppercase ? 'uppercase' : 'capitalize'
          )}
          displayValue={displayValue}
          onChange={onQueryChange}
          placeholder={placeholder}
          required={required}
          autoComplete='off'
        />
        <ComboboxButton className='absolute right-4 max-sm:right-3 flex items-center text-gray-400 group-focus-within:text-primaryColor transition-colors'>
          <MdKeyboardArrowDown className='text-lg' />
        </ComboboxButton>
        <ComboboxOptions className='absolute z-50 top-full left-0 mt-2 max-h-48 w-full overflow-auto rounded-xl bg-white border border-gray-200 shadow-md py-1 text-sm focus:outline-none'>
          {options.length === 0 ? (
            <div className='px-4 py-2 text-gray-400 text-sm italic'>
              Nothing found.
            </div>
          ) : (
            options.map(opt => (
              <ComboboxOption
                key={opt.value}
                value={opt.value}
                className={({ focus }) =>
                  clsx(
                    'px-4 py-2 cursor-default select-none transition-colors',
                    isUppercase ? 'uppercase' : 'capitalize',
                    {
                      'bg-gray-50': focus,
                      'bg-gray-100 font-medium': value === opt.value
                    }
                  )
                }
              >
                {opt.label}
              </ComboboxOption>
            ))
          )}
        </ComboboxOptions>
      </div>
    </Combobox>
  </div>
)

/* ─── SelectField ───────────────────────────────────────────────────────── */
const SelectField = ({
  label,
  name,
  value,
  onChange,
  options,
  required = true
}) => (
  <div className='flex flex-col gap-1.5'>
    <span className='text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider'>
      {label} {required && <span className='text-red-400'>*</span>}
    </span>
    <div className='relative group flex items-center bg-white border border-gray-200 rounded-xl px-4 py-3 max-sm:px-3 max-sm:py-2.5 focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20 transition-all duration-200 shadow-sm'>
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className='w-full appearance-none bg-transparent text-sm max-sm:text-xs text-gray-800 focus:outline-none capitalize'
      >
        <option value='' disabled>
          Select
        </option>
        {options.map((item, index) => {
          const isObj = typeof item === 'object' && item !== null
          return (
            <option key={index} value={isObj ? item.value : item}>
              {isObj ? item.label : item}
            </option>
          )
        })}
      </select>
      <MdKeyboardArrowDown className='absolute right-4 max-sm:right-3 text-gray-400 group-focus-within:text-primaryColor text-lg pointer-events-none transition-colors' />
    </div>
  </div>
)

/* ─── InputField ────────────────────────────────────────────────────────── */
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
  isCapitalize = true
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
        maxLength={maxLength || 50}
        onChange={onChange}
        disabled={disabled}
        required={isRequired}
        className={clsx(
          'flex-1 text-sm max-sm:text-xs placeholder-gray-400 bg-transparent focus:outline-none min-w-0',
          disabled ? 'text-gray-500' : 'text-gray-800',
          { capitalize: isCapitalize && type !== 'datetime-local' }
        )}
      />
    </div>
  </label>
)

export default ReplacementModal
