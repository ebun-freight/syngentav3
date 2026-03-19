import React, { useState, useRef, useEffect } from 'react'
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
import useGetAllPickupFields from '../../hooks/useGetAllPickupFields'
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
  pickups: [],
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

/* ─── Static col-span maps (Tailwind needs full class strings at build time) ─ */
const colSpanClass = {
  1: 'sm:col-span-1',
  2: 'sm:col-span-2',
  3: 'sm:col-span-3',
  4: 'sm:col-span-4',
  5: 'sm:col-span-5'
}
const mobileColSpanClass = {
  1: 'max-sm:col-span-1',
  2: 'max-sm:col-span-2',
  3: 'max-sm:col-span-3'
}

/* ─── Decorative dot pattern ─────────────────────────────────────────────── */
const DotPattern = () => (
  <svg
    className='absolute inset-0 w-full h-full opacity-10 pointer-events-none'
    xmlns='http://www.w3.org/2000/svg'
  >
    <defs>
      <pattern
        id='dots-create-deployment'
        x='0'
        y='0'
        width='20'
        height='20'
        patternUnits='userSpaceOnUse'
      >
        <circle cx='2' cy='2' r='1.2' fill='white' />
      </pattern>
    </defs>
    <rect width='100%' height='100%' fill='url(#dots-create-deployment)' />
  </svg>
)

/* ── Reusable select wrapper ── */
const SelectField = ({
  colSpan = 1,
  mobileColSpan,
  label,
  name,
  value,
  onChange,
  options,
  required = true
}) => (
  <div
    className={clsx(
      mobileColSpan ? mobileColSpanClass[mobileColSpan] : '',
      colSpanClass[colSpan] ?? 'sm:col-span-1',
      'flex flex-col gap-1.5'
    )}
  >
    <span className='text-xs font-semibold text-gray-600 uppercase tracking-wider'>
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
        {options.map((item, index) => (
          <option key={index} value={item}>
            {item}
          </option>
        ))}
      </select>
      <MdKeyboardArrowDown className='absolute right-4 max-sm:right-3 text-gray-400 group-focus-within:text-primaryColor text-lg pointer-events-none transition-colors' />
    </div>
  </div>
)

/* ── Reusable combobox wrapper ── */
const ComboboxField = ({
  colSpan = 1,
  mobileColSpan,
  label,
  value,
  onChange,
  displayValue,
  onQueryChange,
  onReset,
  options,
  placeholder,
  required = true
}) => (
  <div
    className={clsx(
      mobileColSpan ? mobileColSpanClass[mobileColSpan] : '',
      colSpanClass[colSpan] ?? 'sm:col-span-1',
      'flex flex-col gap-1.5'
    )}
  >
    <span className='text-xs font-semibold text-gray-600 uppercase tracking-wider'>
      {label} {required && <span className='text-red-400'>*</span>}
    </span>
    <Combobox value={value} onChange={onChange}>
      <div className='relative group flex items-center bg-white border border-gray-200 rounded-xl px-4 py-3 max-sm:px-3 max-sm:py-2.5 focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20 transition-all duration-200 shadow-sm'>
        <ComboboxInput
          className='w-full bg-transparent text-sm max-sm:text-xs text-gray-800 placeholder-gray-400 focus:outline-none capitalize'
          displayValue={displayValue}
          onChange={onQueryChange}
          onFocus={() => onReset?.()}
          placeholder={placeholder}
          required={required}
          autoComplete='off'
        />
        <ComboboxButton
          onClick={() => onReset?.()}
          className='absolute right-4 max-sm:right-3 flex items-center text-gray-400 group-focus-within:text-primaryColor transition-colors'
        >
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

  // ── Pickup field selector state ────────────────────────────────────────
  const [availableFields, setAvailableFields] = useState([])
  const [selectedFieldIds, setSelectedFieldIds] = useState([])
  const [fieldSearch, setFieldSearch] = useState('')

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

  // Set destination to first option whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const firstDestination = settings.deployments.destination?.[0] ?? ''
      setFormData(prev => ({ ...prev, destination: firstDestination }))
      fetchAvailableFields()
    }
  }, [isOpen, settings.deployments.destination])

  const { getAllPickupFieldsFunction } = useGetAllPickupFields()

  const fetchAvailableFields = async () => {
    const result = await getAllPickupFieldsFunction({
      unassignedOnly: true,
      perPage: 200
    })
    if (!result.error) setAvailableFields(result.pickupFields)
  }

  const toggleFieldSelection = field => {
    const alreadySelected = selectedFieldIds.includes(field._id)
    if (alreadySelected) {
      setSelectedFieldIds(prev => prev.filter(id => id !== field._id))
      setFormData(prev => ({
        ...prev,
        pickups: prev.pickups.filter(p => p._pickupFieldId !== field._id)
      }))
    } else {
      if (formData.pickups.length >= MAX_PICKUPS) return
      setSelectedFieldIds(prev => [...prev, field._id])
      setFormData(prev => ({
        ...prev,
        pickups: [
          ...prev.pickups,
          {
            _pickupFieldId: field._id,
            // display-only metadata (not sent to server as pickup payload fields)
            _fieldId: field.fieldId,
            _growerName: field.growerName,
            _areaHectares: field.areaHectares,
            _tmoNo: field.tmoNo || '',
            _sacksCount: field.sacksCount ?? 0,
            _status: field.status,
            // actual pickup payload fields
            pickupSite: field.pickupSite,
            municipality: field.municipality,
            fieldContactPerson: field.fieldContactPerson,
            fieldContactPersonNo: field.fieldContactPersonNo || '',
            scheduledPickupTime: field.scheduledPickupTime || '',
            estimatedWeightKg: field.estimatedWeightKg
          }
        ]
      }))
    }
  }

  const handleClose = () => {
    onClose()
    setFormData(defaultValue)
    setTruckQuery('')
    setDriverQuery('')
    setSelectedFieldIds([])
    setFieldSearch('')
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
      updated[index] = { ...updated[index], [name]: floatValue ?? '' }
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
    const pickup = formData.pickups[index]
    if (pickup?._pickupFieldId) {
      setSelectedFieldIds(prev =>
        prev.filter(id => id !== pickup._pickupFieldId)
      )
    }
    setFormData(prev => ({
      ...prev,
      pickups: prev.pickups.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async e => {
    e.preventDefault()

    console.log(e)

    if (formData.pickups.length === 0) {
      toast.error('Select at least one pickup field before submitting.')
      return
    }
    const { pickups, ...rest } = formData
    const payload = {
      ...rest,
      // helperCount must be a string to pass the server regex /^\d+$/
      helperCount: String(rest.helperCount ?? 0),
      pickupFieldIds: selectedFieldIds
    }
    const result = await createDeploymentFunction(payload)
    if (result.deployment) {
      toast.success(result.message)
      onCreate(result.deployment)
      handleClose()
    } else {
      toast.error(result)
    }
  }

  /* ── Left panel summary stats ── */
  const summaryStats = [
    { label: 'Stops', value: formData.pickups.length },
    {
      label: 'Truck',
      value: selectedTruck ? selectedTruck.label.split(' ')[0] : '—'
    },
    {
      label: 'Driver',
      value: selectedDriver ? selectedDriver.label.split(' ')[0] : '—'
    },
    { label: 'Helpers', value: formData.helperCount || '0' },
    { label: 'Destination', value: formData.destination || '—' }
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
          <DialogPanel className='font-poppins text-gray-900 w-full max-w-[1400px] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col lg:flex-row max-h-[81vh] h-full'>
            {/* ══ LEFT PANEL ══════════════════════════════════════════════════ */}
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
                  <PiMapPinAreaFill className='text-white/60 text-4xl max-sm:text-2xl' />
                </div>
                <div className='text-center max-sm:text-left'>
                  <p className='text-white font-bold text-base max-sm:text-sm leading-tight'>
                    New Deployment
                  </p>
                  <span className='inline-flex mt-1.5 px-3 py-1 rounded-full text-xxs font-semibold border bg-emerald-50 text-emerald-600 border-emerald-100'>
                    {formData.pickups.length}{' '}
                    {formData.pickups.length === 1 ? 'Stop' : 'Stops'}
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
                  Fill in pickup stops, assign a truck and driver, then complete
                  the delivery details. Fields marked with{' '}
                  <span className='text-red-400 font-bold'>*</span> are
                  required.
                </p>
              </div>
            </div>

            {/* ══ RIGHT PANEL ═════════════════════════════════════════════════ */}
            <div className='flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden'>
              {/* Header */}
              <div className='flex items-start justify-between px-6 pt-5 pb-4 max-sm:px-4 max-sm:pt-4 max-sm:pb-3 border-b border-gray-100 shrink-0'>
                <div>
                  <h2 className='text-gray-900 font-bold text-xl max-sm:text-base'>
                    Create a Deployment
                  </h2>
                  <p className='text-gray-500 text-sm mt-0.5'>
                    Select pickup fields on the right, then fill in the
                    deployment details.
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

              {/* ── Body: middle form + right field list ── */}
              <div className='flex-1 flex min-h-0 overflow-hidden'>
                {/* ── MIDDLE: selected stops + truck/driver + delivery ── */}
                <div
                  ref={scrollRef}
                  className='flex-1 overflow-y-auto scrollbar-thin min-h-0'
                >
                  <form
                    id='create-deployment-form'
                    onSubmit={handleSubmit}
                    className='flex flex-col gap-8 px-6 py-5 max-sm:px-4'
                  >
                    {/* ── SELECTED STOPS ── */}
                    <div>
                      <div className='flex items-center justify-between mb-3'>
                        <h3 className='text-sm font-semibold text-gray-700 uppercase tracking-wider'>
                          Selected Stops
                        </h3>
                        <span className='text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700'>
                          {formData.pickups.length}/{MAX_PICKUPS}
                        </span>
                      </div>

                      {/* Empty state — only this is conditional */}
                      {formData.pickups.length === 0 && (
                        <div className='flex flex-col items-center justify-center py-10 gap-2 rounded-xl border-2 border-dashed border-gray-200 text-gray-400'>
                          <PiMapPinAreaFill className='text-3xl opacity-30' />
                          <p className='text-sm'>
                            Select pickup fields from the list on the right.
                          </p>
                        </div>
                      )}

                      <div className='flex flex-col gap-3'>
                        {formData.pickups.map((pickup, index) => (
                          <div
                            key={pickup._pickupFieldId || index}
                            className='border border-emerald-200 rounded-xl overflow-hidden bg-white shadow-sm'
                          >
                            {/* Card header */}
                            <div className='flex items-center justify-between px-4 py-2.5 bg-emerald-50 border-b border-emerald-100'>
                              <div className='flex items-center gap-2 flex-wrap'>
                                <span className='text-xs font-bold text-emerald-700 uppercase tracking-wide'>
                                  Stop #{index + 1}
                                </span>
                                {pickup._fieldId && (
                                  <span className='font-mono text-xs bg-white border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded font-semibold'>
                                    {pickup._fieldId}
                                  </span>
                                )}
                                {pickup._tmoNo && (
                                  <span className='font-mono text-xs bg-blue-50 border border-blue-200 text-blue-600 px-2 py-0.5 rounded'>
                                    TMO: {pickup._tmoNo}
                                  </span>
                                )}
                              </div>
                              <button
                                type='button'
                                onClick={() => removePickup(index)}
                                className='text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ml-2'
                                title='Remove stop'
                              >
                                <FiTrash2 className='text-sm' />
                              </button>
                            </div>

                            {/* Card body — 6 fields, 3 per row */}
                            <div className='px-4 py-3 grid grid-cols-3 gap-x-4 gap-y-3'>
                              <ReadOnlyField
                                label='Pick-up Site'
                                value={pickup.pickupSite}
                              />
                              <ReadOnlyField
                                label='Municipality'
                                value={pickup.municipality}
                              />
                              <ReadOnlyField
                                label='Sched. Pickup'
                                value={
                                  pickup.scheduledPickupTime
                                    ? new Date(
                                        pickup.scheduledPickupTime
                                      ).toLocaleString('en-PH', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })
                                    : '—'
                                }
                              />
                              <ReadOnlyField
                                label='Area (ha)'
                                value={
                                  pickup._areaHectares !== undefined
                                    ? `${pickup._areaHectares} ha`
                                    : '—'
                                }
                              />
                              <ReadOnlyField
                                label='Est. Weight (kg)'
                                value={
                                  pickup.estimatedWeightKg
                                    ? Number(
                                        pickup.estimatedWeightKg
                                      ).toLocaleString()
                                    : '—'
                                }
                                highlight
                              />
                              <ReadOnlyField
                                label='Grower Name'
                                value={pickup._growerName || '—'}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── TRUCK & DRIVER DETAILS ── */}
                    <div>
                      <h3 className='text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4'>
                        Truck & Driver Details
                      </h3>
                      <div className='grid grid-cols-1 xs:grid-cols-2 gap-4'>
                        <ComboboxField
                          label='Select Truck'
                          value={formData.truckId}
                          onChange={value => {
                            setFormData(prev => ({ ...prev, truckId: value }))
                            setTruckQuery('')
                          }}
                          displayValue={() => selectedTruck?.label || ''}
                          onQueryChange={e => setTruckQuery(e.target.value)}
                          onReset={() => setTruckQuery('')}
                          options={filteredTrucks}
                          placeholder='Search plate no.'
                        />
                        <ComboboxField
                          label='Select Driver'
                          value={formData.driverId}
                          onChange={value => {
                            setFormData(prev => ({ ...prev, driverId: value }))
                            setDriverQuery('')
                          }}
                          displayValue={() => selectedDriver?.label || ''}
                          onQueryChange={e => setDriverQuery(e.target.value)}
                          onReset={() => setDriverQuery('')}
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

                    {/* ── DELIVERY DETAILS ── */}
                    <div className='pb-5'>
                      <h3 className='text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4'>
                        Delivery Details
                      </h3>

                      {/* Desktop (sm+): 5-col layout */}
                      <div className='hidden sm:grid sm:grid-cols-5 gap-4'>
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
                          label='Flagging'
                          name='flagging'
                          value={formData.flagging}
                          onChange={handleChange}
                          options={settings.deployments.flagging}
                          colSpan={2}
                        />
                        <input
                          type='hidden'
                          name='destination'
                          value={formData.destination}
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
                          label='Territory'
                          name='territory'
                          value={formData.territory}
                          onChange={handleChange}
                          options={settings.deployments.territory}
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

                      {/* Mobile: 2-col layout */}
                      <div className='sm:hidden grid grid-cols-2 gap-3'>
                        <InputField
                          label='Receiving Contact Person'
                          type='text'
                          name='receivingContactPerson'
                          placeholder='Contact Person'
                          value={formData.receivingContactPerson}
                          onChange={handleChange}
                        />
                        <InputField
                          label='Contact No.'
                          type='tel'
                          name='receivingContactPersonNo'
                          placeholder='Contact Number'
                          value={formData.receivingContactPersonNo}
                          onChange={handleChange}
                          maxLength={11}
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
                          label='Flagging'
                          name='flagging'
                          value={formData.flagging}
                          onChange={handleChange}
                          options={settings.deployments.flagging}
                          mobileColSpan={2}
                        />
                        <InputField
                          label='Flagging Remarks'
                          type='text'
                          name='flaggingRemarks'
                          placeholder='Flagging Remarks'
                          value={formData.flaggingRemarks}
                          onChange={handleChange}
                          isRequired={false}
                          mobileColSpan={2}
                        />
                      </div>
                    </div>
                  </form>
                </div>

                {/* ── RIGHT: Pickup field checklist only ── */}
                <div className='w-80 shrink-0 flex flex-col min-h-0 border-l border-gray-200 max-lg:hidden'>
                  {/* Sticky header + search */}
                  <div className='shrink-0 px-4 pt-4 pb-3 border-b border-gray-200 bg-gray-50'>
                    <div className='flex items-center justify-between mb-3'>
                      <h3 className='text-sm font-semibold text-gray-700 uppercase tracking-wider'>
                        Pickup Fields
                      </h3>
                      <span
                        className={clsx(
                          'text-xs font-semibold px-2.5 py-1 rounded-full transition-colors',
                          formData.pickups.length > 0
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-200 text-gray-500'
                        )}
                      >
                        {formData.pickups.length}/{MAX_PICKUPS}
                      </span>
                    </div>
                    <div className='flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20 transition-all shadow-sm'>
                      <svg
                        className='text-gray-400 shrink-0 w-3.5 h-3.5'
                        fill='currentColor'
                        viewBox='0 0 20 20'
                      >
                        <path
                          fillRule='evenodd'
                          d='M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z'
                          clipRule='evenodd'
                        />
                      </svg>
                      <input
                        type='text'
                        placeholder='Search fields...'
                        value={fieldSearch}
                        onChange={e => setFieldSearch(e.target.value)}
                        className='w-full text-sm text-gray-700 placeholder-gray-400 bg-transparent focus:outline-none'
                      />
                      {fieldSearch && (
                        <button
                          type='button'
                          onClick={() => setFieldSearch('')}
                          className='text-gray-400 hover:text-gray-600 shrink-0'
                        >
                          <IoClose className='text-sm' />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scrollable field list */}
                  <div className='flex-1 overflow-y-auto scrollbar-thin min-h-0 bg-white'>
                    {availableFields.length === 0 ? (
                      <div className='flex flex-col items-center justify-center py-12 gap-2 text-gray-400'>
                        <PiMapPinAreaFill className='text-3xl opacity-30' />
                        <p className='text-sm italic text-center px-4'>
                          No unassigned pickup fields available.
                        </p>
                      </div>
                    ) : (
                      availableFields
                        .filter(f => {
                          const s = fieldSearch.toLowerCase()
                          return (
                            !fieldSearch ||
                            f.fieldId?.toLowerCase().includes(s) ||
                            f.growerName?.toLowerCase().includes(s) ||
                            f.pickupSite?.toLowerCase().includes(s) ||
                            f.municipality?.toLowerCase().includes(s)
                          )
                        })
                        .map(field => {
                          const isSelected = selectedFieldIds.includes(
                            field._id
                          )
                          const isMaxed =
                            formData.pickups.length >= MAX_PICKUPS &&
                            !isSelected
                          return (
                            <button
                              key={field._id}
                              type='button'
                              disabled={isMaxed}
                              onClick={() => toggleFieldSelection(field)}
                              className={clsx(
                                'w-full text-left flex items-center gap-3 px-3 py-3 border-b border-gray-100 last:border-none transition-colors',
                                isSelected
                                  ? 'bg-emerald-50'
                                  : 'hover:bg-gray-50',
                                isMaxed && 'opacity-40 cursor-not-allowed'
                              )}
                            >
                              {/* Checkbox */}
                              <div
                                className={clsx(
                                  'shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all',
                                  isSelected
                                    ? 'bg-emerald-500 border-emerald-500'
                                    : 'border-gray-300 bg-white'
                                )}
                              >
                                {isSelected && (
                                  <svg
                                    className='w-2.5 h-2.5 text-white'
                                    fill='none'
                                    viewBox='0 0 24 24'
                                    stroke='currentColor'
                                    strokeWidth={3.5}
                                  >
                                    <path
                                      strokeLinecap='round'
                                      strokeLinejoin='round'
                                      d='M5 13l4 4L19 7'
                                    />
                                  </svg>
                                )}
                              </div>

                              {/* Info */}
                              <div className='min-w-0 flex-1'>
                                {/* Row 1: field ID + sched pickup */}
                                <div className='flex items-center gap-1.5 min-w-0'>
                                  <span className='font-mono text-[10px] font-semibold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded shrink-0'>
                                    {field.fieldId}
                                  </span>
                                  <span className='text-xs font-semibold text-gray-800 truncate'>
                                    {field.scheduledPickupTime
                                      ? new Date(
                                          field.scheduledPickupTime
                                        ).toLocaleString('en-PH', {
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })
                                      : '—'}
                                  </span>
                                </div>
                                {/* Row 2: site · municipality */}
                                <p className='text-[11px] text-gray-400 mt-0.5 capitalize truncate'>
                                  {field.pickupSite} · {field.municipality}
                                </p>
                                {/* Row 3: weight + area as pills */}
                                <div className='flex items-center gap-1.5 mt-1'>
                                  <span className='text-[10px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded'>
                                    {Number(
                                      field.estimatedWeightKg
                                    ).toLocaleString()}{' '}
                                    kg
                                  </span>
                                  <span className='text-[10px] font-medium bg-gray-50 text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded'>
                                    {field.areaHectares} ha
                                  </span>
                                </div>
                              </div>
                            </button>
                          )
                        })
                    )}
                  </div>
                </div>
              </div>

              {/* ── ACTION BAR ── */}
              <div className='max-sm:hidden flex items-center gap-3 px-6 py-4 border-t border-gray-100 shrink-0'>
                <button
                  type='submit'
                  form='create-deployment-form'
                  disabled={isLoading}
                  className='px-8 py-2.5 rounded-xl font-semibold text-white text-sm uppercase tracking-wide
                             shadow-md hover:shadow-lg active:scale-[0.99]
                             transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed
                             flex items-center justify-center gap-2.5 cursor-pointer'
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
                      <PiMapPinAreaFill className='text-base' />
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

/* ─── Reusable InputField ────────────────────────────────────────────────── */
const InputField = ({
  colSpan = 1,
  mobileColSpan,
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

  const containerClass = clsx(
    mobileColSpan ? mobileColSpanClass[mobileColSpan] : '',
    colSpanClass[colSpan] ?? 'sm:col-span-1',
    'flex flex-col gap-1.5'
  )

  const wrapperClass = clsx(
    'flex items-center bg-white border border-gray-200 rounded-xl px-4 py-3 max-sm:px-3 max-sm:py-2.5 overflow-hidden',
    'focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20',
    'transition-all duration-200 shadow-sm',
    { 'opacity-60 cursor-not-allowed': disabled }
  )

  const inputClass = clsx(
    'flex-1 min-w-0 text-sm max-sm:text-xs text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none',
    { capitalize: type !== 'datetime-local' }
  )

  if (formatNumber && type === 'number') {
    return (
      <label className={containerClass}>
        {labelEl}
        <div className={wrapperClass}>
          <NumericFormat
            thousandSeparator={thousandSeparator}
            decimalScale={decimalScale}
            allowNegative={allowNegative}
            value={value}
            onValueChange={values =>
              onChange({ target: { name, value: values.floatValue ?? '' } })
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
    <label className={containerClass}>
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

/* ─── Read-only display field for Selected Stops ───────────────────────── */
const ReadOnlyField = ({ label, value, highlight = false }) => (
  <div className='flex flex-col gap-0.5 min-w-0'>
    <span className='text-[10px] font-semibold text-gray-400 uppercase tracking-wider truncate'>
      {label}
    </span>
    <span
      className={clsx(
        'text-xs font-medium truncate capitalize',
        highlight ? 'text-emerald-600 font-semibold' : 'text-gray-700'
      )}
      title={String(value)}
    >
      {value || '—'}
    </span>
  </div>
)

export default CreateDeploymentModal
