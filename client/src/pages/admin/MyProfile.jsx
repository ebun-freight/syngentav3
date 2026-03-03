import React, { useEffect, useState } from 'react'
import { useUserContext } from '../../contexts/UserContext'
import clsx from 'clsx'
import { DateTime } from 'luxon'
import { no_image } from '../../consts/images'
import {
  FaPhoneAlt,
  FaSave,
  FaSignInAlt,
  FaUser,
  FaUserEdit
} from 'react-icons/fa'
import useUpdateUser from '../../hooks/useUpdateUser'
import { RiFolderUploadLine } from 'react-icons/ri'
import { toast } from 'react-toastify'

/* ─── Decorative dot pattern ────────────────────────────────────────────── */
const DotPattern = () => (
  <svg
    className='absolute inset-0 w-full h-full opacity-10 pointer-events-none'
    xmlns='http://www.w3.org/2000/svg'
  >
    <defs>
      <pattern
        id='dots-profile'
        x='0'
        y='0'
        width='20'
        height='20'
        patternUnits='userSpaceOnUse'
      >
        <circle cx='2' cy='2' r='1.2' fill='white' />
      </pattern>
    </defs>
    <rect width='100%' height='100%' fill='url(#dots-profile)' />
  </svg>
)

/* ─── Stat badge ────────────────────────────────────────────────────────── */
const StatBadge = ({ icon: Icon, value, label }) => (
  <div className='flex flex-col items-center gap-1 flex-1'>
    <div className='bg-white/10 rounded-xl p-2 border border-white/10'>
      <Icon className='text-white/80 text-sm max-sm:text-xs' />
    </div>
    <span className='text-white font-bold text-sm max-sm:text-xs leading-none capitalize'>
      {value}
    </span>
    <span className='text-white/50 text-xs max-sm:text-xxs text-center leading-tight'>
      {label}
    </span>
  </div>
)

/* ─── Status badge colours ──────────────────────────────────────────────── */
const userStatusStyles = {
  active: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  pending: 'bg-orange-50 text-orange-500 border-orange-100',
  inactive: 'bg-red-50 text-red-500 border-red-100',
  rejected: 'bg-gray-100 text-gray-500 border-gray-200',
  revoked: 'bg-gray-100 text-gray-500 border-gray-200'
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
        value={value || ''}
        minLength={2}
        maxLength={50}
        onChange={onChange}
        disabled={disabled}
        required={isRequired}
        className={clsx(
          'flex-1 text-sm max-sm:text-xs placeholder-gray-400 bg-transparent focus:outline-none min-w-0',
          disabled ? 'text-gray-500' : 'text-gray-800',
          { capitalize: isCapitalize }
        )}
      />
    </div>
  </label>
)

function MyProfile () {
  const { updateUserFunction, isLoading } = useUpdateUser()
  const { userData, updateUser } = useUserContext()
  const userLoading = userData.isLoading

  const [isEditMode, setIsEditMode] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)

  const user = userData?.data

  const handleChange = e => {
    const { name, value } = e.target
    setEditForm(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = e => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      setPreviewImage(URL.createObjectURL(file))
      setEditForm(prev => ({ ...prev, image: file }))
    }
  }

  const handleUpdateUser = async e => {
    e.preventDefault()
    const result = await updateUserFunction(user._id, editForm)
    if (result.success) {
      toast.success(result.data.message)
      setEditForm(result.data.user)
      updateUser(result.data.user)
      setIsEditMode(false)
      setSelectedFile(null)
      setPreviewImage(null)
    } else {
      toast.error(result.error)
    }
  }

  const handleCancelEditMode = () => {
    setIsEditMode(false)
    setEditForm(user)
    setSelectedFile(null)
    setPreviewImage(null)
  }

  useEffect(() => {
    if (user) {
      setEditForm(user)
      setIsEditMode(false)
      setSelectedFile(null)
      setPreviewImage(null)
    }
  }, [user])

  const roleLabel =
    user?.role === 'admin' || user?.role === 'head_admin'
      ? 'Admin'
      : user?.role === 'visitor'
      ? 'Visitor'
      : 'Subcon'

  if (userLoading) {
    return (
      <div className='flex-1 flex items-center justify-center'>
        <div className='flex flex-col items-center gap-4 text-center'>
          <span className='loading loading-spinner loading-lg text-primaryColor' />
          <p className='text-gray-500 text-sm font-medium'>
            Loading content...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='flex-1 flex flex-col gap-4 sm:gap-6'>
      {/* ── Page heading ──────────────────────────────────────────────── */}
      <div>
        <h1 className='font-bold text-lg sm:text-xl md:text-2xl text-gray-800'>
          My Profile
        </h1>
        <p className='text-xs text-gray-400 mt-0.5'>
          View and manage your personal information
        </p>
      </div>

      {/* ── Split layout ──────────────────────────────────────────────── */}
      <div className='flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6 min-h-0'>
        {/* ══ LEFT — dark identity panel ════════════════════════════════ */}
        <div
          className='relative flex flex-col overflow-hidden rounded-2xl lg:w-72 shrink-0 p-6 sm:p-8 max-lg:pb-8'
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
              background: 'radial-gradient(circle, #475569 0%, transparent 70%)'
            }}
          />
          <div
            className='absolute -bottom-12 -left-12 w-44 h-44 rounded-full opacity-10 pointer-events-none'
            style={{
              background: 'radial-gradient(circle, #334155 0%, transparent 70%)'
            }}
          />

          {/* Avatar + name — horizontal on mobile/tablet, vertical on desktop */}
          <div className='relative z-10 flex flex-col items-center gap-3 max-lg:flex-row max-lg:gap-4'>
            <div
              className={clsx(
                'w-32 h-32 rounded-2xl overflow-hidden relative border-2 transition-all shrink-0',
                'max-lg:w-16 max-lg:h-16 max-lg:rounded-xl',
                isEditMode
                  ? 'border-dashed border-white/40 hover:border-white/70 cursor-pointer group'
                  : 'border-white/20'
              )}
            >
              <img
                src={previewImage || user?.imageUrl || no_image}
                alt={user?.firstname}
                className={clsx(
                  'w-full h-full object-cover object-center transition-opacity',
                  { 'opacity-10': !previewImage && !user?.imageUrl }
                )}
              />
              {isEditMode && (
                <>
                  <div className='absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white gap-1'>
                    <RiFolderUploadLine className='text-2xl max-lg:text-base' />
                    <span className='text-xs font-medium max-lg:hidden'>
                      Change
                    </span>
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

            <div className='text-center max-lg:text-left'>
              <h3 className='text-white font-bold text-base max-lg:text-sm leading-tight capitalize'>
                {user?.firstname} {user?.lastname}
              </h3>
              <span
                className={clsx(
                  'inline-flex mt-1.5 px-3 py-1 rounded-full text-xxs font-semibold border capitalize',
                  userStatusStyles[user?.status] ||
                    'bg-gray-100 text-gray-500 border-gray-200'
                )}
              >
                {user?.status}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className='relative z-10 w-full h-px bg-white/10 my-5 max-lg:hidden' />

          {/* Stats — desktop only */}
          <div className='relative z-10 flex max-lg:hidden'>
            <StatBadge
              icon={FaSignInAlt}
              value={user?.loginCount ?? 0}
              label='Logins'
            />
            <div className='w-px bg-white/10' />
            <StatBadge icon={FaUser} value={roleLabel} label='Role' />
            <div className='w-px bg-white/10' />
            <StatBadge
              icon={FaPhoneAlt}
              value={user?.phoneNo ? '✓' : '—'}
              label='Contact'
            />
          </div>

          {/* Divider */}
          <div className='relative z-10 w-full h-px bg-white/10 my-5 max-lg:my-4' />

          {/* Meta info */}
          <div className='relative z-10 flex justify-between'>
            <div>
              <p className='text-white/40 text-xxs uppercase tracking-wider font-semibold mb-0.5'>
                {user?.role === 'admin' || user?.role === 'head_admin'
                  ? 'Created'
                  : 'Requested'}
              </p>
              <p className='text-white/70 text-xs max-lg:text-xxs'>
                {user?.createdAt
                  ? DateTime.fromISO(user.createdAt).toFormat('MMM d, yyyy')
                  : '—'}
              </p>
            </div>
            <div className='text-right'>
              <p className='text-white/40 text-xxs uppercase tracking-wider font-semibold mb-0.5'>
                Last Login
              </p>
              <p className='text-white/70 text-xs max-lg:text-xxs'>
                {user?.lastLogin
                  ? DateTime.fromISO(user.lastLogin).toFormat('MMM d, yyyy')
                  : '—'}
              </p>
            </div>
          </div>

          {/* Edit mode indicator — desktop */}
          <div
            className='relative z-10 mt-5 flex items-center gap-2 bg-orange-500/20 border border-orange-400/30 rounded-xl px-3 py-2 max-lg:hidden'
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

          {/* Edit mode indicator — mobile/tablet floating pill */}
          <div
            className='absolute top-3 right-3 z-10 lg:hidden flex items-center gap-1.5 bg-orange-500/20 border border-orange-400/30 rounded-full px-2.5 py-1'
            style={{
              opacity: isEditMode ? 1 : 0,
              transition: 'opacity 500ms cubic-bezier(0.4,0,0.2,1)',
              pointerEvents: isEditMode ? 'auto' : 'none'
            }}
          >
            <span className='w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse shrink-0' />
            <p className='text-orange-300 text-xxs font-semibold uppercase tracking-wide whitespace-nowrap'>
              Editing
            </p>
          </div>
        </div>

        {/* ══ RIGHT — form panel ════════════════════════════════════════ */}
        <div className='flex-1 flex flex-col min-w-0 border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm'>
          {/* Header */}
          <div className='px-6 pt-5 pb-4 max-sm:px-4 max-sm:pt-4 max-sm:pb-3 border-b border-gray-100 shrink-0'>
            <h2 className='text-gray-900 font-bold text-lg max-sm:text-base'>
              Account Details
            </h2>
            <p className='text-gray-400 text-xs mt-0.5'>
              {isEditMode
                ? 'Make your changes then hit Save.'
                : 'Your personal and account information.'}
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleUpdateUser}
            className='flex-1 flex flex-col min-h-0'
          >
            <div className='flex-1 overflow-y-auto px-6 py-5 max-sm:px-4 max-sm:pt-4 grid grid-cols-2 gap-x-4 gap-y-4 max-sm:gap-x-3 max-sm:gap-y-3 content-start'>
              <InputField
                label='First Name'
                type='text'
                name='firstname'
                placeholder='First name'
                value={editForm?.firstname || ''}
                disabled={!isEditMode || isLoading}
                onChange={handleChange}
              />
              <InputField
                label='Last Name'
                type='text'
                name='lastname'
                placeholder='Last name'
                value={editForm?.lastname || ''}
                disabled={!isEditMode || isLoading}
                onChange={handleChange}
              />
              <InputField
                label='Email'
                type='email'
                name='email'
                placeholder='Email address'
                value={editForm?.email || ''}
                disabled={!isEditMode || isLoading}
                onChange={handleChange}
                isCapitalize={false}
              />
              <InputField
                label='Phone No.'
                type='tel'
                name='phoneNo'
                placeholder='Phone No.'
                value={editForm?.phoneNo || ''}
                disabled={!isEditMode || isLoading}
                onChange={handleChange}
              />
              <InputField
                label='Role'
                type='text'
                name='role'
                placeholder='Role'
                value={editForm?.role?.replace(/_/g, ' ') || ''}
                disabled
                onChange={handleChange}
                isRequired={false}
              />
              <InputField
                label='Login Count'
                type='number'
                name='loginCount'
                value={user?.loginCount ?? 0}
                disabled
                onChange={handleChange}
                isRequired={false}
              />

              {/* Password fields — animated reveal */}
              <div
                className={clsx(
                  'col-span-2 grid grid-cols-2 gap-x-4 max-sm:gap-x-3 overflow-hidden',
                  !isEditMode && 'pointer-events-none'
                )}
                style={{
                  maxHeight: isEditMode ? '120px' : '0px',
                  opacity: isEditMode ? 1 : 0,
                  transition:
                    'max-height 600ms cubic-bezier(0.4,0,0.2,1), opacity 500ms cubic-bezier(0.4,0,0.2,1)'
                }}
              >
                <InputField
                  label='New Password'
                  type='password'
                  name='password'
                  placeholder='New password'
                  value={editForm?.password || ''}
                  disabled={!isEditMode || isLoading}
                  onChange={handleChange}
                  isRequired={false}
                  isCapitalize={false}
                />
                <InputField
                  label='Confirm Password'
                  type='password'
                  name='confirmPassword'
                  placeholder='Confirm password'
                  value={editForm?.confirmPassword || ''}
                  disabled={!isEditMode || isLoading}
                  onChange={handleChange}
                  isRequired={false}
                  isCapitalize={false}
                />
              </div>

              {/* Timestamps */}
              <div className='col-span-2 grid grid-cols-2 gap-x-4 max-sm:gap-x-3 pt-3 mt-1 border-t border-dashed border-gray-100'>
                <label className='flex flex-col gap-1.5'>
                  <span className='text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                    {user?.role === 'admin' || user?.role === 'head_admin'
                      ? 'Created At'
                      : 'Requested At'}
                  </span>
                  <div className='flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 max-sm:px-3 max-sm:py-2.5 shadow-sm'>
                    <p className='text-sm max-sm:text-xs text-gray-500 truncate'>
                      {user?.createdAt
                        ? DateTime.fromISO(user.createdAt).toLocaleString(
                            DateTime.DATETIME_MED
                          )
                        : '—'}
                    </p>
                  </div>
                </label>
                <label className='flex flex-col gap-1.5'>
                  <span className='text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                    Updated At
                  </span>
                  <div className='flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 max-sm:px-3 max-sm:py-2.5 shadow-sm'>
                    <p className='text-sm max-sm:text-xs text-gray-500 truncate'>
                      {user?.updatedAt
                        ? DateTime.fromISO(user.updatedAt).toLocaleString(
                            DateTime.DATETIME_MED
                          )
                        : '—'}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* ── Actions ── */}
            {['head_admin', 'admin'].includes(user?.role) && (
              <div className='px-6 pb-5 pt-4 max-sm:px-4 max-sm:pb-4 border-t border-gray-100 shrink-0'>
                {isEditMode ? (
                  <div className='flex gap-3 max-sm:gap-2'>
                    <button
                      type='button'
                      onClick={handleCancelEditMode}
                      disabled={isLoading}
                      className='px-8 py-2.5 rounded-xl font-semibold text-sm max-sm:text-xs uppercase tracking-wide
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
                  <div className='flex gap-3 max-sm:gap-2'>
                    <button
                      type='button'
                      onClick={() => setIsEditMode(true)}
                      disabled={isLoading}
                      className='px-8 py-2.5 rounded-xl font-semibold text-white text-sm max-sm:text-xs uppercase tracking-wide
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
                  </div>
                )}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

export default MyProfile
