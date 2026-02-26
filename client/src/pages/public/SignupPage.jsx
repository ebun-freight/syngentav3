import React, { useEffect, useState } from 'react'
import {
  FaLock,
  FaUser,
  FaClock,
  FaUserCheck,
  FaCheckCircle
} from 'react-icons/fa'
import { LuUpload } from 'react-icons/lu'
import { Link, useNavigate } from 'react-router'
import axios from 'axios'
import { API_USER } from '../../utils/APIRoutes'
import { toast } from 'react-toastify'
import { ebun_logo_light, signup_bg } from '../../consts/images'
import clsx from 'clsx'
import useCreateUser from '../../hooks/userCreateUser'
import AOS from 'aos'
import 'aos/dist/aos.css'

/* ─── Decorative SVG dot pattern (reused from LoginPage) ────────────────── */
const DotPattern = () => (
  <svg
    className='absolute inset-0 w-full h-full opacity-10'
    xmlns='http://www.w3.org/2000/svg'
  >
    <defs>
      <pattern
        id='dots-signup'
        x='0'
        y='0'
        width='24'
        height='24'
        patternUnits='userSpaceOnUse'
      >
        <circle cx='2' cy='2' r='1.5' fill='white' />
      </pattern>
    </defs>
    <rect width='100%' height='100%' fill='url(#dots-signup)' />
  </svg>
)

/* ─── Step item in the brand panel ─────────────────────────────────────── */
const Step = ({ icon: Icon, title, desc }) => (
  <div className='flex items-start gap-3'>
    <div className='bg-white/15 p-2 rounded-lg mt-0.5 shrink-0 border border-white/10'>
      <Icon className='text-sm text-white' />
    </div>
    <div>
      <h3 className='font-semibold text-white text-sm leading-snug'>{title}</h3>
      <p className='text-white/55 text-xs mt-0.5 leading-relaxed'>{desc}</p>
    </div>
  </div>
)

/* ─── Input field ───────────────────────────────────────────────────────── */
const InputField = ({
  label,
  type,
  name,
  value,
  placeholder,
  pattern,
  onChange,
  disabled,
  phoneMaxLength,
  isRequired = true,
  isCapitalize = true,
  isUppercase = false,
  showToggle = false,
  onToggle,
  showValue
}) => (
  <label className='flex flex-col gap-1.5'>
    <span className='text-xs font-semibold text-gray-600 uppercase tracking-wider'>
      {label} {isRequired && <span className='text-slate-400'>*</span>}
    </span>
    <div
      className={clsx(
        'group flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 min-w-0',
        'focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20',
        'transition-all duration-200 shadow-sm',
        { 'opacity-60 cursor-not-allowed': disabled }
      )}
    >
      <input
        type={showToggle ? (showValue ? 'text' : 'password') : type}
        name={name}
        value={value}
        placeholder={placeholder}
        minLength={type === 'password' ? 8 : 2}
        maxLength={phoneMaxLength || 30}
        pattern={pattern}
        onChange={onChange}
        disabled={disabled}
        required={isRequired}
        className={clsx(
          'min-w-0 flex-1 text-sm text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none',
          { capitalize: isCapitalize, uppercase: isUppercase }
        )}
      />
      {showToggle && (
        <button
          type='button'
          onClick={onToggle}
          className='text-gray-400 hover:text-primaryColor transition-colors text-xs font-medium shrink-0 select-none'
        >
          {showValue ? 'Hide' : 'Show'}
        </button>
      )}
    </div>
  </label>
)

function SignupPage () {
  const navigate = useNavigate()
  const [previewImage, setPreviewImage] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const { createUserFunction, isLoading } = useCreateUser()

  const [formData, setFormData] = useState({
    firstname: '',
    middlename: '',
    lastname: '',
    email: '',
    phoneNo: '',
    role: 'visitor',
    status: 'pending',
    password: '',
    confirmPassword: '',
    image: {}
  })

  const handleChange = e => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = e => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        setPreviewImage(reader.result)
        setFormData(prev => ({ ...prev, image: file }))
      }
      reader.readAsDataURL(file)
    } else {
      setPreviewImage(null)
      setFormData(prev => ({ ...prev, image: null }))
    }
  }

  const handleRequestAccess = async e => {
    e.preventDefault()
    const result = await createUserFunction(formData)
    if (result.user) {
      toast.success(result.message)
      navigate('/')
    } else {
      toast.error(result)
    }
  }

  useEffect(() => {
    AOS.init({ duration: 800, once: true, easing: 'ease-out-cubic' })
  }, [])

  return (
    <div className='min-h-screen flex flex-col lg:flex-row bg-gray-50 overflow-x-hidden'>
      {/* ── Brand Panel ──────────────────────────────────────────────────── */}
      <div
        className='relative flex flex-col justify-between overflow-hidden
                   lg:w-[38%] lg:min-h-screen p-8 sm:p-10 lg:p-12'
        style={{
          background:
            'linear-gradient(155deg, #020617 0%, #001e36 55%, #0f172a 100%)'
        }}
      >
        <DotPattern />

        {/* Radial glows — slate only */}
        <div
          className='absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-10 pointer-events-none'
          style={{
            background: 'radial-gradient(circle, #475569 0%, transparent 70%)'
          }}
        />
        <div
          className='absolute -bottom-16 -left-16 w-64 h-64 rounded-full opacity-10 pointer-events-none'
          style={{
            background: 'radial-gradient(circle, #334155 0%, transparent 70%)'
          }}
        />

        {/* Logo */}
        <div
          data-aos='fade-right'
          className='relative z-10 flex items-center justify-center gap-3 pb-6 border-b border-white/10'
        >
          <img src={ebun_logo_light} alt='' className='w-10 sm:w-14' />
          <div>
            <h1 className='font-semibold text-3xl sm:text-4xl tracking-widest text-white uppercase'>
              EBUN
            </h1>
            <p className='max-sm:text-xs text-white -mt-1.5 uppercase tracking-widest sm:tracking-wider sm:ml-0.5'>
              Freight OPC
            </p>
          </div>
        </div>

        {/* Steps */}
        <div
          data-aos='fade-right'
          data-aos-delay='100'
          className='relative z-10 flex-1 flex flex-col justify-center py-8 space-y-6'
        >
          <div className='mb-2'>
            <div className='w-8 h-0.5 bg-white/30 mb-4' />
            <h2 className='text-white font-bold text-xl sm:text-2xl leading-tight'>
              Create Your
              <br />
              <span className='text-slate-300'>Account</span>
            </h2>
            <p className='text-white/50 text-xs mt-2'>
              Follow these steps to get started.
            </p>
          </div>

          <Step
            icon={FaUser}
            title='Fill Registration Form'
            desc='Provide your personal information including name, email, and contact details.'
          />
          <Step
            icon={FaClock}
            title='Wait for Approval'
            desc='Your account will be in pending status while our admin team reviews your registration.'
          />
          <Step
            icon={FaUserCheck}
            title='Admin Verification'
            desc='Admins will verify your information and approve your account within 24–48 hours.'
          />
          <Step
            icon={FaCheckCircle}
            title='Get Started'
            desc="Once approved, you'll receive an email notification and can start using the platform."
          />
        </div>

        {/* Footer note */}
        <div
          data-aos='fade-up'
          data-aos-delay='200'
          className='relative z-10 pt-6 border-t border-white/10'
        >
          <p className='text-xs text-white/40 text-center'>
            <span className='font-semibold text-white/60'>
              Secure &amp; Confidential:
            </span>{' '}
            Your information is protected with enterprise-grade security.
          </p>
        </div>
      </div>

      {/* ── Form Panel ───────────────────────────────────────────────────── */}
      <div className='flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-12'>
        <div data-aos='fade-left' className='w-full max-w-2xl'>
          {/* Heading */}
          <div className='mb-6'>
            <h2 className='text-gray-900 font-bold text-2xl sm:text-3xl'>
              Create an account
            </h2>
            <p className='text-gray-500 text-sm mt-1'>
              Complete the form below to request access.
            </p>
          </div>

          <form onSubmit={handleRequestAccess} className='space-y-5'>
            {/* Avatar + Name row */}
            <div className='flex flex-col sm:flex-row gap-5 items-start'>
              {/* Avatar upload */}
              <div className='flex flex-col gap-1.5 shrink-0'>
                <span className='text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                  Photo
                </span>
                <div className='w-28 h-28 relative border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-gray-50 hover:border-primaryColor transition-colors group'>
                  <input
                    type='file'
                    accept='image/*'
                    onChange={handleFileChange}
                    className='absolute inset-0 opacity-0 cursor-pointer z-10'
                  />
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt=''
                      className='w-full h-full object-cover'
                    />
                  ) : (
                    <div className='flex flex-col items-center justify-center h-full gap-1.5 text-gray-400 group-hover:text-primaryColor transition-colors'>
                      <LuUpload className='text-2xl' />
                      <p className='text-xs font-medium text-center px-1 leading-tight'>
                        Upload photo
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* First / Last name */}
              <div className='flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full'>
                <InputField
                  label='First Name'
                  type='text'
                  name='firstname'
                  placeholder='First name'
                  value={formData.firstname}
                  onChange={handleChange}
                />
                <InputField
                  label='Last Name'
                  type='text'
                  name='lastname'
                  placeholder='Last name'
                  value={formData.lastname}
                  onChange={handleChange}
                />
                <InputField
                  label='Email'
                  type='email'
                  name='email'
                  placeholder='you@example.com'
                  value={formData.email}
                  onChange={handleChange}
                  isCapitalize={false}
                />
                <InputField
                  label='Phone No.'
                  type='tel'
                  name='phoneNo'
                  placeholder='09XXXXXXXXX'
                  pattern='^(09|\+639)\d{9}$'
                  value={formData.phoneNo}
                  onChange={handleChange}
                  phoneMaxLength={11}
                />
              </div>
            </div>

            {/* Password row */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <InputField
                label='Password'
                type='password'
                name='password'
                placeholder='Min. 8 characters'
                value={formData.password}
                onChange={handleChange}
                showToggle
                showValue={showPassword}
                onToggle={() => setShowPassword(p => !p)}
              />
              <InputField
                label='Confirm Password'
                type='password'
                name='confirmPassword'
                placeholder='Re-enter password'
                value={formData.confirmPassword}
                onChange={handleChange}
                showToggle
                showValue={showConfirm}
                onToggle={() => setShowConfirm(p => !p)}
              />
            </div>

            {/* Submit */}
            <div className='pt-2'>
              <button
                type='submit'
                disabled={isLoading}
                className='w-full py-3.5 rounded-xl font-semibold text-white text-sm
                           shadow-md hover:shadow-lg hover:brightness-105 active:scale-[0.99]
                           transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed
                           flex items-center justify-center gap-2.5'
                style={{
                  background:
                    'linear-gradient(135deg, #020617 0%, #001e36 60%, #0f172a 100%)'
                }}
              >
                {isLoading ? (
                  <>
                    <span className='loading loading-spinner loading-sm' />
                    <span>Submitting Registration...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <svg
                      className='w-4 h-4'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        d='M13 7l5 5m0 0l-5 5m5-5H6'
                      />
                    </svg>
                  </>
                )}
              </button>

              <p className='text-gray-500 mt-4 text-sm text-center'>
                Already have an account?{' '}
                <Link
                  to='/'
                  className='text-primaryColor font-semibold hover:underline underline-offset-2'
                >
                  Sign In
                </Link>
              </p>

              <p className='text-gray-400 text-xs text-center mt-6'>
                © {new Date().getFullYear()} Ebun Freight OPC. All rights
                reserved.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default SignupPage
