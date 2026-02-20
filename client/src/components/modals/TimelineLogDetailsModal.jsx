import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild
} from '@headlessui/react'
import clsx from 'clsx'
import { IoClose } from 'react-icons/io5'
import { useEffect, useState } from 'react'
import { DateTime } from 'luxon'
import { HiDotsHorizontal } from 'react-icons/hi'
import { NumericFormat } from 'react-number-format'

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
          <DialogPanel className='font-poppins text-gray-900 w-full max-w-6xl rounded-2xl bg-white shadow-xl overflow-hidden relative h-[80vh] overflow-y-auto scrollbar-thin'>
            {/* Top right buttons */}
            <div className='absolute top-4 right-4 flex items-center gap-2 z-10'>
              <div className='dropdown dropdown-bottom dropdown-end'>
                <div
                  tabIndex={0}
                  role='button'
                  className='hover:bg-gray-100 p-1 rounded-full text-2xl text-gray-500 cursor-pointer transition-all'
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
                className='hover:bg-gray-100 p-1 rounded-full text-2xl text-gray-600 cursor-pointer transition-all'
              >
                <IoClose />
              </button>
            </div>

            <div className='flex h-full'>
              {/* ── TIMELINE SIDEBAR ── */}
              <div className='bg-gray-100 min-w-60 border-r border-gray-200 flex flex-col pb-8'>
                <h2 className='text-lg font-semibold mb-4 -ml-2 px-6 pt-8'>
                  Transport Log
                </h2>
                <div className='relative flex-1 overflow-y-auto scrollbar-thin px-6 mt-4'>
                  <div className='flex flex-col'>
                    {/* Departed */}
                    <TimelineStop
                      isActive={!!targetDeployment?.departed?.trim()}
                      isLast={false}
                    >
                      <TimelineDisplay
                        label='Departed'
                        value={targetDeployment?.departed}
                      />
                    </TimelineStop>

                    {/* Pickup stops */}
                    {pickups.map((pickup, index) => {
                      const prevPickupOut =
                        index === 0
                          ? targetDeployment?.departed
                          : pickups[index - 1]?.pickupOut
                      const multiStop = pickups.length > 1
                      return (
                        <div key={index}>
                          {multiStop && (
                            <TimelineLabel
                              isActive={!!prevPickupOut}
                              label={`Stop #${index + 1}`}
                            />
                          )}
                          <TimelineStop
                            isActive={!!pickup.pickupIn?.trim()}
                            isLast={false}
                          >
                            <TimelineDisplay
                              label='Pick-up In'
                              value={pickup.pickupIn}
                            />
                          </TimelineStop>
                          <TimelineStop
                            isActive={!!pickup.pickupOut?.trim()}
                            isLast={false}
                          >
                            <TimelineDisplay
                              label='Pick-up Out'
                              value={pickup.pickupOut}
                            />
                          </TimelineStop>
                        </div>
                      )
                    })}

                    {/* Dest Arrival */}
                    <TimelineStop
                      isActive={!!targetDeployment?.destArrival?.trim()}
                      isLast={false}
                    >
                      <TimelineDisplay
                        label='Dest Arrival'
                        value={targetDeployment?.destArrival}
                      />
                    </TimelineStop>

                    {/* Dest Departure */}
                    <TimelineStop
                      isActive={!!targetDeployment?.destDeparture?.trim()}
                      isLast={false}
                    >
                      <TimelineDisplay
                        label='Dest Departure'
                        value={targetDeployment?.destDeparture}
                      />
                    </TimelineStop>

                    {/* Unloading Time */}
                    <TimelineStop
                      isActive={!!targetDeployment?.destDeparture?.trim()}
                      isLast={true}
                    >
                      <label className='flex flex-col gap-1'>
                        <p className='text-xs font-semibold uppercase text-gray-500'>
                          Unloading Time
                        </p>
                        {targetDeployment?.destDeparture &&
                        targetDeployment?.destArrival ? (
                          <div className='outline outline-gray-300 px-3 py-2 rounded break-all'>
                            {(() => {
                              const { days, hours, minutes } = DateTime.fromISO(
                                targetDeployment.destDeparture
                              ).diff(
                                DateTime.fromISO(targetDeployment.destArrival),
                                ['days', 'hours', 'minutes']
                              )
                              const totalHours = days * 24 + hours
                              const fmt = () => {
                                const p = []
                                if (days > 0) p.push(`${days}d`)
                                if (hours > 0) p.push(`${hours}h`)
                                if (minutes > 0)
                                  p.push(`${Math.floor(minutes)}m`)
                                return p.join(' ') || `${Math.floor(minutes)}m`
                              }
                              const fmtH = () =>
                                totalHours > 0
                                  ? `${totalHours}h${
                                      minutes > 0
                                        ? ` ${Math.floor(minutes)}m`
                                        : ''
                                    }`
                                  : `${Math.floor(minutes)}m`
                              if (totalHours >= 24)
                                return `${fmt()} (${fmtH()})`
                              if (hours > 0)
                                return `${hours}h ${Math.floor(minutes)}m`
                              return `${Math.floor(minutes)}m`
                            })()}
                          </div>
                        ) : (
                          <p className='italic text-gray-400 text-sm font-light outline outline-gray-300 px-3 py-2.5 rounded'>
                            Pending
                          </p>
                        )}
                      </label>
                    </TimelineStop>
                  </div>
                </div>
              </div>

              {/* ── MAIN PANEL ── */}
              <div className='pl-6 py-8 flex-1 flex flex-col'>
                <div className='flex items-center gap-3 mb-4'>
                  <h2 className='text-lg font-semibold'>Deployment Details</h2>
                  <div
                    className='bg-gray-100 px-2 py-1 rounded-md shadow-card3 text-sm font-medium relative cursor-copy'
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

                {/* Tabs */}
                <div className='flex gap-2 border-b border-gray-200 mb-4 mr-6'>
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
                  <div className='ml-auto rounded-t-lg outline outline-gray-200 flex'>
                    <p className='px-3 py-2 text-sm text-gray-500'>
                      Assigned At:{' '}
                      {targetDeployment?.createdAt
                        ? DateTime.fromISO(targetDeployment.createdAt)
                            .setZone('Asia/Manila')
                            .toFormat('MMM d, yyyy - hh:mm a')
                        : '—'}
                    </p>
                  </div>
                </div>

                {/* Tab content */}
                <div className='flex-1 overflow-y-auto scrollbar-thin pr-6'>
                  {activeTab === 'info' && (
                    <DeploymentInfoTab
                      targetDeployment={targetDeployment}
                      timelineDetails={timelineDetails}
                      isReplacementShow={isReplacementShow}
                    />
                  )}
                  {activeTab === 'pickups' && (
                    <PickupSitesTab pickups={pickups} />
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

// ── TIMELINE HELPERS ───────────────────────────────────────────────────────────

const TimelineLabel = ({ isActive, label }) => (
  <div className='flex gap-5'>
    <div className='relative'>
      <div
        className={clsx(
          'w-0.5 h-full absolute top-0 left-1/2 -translate-x-1/2',
          { 'bg-emerald-500': isActive, 'bg-gray-300': !isActive }
        )}
      />
    </div>
    <div className='mb-1 flex-1 bg-emerald-500/10 px-2 rounded-sm'>
      <span className='text-xs font-semibold text-emerald-600 uppercase tracking-wide'>
        {label}
      </span>
    </div>
  </div>
)

const TimelineStop = ({ isActive, isLast, children }) => (
  <div className='flex gap-5'>
    <div className='relative'>
      <div
        className={clsx(
          'w-4 aspect-square rounded-full absolute z-10 left-1/2 -translate-x-1/2',
          {
            'bg-emerald-500 shadow-warning': isActive,
            'bg-gray-200 shadow-[inset_0_2px_4px_0_rgb(0,0,0,0.2)]': !isActive
          }
        )}
      />
      {!isLast && (
        <div
          className={clsx(
            'w-0.5 h-full absolute top-0 left-1/2 -translate-x-1/2',
            { 'bg-emerald-500': isActive, 'bg-gray-300': !isActive }
          )}
        />
      )}
    </div>
    <div className='pb-6 flex-1 w-56'>{children}</div>
  </div>
)

const TimelineDisplay = ({ label, value }) => (
  <label className='flex flex-col gap-1'>
    <p className='text-xs font-semibold uppercase text-gray-500'>{label}</p>
    {value ? (
      <p className='outline outline-gray-300 px-3 py-2 rounded break-all'>
        {DateTime.fromISO(value)
          .setZone('Asia/Manila')
          .toFormat('MMM d, yyyy - hh:mm a')}
      </p>
    ) : (
      <p className='italic text-gray-400 text-sm font-light outline outline-gray-300 px-3 py-2.5 rounded'>
        Pending
      </p>
    )}
  </label>
)

const TabButton = ({ label, tab, activeTab, setActiveTab }) => (
  <button
    type='button'
    onClick={() => setActiveTab(tab)}
    className={clsx(
      'px-4 py-2 text-sm font-medium transition-colors relative',
      {
        'text-emerald-600': activeTab === tab,
        'text-gray-500 hover:text-gray-700': activeTab !== tab
      }
    )}
  >
    {label}
    {activeTab === tab && (
      <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600' />
    )}
  </button>
)

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
    <div className='space-y-4'>
      {/* Truck & Driver */}
      <div className='space-y-2'>
        <div className='flex justify-between items-center'>
          <h3 className='text-xs uppercase font-semibold text-gray-500'>
            Truck & Driver Details
          </h3>
          {isReplacementShow && (
            <p className='text-xs text-red-500'>*Replacement truck active</p>
          )}
        </div>
        <div className='grid grid-cols-2 gap-x-6 gap-y-4 border border-gray-200 rounded-md p-6'>
          <StaticField
            label='Plate No.'
            value={activeTruck?.plateNo}
            isUpperCase
          />

          <div className='grid grid-cols-2 gap-x-6'>
            <StaticField
              label='Truck Type'
              value={activeTruckType}
              isCapitalize
            />
            <StaticField label='Helper Count' value={helperCount} />
          </div>

          <StaticField
            label='Driver'
            value={
              activeDriver
                ? `${activeDriver.firstname} ${activeDriver.lastname}`
                : 'N/A'
            }
            isCapitalize
          />

          <div className='grid grid-cols-2 gap-x-6'>
            <StaticField
              label='Sacks Count'
              value={targetDeployment?.totalSacksCount}
              formatNumber
              thousandSeparator
              decimalScale={0}
            />
            <StaticField
              label='Load Weight (kg)'
              value={targetDeployment?.totalWeightKg}
              formatNumber
              thousandSeparator
              decimalScale={2}
            />
          </div>
        </div>
      </div>

      {/* Delivery Details */}
      <div className='space-y-2'>
        <h3 className='text-xs uppercase font-semibold text-gray-500'>
          Delivery Details
        </h3>
        <div className='grid grid-cols-2 gap-x-6 gap-y-4 border border-gray-200 rounded-md p-6'>
          <StaticField
            label='Receiving Contact Person'
            value={targetDeployment?.receivingContactPerson}
            isCapitalize
          />
          <StaticField
            label='Receiving Contact No.'
            value={targetDeployment?.receivingContactPersonNo}
          />

          <StaticField
            label='Destination'
            value={targetDeployment?.destination}
            isCapitalize
          />

          <div className='grid grid-cols-2 gap-x-6'>
            <StaticField
              label='Territory'
              value={targetDeployment?.territory}
              isCapitalize
            />
            <StaticField
              label='Hybrid'
              value={targetDeployment?.hybrid}
              isCapitalize
            />
          </div>

          <div className='grid grid-cols-2 gap-x-6'>
            {/* Flagging badge */}
            <label className='flex flex-col gap-1'>
              <span className='uppercase text-xs text-gray-500 font-semibold'>
                Flagging
              </span>
              <div className='outline outline-gray-200 px-3 py-2 rounded'>
                <p
                  className={clsx(
                    'capitalize w-fit px-2 py-0.5 rounded-full text-sm',
                    {
                      'bg-emerald-500/10 text-emerald-500':
                        targetDeployment?.flagging === 'green',
                      'bg-orange-500/10 text-orange-500':
                        targetDeployment?.flagging === 'orange',
                      'bg-yellow-500/10 text-yellow-500':
                        targetDeployment?.flagging === 'yellow',
                      'bg-red-500/10 text-red-500':
                        targetDeployment?.flagging === 'red'
                    }
                  )}
                >
                  {targetDeployment?.flagging || 'N/A'}
                </p>
              </div>
            </label>
            <StaticField
              label='Flagging Remarks'
              value={targetDeployment?.flaggingRemarks}
              isCapitalize
            />
          </div>

          <div className='grid grid-cols-2 gap-x-6'>
            {/* Status badge */}
            <label className='flex flex-col gap-1'>
              <span className='uppercase text-xs text-gray-500 font-semibold'>
                Status
              </span>
              <div className='outline outline-gray-200 px-3 py-2 rounded'>
                <p
                  className={clsx(
                    'capitalize w-fit px-2 py-0.5 rounded-full text-sm',
                    {
                      'bg-orange-500/10 text-orange-500':
                        targetDeployment?.status === 'preparing',
                      'bg-emerald-500/10 text-emerald-500':
                        targetDeployment?.status === 'ongoing',
                      'bg-blue-500/10 text-blue-500':
                        targetDeployment?.status === 'completed',
                      'bg-red-500/10 text-red-500':
                        targetDeployment?.status === 'canceled'
                    }
                  )}
                >
                  {targetDeployment?.status}
                </p>
              </div>
            </label>
            <StaticField
              label='Cancellation Reason'
              value={targetDeployment?.cancellationReason}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── PICKUP SITES TAB ───────────────────────────────────────────────────────────

const MAX_PICKUPS = 10

const PickupSitesTab = ({ pickups }) => (
  <div>
    <div className='flex items-center gap-2 sticky top-0 bg-white z-10 pb-2'>
      <h3 className='text-xs uppercase font-semibold text-gray-500'>
        Pickup Stops
      </h3>
      <span className='text-xs text-gray-400'>
        ({pickups.length}/{MAX_PICKUPS})
      </span>
    </div>

    <div className='flex flex-col gap-3'>
      {pickups.map((pickup, index) => (
        <div
          key={index}
          className='border border-gray-200 rounded-xl p-4 bg-gray-50/50'
        >
          <div className='flex items-center gap-2 mb-2'>
            <p className='text-xs font-semibold text-emerald-600 uppercase tracking-wide'>
              Stop #{index + 1}
            </p>
            {pickup.tmoNo && (
              <span className='text-sm font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded'>
                {pickup.tmoNo}
              </span>
            )}
          </div>

          <div className='grid grid-cols-2 gap-x-6 gap-y-4'>
            <StaticField
              label='Pick-up Site'
              value={pickup.pickupSite}
              isCapitalize
            />
            <StaticField
              label='Municipality'
              value={pickup.municipality}
              isCapitalize
            />
            <StaticField
              label='Field Contact Person'
              value={pickup.fieldContactPerson}
              isCapitalize
            />
            <StaticField
              label='Field Contact No.'
              value={pickup.fieldContactPersonNo}
            />
            <StaticField
              label='Scheduled Pickup Time'
              value={
                pickup.scheduledPickupTime
                  ? DateTime.fromISO(pickup.scheduledPickupTime)
                      .setZone('Asia/Manila')
                      .toFormat('MMM dd, yyyy hh:mm a')
                  : ''
              }
            />
            <div className='grid grid-cols-3 gap-x-3'>
              <StaticField
                label='Est. Weight (Kg)'
                value={pickup.estimatedWeightKg}
                formatNumber
                thousandSeparator
                decimalScale={2}
              />

              <StaticField
                label='Act. Weight (Kg)'
                value={pickup.actualWeightKg}
                formatNumber
                thousandSeparator
                decimalScale={2}
              />

              <StaticField
                label='Sacks Count'
                value={pickup.sacksCount}
                formatNumber
                decimalScale={0}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)

// ── STATIC FIELD ───────────────────────────────────────────────────────────────

const StaticField = ({
  label,
  value,
  isCapitalize = false,
  isUpperCase = false,
  formatNumber = false,
  thousandSeparator = false,
  decimalScale = 0
}) => {
  if (formatNumber) {
    return (
      <label className='flex flex-col gap-1'>
        <span className='uppercase text-xs text-gray-500 font-semibold text-nowrap'>
          {label}
        </span>
        <NumericFormat
          thousandSeparator={thousandSeparator}
          decimalScale={decimalScale}
          allowNegative={false}
          value={value}
          displayType='text'
          renderText={formattedValue => (
            <p className='outline outline-gray-200 px-3 py-2 rounded w-full'>
              {formattedValue || '—'}
            </p>
          )}
        />
      </label>
    )
  }

  return (
    <label className='flex flex-col gap-1'>
      <span className='uppercase text-xs text-gray-500 font-semibold'>
        {label}
      </span>
      <p
        className={clsx(
          'outline outline-gray-200 px-3 py-2 rounded w-full break-all',
          {
            capitalize: isCapitalize,
            uppercase: isUpperCase
          }
        )}
      >
        {value || '—'}
      </p>
    </label>
  )
}

export default TimelineLogDetailsModal
