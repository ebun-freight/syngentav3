import React, { useState, useEffect } from 'react'
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from 'react-icons/md'
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

  // ─── build calendar events from deployment data ────────────────────────────

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
      // 1. Deployment created / canceled marker
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

      // 2. Departed from station (top-level field)
      const departedEvent = makeEvent(
        deployment,
        deployment.departed,
        'departed',
        'Departure',
        FaTruck
      )
      if (departedEvent)
        events.push(departedEvent)

        // 3. Per-pickup-stop events — pickupIn / pickupOut live inside pickups[]
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

      // 4. Destination arrival / departure (top-level fields)
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
    currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

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

  // ─── shared event chip ─────────────────────────────────────────────────────

  const EventChip = ({ event }) => (
    <div
      className={`${event.color} text-white text-xs p-2 rounded cursor-pointer hover:brightness-95 transition-opacity space-y-1`}
      onClick={() => handleDeploymentSelect(event.deployment)}
      title={`${event.deploymentCode} – ${event.truckPlate} – ${event.shortTitle} at ${event.formattedTime}`}
    >
      <div className='flex items-center justify-between gap-1'>
        <span className='text-xs font-medium bg-black/20 px-2 py-0.5 rounded-full'>
          {event.deploymentCode}
        </span>
        <span className='text-xs font-medium opacity-90'>
          {event.formattedTime}
        </span>
      </div>
      <div className='text-xs truncate'>
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
          className='min-h-32 p-2 bg-gray-50 border border-gray-200'
        />
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
          className={`min-h-32 border border-gray-200 transition-colors cursor-pointer align-top ${
            isToday
              ? 'bg-blue-50 ring-1 ring-blue-200'
              : 'bg-white hover:bg-gray-50'
          }`}
          onClick={() => handleDateCellClick(date)}
        >
          <div
            className={`font-semibold pt-2 pl-2 ${
              isToday ? 'text-blue-600' : 'text-gray-700'
            }`}
          >
            {day}
          </div>
          <div
            className='space-y-1 h-48 overflow-y-auto scrollbar-thin p-1'
            onClick={e => e.stopPropagation()}
          >
            {dayEvents.map(event => (
              <EventChip key={event.id} event={event} />
            ))}
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
          className='min-h-32 p-2 bg-gray-50 border border-gray-200'
        />
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
          className={`w-[14.28%] p-3 text-center border-b border-gray-200 ${
            isToday ? 'bg-blue-50' : 'bg-white'
          }`}
        >
          <div className='font-semibold text-gray-600 uppercase text-sm'>
            {date.toLocaleDateString('en-US', { weekday: 'short' })}
          </div>
          <div
            className={`text-lg font-bold ${
              isToday ? 'text-blue-600' : 'text-gray-800'
            }`}
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
          className={`border border-gray-200 transition-colors align-top relative overflow-y-auto scrollbar-thin ${
            isToday
              ? 'bg-blue-50 ring-1 ring-blue-200'
              : 'bg-white hover:bg-gray-50'
          }`}
        >
          <div className='absolute top-0 left-0 right-0'>
            <div
              className='p-1 space-y-2 cursor-pointer'
              onClick={() => handleDateCellClick(date)}
            >
              <div onClick={e => e.stopPropagation()} className='space-y-1'>
                {dayEvents.length > 0 ? (
                  dayEvents.map(event => (
                    <EventChip key={event.id} event={event} />
                  ))
                ) : (
                  <div className='text-sm italic text-gray-400 text-center py-4'>
                    No events
                  </div>
                )}
              </div>
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
        <tbody>
          <tr>{cells}</tr>
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
        'bg-orange-500': 'border-orange-500',
        'bg-emerald-500': 'border-emerald-500',
        'bg-blue-500': 'border-blue-500',
        'bg-red-500': 'border-red-500'
      }
      return map[color] || 'border-gray-400'
    }

    if (events.length === 0) {
      return (
        <div className='flex-1 overflow-y-auto scrollbar-thin relative'>
          <div className='text-center text-gray-500 py-8 italic'>
            No deployment events for this day
          </div>
        </div>
      )
    }

    return (
      <div className='flex-1 overflow-y-auto scrollbar-thin relative'>
        <div className='space-y-3 absolute top-0 left-0 right-0'>
          {events.map(event => {
            const deployment = event.deployment

            // Collect pickup site names for display
            const pickupSites = (deployment.pickups || [])
              .map(p => p.pickupSite)
              .filter(Boolean)
              .join(', ')

            return (
              <div
                key={event.id}
                className={`border-l-4 ${borderColorClass(
                  event.color
                )} p-4 bg-white outline outline-gray-100 rounded overflow-hidden cursor-pointer hover:bg-gray-100 transition-colors`}
                onClick={() => handleDeploymentSelect(deployment)}
              >
                <div className='flex items-start space-x-4'>
                  <div className='text-sm min-w-20 font-medium'>
                    {event.formattedTime}
                  </div>
                  <div className='flex-1'>
                    <div className='flex items-center gap-2 mb-1'>
                      <div className='text-xs font-medium bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full'>
                        {event.deploymentCode}
                      </div>
                      <div className='font-semibold text-gray-800'>
                        {event.truckPlate} – {event.shortTitle}
                      </div>
                    </div>

                    {pickupSites && (
                      <div className='text-sm text-gray-600 capitalize'>
                        {pickupSites} → {deployment.destination}
                      </div>
                    )}

                    <div className='text-sm text-gray-500 mt-1 capitalize'>
                      Driver: {getDriverName(deployment)}
                    </div>
                    <div className='text-sm text-gray-500 capitalize'>
                      Status: {deployment.status}
                    </div>

                    {/* Show pickup stops summary */}
                    {(deployment.pickups || []).length > 0 && (
                      <div className='text-xs text-gray-400 mt-1'>
                        {deployment.pickups.length} pickup stop
                        {deployment.pickups.length !== 1 ? 's' : ''}
                        {deployment.pickups.some(p => p.pickupIn || p.pickupOut)
                          ? ' (timeline logged)'
                          : ''}
                      </div>
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

  // ─── loading / error states ────────────────────────────────────────────────

  if (isDeploymentsLoading || isDriverLoading || isTruckLoading) {
    return (
      <div className='flex-1 flex items-center justify-center'>
        <div className='flex flex-col items-center justify-center gap-4 text-center'>
          <span className='loading loading-spinner loading-lg text-emerald-500' />
          <p className='text-gray-600 font-medium'>Loading deployments...</p>
        </div>
      </div>
    )
  }

  if (deploymentsError || truckError || driverError) {
    return (
      <div className='flex-1 flex justify-center items-center'>
        <div className='flex flex-col justify-center items-center gap-4 px-4 text-center'>
          <img src={error_illustration} alt='error' className='w-56' />
          <div className='space-y-2'>
            <h1 className='text-xl font-semibold text-gray-700'>
              Something went wrong
            </h1>
            <p className='text-gray-500 max-w-md leading-relaxed'>
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
      <div className='flex-1 flex flex-col gap-6'>
        {/* Header / controls */}
        <div className='bg-white shadow-card3 outline outline-gray-200 rounded flex items-center justify-between gap-4'>
          <div className='text-2xl font-semibold px-4'>
            {view === 'month' && getMonthYearString()}
            {view === 'week' && getWeekRangeString()}
            {view === 'day' &&
              currentDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
          </div>

          <div className='flex gap-6'>
            <div className='flex items-center py-1'>
              <button
                onClick={prevPeriod}
                className='py-4 px-6 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-800 text-xl cursor-pointer'
              >
                <MdKeyboardArrowLeft />
              </button>
              <button
                onClick={goToToday}
                className='px-3 py-4 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer'
              >
                Today
              </button>
              <button
                onClick={nextPeriod}
                className='py-4 px-6 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-800 text-xl cursor-pointer'
              >
                <MdKeyboardArrowRight />
              </button>
            </div>

            <div className='flex space-x-1 p-1 rounded-lg'>
              {['month', 'week', 'day'].map(v => (
                <button
                  key={v}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                    view === v
                      ? 'bg-blue-500/10 text-blue-500'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  onClick={() => setView(v)}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar container */}
        <div className='flex-1 flex flex-col relative shadow-card3 outline outline-gray-200 rounded overflow-hidden'>
          {view === 'month' && (
            <div className='absolute inset-0'>
              <div className='h-full flex flex-col'>
                <div className='flex-1 overflow-auto scrollbar-thin'>
                  <table className='w-full h-full border-collapse'>
                    <thead className='sticky top-0 z-30 bg-white'>
                      <tr>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
                          day => (
                            <th
                              key={day}
                              className='w-[14.28%] p-4 text-center font-semibold text-gray-600 uppercase text-sm border-b border-gray-200'
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
              </div>
            </div>
          )}

          {view === 'week' && (
            <div className='flex-1 flex flex-col overflow-hidden'>
              <table className='w-full h-full border-collapse'>
                {renderWeekView()}
              </table>
            </div>
          )}

          {view === 'day' && (
            <div className='flex-1 flex flex-col overflow-hidden bg-white p-4'>
              {renderDayView()}
            </div>
          )}
        </div>
      </div>

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
