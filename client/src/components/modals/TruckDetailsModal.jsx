import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild,
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions
} from '@headlessui/react'
import {
  FaRoute,
  FaSave,
  FaTrash,
  FaTruck,
  FaUserEdit,
  FaWeightHanging
} from 'react-icons/fa'
import { MdAltRoute, MdLocalShipping, MdScale } from 'react-icons/md'
import { IoClose } from 'react-icons/io5'
import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { MdKeyboardArrowDown } from 'react-icons/md'
import { toast } from 'react-toastify'
import { RiFolderUploadLine } from 'react-icons/ri'
import { DateTime } from 'luxon'
import { no_image } from '../../consts/images'
import useUpdateTruck from '../../hooks/useUpdateTruck'
import { NumericFormat } from 'react-number-format'
import { useUserContext } from '../../contexts/UserContext'
import { useSettingsContext } from '../../contexts/SettingsContext'

/* ─── Decorative dot pattern ────────────────────────────────────────────── */
const DotPattern = () => (
  <svg
    className='absolute inset-0 w-full h-full opacity-10 pointer-events-none'
    xmlns='http://www.w3.org/2000/svg'
  >
    <defs>
      <pattern
        id='dots-truck'
        x='0'
        y='0'
        width='20'
        height='20'
        patternUnits='userSpaceOnUse'
      >
        <circle cx='2' cy='2' r='1.2' fill='white' />
      </pattern>
    </defs>
    <rect width='100%' height='100%' fill='url(#dots-truck)' />
  </svg>
)

/* ─── Stat badge ────────────────────────────────────────────────────────── */
const StatBadge = ({ icon: Icon, value, label }) => (
  <div className='flex flex-col items-center gap-1 flex-1'>
    <div className='bg-white/10 rounded-lg p-2 border border-white/10'>
      <Icon className='text-white/80 text-base' />
    </div>
    <span className='text-white font-bold text-sm leading-none capitalize'>
      {value}
    </span>
    <span className='text-white/50 text-xs text-center leading-tight'>
      {label}
    </span>
  </div>
)

/* ─── Status badge colours ──────────────────────────────────────────────── */
const statusStyles = {
  available: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  deployed: 'bg-blue-50 text-blue-500 border-blue-100',
  unavailable: 'bg-red-50 text-red-500 border-red-100'
}

function TruckDetailsModal ({
  isOpen,
  onClose,
  truck,
  onUpdate,
  openDeleteModal
}) {
  const { userData } = useUserContext()
  const { settings } = useSettingsContext()

  const [isEditMode, setIsEditMode] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)
  const [subconQuery, setSubconQuery] = useState('')
  const [filteredSubcons, setFilteredSubcons] = useState([])

  const { updateTruckFunction, isLoading } = useUpdateTruck()

  const handleChange = e => {
    const { name, value } = e.target
    setEditForm(prev => ({ ...prev, [name]: value }))
  }

  const handleComboboxChange = (name, value) => {
    setEditForm(prev => ({ ...prev, [name]: value }))
  }

  useEffect(() => {
    setFilteredSubcons(
      settings.trucksDrivers.subcon.filter(s =>
        s.toLowerCase().includes(subconQuery.toLowerCase())
      )
    )
  }, [subconQuery, settings.trucksDrivers.subcon])

  const handleFileChange = e => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      setPreviewImage(URL.createObjectURL(file))
      setEditForm(prev => ({ ...prev, image: file }))
    }
  }

  const handleUpdateTruck = async e => {
    e.preventDefault()
    const result = await updateTruckFunction(truck._id, editForm)
    if (result.success) {
      onUpdate(result.data.truck)
      toast.success(result.data.message)
      setIsEditMode(false)
      onClose()
    } else {
      toast.error(result.error)
    }
  }

  const handleCloseModal = () => onClose()

  const handleCancelEditMode = () => {
    setIsEditMode(false)
    setEditForm(truck)
    setSelectedFile(null)
    setPreviewImage(null)
  }

  useEffect(() => {
    if (isOpen && truck) {
      setEditForm(truck)
      setIsEditMode(false)
      setSelectedFile(null)
      setPreviewImage(null)
    }
  }, [isOpen, truck])

  const isAdmin = ['head_admin', 'admin'].includes(userData.data.role)

  return (
    <Dialog
      open={isOpen}
      onClose={isLoading ? () => {} : handleCloseModal}
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

      <div className='fixed inset-0 flex items-center justify-center p-4'>
        <TransitionChild
          enter='ease-out duration-300'
          enterFrom='opacity-0 scale-95 translate-y-2'
          enterTo='opacity-100 scale-100 translate-y-0'
          leave='ease-in duration-200'
          leaveFrom='opacity-100 scale-100'
          leaveTo='opacity-0 scale-95'
        >
          <DialogPanel className='font-poppins w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col sm:flex-row max-h-[90vh] sm:max-h-none'>
            {/* ══ LEFT PANEL ══════════════════════════════════════════════════════ */}
            <div
              className='relative flex flex-col overflow-hidden sm:w-72 shrink-0 p-8 pb-16'
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

              {/* Truck Image */}
              <div className='relative z-10 flex flex-col items-center gap-3'>
                <div
                  className={clsx(
                    'w-32 h-32 rounded-2xl overflow-hidden relative border-2 transition-all',
                    isEditMode
                      ? 'border-dashed border-white/40 hover:border-white/70 cursor-pointer group'
                      : 'border-white/20'
                  )}
                >
                  <img
                    src={previewImage || truck?.imageUrl || no_image}
                    alt={truck?.plateNo}
                    className={clsx(
                      'w-full h-full object-cover object-center transition-opacity',
                      { 'opacity-10': !previewImage && !truck?.imageUrl }
                    )}
                  />
                  {isEditMode && (
                    <>
                      <div className='absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white gap-1'>
                        <RiFolderUploadLine className='text-2xl' />
                        <span className='text-xs font-medium'>Change</span>
                      </div>
                      <input
                        type='file'
                        accept='image/*'
                        onChange={handleFileChange}
                        className='absolute inset-0 opacity-0 cursor-pointer'
                      />
                    </>
                  )}
                </div>

                <div className='text-center'>
                  <h3 className='text-white font-bold text-base leading-tight uppercase tracking-widest'>
                    {truck?.plateNo || '—'}
                  </h3>
                  <span
                    className={clsx(
                      'inline-flex mt-1.5 px-3 py-1 rounded-full text-xxs font-semibold border capitalize',
                      statusStyles[truck?.status]
                    )}
                  >
                    {truck?.status}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className='relative z-10 w-full h-px bg-white/10 my-4' />

              {/* Stats */}
              <div className='relative z-10 flex gap-2'>
                <StatBadge
                  icon={FaRoute}
                  value={truck?.tripCount ?? 0}
                  label='Trips'
                />
                <div className='w-px bg-white/10' />
                <StatBadge
                  icon={FaTruck}
                  value={truck?.truckType || '—'}
                  label='Type'
                />
                <div className='w-px bg-white/10' />
                <StatBadge
                  icon={FaWeightHanging}
                  value={
                    truck?.maxLoad
                      ? `${Number(truck.maxLoad).toLocaleString()}`
                      : '—'
                  }
                  label='Max Load'
                />
              </div>

              {/* Divider */}
              <div className='relative z-10 w-full h-px bg-white/10 my-4' />

              {/* Meta info */}
              <div className='relative z-10 flex justify-between'>
                <div>
                  <p className='text-white/40 text-xxs uppercase tracking-wider font-semibold mb-0.5'>
                    Created
                  </p>
                  <p className='text-white/70 text-xs'>
                    {truck?.createdAt
                      ? DateTime.fromISO(truck.createdAt).toFormat(
                          'MMM d, yyyy'
                        )
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className='text-white/40 text-xxs uppercase tracking-wider font-semibold mb-0.5'>
                    Last Updated
                  </p>
                  <p className='text-white/70 text-xs'>
                    {truck?.updatedAt
                      ? DateTime.fromISO(truck.updatedAt).toFormat(
                          'MMM d, yyyy'
                        )
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Edit mode indicator — absolute, pure opacity fade */}
              <div
                className='absolute bottom-5 left-5 right-5 z-10 flex items-center gap-2 bg-orange-500/20 border border-orange-400/30 rounded-xl px-3 py-2'
                style={{
                  opacity: isEditMode ? 1 : 0,
                  transition: 'opacity 500ms cubic-bezier(0.4,0,0.2,1)',
                  pointerEvents: isEditMode ? 'auto' : 'none'
                }}
              >
                <span className='w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse shrink-0' />
                <p className='text-orange-300 text-xs font-semibold uppercase tracking-wide leading-snug whitespace-nowrap'>
                  Edit mode active
                </p>
              </div>
            </div>

            {/* ══ RIGHT PANEL ═════════════════════════════════════════════════════ */}
            <div className='flex-1 flex flex-col min-w-0 overflow-y-auto'>
              {/* Header */}
              <div className='flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 shrink-0'>
                <div>
                  <h2 className='text-gray-900 font-bold text-lg'>
                    Truck Details
                  </h2>
                  <p className='text-gray-400 text-xs mt-0.5'>
                    {isEditMode
                      ? 'Make changes and save to update.'
                      : "View this truck's information."}
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  disabled={isLoading}
                  className='text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg text-xl transition-all cursor-pointer disabled:opacity-40 shrink-0 ml-4'
                >
                  <IoClose />
                </button>
              </div>

              {/* Form */}
              <form
                onSubmit={handleUpdateTruck}
                className='flex-1 flex flex-col'
              >
                <div className='flex-1 px-6 py-5 grid grid-cols-2 gap-x-4 gap-y-4 content-start'>
                  {/* Plate No. */}
                  <InputField
                    label='Plate No.'
                    type='text'
                    name='plateNo'
                    placeholder='Plate No.'
                    value={editForm?.plateNo || ''}
                    disabled={!isEditMode || isLoading}
                    isUppercase
                    onChange={handleChange}
                  />

                  {/* Truck Type */}
                  <div className='flex flex-col gap-1.5'>
                    <span className='text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                      Type
                    </span>
                    {isEditMode ? (
                      <div className='relative flex items-center bg-white border border-gray-200 rounded-xl px-4 py-3 focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20 transition-all shadow-sm'>
                        <select
                          name='truckType'
                          value={editForm?.truckType || ''}
                          onChange={handleChange}
                          className='w-full appearance-none bg-transparent text-sm text-gray-800 focus:outline-none capitalize'
                        >
                          {settings.trucksDrivers.truckType.map((item, i) => (
                            <option key={i} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                        <MdKeyboardArrowDown className='absolute right-4 text-gray-400 text-lg pointer-events-none' />
                      </div>
                    ) : (
                      <div className='flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 shadow-sm'>
                        <p className='text-sm text-gray-500 capitalize'>
                          {editForm?.truckType}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Max Load */}
                  <div className='flex flex-col gap-1.5'>
                    <span className='text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                      Max Load
                    </span>
                    {isEditMode ? (
                      <div className='flex items-center bg-white border border-gray-200 rounded-xl px-4 py-3 focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20 transition-all shadow-sm'>
                        <NumericFormat
                          thousandSeparator
                          decimalScale={0}
                          allowNegative={false}
                          value={editForm?.maxLoad || ''}
                          onValueChange={values => {
                            handleChange({
                              target: {
                                name: 'maxLoad',
                                value: values.floatValue || ''
                              }
                            })
                          }}
                          placeholder='Max Load'
                          disabled={isLoading}
                          className='flex-1 text-sm text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none min-w-0'
                        />
                      </div>
                    ) : (
                      <div className='flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 shadow-sm'>
                        <p className='text-sm text-gray-500'>
                          {editForm?.maxLoad
                            ? Number(editForm.maxLoad).toLocaleString()
                            : '—'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div className='flex flex-col gap-1.5'>
                    <span className='text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                      Status
                    </span>
                    {isEditMode ? (
                      <div className='relative flex items-center bg-white border border-gray-200 rounded-xl px-4 py-3 focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20 transition-all shadow-sm'>
                        <select
                          name='status'
                          value={editForm?.status || ''}
                          onChange={handleChange}
                          className='w-full appearance-none bg-transparent text-sm text-gray-800 focus:outline-none capitalize'
                        >
                          {settings.trucksDrivers.status.map((item, i) => (
                            <option key={i} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                        <MdKeyboardArrowDown className='absolute right-4 text-gray-400 text-lg pointer-events-none' />
                      </div>
                    ) : (
                      <div className='flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 shadow-sm'>
                        <p className='text-sm text-gray-500 capitalize'>
                          {editForm?.status}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Trip Count */}
                  <InputField
                    label='Trip Count'
                    type='number'
                    name='tripCount'
                    placeholder='0'
                    value={editForm?.tripCount ?? ''}
                    disabled={!isEditMode || isLoading}
                    onChange={handleChange}
                  />

                  {/* Subcon */}
                  <div className='flex flex-col gap-1.5'>
                    <span className='text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                      Subcon
                    </span>
                    {isEditMode ? (
                      <Combobox
                        value={editForm?.subcon || ''}
                        onChange={v => handleComboboxChange('subcon', v)}
                      >
                        <div className='relative flex items-center bg-white border border-gray-200 rounded-xl px-4 py-3 focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20 transition-all shadow-sm'>
                          <ComboboxInput
                            className='w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none capitalize min-w-0'
                            displayValue={v => v || ''}
                            onChange={e => setSubconQuery(e.target.value)}
                            placeholder='Search subcon...'
                            autoComplete='off'
                          />
                          <ComboboxButton className='absolute right-4 text-gray-400'>
                            <MdKeyboardArrowDown className='text-lg' />
                          </ComboboxButton>
                        </div>
                        <ComboboxOptions
                          portal
                          anchor={{ to: 'bottom start', gap: 8 }}
                          className='z-999 max-h-48 w-(--input-width) overflow-auto rounded-xl bg-white border border-gray-200 shadow-md py-1 text-sm focus:outline-none'
                        >
                          {filteredSubcons.length === 0 ? (
                            <div className='px-4 py-2 text-gray-400 italic'>
                              Nothing found.
                            </div>
                          ) : (
                            filteredSubcons.map((subcon, i) => (
                              <ComboboxOption
                                key={i}
                                value={subcon}
                                className={({ focus }) =>
                                  clsx(
                                    'px-4 py-2 cursor-default select-none capitalize transition-colors',
                                    {
                                      'bg-gray-50': focus,
                                      'bg-gray-100 font-medium':
                                        editForm?.subcon === subcon
                                    }
                                  )
                                }
                              >
                                {subcon}
                              </ComboboxOption>
                            ))
                          )}
                        </ComboboxOptions>
                      </Combobox>
                    ) : (
                      <div className='flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 shadow-sm'>
                        <p className='text-sm text-gray-700 capitalize truncate'>
                          {editForm?.subcon?.replace(/_/g, ' ') ||
                            'Not assigned'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Actions ── */}
                {isAdmin && (
                  <div className='px-6 pb-5 pt-4 border-t border-gray-100 shrink-0'>
                    {isEditMode ? (
                      <div className='flex gap-3'>
                        <button
                          type='button'
                          onClick={handleCancelEditMode}
                          disabled={isLoading}
                          className='px-8 py-2.5 rounded-xl font-semibold text-sm uppercase tracking-wide
                                     bg-gray-100 text-gray-600 hover:bg-gray-200
                                     cursor-pointer active:scale-[0.99] transition-all
                                     disabled:opacity-50 disabled:cursor-not-allowed
                                     flex items-center justify-center gap-2'
                        >
                          Cancel
                        </button>
                        <button
                          type='submit'
                          disabled={isLoading}
                          className='px-8 py-2.5 rounded-xl font-semibold text-white text-sm uppercase tracking-wide
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
                              <span className='loading loading-spinner loading-sm' />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <FaSave className='text-sm shrink-0' />
                              <span>Save </span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className='flex gap-3'>
                        <button
                          type='button'
                          onClick={() => setIsEditMode(true)}
                          disabled={isLoading}
                          className='px-8 py-2.5 rounded-xl font-semibold text-white text-sm uppercase tracking-wide
                                     shadow-md hover:shadow-lg cursor-pointer active:scale-[0.99]
                                     transition-all disabled:opacity-70 disabled:cursor-not-allowed
                                     flex items-center justify-center gap-2'
                          style={{
                            background:
                              'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                          }}
                        >
                          <FaUserEdit className='text-sm shrink-0' />
                          <span>Edit </span>
                        </button>
                        <button
                          type='button'
                          onClick={openDeleteModal}
                          disabled={isLoading}
                          className='px-8 py-2.5 rounded-xl font-semibold text-white text-sm uppercase tracking-wide
                                     shadow-md hover:shadow-lg cursor-pointer active:scale-[0.99]
                                     transition-all disabled:opacity-70 disabled:cursor-not-allowed
                                     flex items-center justify-center gap-2'
                          style={{
                            background:
                              'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                          }}
                        >
                          <FaTrash className='text-sm shrink-0' />
                          <span>Delete </span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
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
  isRequired = true,
  isUppercase = false
}) => (
  <label className='flex flex-col gap-1.5'>
    <span className='text-xs font-semibold text-gray-600 uppercase tracking-wider'>
      {label} {isRequired && <span className='text-red-400'>*</span>}
    </span>
    <div
      className={clsx(
        'flex items-center border rounded-xl px-4 py-3 transition-all duration-200 shadow-sm',
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
        maxLength={30}
        onChange={onChange}
        disabled={disabled}
        required={isRequired}
        className={clsx(
          'flex-1 text-sm placeholder-gray-400 bg-transparent focus:outline-none min-w-0',
          disabled ? 'text-gray-500' : 'text-gray-800',
          isUppercase ? 'uppercase' : 'capitalize'
        )}
      />
    </div>
  </label>
)

export default TruckDetailsModal
