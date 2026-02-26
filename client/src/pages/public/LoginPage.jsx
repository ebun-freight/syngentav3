import React, { useEffect, useState } from 'react'
import { FaLock, FaUser } from 'react-icons/fa'
import useLogin from '../../hooks/useLogin'
import { Link } from 'react-router'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { ebun_logo_light } from '../../consts/images'

/* ─── Decorative SVG grid/dot pattern ───────────────────────────────────── */
const DotPattern = () => (
  <svg
    className='absolute inset-0 w-full h-full opacity-10'
    xmlns='http://www.w3.org/2000/svg'
  >
    <defs>
      <pattern
        id='dots'
        x='0'
        y='0'
        width='24'
        height='24'
        patternUnits='userSpaceOnUse'
      >
        <circle cx='2' cy='2' r='1.5' fill='white' />
      </pattern>
    </defs>
    <rect width='100%' height='100%' fill='url(#dots)' />
  </svg>
)

/* ─── Stat badge used in the brand panel ────────────────────────────────── */
const StatBadge = ({ value, label }) => (
  <div className='flex flex-col items-center'>
    <span className='text-white font-bold text-2xl leading-none'>{value}</span>
    <span className='text-white/60 text-xs mt-0.5 text-center'>{label}</span>
  </div>
)

function LoginPage () {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const { loginFunction, isLoading } = useLogin()

  const handleChange = e => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    await loginFunction(formData)
  }

  useEffect(() => {
    sessionStorage.removeItem('userToken')
    AOS.init({ duration: 800, once: true, easing: 'ease-out-cubic' })
  }, [])

  return (
    <div className='min-h-screen flex flex-col lg:flex-row bg-gray-50'>
      {/* ── Brand Panel (left on desktop, top banner on mobile) ─────────── */}
      <div
        className='relative flex flex-col justify-between overflow-hidden
                   lg:w-[45%] lg:min-h-screen
                   p-8 sm:p-10 lg:p-14'
        style={{
          background:
            'linear-gradient(155deg, #020617 0%, #001e36 55%, #0f172a 100%)'
        }}
      >
        <DotPattern />

        {/* Decorative circle blur */}
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
          className='relative z-10 flex items-center justify-center gap-3 p-4 sm:p-6 border-b border-white/10'
        >
          <img src={ebun_logo_light} alt='' className='w-10 sm:w-14' />
          <div>
            <h1 className='font-semibold text-3xl sm:text-4xl tracking-widest text-white uppercase'>
              EBUN
            </h1>
            <p className='max-sm:text-xs text-white -mt-1.5 uppercase tracking-widest sm:tracking-wider sm:ml-0.5 text-nowrap whitespace-nowrap'>
              Freight OPC
            </p>
          </div>
        </div>

        {/* Centre copy — hidden on small mobile, shown sm+ */}
        <div
          data-aos='fade-right'
          data-aos-delay='100'
          className='relative z-10 hidden sm:block'
        >
          <div className='w-10 h-0.5 bg-white/40 mb-6' />
          <h2 className='text-white font-bold text-3xl lg:text-4xl leading-tight max-w-xs'>
            Smarter Freight.
            <br />
            <span className='text-slate-300'>Safer Roads.</span>
          </h2>
          <p className='mt-4 text-white/60 text-sm leading-relaxed max-w-xs'>
            "Where Safety Leads, Technology Drives, and Community Thrives"
          </p>
        </div>

        {/* Stats row — hidden on small mobile */}
        <div
          data-aos='fade-up'
          data-aos-delay='200'
          className='relative z-10 hidden sm:flex items-center gap-8
                     border-t border-white/20 pt-6'
        >
          <StatBadge value='100+' label='Daily Trips' />
          <div className='w-px h-8 bg-white/20' />
          <StatBadge value='24/7' label='Operations' />
          <div className='w-px h-8 bg-white/20' />
          <StatBadge value='99%' label='On-Time Rate' />
        </div>

        {/* Mobile: compact tagline only */}
        <p className='relative z-10 sm:hidden text-white/60 text-xs italic mt-4 text-center'>
          "Where Safety Leads, Technology Drives, and Community Thrives"
        </p>
      </div>

      {/* ── Form Panel (right on desktop, below brand on mobile) ─────────── */}
      <div className='flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16'>
        <div data-aos='fade-left' className='w-full max-w-md'>
          {/* Heading */}
          <div className='mb-8'>
            <h2 className='text-gray-900 font-bold text-2xl sm:text-3xl'>
              Welcome back
            </h2>
            <p className='text-gray-500 text-sm mt-1'>
              Sign in to your Ebun account to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className='space-y-5'>
            {/* Email */}
            <div>
              <label className='block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5'>
                Email Address
              </label>
              <div
                className='group flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3.5
                              focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20
                              transition-all duration-200 shadow-sm'
              >
                <FaUser className='text-gray-400 group-focus-within:text-primaryColor transition-colors shrink-0 text-sm' />
                <input
                  type='email'
                  name='email'
                  value={formData.email}
                  onChange={handleChange}
                  placeholder='you@example.com'
                  required
                  className='flex-1 text-sm text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none'
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className='flex items-center justify-between mb-1.5'>
                <label className='block text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                  Password
                </label>
              </div>
              <div
                className='group flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3.5
                              focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20
                              transition-all duration-200 shadow-sm'
              >
                <FaLock className='text-gray-400 group-focus-within:text-primaryColor transition-colors shrink-0 text-sm' />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name='password'
                  value={formData.password}
                  onChange={handleChange}
                  placeholder='••••••••'
                  required
                  className='flex-1 text-sm text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none'
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(p => !p)}
                  className='text-gray-400 hover:text-primaryColor transition-colors text-xs font-medium shrink-0 select-none'
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type='submit'
              disabled={isLoading}
              className='w-full mt-2 py-3.5 rounded-xl font-semibold text-white text-sm
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
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
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
          </form>

          {/* Footer */}
          <p className='text-gray-500 mt-6 text-sm text-center'>
            Don&apos;t have an account?{' '}
            <Link
              to='/signup'
              className='text-primaryColor font-semibold hover:underline underline-offset-2'
            >
              Sign up
            </Link>
          </p>

          <p className='text-gray-400 text-xs text-center mt-8'>
            © {new Date().getFullYear()} Ebun Freight OPC. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
