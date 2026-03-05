import { ebun_logo_light } from '../consts/images'

const AuthLoader = () => (
  <div
    className='fixed inset-0 z-9999 flex flex-col items-center justify-center gap-8'
    style={{
      background:
        'linear-gradient(155deg, #020617 0%, #001e36 55%, #0f172a 100%)'
    }}
  >
    {/* Dot pattern overlay */}
    <svg
      className='absolute inset-0 w-full h-full opacity-10 pointer-events-none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <defs>
        <pattern
          id='dots-auth'
          x='0'
          y='0'
          width='24'
          height='24'
          patternUnits='userSpaceOnUse'
        >
          <circle cx='2' cy='2' r='1.5' fill='white' />
        </pattern>
      </defs>
      <rect width='100%' height='100%' fill='url(#dots-auth)' />
    </svg>

    {/* Radial glows */}
    <div
      className='absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10 pointer-events-none'
      style={{
        background: 'radial-gradient(circle, #475569 0%, transparent 70%)'
      }}
    />
    <div
      className='absolute -bottom-20 -left-20 w-72 h-72 rounded-full opacity-10 pointer-events-none'
      style={{
        background: 'radial-gradient(circle, #334155 0%, transparent 70%)'
      }}
    />

    {/* Logo */}
    <div className='relative z-10 flex items-center gap-3'>
      <img src={ebun_logo_light} alt='' className='w-10 sm:w-12' />
      <div>
        <h1 className='font-semibold text-2xl sm:text-3xl tracking-widest text-white uppercase'>
          EBUN
        </h1>
        <p className='text-white/60 text-xxs sm:text-xs -mt-1 uppercase tracking-widest'>
          Freight OPC
        </p>
      </div>
    </div>

    {/* Spinner + text */}
    <div className='relative z-10 flex flex-col items-center gap-4'>
      <div className='relative w-12 h-12 sm:w-14 sm:h-14'>
        <svg
          className='absolute inset-0 w-full h-full animate-spin'
          style={{ animationDuration: '1.1s' }}
          viewBox='0 0 56 56'
          fill='none'
        >
          <circle
            cx='28'
            cy='28'
            r='22'
            stroke='rgba(255,255,255,0.1)'
            strokeWidth='4'
          />
          <circle
            cx='28'
            cy='28'
            r='22'
            stroke='url(#auth-lg)'
            strokeWidth='4'
            strokeLinecap='round'
            strokeDasharray='90 50'
          />
          <defs>
            <linearGradient id='auth-lg' x1='0%' y1='0%' x2='100%' y2='0%'>
              <stop offset='0%' stopColor='#10b981' />
              <stop offset='100%' stopColor='#059669' stopOpacity='0.2' />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className='text-center'>
        <p className='text-white font-semibold text-sm tracking-wide'>
          Authenticating...
        </p>
        <p className='text-white/40 text-xs mt-0.5'>Please wait a moment</p>
      </div>

      <div className='flex items-center gap-1.5'>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className='w-1 h-1 rounded-full bg-emerald-500 animate-bounce'
            style={{
              animationDelay: `${i * 0.18}s`,
              animationDuration: '0.9s'
            }}
          />
        ))}
      </div>
    </div>
  </div>
)

export default AuthLoader
