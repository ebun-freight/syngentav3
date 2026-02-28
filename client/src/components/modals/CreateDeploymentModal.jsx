import React, { useState, useRef } from 'react'
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
import clsx from 'clsx'
import { PiMapPinAreaFill } from 'react-icons/pi'
import { FiPlus, FiTrash2 } from 'react-icons/fi'
import useCreateDeployment from '../../hooks/useCreateDeployment'
import { NumericFormat } from 'react-number-format'
import { useSettingsContext } from '../../contexts/SettingsContext'

const defaultPickup = {
  pickupSite: '',
  municipality: '',
  fieldContactPerson: '',
  fieldContactPersonNo: '',
  scheduledPickupTime: '',
  estimatedWeightKg: ''
}

const defaultValue = {
  pickups: [{ ...defaultPickup }],
  truckId: '',
  driverId: '',
  truckType: '',
  helperCount: 0,
  destination: '',
  receivingContactPerson: '',
  receivingContactPersonNo: '',
  hybrid: '',
  territory: '',
  flagging: '',
  flaggingRemarks: '',
  totalSacksCount: 0,
  totalWeightKg: 0,
  departed: '',
  destArrival: '',
  destDeparture: ''
}

const MAX_PICKUPS = 10

/* ── Reusable select wrapper ── */
const SelectField = ({
  colSpan = 1,
  label,
  name,
  value,
  onChange,
  options,
  required = true
}) => (
  <div className={`col-span-${colSpan} flex flex-col gap-1.5`}>
    <span className='text-xs font-semibold text-gray-600 uppercase tracking-wider'>
      {label} {required && <span className='text-red-400'>*</span>}
    </span>
    <div className='relative group flex items-center bg-white border border-gray-200 rounded-xl px-4 py-3 focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20 transition-all duration-200 shadow-sm'>
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className='w-full appearance-none bg-transparent text-sm text-gray-800 focus:outline-none capitalize'
      >
        <option value='' disabled>
          Select
        </option>
        {options.map((item, index) => (
          <option key={index} value={item}>
            {item}
          </option>
        ))}
      </select>
      <MdKeyboardArrowDown className='absolute right-4 text-gray-400 group-focus-within:text-primaryColor text-lg pointer-events-none transition-colors' />
    </div>
  </div>
)

/* ── Reusable combobox wrapper ── */
const ComboboxField = ({
  colSpan = 1,
  label,
  value,
  onChange,
  displayValue,
  onQueryChange,
  options,
  placeholder,
  required = true
}) => (
  <div className={`col-span-${colSpan} flex flex-col gap-1.5`}>
    <span className='text-xs font-semibold text-gray-600 uppercase tracking-wider'>
      {label} {required && <span className='text-red-400'>*</span>}
    </span>
    <Combobox value={value} onChange={onChange}>
      <div className='relative group flex items-center bg-white border border-gray-200 rounded-xl px-4 py-3 focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20 transition-all duration-200 shadow-sm'>
        <ComboboxInput
          className='w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none capitalize'
          displayValue={displayValue}
          onChange={onQueryChange}
          placeholder={placeholder}
          required={required}
          autoComplete='off'
        />
        <ComboboxButton className='absolute right-4 flex items-center text-gray-400 group-focus-within:text-primaryColor transition-colors'>
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
                    'px-4 py-2 cursor-default select-none capitalize transition-colors',
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

function CreateDeploymentModal ({ isOpen, onClose, onCreate, trucks, drivers }) {
  const { settings } = useSettingsContext()
  const [formData, setFormData] = useState(defaultValue)
  const { createDeploymentFunction, isLoading } = useCreateDeployment()

  const [truckQuery, setTruckQuery] = useState('')
  const [driverQuery, setDriverQuery] = useState('')
  const scrollRef = useRef(null)

  const truckOptions =
    trucks
      ?.filter(truck => truck.status === 'available')
      .sort((a, b) => (a.tripCount || 0) - (b.tripCount || 0))
      .map(truck => ({
        value: truck._id,
        label: `${truck.plateNo.toUpperCase()} (${truck.truckType}) - ${
          truck.tripCount || 0
        } trips`
      })) || []

  const driverOptions =
    drivers
      ?.filter(driver => driver.status === 'available')
      .sort((a, b) => (a.tripCount || 0) - (b.tripCount || 0))
      .map(driver => ({
        value: driver._id,
        label: `${driver.firstname} ${driver.lastname} - ${
          driver.tripCount || 0
        } trips`
      })) || []

  const filteredTrucks =
    truckQuery === ''
      ? truckOptions
      : truckOptions.filter(t =>
          t.label.toLowerCase().includes(truckQuery.toLowerCase())
        )

  const filteredDrivers =
    driverQuery === ''
      ? driverOptions
      : driverOptions.filter(d =>
          d.label.toLowerCase().includes(driverQuery.toLowerCase())
        )

  const selectedTruck = truckOptions.find(t => t.value === formData.truckId)
  const selectedDriver = driverOptions.find(d => d.value === formData.driverId)

  const handleClose = () => {
    onClose()
    setFormData(defaultValue)
    setTruckQuery('')
    setDriverQuery('')
  }

  const handleChange = e => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePickupChange = (index, e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const updated = [...prev.pickups]
      updated[index] = { ...updated[index], [name]: value }
      return { ...prev, pickups: updated }
    })
  }

  const handlePickupNumericChange = (index, name, floatValue) => {
    setFormData(prev => {
      const updated = [...prev.pickups]
      updated[index] = { ...updated[index], [name]: floatValue || '' }
      return { ...prev, pickups: updated }
    })
  }

  const addPickup = () => {
    if (formData.pickups.length >= MAX_PICKUPS) return
    setFormData(prev => ({
      ...prev,
      pickups: [...prev.pickups, { ...defaultPickup }]
    }))
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }, 50)
  }

  const removePickup = index => {
    if (formData.pickups.length <= 1) return
    setFormData(prev => ({
      ...prev,
      pickups: prev.pickups.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const result = await createDeploymentFunction(formData)
    if (result.deployment) {
      toast.success(result.message)
      onCreate(result.deployment)
      handleClose()
    } else {
      toast.error(result)
    }
  }

  return (
    <Dialog open={isOpen} onClose={handleClose} className='relative z-50'>
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

      <div className='fixed inset-0 flex items-center justify-center p-4'>
        <TransitionChild
          enter='ease-out duration-300'
          enterFrom='opacity-0 scale-95'
          enterTo='opacity-100 scale-100'
          leave='ease-in duration-200'
          leaveFrom='opacity-100 scale-100'
          leaveTo='opacity-0 scale-95'
        >
          <DialogPanel className='font-poppins text-gray-900 w-full max-w-4xl rounded-2xl bg-white shadow-xl overflow-hidden max-h-[90vh] flex flex-col'>
            {/* ── Header ── */}
            <div className='flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0'>
              <div>
                <h2 className='text-gray-900 font-bold text-xl'>
                  Create a Deployment
                </h2>
                <p className='text-gray-500 text-sm mt-0.5'>
                  Fill in the details to deploy a truck.
                </p>
              </div>
              <button
                onClick={handleClose}
                className='text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg text-xl transition-all cursor-pointer'
              >
                <IoClose />
              </button>
            </div>

            {/* ── Scrollable body ── */}
            <div
              ref={scrollRef}
              className='flex-1 overflow-y-auto scrollbar-thin'
            >
              <form
                onSubmit={handleSubmit}
                className='px-6 py-6 flex flex-col gap-8'
              >
                {/* PICKUP STOPS */}
                <div>
                  <div className='flex items-center justify-between mb-3'>
                    <div>
                      <h3 className='text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                        Pickup Details
                      </h3>
                      <p className='text-xs text-gray-400 mt-0.5'>
                        {formData.pickups.length}/{MAX_PICKUPS} stops
                      </p>
                    </div>
                    <button
                      type='button'
                      onClick={addPickup}
                      disabled={formData.pickups.length >= MAX_PICKUPS}
                      className='flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors cursor-pointer'
                    >
                      <FiPlus className='text-sm' />
                      Add Stop
                    </button>
                  </div>

                  <div className='flex flex-col gap-4'>
                    {formData.pickups.map((pickup, index) => (
                      <div
                        key={index}
                        className='border border-gray-200 rounded-xl p-4 relative bg-gray-50/50'
                      >
                        <div className='flex items-center justify-between mb-3'>
                          <p className='text-xs font-semibold text-emerald-600 uppercase tracking-wide'>
                            Stop #{index + 1}
                          </p>
                          {formData.pickups.length > 1 && (
                            <button
                              type='button'
                              onClick={() => removePickup(index)}
                              className='text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer'
                              title='Remove stop'
                            >
                              <FiTrash2 className='text-base' />
                            </button>
                          )}
                        </div>

                        <div className='grid grid-cols-3 gap-4'>
                          <InputField
                            label='Pick-up Site'
                            type='text'
                            name='pickupSite'
                            placeholder='Pick-up Site'
                            value={pickup.pickupSite}
                            onChange={e => handlePickupChange(index, e)}
                          />
                          <InputField
                            label='Field Contact Person'
                            type='text'
                            name='fieldContactPerson'
                            placeholder='Field Contact Person'
                            value={pickup.fieldContactPerson}
                            onChange={e => handlePickupChange(index, e)}
                          />
                          <InputField
                            label='Scheduled Pickup Time'
                            type='datetime-local'
                            name='scheduledPickupTime'
                            value={pickup.scheduledPickupTime}
                            onChange={e => handlePickupChange(index, e)}
                          />
                          <InputField
                            label='Municipality'
                            type='text'
                            name='municipality'
                            placeholder='Municipality'
                            value={pickup.municipality}
                            onChange={e => handlePickupChange(index, e)}
                          />
                          <InputField
                            label='Field Contact No.'
                            type='tel'
                            name='fieldContactPersonNo'
                            placeholder='Contact Number'
                            value={pickup.fieldContactPersonNo}
                            onChange={e => handlePickupChange(index, e)}
                            maxLength={11}
                          />
                          {/* Estimated Weight */}
                          <div className='flex flex-col gap-1.5'>
                            <span className='text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                              Est. Weight (kg){' '}
                              <span className='text-red-400'>*</span>
                            </span>
                            <div className='flex items-center bg-white border border-gray-200 rounded-xl px-4 py-3 focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20 transition-all duration-200 shadow-sm'>
                              <NumericFormat
                                thousandSeparator
                                decimalScale={2}
                                allowNegative={false}
                                value={pickup.estimatedWeightKg}
                                onValueChange={values =>
                                  handlePickupNumericChange(
                                    index,
                                    'estimatedWeightKg',
                                    values.floatValue
                                  )
                                }
                                placeholder='Estimated Weight'
                                required
                                className='flex-1 text-sm text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none'
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {formData.pickups.length >= MAX_PICKUPS && (
                    <p className='text-xs text-gray-400 mt-2 text-center'>
                      Maximum of {MAX_PICKUPS} pickup stops reached.
                    </p>
                  )}
                </div>

                {/* TRUCK & DRIVER DETAILS */}
                <div>
                  <h3 className='text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3'>
                    Truck & Driver Details
                  </h3>
                  <div className='grid grid-cols-2 gap-4'>
                    <ComboboxField
                      label='Select Truck'
                      value={formData.truckId}
                      onChange={value =>
                        setFormData(prev => ({ ...prev, truckId: value }))
                      }
                      displayValue={() => selectedTruck?.label || ''}
                      onQueryChange={e => setTruckQuery(e.target.value)}
                      options={filteredTrucks}
                      placeholder='Search plate no.'
                    />

                    <ComboboxField
                      label='Select Driver'
                      value={formData.driverId}
                      onChange={value =>
                        setFormData(prev => ({ ...prev, driverId: value }))
                      }
                      displayValue={() => selectedDriver?.label || ''}
                      onQueryChange={e => setDriverQuery(e.target.value)}
                      options={filteredDrivers}
                      placeholder='Search driver name'
                    />

                    <SelectField
                      label='Truck Type'
                      name='truckType'
                      value={formData.truckType}
                      onChange={handleChange}
                      options={settings.trucksDrivers.truckType}
                    />

                    <InputField
                      label='Helper Count'
                      type='number'
                      name='helperCount'
                      placeholder='Helper Count'
                      value={formData.helperCount}
                      onChange={handleChange}
                      formatNumber
                    />
                  </div>
                </div>

                {/* DELIVERY DETAILS */}
                <div>
                  <h3 className='text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3'>
                    Delivery Details
                  </h3>
                  <div className='grid grid-cols-5 gap-4'>
                    <InputField
                      label='Receiving Contact Person'
                      type='text'
                      name='receivingContactPerson'
                      placeholder='Contact Person'
                      value={formData.receivingContactPerson}
                      onChange={handleChange}
                      colSpan={2}
                    />

                    <SelectField
                      label='Hybrid'
                      name='hybrid'
                      value={formData.hybrid}
                      onChange={handleChange}
                      options={settings.deployments.hybrid}
                    />

                    <SelectField
                      label='Territory'
                      name='territory'
                      value={formData.territory}
                      onChange={handleChange}
                      options={settings.deployments.territory}
                    />

                    <SelectField
                      label='Destination'
                      name='destination'
                      value={formData.destination}
                      onChange={handleChange}
                      options={settings.deployments.destination}
                    />

                    <InputField
                      label='Contact No.'
                      type='tel'
                      name='receivingContactPersonNo'
                      placeholder='Contact Number'
                      value={formData.receivingContactPersonNo}
                      onChange={handleChange}
                      maxLength={11}
                      colSpan={2}
                    />

                    <SelectField
                      label='Flagging'
                      name='flagging'
                      value={formData.flagging}
                      onChange={handleChange}
                      options={settings.deployments.flagging}
                    />

                    <InputField
                      label='Flagging Remarks'
                      type='text'
                      name='flaggingRemarks'
                      placeholder='Flagging Remarks'
                      value={formData.flaggingRemarks}
                      onChange={handleChange}
                      isRequired={false}
                      colSpan={2}
                    />
                  </div>
                </div>

                {/* SUBMIT */}
                <button
                  type='submit'
                  disabled={isLoading}
                  className='w-full py-3 rounded-xl font-semibold text-white text-sm uppercase tracking-wide
                             bg-emerald-500 hover:bg-emerald-600
                             shadow-md hover:shadow-lg active:scale-[0.99]
                             transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed
                             flex items-center justify-center gap-2.5 cursor-pointer'
                >
                  {isLoading ? (
                    <>
                      <span className='loading loading-spinner loading-xs sm:loading-sm' />
                      <span>Deploying...</span>
                    </>
                  ) : (
                    <>
                      <PiMapPinAreaFill className='text-base' />
                      <span>Deploy Truck</span>
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

const InputField = ({
  colSpan = 1,
  label,
  placeholder = '',
  type,
  name,
  value,
  pattern,
  onChange,
  disabled,
  maxLength,
  isRequired = true,
  formatNumber = false,
  thousandSeparator = true,
  decimalScale = 0,
  allowNegative = false
}) => {
  const labelEl = (
    <span className='text-xs font-semibold text-gray-600 uppercase tracking-wider'>
      {label} {isRequired && <span className='text-red-400'>*</span>}
    </span>
  )

  const wrapperClass = clsx(
    'flex items-center bg-white border border-gray-200 rounded-xl px-4 py-3',
    'focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20',
    'transition-all duration-200 shadow-sm',
    { 'opacity-60 cursor-not-allowed': disabled }
  )

  const inputClass = clsx(
    'flex-1 text-sm text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none',
    { capitalize: type !== 'datetime-local' }
  )

  if (formatNumber && type === 'number') {
    return (
      <label className={`col-span-${colSpan} flex flex-col gap-1.5`}>
        {labelEl}
        <div className={wrapperClass}>
          <NumericFormat
            thousandSeparator={thousandSeparator}
            decimalScale={decimalScale}
            allowNegative={allowNegative}
            value={value}
            onValueChange={values =>
              onChange({ target: { name, value: values.floatValue || '' } })
            }
            placeholder={placeholder}
            disabled={disabled}
            required={isRequired}
            className={inputClass}
          />
        </div>
      </label>
    )
  }

  return (
    <label className={`col-span-${colSpan} flex flex-col gap-1.5`}>
      {labelEl}
      <div className={wrapperClass}>
        <input
          type={type}
          name={name}
          value={value}
          minLength={2}
          maxLength={maxLength || 50}
          pattern={pattern}
          onChange={onChange}
          disabled={disabled}
          required={isRequired}
          placeholder={placeholder}
          className={inputClass}
        />
      </div>
    </label>
  )
}

export default CreateDeploymentModal
