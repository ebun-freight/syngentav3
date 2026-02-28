import React, { useState, useEffect } from 'react'
import {
  MdOutlineKeyboardArrowLeft,
  MdOutlineKeyboardArrowRight
} from 'react-icons/md'
import {
  FaBoxOpen,
  FaCheckCircle,
  FaFlagCheckered,
  FaTruck,
  FaWarehouse,
  FaClock,
  FaTimesCircle
} from 'react-icons/fa'
import DeploymentDetailsModal from '../../components/modals/DeploymentDetailsModal'
import useGetAllTruck from '../../hooks/useGetAllTruck'
import useGetAllDriver from '../../hooks/useGetAllDriver'
import ReplacementHistoryModal from '../../components/modals/ReplacementHistoryModal'
import useGetAllDeployment from '../../hooks/useGetAllDeployment'
import { error_illustration } from '../../consts/images'
import clsx from 'clsx'

/* ── Shared button base (mirrors Deployments page) ─────────────────────── */
const btnBase =
  'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed'

function CalendarPage () {
  const { getAllDeploymentFunction, isLoading: isDeploymentsLoading } =
    useGetAllDeployment()
  const { getAllTruckFunction, isLoading: isTruckLoading } = useGetAllTruck()
  const { getAllDriverFunction, isLoading: isDriverLoading } = useGetAllDriver()

  const [allDeployments, setAllDeployments] = useState([])
  const [allTrucks, setAllTrucks] = useState([])
  const [allDrivers, setAllDrivers] = useState([])
  const [deploymentsError, setDeploymentsError] = useState(null)
  const [truckError, setTruckError] = useState(null)
  const [driverError, setDriverError] = useState(null)

  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDeployment, setSelectedDeployment] = useState({})
  const [view, setView] = useState('month')
  const [isDeploymentDetailsModalOpen, setIsDeploymentDetailsModalOpen] =
    useState(false)
  const [isReplacementModalOpen, setIsReplacementModalOpen] = useState(false)
  const [showReplacementHistory, setShowReplacementHistory] = useState(false)

  useEffect(() => {
    const handleGetAllDeployments = async () => {
      const { deployments, error } = await getAllDeploymentFunction({})
      if (error) setDeploymentsError(error)
      setAllDeployments(deployments || [])
    }
    const handleGetAllTrucks = async () => {
      const { trucks, error } = await getAllTruckFunction({})
      if (error) setTruckError(error)
      setAllTrucks(trucks || [])
    }
    const handleGetAllDrivers = async () => {
      const { drivers, error } = await getAllDriverFunction({})
      if (error) setDriverError(error)
      setAllDrivers(drivers || [])
    }
    handleGetAllDeployments()
    handleGetAllTrucks()
    handleGetAllDrivers()
  }, [])

  const handleDeploymentSelect = deployment => {
    setSelectedDeployment(deployment)
    setIsDeploymentDetailsModalOpen(true)
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  const formatTime = date =>
    date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })

  const getStatusColor = status => {
    const map = {
      preparing: 'bg-orange-500',
      ongoing: 'bg-emerald-500',
      completed: 'bg-blue-500',
      canceled: 'bg-red-500'
    }
    return map[status] || 'bg-emerald-500'
  }

  /* Status badge — mirrors Deployments table pill */
  const StatusBadge = ({ status }) => (
    <span
      className={clsx('px-2 py-0.5 rounded-full text-xxs w-fit capitalize', {
        'bg-orange-50 text-orange-500': status === 'preparing',
        'bg-emerald-50 text-emerald-600': status === 'ongoing',
        'bg-blue-50 text-blue-500': status === 'completed',
        'bg-red-50 text-red-500': status === 'canceled'
      })}
    >
      {status}
    </span>
  )

  const getTruckPlate = deployment => {
    if (!deployment) return 'UNKNOWN TRUCK'
    return (
      deployment.replacement?.replacementTruckId?.plateNo?.toUpperCase() ||
      deployment.truckId?.plateNo?.toUpperCase() ||
      'UNKNOWN TRUCK'
    )
  }

  const getDriverName = deployment => {
    if (!deployment) return 'Unknown Driver'
    if (deployment.replacement?.replacementDriverId) {
      const d = deployment.replacement.replacementDriverId
      return `${d.firstname} ${d.lastname}`
    }
    return (
      `${deployment.driverId?.firstname ?? ''} ${
        deployment.driverId?.lastname ?? ''
      }`.trim() || 'Unknown Driver'
    )
  }

  // ─── build calendar events ─────────────────────────────────────────────────

  const getCalendarEvents = () => {
    const events = []

    const makeEvent = (deployment, timestamp, eventType, title, icon) => {
      if (!timestamp) return null
      const eventDate = new Date(timestamp)
      if (isNaN(eventDate.getTime())) return null
      return {
        id: `${deployment._id}-${eventType}`,
        deploymentId: deployment._id,
        title,
        shortTitle: title,
        deploymentCode: deployment.deploymentCode || '',
        truckPlate: getTruckPlate(deployment),
        formattedTime: formatTime(eventDate),
        start: eventDate,
        end: eventDate,
        type: eventType,
        deployment,
        color: getStatusColor(deployment.status),
        icon,
        rawTimestamp: timestamp
      }
    }

    allDeployments.forEach(deployment => {
      const createdEvent = makeEvent(
        deployment,
        deployment.createdAt,
        'created',
        deployment.status === 'canceled'
          ? 'Deployment Canceled'
          : 'Deployment Created',
        deployment.status === 'canceled' ? FaTimesCircle : FaClock
      )
      if (createdEvent) events.push(createdEvent)

      const departedEvent = makeEvent(
        deployment,
        deployment.departed,
        'departed',
        'Departure',
        FaTruck
      )
      if (departedEvent) events.push(departedEvent)
      ;(deployment.pickups || []).forEach((stop, index) => {
        const stopLabel = `Stop #${index + 1}`
        if (stop.pickupIn) {
          const ev = makeEvent(
            deployment,
            stop.pickupIn,
            `pickupIn-${index}`,
            `Pickup Arrival (${stopLabel})`,
            FaWarehouse
          )
          if (ev) events.push(ev)
        }
        if (stop.pickupOut) {
          const ev = makeEvent(
            deployment,
            stop.pickupOut,
            `pickupOut-${index}`,
            `Pickup Departure (${stopLabel})`,
            FaBoxOpen
          )
          if (ev) events.push(ev)
        }
      })

      const destArrivalEvent = makeEvent(
        deployment,
        deployment.destArrival,
        'destArrival',
        'Destination Arrival',
        FaFlagCheckered
      )
      if (destArrivalEvent) events.push(destArrivalEvent)

      const destDepartureEvent = makeEvent(
        deployment,
        deployment.destDeparture,
        'destDeparture',
        'Delivery Completed',
        FaCheckCircle
      )
      if (destDepartureEvent) events.push(destDepartureEvent)
    })

    return events.sort((a, b) => a.start - b.start)
  }

  // ─── navigation ────────────────────────────────────────────────────────────

  const nextPeriod = () => {
    const d = new Date(currentDate)
    if (view === 'month') d.setMonth(d.getMonth() + 1)
    else if (view === 'week') d.setDate(d.getDate() + 7)
    else d.setDate(d.getDate() + 1)
    setCurrentDate(d)
  }

  const prevPeriod = () => {
    const d = new Date(currentDate)
    if (view === 'month') d.setMonth(d.getMonth() - 1)
    else if (view === 'week') d.setDate(d.getDate() - 7)
    else d.setDate(d.getDate() - 1)
    setCurrentDate(d)
  }

  const goToToday = () => setCurrentDate(new Date())

  const handleDateCellClick = date => {
    setCurrentDate(date)
    setView('day')
  }

  // ─── date helpers ──────────────────────────────────────────────────────────

  const getDaysInMonth = date =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()

  const getFirstDayOfMonth = date =>
    new Date(date.getFullYear(), date.getMonth(), 1).getDay()

  const getMonthYearString = () =>
    currentDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    })

  const getWeekRangeString = () => {
    const start = new Date(currentDate)
    start.setDate(currentDate.getDate() - currentDate.getDay())
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    const fmt = { month: 'short', day: 'numeric' }
    return `${start.toLocaleDateString(
      'en-US',
      fmt
    )} – ${end.toLocaleDateString('en-US', fmt)}`
  }

  // ─── event chip (month / week) ─────────────────────────────────────────────

  const EventChip = ({ event }) => (
    <div
      className={clsx(
        event.color,
        'text-white px-1.5 py-1 rounded-md cursor-pointer hover:brightness-95 active:scale-[0.99] transition-all space-y-0.5 shadow-sm'
      )}
      onClick={() => handleDeploymentSelect(event.deployment)}
      title={`${event.deploymentCode} – ${event.truckPlate} – ${event.shortTitle} at ${event.formattedTime}`}
    >
      <div className='flex items-center justify-between gap-1'>
        <span className='text-xxs xl:text-xs font-medium bg-black/20 px-1.5 py-1 rounded-full leading-none truncate'>
          {event.deploymentCode}
        </span>
        <span className='text-xxs xl:text-xs opacity-90 shrink-0'>
          {event.formattedTime}
        </span>
      </div>
      <div className='text-xxs xl:text-xs truncate opacity-90'>
        {event.truckPlate} – {event.shortTitle}
      </div>
    </div>
  )

  // ─── month view ────────────────────────────────────────────────────────────

  const renderMonthView = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDayOfMonth = getFirstDayOfMonth(currentDate)
    const events = getCalendarEvents()
    const weeks = []
    let currentWeek = []

    for (let i = 0; i < firstDayOfMonth; i++) {
      currentWeek.push(
        <td
          key={`pre-${i}`}
          className='bg-gray-50 border border-gray-100 relative p-0'
        >
          <div style={{ paddingBottom: '100%' }} />
        </td>
      )
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        day
      )
      const dayEvents = events.filter(
        e => e.start.toDateString() === date.toDateString()
      )
      const isToday = date.toDateString() === new Date().toDateString()

      currentWeek.push(
        <td
          key={day}
          className={clsx(
            'border border-gray-100 transition-colors cursor-pointer relative p-0',
            isToday
              ? 'bg-blue-50 ring-1 ring-inset ring-blue-200'
              : 'bg-white hover:bg-gray-50'
          )}
          onClick={() => handleDateCellClick(date)}
        >
          {/* Spacer: padding-bottom:100% makes height === width (square) */}
          <div style={{ paddingBottom: '100%' }} />
          {/* Content sits absolutely over the spacer */}
          <div className='absolute inset-0 flex flex-col overflow-hidden'>
            <div
              className={clsx(
                'text-sm font-bold pt-2 pl-2 shrink-0',
                isToday ? 'text-blue-600' : 'text-gray-700'
              )}
            >
              {day}
            </div>
            <div
              className='flex-1 overflow-y-auto scrollbar-thin p-1 space-y-1 min-h-0'
              onClick={e => e.stopPropagation()}
            >
              {dayEvents.map(event => (
                <EventChip key={event.id} event={event} />
              ))}
            </div>
          </div>
        </td>
      )

      if (currentWeek.length === 7) {
        weeks.push(<tr key={`week-${weeks.length}`}>{currentWeek}</tr>)
        currentWeek = []
      }
    }

    while (currentWeek.length > 0 && currentWeek.length < 7) {
      currentWeek.push(
        <td
          key={`post-${currentWeek.length}`}
          className='bg-gray-50 border border-gray-100 relative p-0'
        >
          <div style={{ paddingBottom: '100%' }} />
        </td>
      )
    }

    if (currentWeek.length > 0) {
      weeks.push(<tr key={`week-${weeks.length}`}>{currentWeek}</tr>)
    }

    return weeks
  }

  // ─── week view ─────────────────────────────────────────────────────────────

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
    const events = getCalendarEvents()

    const headers = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      const isToday = date.toDateString() === new Date().toDateString()
      return (
        <th
          key={i}
          className={clsx(
            'w-[14.28%] p-3 text-center border-b border-gray-200',
            isToday ? 'bg-blue-50' : 'bg-white'
          )}
        >
          <div className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>
            {date.toLocaleDateString('en-US', { weekday: 'short' })}
          </div>
          <div
            className={clsx(
              'text-lg font-bold mt-0.5',
              isToday ? 'text-blue-600' : 'text-gray-800'
            )}
          >
            {date.getDate()}
          </div>
        </th>
      )
    })

    const cells = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      const dayEvents = events.filter(
        e => e.start.toDateString() === date.toDateString()
      )
      const isToday = date.toDateString() === new Date().toDateString()

      return (
        <td
          key={i}
          className={clsx(
            'border border-gray-100 transition-colors align-top',
            isToday
              ? 'bg-blue-50 ring-1 ring-inset ring-blue-200'
              : 'bg-white hover:bg-gray-50'
          )}
          style={{ minHeight: '300px', height: '100%' }}
        >
          <div
            className='p-1.5 space-y-1.5 cursor-pointer h-full'
            style={{ minHeight: '300px' }}
            onClick={() => handleDateCellClick(date)}
          >
            <div onClick={e => e.stopPropagation()} className='space-y-1.5'>
              {dayEvents.length > 0 ? (
                dayEvents.map(event => (
                  <EventChip key={event.id} event={event} />
                ))
              ) : (
                <p className='text-xs italic text-gray-400 text-center py-4'>
                  No events
                </p>
              )}
            </div>
          </div>
        </td>
      )
    })

    return (
      <>
        <thead className='sticky top-0 z-30 bg-white'>
          <tr>{headers}</tr>
        </thead>
        <tbody className='h-full'>
          <tr className='h-full'>{cells}</tr>
        </tbody>
      </>
    )
  }

  // ─── day view ──────────────────────────────────────────────────────────────

  const renderDayView = () => {
    const events = getCalendarEvents().filter(
      e => e.start.toDateString() === currentDate.toDateString()
    )

    const borderColorClass = color => {
      const map = {
        'bg-orange-500': 'border-l-orange-400',
        'bg-emerald-500': 'border-l-emerald-400',
        'bg-blue-500': 'border-l-blue-400',
        'bg-red-500': 'border-l-red-400'
      }
      return map[color] || 'border-l-gray-300'
    }

    if (events.length === 0) {
      return (
        <div className='flex-1 flex items-center justify-center'>
          <p className='text-xs sm:text-sm italic text-gray-400 font-light mt-6'>
            No deployment events for this day
          </p>
        </div>
      )
    }

    return (
      <div className='flex-1 overflow-y-auto scrollbar-thin'>
        <div className='space-y-2 sm:space-y-3'>
          {events.map(event => {
            const deployment = event.deployment
            const pickupSites = (deployment.pickups || [])
              .map(p => p.pickupSite)
              .filter(Boolean)
              .join(', ')

            return (
              <div
                key={event.id}
                className={clsx(
                  'border-l-4 bg-white rounded-xl shadow-sm',
                  'border-t border-r border-b border-gray-200',
                  'cursor-pointer hover:bg-gray-50 active:scale-[0.99] transition-all duration-200',
                  borderColorClass(event.color)
                )}
                onClick={() => handleDeploymentSelect(deployment)}
              >
                {/* Time strip on mobile, inline on sm+ */}
                <div className='flex sm:hidden items-center gap-1.5 px-2.5 pt-2.5 pb-1'>
                  <span
                    className={clsx(
                      'text-xxs px-1.5 py-0.5 rounded-full text-white',
                      event.color
                    )}
                  >
                    {event.formattedTime}
                  </span>
                  <span className='text-xxs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full'>
                    {event.deploymentCode}
                  </span>
                </div>

                <div className='flex items-start gap-3 p-2.5 sm:p-3'>
                  {/* Time — desktop only */}
                  <div className='hidden sm:block text-xs font-medium text-gray-500 min-w-16 shrink-0 pt-0.5'>
                    {event.formattedTime}
                  </div>

                  {/* Content */}
                  <div className='flex-1 min-w-0'>
                    <div className='flex flex-wrap items-center gap-1.5 mb-1'>
                      <span className='hidden sm:inline text-xxs font-semibold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full'>
                        {event.deploymentCode}
                      </span>
                      <span className='font-semibold text-gray-800 text-xxs sm:text-xs capitalize'>
                        {event.truckPlate} – {event.shortTitle}
                      </span>
                    </div>

                    {pickupSites && (
                      <p className='text-xxs sm:text-xs text-gray-500 capitalize'>
                        {pickupSites} → {deployment.destination}
                      </p>
                    )}

                    <div className='flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xxs sm:text-xs text-gray-500 capitalize'>
                      <span>Driver: {getDriverName(deployment)}</span>
                      <StatusBadge status={deployment.status} />
                    </div>

                    {(deployment.pickups || []).length > 0 && (
                      <p className='text-xxs text-gray-400 mt-1'>
                        {deployment.pickups.length} pickup stop
                        {deployment.pickups.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── loading / error states (mirrors Deployments page) ────────────────────

  if (isDeploymentsLoading || isDriverLoading || isTruckLoading) {
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

  if (deploymentsError || truckError || driverError) {
    return (
      <div className='flex-1 flex justify-center items-center'>
        <div className='flex flex-col items-center gap-4 text-center px-4'>
          <img src={error_illustration} alt='error' className='w-52' />
          <div>
            <h1 className='text-lg font-semibold text-gray-700'>
              Something went wrong
            </h1>
            <p className='text-gray-400 text-sm mt-1 max-w-md leading-relaxed'>
              We encountered an unexpected error. Please try again later.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ─── render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className='flex-1 flex flex-col gap-2 sm:gap-4 lg:gap-6'>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className='flex flex-wrap max-xl:flex-col justify-between xl:items-start gap-y-4'>
          {/* Left: title + description */}
          <div className='flex justify-between flex-1 items-center'>
            <div>
              <h1 className='font-bold text-lg sm:text-xl md:text-2xl text-gray-800'>
                Calendar
              </h1>
              <p className='text-xs text-gray-400 mt-0.5'>
                {view === 'month' && getMonthYearString()}
                {view === 'week' && getWeekRangeString()}
                {view === 'day' &&
                  currentDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
              </p>
            </div>
          </div>

          {/* Right: controls */}
          <div className='flex-1 flex max-sm:flex-col justify-between gap-2 sm:gap-4'>
            {/* Spacer so controls push to the right on larger screens */}
            <div className='hidden xl:block flex-1' />

            <div className='flex gap-2 max-sm:justify-between max-sm:w-full'>
              {/* Prev / Today / Next */}
              <div className='flex items-center bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden'>
                <button
                  onClick={prevPeriod}
                  className='p-2 text-xl hover:bg-gray-50 cursor-pointer border-r border-gray-200 text-gray-600 hover:text-gray-800 transition-colors active:scale-95'
                >
                  <MdOutlineKeyboardArrowLeft />
                </button>
                <button
                  onClick={goToToday}
                  className='px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer active:scale-95'
                >
                  Today
                </button>
                <button
                  onClick={nextPeriod}
                  className='p-2 text-xl hover:bg-gray-50 cursor-pointer border-l border-gray-200 text-gray-600 hover:text-gray-800 transition-colors active:scale-95'
                >
                  <MdOutlineKeyboardArrowRight />
                </button>
              </div>

              {/* View switcher */}
              <div className='flex items-center bg-white border border-gray-200 rounded-xl shadow-sm p-1 gap-0.5'>
                {['month', 'week', 'day'].map(v => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={clsx(
                      'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer capitalize',
                      view === v
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Calendar container ──────────────────────────────────────────── */}
        <div className='flex-1 flex flex-col relative bg-white border border-gray-200 rounded-xl overflow-hidden'>
          {/* Month */}
          {view === 'month' && (
            <div className='absolute inset-0 overflow-auto scrollbar-thin'>
              <table
                className='border-collapse table-fixed w-full'
                style={{ minWidth: '1200px' }}
              >
                <colgroup>
                  {Array.from({ length: 7 }).map((_, i) => (
                    <col key={i} style={{ width: '14.2857%' }} />
                  ))}
                </colgroup>
                <thead className='sticky top-0 z-30 bg-white'>
                  <tr>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
                      day => (
                        <th
                          key={day}
                          className='p-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200'
                        >
                          {day}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>{renderMonthView()}</tbody>
              </table>
            </div>
          )}

          {/* Week */}
          {view === 'week' && (
            <div className='absolute inset-0 overflow-auto scrollbar-thin'>
              <table
                className='border-collapse table-fixed w-full h-full'
                style={{ minWidth: '1200px', minHeight: '100%' }}
              >
                <colgroup>
                  {Array.from({ length: 7 }).map((_, i) => (
                    <col key={i} style={{ width: '14.2857%' }} />
                  ))}
                </colgroup>
                {renderWeekView()}
              </table>
            </div>
          )}

          {/* Day */}
          {view === 'day' && (
            <div className='absolute inset-0 overflow-y-auto scrollbar-thin bg-gray-50 p-3 sm:p-4'>
              {renderDayView()}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <DeploymentDetailsModal
        isOpen={isDeploymentDetailsModalOpen}
        onClose={() => setIsDeploymentDetailsModalOpen(false)}
        deployment={selectedDeployment}
        drivers={allDrivers}
        trucks={allTrucks}
        openReplacementModal={() => setIsReplacementModalOpen(true)}
        openReplacementHistory={() => setShowReplacementHistory(true)}
        updatable={false}
      />
      <ReplacementHistoryModal
        isOpen={showReplacementHistory}
        onClose={() => setShowReplacementHistory(false)}
        deployment={selectedDeployment}
      />
    </>
  )
}

export default CalendarPage
