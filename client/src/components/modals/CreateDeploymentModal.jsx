import React, { useState } from 'react'
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

  // truck & driver details
  truckId: '',
  driverId: '',
  truckType: '',
  helperCount: 0,

  // delivery details
  destination: '',
  receivingContactPerson: '',
  receivingContactPersonNo: '',
  hybrid: '',
  territory: '',
  flagging: '',
  flaggingRemarks: '',
  totalSacksCount: 0,

  // load details
  totalWeightKg: 0,

  // timeline details
  departed: '',
  destArrival: '',
  destDeparture: ''
}

const MAX_PICKUPS = 10

function CreateDeploymentModal ({ isOpen, onClose, onCreate, trucks, drivers }) {
  const { settings } = useSettingsContext()
  const [formData, setFormData] = useState(defaultValue)
  const { createDeploymentFunction, isLoading } = useCreateDeployment()

  const [truckQuery, setTruckQuery] = useState('')
  const [driverQuery, setDriverQuery] = useState('')

  const truckOptions =
    trucks
      ?.filter(truck => truck.status === 'available')
      .sort((a, b) => (a.tripCount || 0) - (b.tripCount || 0))
      .map(truck => ({
        value: truck._id,
        label: `${truck.plateNo.toUpperCase()} (${truck.truckType}) - ${
          truck.tripCount || 0
        } trips`,
        tripCount: truck.tripCount || 0
      })) || []

  const driverOptions =
    drivers
      ?.filter(driver => driver.status === 'available')
      .sort((a, b) => (a.tripCount || 0) - (b.tripCount || 0))
      .map(driver => ({
        value: driver._id,
        label: `${driver.firstname} ${driver.lastname} - ${
          driver.tripCount || 0
        } trips`,
        tripCount: driver.tripCount || 0
      })) || []

  const filteredTrucks =
    truckQuery === ''
      ? truckOptions
      : truckOptions.filter(truck =>
          truck.label.toLowerCase().includes(truckQuery.toLowerCase())
        )

  const filteredDrivers =
    driverQuery === ''
      ? driverOptions
      : driverOptions.filter(driver =>
          driver.label.toLowerCase().includes(driverQuery.toLowerCase())
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

  // Pickup array handlers
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
          enterFrom='opacity-0 -translate-y-8'
          enterTo='opacity-100 translate-y-0'
          leave='ease-in duration-200'
          leaveFrom='opacity-100 translate-y-0'
          leaveTo='opacity-0 -translate-y-8'
        >
          <DialogPanel className='font-poppins text-gray-900 w-full max-w-4xl rounded-2xl bg-white shadow-xl overflow-hidden relative max-h-[90vh] overflow-y-auto scrollbar-thin'>
            <button
              onClick={handleClose}
              className='absolute top-4 right-4 hover:bg-gray-100 p-1 rounded-full text-2xl text-gray-600 cursor-pointer transition-all z-10'
            >
              <IoClose />
            </button>

            <form onSubmit={handleSubmit} className='px-6 py-8'>
              <h2 className='text-lg font-semibold mb-6'>
                Create a Deployment
              </h2>

              {/* PICKUP STOPS SECTION */}
              <div className='mb-6'>
                <div className='flex items-center justify-between mb-3'>
                  <h3 className='text-sm font-semibold text-gray-700 uppercase tracking-wide'>
                    Pickup Details
                    <span className='ml-2 text-xs font-normal text-gray-400 normal-case tracking-normal'>
                      ({formData.pickups.length}/{MAX_PICKUPS} stops)
                    </span>
                  </h3>
                  <button
                    type='button'
                    onClick={addPickup}
                    disabled={formData.pickups.length >= MAX_PICKUPS}
                    className='flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors'
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
                      {/* Stop header */}
                      <p className='text-xs font-semibold text-emerald-600 uppercase tracking-wide  mb-3'>
                        Stop #{index + 1}
                      </p>

                      {formData.pickups.length > 1 && (
                        <button
                          type='button'
                          onClick={() => removePickup(index)}
                          className='text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition-colors absolute top-2 right-2 cursor-pointer'
                          title='Remove stop'
                        >
                          <FiTrash2 className='text-lg' />
                        </button>
                      )}

                      <div className='grid grid-cols-3 gap-x-6 gap-y-4'>
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
                          placeholder='Scheduled Pickup Time'
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
                          label='Field Contact Person No.'
                          type='tel'
                          name='fieldContactPersonNo'
                          placeholder='Contact Number'
                          value={pickup.fieldContactPersonNo}
                          onChange={e => handlePickupChange(index, e)}
                          plateNoMaxLength={11}
                        />
                        {/* Estimated Weight numeric field */}
                        <label className='flex flex-col gap-1'>
                          <span className='uppercase text-xs text-gray-500 font-semibold text-nowrap'>
                            Estimated Weight (Kg)
                          </span>
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
                            className='outline outline-gray-300 px-3 py-2 rounded break-all focus:outline-gray-400 bg-white'
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add stop hint when at max */}
                {formData.pickups.length >= MAX_PICKUPS && (
                  <p className='text-xs text-gray-400 mt-2 text-center'>
                    Maximum of {MAX_PICKUPS} pickup stops reached.
                  </p>
                )}
              </div>

              {/* TRUCK & DRIVER DETAILS SECTION */}
              <div className='mb-6'>
                <h3 className='text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide'>
                  Truck & Driver Details
                </h3>
                <div className='grid grid-cols-2 gap-x-6 gap-y-4'>
                  {/* Searchable Truck Select */}
                  <div className='flex flex-col gap-1'>
                    <span className='uppercase text-xs text-gray-500 font-semibold'>
                      Select Truck
                    </span>
                    <Combobox
                      value={formData.truckId}
                      onChange={value =>
                        setFormData(prev => ({ ...prev, truckId: value }))
                      }
                    >
                      <div className='relative'>
                        <ComboboxInput
                          className='w-full outline outline-gray-300 px-3 py-2 rounded focus:outline-1 focus:outline-gray-400 capitalize'
                          displayValue={() => selectedTruck?.label || ''}
                          onChange={e => setTruckQuery(e.target.value)}
                          placeholder='Search plate no.'
                          required
                          autoComplete='off'
                        />
                        <ComboboxButton className='absolute inset-y-0 right-0 flex items-center px-2 hover:bg-gray-100 rounded-sm'>
                          <MdKeyboardArrowDown className='h-5 w-5 text-gray-400' />
                        </ComboboxButton>
                        <ComboboxOptions className='absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white outline-1 outline-gray-300 py-1 text-base shadow-sm focus:outline-none sm:text-sm'>
                          {filteredTrucks.length === 0 ? (
                            <div className='relative cursor-default select-none px-4 py-2 text-gray-700'>
                              Nothing found.
                            </div>
                          ) : (
                            filteredTrucks.map(truck => (
                              <ComboboxOption
                                key={truck.value}
                                value={truck.value}
                                className={({ focus }) =>
                                  `relative cursor-default select-none py-2 px-4 text-base ${
                                    focus ? 'bg-gray-50' : 'text-gray-900'
                                  } ${
                                    formData.truckId === truck.value
                                      ? 'bg-gray-100'
                                      : ''
                                  }`
                                }
                              >
                                <span className='block truncate capitalize'>
                                  {truck.label}
                                </span>
                              </ComboboxOption>
                            ))
                          )}
                        </ComboboxOptions>
                      </div>
                    </Combobox>
                  </div>

                  {/* Searchable Driver Select */}
                  <div className='flex flex-col gap-1'>
                    <span className='uppercase text-xs text-gray-500 font-semibold'>
                      Select Driver
                    </span>
                    <Combobox
                      value={formData.driverId}
                      onChange={value =>
                        setFormData(prev => ({ ...prev, driverId: value }))
                      }
                    >
                      <div className='relative'>
                        <ComboboxInput
                          className='w-full outline outline-gray-300 px-3 py-2 rounded focus:outline-1 focus:outline-gray-400 capitalize'
                          displayValue={() => selectedDriver?.label || ''}
                          onChange={e => setDriverQuery(e.target.value)}
                          placeholder='Search driver name'
                          required
                          autoComplete='off'
                        />
                        <ComboboxButton className='absolute inset-y-0 right-0 flex items-center px-2 hover:bg-gray-100 rounded-sm'>
                          <MdKeyboardArrowDown className='h-5 w-5 text-gray-400' />
                        </ComboboxButton>
                        <ComboboxOptions className='absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white outline-1 outline-gray-300 py-1 text-base shadow-sm focus:outline-none sm:text-sm'>
                          {filteredDrivers.length === 0 ? (
                            <div className='relative cursor-default select-none px-4 py-2 text-gray-700'>
                              Nothing found.
                            </div>
                          ) : (
                            filteredDrivers.map(driver => (
                              <ComboboxOption
                                key={driver.value}
                                value={driver.value}
                                className={({ focus }) =>
                                  `relative cursor-default select-none py-2 px-4 text-base ${
                                    focus ? 'bg-gray-50' : 'text-gray-900'
                                  } ${
                                    formData.driverId === driver.value
                                      ? 'bg-gray-100'
                                      : ''
                                  }`
                                }
                              >
                                <span className='block truncate capitalize'>
                                  {driver.label}
                                </span>
                              </ComboboxOption>
                            ))
                          )}
                        </ComboboxOptions>
                      </div>
                    </Combobox>
                  </div>

                  {/* Truck Type */}
                  <label className='flex flex-col gap-1'>
                    <span className='uppercase text-xs text-gray-500 font-semibold'>
                      Truck Type
                    </span>
                    <div className='relative'>
                      <select
                        name='truckType'
                        value={formData.truckType}
                        onChange={handleChange}
                        required
                        className='outline outline-gray-300 px-3 py-2 rounded focus:outline-1 focus:outline-gray-400 appearance-none w-full capitalize'
                      >
                        <option value='' disabled>
                          Select
                        </option>
                        {settings.trucksDrivers.truckType.map((item, index) => (
                          <option key={index} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <MdKeyboardArrowDown className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 text-lg pointer-events-none' />
                    </div>
                  </label>

                  <InputField
                    label='Helper Count'
                    type='number'
                    name='helperCount'
                    placeholder='Helper Count'
                    value={formData.helperCount}
                    onChange={handleChange}
                    formatNumber={true}
                  />
                </div>
              </div>

              {/* DELIVERY DETAILS SECTION */}
              <div className='mb-6'>
                <h3 className='text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide'>
                  Delivery Details
                </h3>
                <div className='grid grid-cols-5 gap-x-6 gap-y-4'>
                  <InputField
                    label='Receiving Contact Person'
                    type='text'
                    name='receivingContactPerson'
                    placeholder='Contact Person'
                    value={formData.receivingContactPerson}
                    onChange={handleChange}
                    colSpan={2}
                  />

                  {/* Hybrid */}
                  <label className='flex flex-col gap-1'>
                    <span className='uppercase text-xs text-gray-500 font-semibold'>
                      Hybrid
                    </span>
                    <div className='relative'>
                      <select
                        name='hybrid'
                        value={formData.hybrid}
                        onChange={handleChange}
                        required
                        className='outline outline-gray-300 px-3 py-2 rounded focus:outline-1 focus:outline-gray-400 appearance-none w-full capitalize'
                      >
                        <option value='' disabled>
                          Select
                        </option>
                        {settings.deployments.hybrid.map((item, index) => (
                          <option key={index} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <MdKeyboardArrowDown className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 text-lg pointer-events-none' />
                    </div>
                  </label>

                  {/* Territory */}
                  <label className='flex flex-col gap-1'>
                    <span className='uppercase text-xs text-gray-500 font-semibold'>
                      Territory
                    </span>
                    <div className='relative'>
                      <select
                        name='territory'
                        value={formData.territory}
                        onChange={handleChange}
                        required
                        className='outline outline-gray-300 px-3 py-2 rounded focus:outline-1 focus:outline-gray-400 appearance-none w-full capitalize'
                      >
                        <option value='' disabled>
                          Select
                        </option>
                        {settings.deployments.territory.map((item, index) => (
                          <option key={index} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <MdKeyboardArrowDown className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 text-lg pointer-events-none' />
                    </div>
                  </label>

                  {/* Destination */}
                  <label className='flex flex-col gap-1'>
                    <span className='uppercase text-xs text-gray-500 font-semibold'>
                      Destination
                    </span>
                    <div className='relative'>
                      <select
                        name='destination'
                        value={formData.destination}
                        onChange={handleChange}
                        required
                        className='outline outline-gray-300 px-3 py-2 rounded focus:outline-1 focus:outline-gray-400 appearance-none w-full capitalize'
                      >
                        <option value='' disabled>
                          Select
                        </option>
                        {settings.deployments.destination.map((item, index) => (
                          <option key={index} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <MdKeyboardArrowDown className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 text-lg pointer-events-none' />
                    </div>
                  </label>

                  <InputField
                    label='Contact No.'
                    type='tel'
                    name='receivingContactPersonNo'
                    placeholder='Contact Number'
                    value={formData.receivingContactPersonNo}
                    onChange={handleChange}
                    plateNoMaxLength={11}
                    colSpan={2}
                  />

                  {/* Flagging */}
                  <label className='flex flex-col gap-1'>
                    <span className='uppercase text-xs text-gray-500 font-semibold'>
                      Flagging
                    </span>
                    <div className='relative'>
                      <select
                        name='flagging'
                        value={formData.flagging}
                        onChange={handleChange}
                        required
                        className='outline outline-gray-300 px-3 py-2 rounded focus:outline-1 focus:outline-gray-400 appearance-none w-full capitalize'
                      >
                        <option value='' disabled>
                          Select
                        </option>
                        {settings.deployments.flagging.map((item, index) => (
                          <option key={index} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <MdKeyboardArrowDown className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 text-lg pointer-events-none' />
                    </div>
                  </label>

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

              {/* SUBMIT BUTTON */}
              <div className='mt-8'>
                <button
                  type='submit'
                  className='bg-linear-to-b from-emerald-500 to-emerald-600 text-white px-8 py-2 uppercase text-sm font-semibold rounded flex items-center gap-2 cursor-pointer active:scale-95 transition-all hover:brightness-95'
                >
                  {isLoading ? (
                    <>
                      <span className='loading loading-spinner loading-xs'></span>
                      Deploying
                    </>
                  ) : (
                    <>
                      <PiMapPinAreaFill className='text-xl' />
                      Deploy Truck
                    </>
                  )}
                </button>
              </div>
            </form>
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
  plateNoMaxLength,
  isRequired = true,
  formatNumber = false,
  thousandSeparator = true,
  decimalScale = 0,
  allowNegative = false
}) => {
  if (formatNumber && type === 'number') {
    return (
      <label className={`col-span-${colSpan} flex flex-col gap-1`}>
        <span className='uppercase text-xs text-gray-500 font-semibold text-nowrap'>
          {label}
        </span>
        <NumericFormat
          thousandSeparator={thousandSeparator}
          decimalScale={decimalScale}
          allowNegative={allowNegative}
          value={value}
          onValueChange={values => {
            const syntheticEvent = {
              target: { name, value: values.floatValue || '' }
            }
            onChange(syntheticEvent)
          }}
          placeholder={placeholder}
          disabled={disabled}
          required={isRequired}
          className='outline outline-gray-300 px-3 py-2 rounded break-all focus:outline-gray-400'
        />
      </label>
    )
  }

  return (
    <label className={`col-span-${colSpan} flex flex-col gap-1`}>
      <span className='uppercase text-xs text-gray-500 font-semibold'>
        {label}
      </span>
      <input
        type={type}
        name={name}
        value={value}
        minLength={2}
        maxLength={plateNoMaxLength || 50}
        pattern={pattern}
        onChange={onChange}
        disabled={disabled}
        required={isRequired}
        placeholder={placeholder}
        className={clsx(
          'outline outline-gray-300 px-3 py-2 rounded break-all focus:outline-gray-400',
          { capitalize: type !== 'datetime-local' }
        )}
      />
    </label>
  )
}

export default CreateDeploymentModal
