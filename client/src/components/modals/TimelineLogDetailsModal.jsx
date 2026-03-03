import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild
} from '@headlessui/react'
import clsx from 'clsx'
import { IoClose } from 'react-icons/io5'
import { useEffect, useState, useRef } from 'react'
import { DateTime } from 'luxon'
import { HiDotsHorizontal } from 'react-icons/hi'
import { NumericFormat } from 'react-number-format'
import { PiMapPinAreaFill } from 'react-icons/pi'
import { FaCalendar } from 'react-icons/fa'

// ── DOT PATTERN ────────────────────────────────────────────────────────────────

const DotPattern = () => (
  <svg
    className='absolute inset-0 w-full h-full opacity-10 pointer-events-none'
    xmlns='http://www.w3.org/2000/svg'
  >
    <defs>
      <pattern
        id='dots-timeline-log'
        x='0'
        y='0'
        width='20'
        height='20'
        patternUnits='userSpaceOnUse'
      >
        <circle cx='2' cy='2' r='1.2' fill='white' />
      </pattern>
    </defs>
    <rect width='100%' height='100%' fill='url(#dots-timeline-log)' />
  </svg>
)

// ── STATUS COLORS ──────────────────────────────────────────────────────────────

const statusColorMap = {
  preparing: 'bg-orange-50 text-orange-600 border-orange-100',
  ongoing: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  completed: 'bg-blue-50 text-blue-600 border-blue-100',
  canceled: 'bg-red-50 text-red-600 border-red-100'
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────

function TimelineLogDetailsModal ({
  isOpen,
  onClose,
  deployment,
  openReplacementHistory,
  timelineLog
}) {
  const [timelineDetails, setTimelineDetails] = useState({})
  const [isReplacementShow, setIsReplacementShow] = useState(false)
  const [activeTab, setActiveTab] = useState('info')

  useEffect(() => {
    if (isOpen && timelineLog) {
      setTimelineDetails(timelineLog)
      setActiveTab('info')
    }
  }, [isOpen, timelineLog])

  useEffect(() => {
    if (timelineLog?.targetDeployment?.replacement?.replacementTruckId?._id) {
      setIsReplacementShow(true)
    } else {
      setIsReplacementShow(false)
    }
  }, [timelineLog, isOpen])

  const targetDeployment = timelineDetails?.targetDeployment || {}
  const pickups = targetDeployment?.pickups || []
  const lastPickupOut = pickups[pickups.length - 1]?.pickupOut

  return (
    <Dialog open={isOpen} onClose={onClose} className='relative z-50'>
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
          <DialogPanel className='font-poppins text-gray-900 w-full max-w-6xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col lg:flex-row h-[72vh]'>
            {/* ══ LEFT PANEL ════════════════════════════════════════════════════ */}
            <div
              className='relative flex flex-col overflow-hidden lg:w-72 shrink-0 max-sm:p-5 pb-4'
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

              {/* Icon + status */}
              <div className='relative z-10 flex items-center gap-3 p-8 pb-4 max-sm:gap-4 max-sm:p-0'>
                <div className='w-18 h-18 rounded-2xl flex items-center justify-center border-2 border-dashed border-white/40 max-sm:w-14 max-sm:h-14 max-sm:rounded-xl shrink-0 bg-white/5'>
                  <PiMapPinAreaFill className='text-white/60 text-4xl max-sm:text-2xl' />
                </div>
                <div className='text-left'>
                  <p className='text-white font-bold text-base max-sm:text-sm leading-tight'>
                    Transport Log
                  </p>
                  <span
                    className={clsx(
                      'inline-flex mt-1.5 px-3 py-1 rounded-full text-xxs font-semibold border capitalize',
                      statusColorMap[targetDeployment?.status] ||
                        'bg-gray-50 text-gray-600 border-gray-100'
                    )}
                  >
                    {targetDeployment?.status || '—'}
                  </span>
                </div>
              </div>

              {/* Meta info */}
              <div className='relative z-10 px-8 max-sm:px-0 max-sm:mt-3 sm:max-lg:pb-4'>
                {/* sm+: stacked rows */}
                <div className='hidden md:flex flex-col gap-1'>
                  <div className='flex items-center justify-between gap-2'>
                    <span className='text-white/40 text-xxs uppercase tracking-wider font-semibold'>
                      DP Code
                    </span>
                    <span className='text-white/70 text-xs font-mono font-medium truncate max-w-32'>
                      #{targetDeployment?.deploymentCode}
                    </span>
                  </div>
                  <div className='flex items-center justify-between gap-2'>
                    <span className='text-white/40 text-xxs uppercase tracking-wider font-semibold'>
                      Stops
                    </span>
                    <span className='text-white/70 text-xs font-medium'>
                      {pickups.length} {pickups.length === 1 ? 'stop' : 'stops'}
                    </span>
                  </div>
                </div>

                {/* xs: 2-column grid */}
                <div className='md:hidden flex justify-between gap-x-4 gap-y-2.5'>
                  <div className='flex flex-col gap-0.5'>
                    <span className='text-white/40 text-xxs uppercase tracking-wider font-semibold'>
                      DP Code
                    </span>
                    <span className='text-white/70 text-xxs sm:text-xs font-mono font-medium truncate'>
                      #{targetDeployment?.deploymentCode}
                    </span>
                  </div>
                  <div className='flex flex-col gap-0.5'>
                    <span className='text-white/40 text-xxs uppercase tracking-wider font-semibold'>
                      Stops
                    </span>
                    <span className='text-white/70 text-xxs sm:text-xs font-medium'>
                      {pickups.length} {pickups.length === 1 ? 'stop' : 'stops'}
                    </span>
                  </div>
                  <div className='flex flex-col gap-0.5'>
                    <span className='text-white/40 text-xxs uppercase tracking-wider font-semibold'>
                      Assigned
                    </span>
                    <span className='text-white/70 text-xxs sm:text-xs font-medium'>
                      {targetDeployment?.createdAt
                        ? DateTime.fromISO(targetDeployment.createdAt)
                            .setZone('Asia/Manila')
                            .toFormat('MMM d, yyyy')
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className='relative z-10 w-full h-px bg-white/10 my-4 mx-auto max-lg:hidden' />

              {/* Dark timeline — desktop only */}
              <div className='relative z-10 flex-1 overflow-y-auto px-8 pb-4 max-lg:hidden [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/30 [scrollbar-color:rgba(255,255,255,0.2)_transparent] scrollbar-thin'>
                <div className='flex flex-col'>
                  <DarkTimelineStop
                    isActive={!!targetDeployment?.departed?.trim()}
                    isLast={false}
                  >
                    <DarkTimelineDisplay
                      label='Departed'
                      value={targetDeployment?.departed}
                    />
                  </DarkTimelineStop>

                  {pickups.map((pickup, index) => {
                    const prevPickupOut =
                      index === 0
                        ? targetDeployment?.departed
                        : pickups[index - 1]?.pickupOut
                    const multiStop = pickups.length > 1
                    return (
                      <div key={index}>
                        {multiStop && (
                          <DarkTimelineLabel
                            isActive={!!prevPickupOut}
                            label={`Stop #${index + 1}`}
                          />
                        )}
                        <DarkTimelineStop
                          isActive={!!pickup.pickupIn?.trim()}
                          isLast={false}
                        >
                          <DarkTimelineDisplay
                            label='Pick-up In'
                            value={pickup.pickupIn}
                          />
                        </DarkTimelineStop>
                        <DarkTimelineStop
                          isActive={!!pickup.pickupOut?.trim()}
                          isLast={false}
                        >
                          <DarkTimelineDisplay
                            label='Pick-up Out'
                            value={pickup.pickupOut}
                          />
                        </DarkTimelineStop>
                      </div>
                    )
                  })}

                  <DarkTimelineStop
                    isActive={!!targetDeployment?.destArrival?.trim()}
                    isLast={false}
                  >
                    <DarkTimelineDisplay
                      label='Dest Arrival'
                      value={targetDeployment?.destArrival}
                    />
                  </DarkTimelineStop>

                  <DarkTimelineStop
                    isActive={!!targetDeployment?.destDeparture?.trim()}
                    isLast={false}
                  >
                    <DarkTimelineDisplay
                      label='Dest Departure'
                      value={targetDeployment?.destDeparture}
                    />
                  </DarkTimelineStop>

                  <DarkTimelineStop
                    isActive={!!targetDeployment?.destDeparture?.trim()}
                    isLast={true}
                  >
                    <UnloadingTimeDisplay
                      destArrival={targetDeployment?.destArrival}
                      destDeparture={targetDeployment?.destDeparture}
                      dark
                    />
                  </DarkTimelineStop>
                </div>
              </div>
            </div>

            {/* ══ RIGHT PANEL ══════════════════════════════════════════════════ */}
            <div className='flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden'>
              {/* Header */}
              <div className='flex items-start justify-between px-6 pt-5 pb-4 max-sm:px-4 max-sm:pt-4 max-sm:pb-3 border-b border-gray-100 shrink-0'>
                <div className='flex items-start gap-3 min-w-0'>
                  <div>
                    <h2 className='text-gray-900 font-bold text-lg max-sm:text-base'>
                      Deployment Details
                    </h2>
                    <p className='text-gray-400 text-xs mt-0.5'>
                      View deployment information.
                    </p>
                  </div>
                  <div
                    className='bg-gray-100 px-2 py-1 rounded-md text-sm font-medium relative cursor-copy shrink-0 max-md:hidden'
                    onClick={e => {
                      e.stopPropagation()
                      navigator.clipboard.writeText(
                        targetDeployment?.deploymentCode
                      )
                      const div = e.currentTarget
                      const tip = document.createElement('div')
                      tip.className =
                        'absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50'
                      tip.textContent = 'Copied'
                      div.appendChild(tip)
                      setTimeout(() => {
                        if (div.contains(tip)) div.removeChild(tip)
                      }, 1000)
                    }}
                    title='Click to copy'
                  >
                    #{targetDeployment?.deploymentCode}
                  </div>
                </div>

                <div className='flex items-center gap-2 shrink-0 ml-4'>
                  <div className='dropdown dropdown-bottom dropdown-end'>
                    <div
                      tabIndex={0}
                      role='button'
                      className='hover:bg-gray-100 p-1.5 rounded-lg text-xl text-gray-500 cursor-pointer transition-all'
                    >
                      <HiDotsHorizontal />
                    </div>
                    <ul
                      tabIndex={0}
                      className='dropdown-content menu shadow-sm rounded-box p-0 bg-white'
                    >
                      <li>
                        <div
                          onClick={openReplacementHistory}
                          className='px-6 py-2 text-nowrap cursor-pointer hover:bg-gray-50 bg-white border border-gray-200'
                        >
                          Replacement History
                        </div>
                      </li>
                    </ul>
                  </div>
                  <button
                    onClick={onClose}
                    className='text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg text-xl transition-all cursor-pointer'
                  >
                    <IoClose />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className='flex gap-0 border-b border-gray-100 px-6 max-sm:px-4 shrink-0 overflow-x-auto'>
                <TabButton
                  label='Deployment Info'
                  tab='info'
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                />
                <TabButton
                  label='Pickup Sites'
                  tab='pickups'
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                />
                {/* Timelines tab — only visible below lg */}
                <div className='lg:hidden'>
                  <TabButton
                    label='Timelines'
                    tab='timelines'
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                  />
                </div>

                <div className='ml-auto flex items-center max-md:hidden'>
                  <p className='text-xs text-gray-400 pr-3'>
                    Assigned:{' '}
                    {targetDeployment?.createdAt
                      ? DateTime.fromISO(targetDeployment.createdAt)
                          .setZone('Asia/Manila')
                          .toFormat('MMM d, yyyy - hh:mm a')
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Scrollable content */}
              <div className='flex-1 flex flex-col min-h-0 overflow-hidden'>
                <div className='flex-1 overflow-hidden flex flex-col min-h-0'>
                  {activeTab === 'info' && (
                    <div className='flex-1 overflow-y-auto scrollbar-thin px-6 py-5 max-sm:px-4 max-sm:py-4'>
                      <DeploymentInfoTab
                        targetDeployment={targetDeployment}
                        timelineDetails={timelineDetails}
                        isReplacementShow={isReplacementShow}
                      />
                    </div>
                  )}
                  {activeTab === 'pickups' && (
                    <PickupSitesTab pickups={pickups} />
                  )}
                  {activeTab === 'timelines' && (
                    <TimelineTab
                      targetDeployment={targetDeployment}
                      pickups={pickups}
                    />
                  )}
                </div>
              </div>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  )
}

// ── DARK TIMELINE HELPERS (left panel / desktop) ───────────────────────────────

const DarkTimelineLabel = ({ isActive, label }) => (
  <div className='flex gap-4'>
    <div className='relative w-4 shrink-0'>
      <div
        className={clsx(
          'w-0.5 h-full absolute top-0 left-1/2 -translate-x-1/2',
          { 'bg-emerald-500': isActive, 'bg-[#263e54]': !isActive }
        )}
      />
    </div>
    <div className='mb-1 flex-1 bg-emerald-500/15 px-2 rounded-sm'>
      <span className='text-xxs font-semibold text-emerald-400 uppercase tracking-wide'>
        {label}
      </span>
    </div>
  </div>
)

const DarkTimelineStop = ({ isActive, isLast, children }) => (
  <div className='flex gap-4'>
    <div className='relative w-4 shrink-0'>
      {!isLast && (
        <div
          className={clsx(
            'w-0.5 h-full absolute top-0 left-1/2 -translate-x-1/2',
            { 'bg-emerald-500': isActive, 'bg-[#263e54]': !isActive }
          )}
        />
      )}
      <div
        className={clsx(
          'w-3.5 aspect-square rounded-full absolute z-10 left-1/2 -translate-x-1/2',
          {
            'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]': isActive,
            'bg-[#263e54]': !isActive
          }
        )}
      />
    </div>
    <div className='pb-5 flex-1 min-w-0'>{children}</div>
  </div>
)

const DarkTimelineDisplay = ({ label, value }) => (
  <div className='flex flex-col gap-1'>
    <p className='text-white/40 text-xxs font-semibold uppercase tracking-wider'>
      {label}
    </p>
    {value ? (
      <p className='bg-white/10 border border-white/15 text-white/80 text-xs px-3 py-2 rounded-lg break-all'>
        {DateTime.fromISO(value)
          .setZone('Asia/Manila')
          .toFormat('MMM d, yyyy - hh:mm a')}
      </p>
    ) : (
      <p className='italic text-white/30 text-xs font-light bg-white/5 border border-white/10 px-3 py-2 rounded-lg'>
        Pending
      </p>
    )}
  </div>
)

// ── SHARED UNLOADING TIME DISPLAY ─────────────────────────────────────────────

const computeUnloadingTime = (destArrival, destDeparture) => {
  if (!destArrival || !destDeparture) return null
  const { days, hours, minutes } = DateTime.fromISO(destDeparture).diff(
    DateTime.fromISO(destArrival),
    ['days', 'hours', 'minutes']
  )
  const totalHours = days * 24 + hours
  const fmt = () => {
    const p = []
    if (days > 0) p.push(`${days}d`)
    if (hours > 0) p.push(`${hours}h`)
    if (minutes > 0) p.push(`${Math.floor(minutes)}m`)
    return p.join(' ') || `${Math.floor(minutes)}m`
  }
  const fmtH = () =>
    totalHours > 0
      ? `${totalHours}h${minutes > 0 ? ` ${Math.floor(minutes)}m` : ''}`
      : `${Math.floor(minutes)}m`
  if (totalHours >= 24) return `${fmt()} (${fmtH()})`
  if (hours > 0) return `${hours}h ${Math.floor(minutes)}m`
  return `${Math.floor(minutes)}m`
}

const UnloadingTimeDisplay = ({ destArrival, destDeparture, dark = false }) => {
  const result = computeUnloadingTime(destArrival, destDeparture)
  return (
    <div className='flex flex-col gap-1'>
      <p
        className={clsx(
          'text-xxs font-semibold uppercase tracking-wider',
          dark ? 'text-white/40' : 'text-gray-500'
        )}
      >
        Unloading Time
      </p>
      {result ? (
        <div
          className={clsx(
            'px-3 py-2 rounded-lg break-all',
            dark
              ? 'bg-white/10 border border-white/15'
              : 'bg-emerald-50 border border-emerald-200'
          )}
        >
          <span
            className={clsx(
              'text-xs font-semibold',
              dark ? 'text-white/80' : 'text-emerald-700'
            )}
          >
            {result}
          </span>
        </div>
      ) : (
        <p
          className={clsx(
            'italic text-xs font-light px-3 py-2 rounded-lg',
            dark
              ? 'text-white/30 bg-white/5 border border-white/10'
              : 'text-gray-400 bg-gray-50 border border-gray-200'
          )}
        >
          Pending
        </p>
      )}
    </div>
  )
}

// ── TAB BUTTON ─────────────────────────────────────────────────────────────────

const TabButton = ({ label, tab, activeTab, setActiveTab }) => (
  <button
    type='button'
    onClick={() => setActiveTab(tab)}
    className={clsx(
      'px-4 py-3 text-sm max-sm:text-xs font-medium transition-colors relative text-nowrap',
      {
        'text-emerald-600': activeTab === tab,
        'text-gray-500 hover:text-gray-700': activeTab !== tab
      }
    )}
  >
    {label}
    {activeTab === tab && (
      <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full' />
    )}
  </button>
)

// ── TIMELINE TAB (small / medium screens) ─────────────────────────────────────

const LightTimelineStop = ({ isActive, isLast, children }) => (
  <div className='flex gap-4'>
    <div className='relative w-4 shrink-0'>
      {!isLast && (
        <div
          className={clsx(
            'w-0.5 h-full absolute top-0 left-1/2 -translate-x-1/2',
            isActive ? 'bg-emerald-500' : 'bg-gray-200'
          )}
        />
      )}
      <div
        className={clsx(
          'w-3.5 aspect-square rounded-full absolute z-10 left-1/2 -translate-x-1/2',
          isActive ? 'bg-emerald-500' : 'bg-gray-200'
        )}
      />
    </div>
    <div className='pb-5 flex-1 min-w-0'>{children}</div>
  </div>
)

const LightTimelineLabel = ({ isActive, label }) => (
  <div className='flex gap-4'>
    <div className='relative w-4 shrink-0'>
      <div
        className={clsx(
          'w-0.5 h-full absolute top-0 left-1/2 -translate-x-1/2',
          isActive ? 'bg-emerald-500' : 'bg-gray-200'
        )}
      />
    </div>
    <div className='mb-1 flex-1 bg-emerald-500/10 px-2 rounded-sm'>
      <span className='text-xxs font-semibold text-emerald-600 uppercase tracking-wide'>
        {label}
      </span>
    </div>
  </div>
)

const LightTimelineDisplay = ({ label, value }) => (
  <div className='flex flex-col gap-1'>
    <p className='text-xxs font-semibold text-gray-500 uppercase tracking-wider'>
      {label}
    </p>
    {value ? (
      <p className='bg-white border border-gray-200 text-gray-700 text-xs px-3 py-2 rounded-lg shadow-sm'>
        {DateTime.fromISO(value)
          .setZone('Asia/Manila')
          .toFormat('MMM d, yyyy — hh:mm a')}
      </p>
    ) : (
      <p className='italic text-gray-400 text-xs font-light bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg'>
        Pending
      </p>
    )}
  </div>
)

const TimelineTab = ({ targetDeployment, pickups }) => {
  const multiStop = pickups.length > 1

  return (
    <div className='flex-1 overflow-y-auto scrollbar-thin px-5 py-5 max-sm:px-4'>
      <div className='flex flex-col'>
        <LightTimelineStop
          isActive={!!targetDeployment?.departed?.trim()}
          isLast={false}
        >
          <LightTimelineDisplay
            label='Departed'
            value={targetDeployment?.departed}
          />
        </LightTimelineStop>

        {pickups.map((pickup, index) => {
          const prevPickupOut =
            index === 0
              ? targetDeployment?.departed
              : pickups[index - 1]?.pickupOut
          return (
            <div key={index}>
              {multiStop && (
                <LightTimelineLabel
                  isActive={!!prevPickupOut}
                  label={`Stop #${index + 1}${
                    pickup.pickupSite ? ` — ${pickup.pickupSite}` : ''
                  }`}
                />
              )}
              <LightTimelineStop
                isActive={!!pickup.pickupIn?.trim()}
                isLast={false}
              >
                <LightTimelineDisplay
                  label='Pick-up In'
                  value={pickup.pickupIn}
                />
              </LightTimelineStop>
              <LightTimelineStop
                isActive={!!pickup.pickupOut?.trim()}
                isLast={false}
              >
                <LightTimelineDisplay
                  label='Pick-up Out'
                  value={pickup.pickupOut}
                />
              </LightTimelineStop>
            </div>
          )
        })}

        <LightTimelineStop
          isActive={!!targetDeployment?.destArrival?.trim()}
          isLast={false}
        >
          <LightTimelineDisplay
            label='Dest Arrival'
            value={targetDeployment?.destArrival}
          />
        </LightTimelineStop>

        <LightTimelineStop
          isActive={!!targetDeployment?.destDeparture?.trim()}
          isLast={false}
        >
          <LightTimelineDisplay
            label='Dest Departure'
            value={targetDeployment?.destDeparture}
          />
        </LightTimelineStop>

        <LightTimelineStop
          isActive={
            !!(targetDeployment?.destDeparture && targetDeployment?.destArrival)
          }
          isLast={true}
        >
          <UnloadingTimeDisplay
            destArrival={targetDeployment?.destArrival}
            destDeparture={targetDeployment?.destDeparture}
          />
        </LightTimelineStop>
      </div>
    </div>
  )
}

// ── DEPLOYMENT INFO TAB ────────────────────────────────────────────────────────

const DeploymentInfoTab = ({
  targetDeployment,
  timelineDetails,
  isReplacementShow
}) => {
  const activeTruck = isReplacementShow
    ? targetDeployment?.replacement?.replacementTruckId
    : targetDeployment?.truckId

  const activeDriver = isReplacementShow
    ? targetDeployment?.replacement?.replacementDriverId
    : targetDeployment?.driverId

  const activeTruckType = isReplacementShow
    ? targetDeployment?.replacement?.replacementTruckType
    : targetDeployment?.truckType

  const helperCount = isReplacementShow
    ? targetDeployment?.replacement?.replacementHelperCount
    : targetDeployment?.helperCount

  return (
    <div className='space-y-5'>
      {/* Truck & Driver */}
      <div className='space-y-2'>
        <div className='flex justify-between items-center'>
          <h3 className='text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider'>
            Truck & Driver Details
          </h3>
          {isReplacementShow && (
            <p className='text-xs max-sm:text-xxs text-red-500 font-medium'>
              *Replacement truck
            </p>
          )}
        </div>
        <div className='grid grid-cols-1 xs:grid-cols-2 gap-x-5 gap-y-4 border border-gray-200 rounded-xl p-5 max-sm:p-4'>
          <InfoField label='Plate No.'>
            <InfoValue className='uppercase'>{activeTruck?.plateNo}</InfoValue>
          </InfoField>

          <div className='grid grid-cols-2 gap-4'>
            <InfoField label='Truck Type'>
              <InfoValue className='capitalize'>{activeTruckType}</InfoValue>
            </InfoField>
            <InfoField label='Helper Count'>
              <InfoValue>{helperCount}</InfoValue>
            </InfoField>
          </div>

          <InfoField label='Driver'>
            <InfoValue className='capitalize'>
              {activeDriver
                ? `${activeDriver.firstname} ${activeDriver.lastname}`
                : 'N/A'}
            </InfoValue>
          </InfoField>

          <div className='grid grid-cols-2 gap-4'>
            <InfoField label='Total Sacks'>
              <InfoValue>
                <NumericFormat
                  thousandSeparator
                  decimalScale={0}
                  allowNegative={false}
                  value={targetDeployment?.totalSacksCount}
                  displayType='text'
                  renderText={v => v || '—'}
                />
              </InfoValue>
            </InfoField>
            <InfoField label='Load Weight (kg)'>
              <InfoValue>
                <NumericFormat
                  thousandSeparator
                  decimalScale={2}
                  allowNegative={false}
                  value={targetDeployment?.totalWeightKg}
                  displayType='text'
                  renderText={v => v || '—'}
                />
              </InfoValue>
            </InfoField>
          </div>
        </div>
      </div>

      {/* Delivery Details */}
      <div className='space-y-2'>
        <h3 className='text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider'>
          Delivery Details
        </h3>
        <div className='grid grid-cols-1 xs:grid-cols-2 gap-x-5 gap-y-4 border border-gray-200 rounded-xl p-5 max-sm:p-4'>
          <InfoField label='Receiving Contact Person'>
            <InfoValue className='capitalize'>
              {targetDeployment?.receivingContactPerson}
            </InfoValue>
          </InfoField>
          <InfoField label='Receiving Contact No.'>
            <InfoValue>{targetDeployment?.receivingContactPersonNo}</InfoValue>
          </InfoField>

          <InfoField label='Destination'>
            <InfoValue className='capitalize'>
              {targetDeployment?.destination}
            </InfoValue>
          </InfoField>

          <div className='grid grid-cols-2 gap-4'>
            <InfoField label='Territory'>
              <InfoValue className='capitalize'>
                {targetDeployment?.territory}
              </InfoValue>
            </InfoField>
            <InfoField label='Hybrid'>
              <InfoValue className='capitalize'>
                {targetDeployment?.hybrid}
              </InfoValue>
            </InfoField>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <InfoField label='Flagging'>
              <div
                className={clsx(
                  'flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 max-sm:px-3 max-sm:py-2 shadow-sm min-h-[42px] max-sm:min-h-9'
                )}
              >
                <span
                  className={clsx(
                    'capitalize w-fit px-2.5 py-0.5 rounded-full text-xs font-semibold',
                    {
                      'bg-emerald-500/10 text-emerald-600':
                        targetDeployment?.flagging === 'green',
                      'bg-orange-500/10 text-orange-600':
                        targetDeployment?.flagging === 'orange',
                      'bg-yellow-500/10 text-yellow-600':
                        targetDeployment?.flagging === 'yellow',
                      'bg-red-500/10 text-red-600':
                        targetDeployment?.flagging === 'red',
                      'text-gray-400 italic': !targetDeployment?.flagging
                    }
                  )}
                >
                  {targetDeployment?.flagging || '—'}
                </span>
              </div>
            </InfoField>
            <InfoField label='Flagging Remarks'>
              <InfoValue className='capitalize'>
                {targetDeployment?.flaggingRemarks}
              </InfoValue>
            </InfoField>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <InfoField label='Status'>
              <div className='flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 max-sm:px-3 max-sm:py-2 shadow-sm min-h-[42px] max-sm:min-h-9'>
                <span
                  className={clsx(
                    'capitalize w-fit px-2.5 py-0.5 rounded-full text-xs font-semibold',
                    {
                      'bg-orange-500/10 text-orange-600':
                        targetDeployment?.status === 'preparing',
                      'bg-emerald-500/10 text-emerald-600':
                        targetDeployment?.status === 'ongoing',
                      'bg-blue-500/10 text-blue-600':
                        targetDeployment?.status === 'completed',
                      'bg-red-500/10 text-red-600':
                        targetDeployment?.status === 'canceled'
                    }
                  )}
                >
                  {targetDeployment?.status || '—'}
                </span>
              </div>
            </InfoField>
            <InfoField label='Cancellation Reason'>
              <InfoValue>{targetDeployment?.cancellationReason}</InfoValue>
            </InfoField>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── PICKUP SITES TAB ───────────────────────────────────────────────────────────

const MAX_PICKUPS = 10

const PickupSitesTab = ({ pickups }) => (
  <div className='flex flex-col flex-1 overflow-hidden min-h-0 px-6 py-5 max-sm:px-4 max-sm:py-4'>
    <div className='flex items-center gap-2 pb-3 mb-1 shrink-0'>
      <h3 className='text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider'>
        Pickup Stops
      </h3>
      <span className='text-xs max-sm:text-xxs text-gray-400'>
        ({pickups.length}/{MAX_PICKUPS})
      </span>
    </div>

    <div className='flex-1 overflow-y-auto scrollbar-thin flex flex-col gap-3 min-h-0'>
      {pickups.map((pickup, index) => (
        <div
          key={index}
          className='border border-gray-200 rounded-xl p-4 max-sm:p-3 bg-gray-50/50'
        >
          <div className='flex items-center gap-2 mb-3'>
            <p className='text-xxs sm:text-xs font-semibold text-emerald-600 uppercase tracking-wide'>
              Stop #{index + 1}
            </p>
            {pickup.tmoNo && (
              <span className='text-sm max-sm:text-xs font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded'>
                {pickup.tmoNo}
              </span>
            )}
          </div>

          <div className='grid grid-cols-2 gap-x-5 gap-y-4 max-sm:gap-x-3 max-sm:gap-y-3'>
            <InfoField label='Pick-up Site'>
              <InfoValue className='capitalize'>{pickup.pickupSite}</InfoValue>
            </InfoField>
            <InfoField label='Municipality'>
              <InfoValue className='capitalize'>
                {pickup.municipality}
              </InfoValue>
            </InfoField>
            <InfoField label='Field Contact Person'>
              <InfoValue className='capitalize'>
                {pickup.fieldContactPerson}
              </InfoValue>
            </InfoField>
            <InfoField label='Field Contact No.'>
              <InfoValue>{pickup.fieldContactPersonNo}</InfoValue>
            </InfoField>

            <InfoField label='Scheduled Pickup Time'>
              {pickup.scheduledPickupTime ? (
                <InfoValue>
                  {DateTime.fromISO(pickup.scheduledPickupTime)
                    .setZone('Asia/Manila')
                    .toFormat('MMM d, yyyy - hh:mm a')}
                </InfoValue>
              ) : (
                <div className='flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 max-sm:px-3 max-sm:py-2 shadow-sm'>
                  <p className='italic text-gray-400 text-sm max-sm:text-xs'>
                    Not set
                  </p>
                </div>
              )}
            </InfoField>

            {/* sm+: 3-col weight/sacks */}
            <div className='grid grid-cols-3 gap-3 max-sm:hidden'>
              {[
                {
                  label: 'Est. Weight (Kg)',
                  field: 'estimatedWeightKg',
                  sep: true,
                  dec: 2
                },
                {
                  label: 'Act. Weight (Kg)',
                  field: 'actualWeightKg',
                  sep: true,
                  dec: 2
                },
                {
                  label: 'Sacks Count',
                  field: 'sacksCount',
                  sep: false,
                  dec: 0
                }
              ].map(({ label, field, sep, dec }) => (
                <InfoField key={field} label={label}>
                  <div className='flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm min-h-[42px]'>
                    <NumericFormat
                      thousandSeparator={sep}
                      decimalScale={dec}
                      allowNegative={false}
                      value={pickup[field]}
                      displayType='text'
                      renderText={v => (
                        <span className='text-sm text-gray-700'>
                          {v || '—'}
                        </span>
                      )}
                    />
                  </div>
                </InfoField>
              ))}
            </div>

            {/* xs: stacked weight/sacks */}
            {[
              { label: 'Sacks Count', field: 'sacksCount', sep: false, dec: 0 },
              {
                label: 'Est. Weight (Kg)',
                field: 'estimatedWeightKg',
                sep: true,
                dec: 2
              },
              {
                label: 'Act. Weight (Kg)',
                field: 'actualWeightKg',
                sep: true,
                dec: 2
              }
            ].map(({ label, field, sep, dec }) => (
              <div key={field} className='flex flex-col gap-1.5 sm:hidden'>
                <span className='text-xxs font-semibold text-gray-600 uppercase tracking-wider text-nowrap'>
                  {label}
                </span>
                <div className='flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 shadow-sm'>
                  <NumericFormat
                    thousandSeparator={sep}
                    decimalScale={dec}
                    allowNegative={false}
                    value={pickup[field]}
                    displayType='text'
                    renderText={v => (
                      <span className='text-xs text-gray-700'>{v || '—'}</span>
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
)

// ── SHARED UI HELPERS ──────────────────────────────────────────────────────────

const InfoField = ({ label, children }) => (
  <div className='flex flex-col gap-1.5'>
    <span className='text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider truncate'>
      {label}
    </span>
    {children}
  </div>
)

const InfoValue = ({ children, className = '' }) => (
  <div
    className={clsx(
      'flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 max-sm:px-3 max-sm:py-2 shadow-sm text-sm max-sm:text-xs text-gray-700 min-h-[42px] max-sm:min-h-9 truncate',
      className
    )}
  >
    {children || (
      <span className='text-gray-400 italic text-sm max-sm:text-xs'>—</span>
    )}
  </div>
)

export default TimelineLogDetailsModal
