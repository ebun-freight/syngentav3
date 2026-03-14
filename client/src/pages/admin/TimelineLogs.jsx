import React, { useEffect, useState } from 'react'
import { FaFilter, FaSearch } from 'react-icons/fa'
import { IoClose } from 'react-icons/io5'
import {
  MdOutlineKeyboardArrowLeft,
  MdOutlineKeyboardArrowRight
} from 'react-icons/md'
import useGetAllTimelineLogs from '../../hooks/useGetAllTimelineLogs'
import clsx from 'clsx'
import { DateTime } from 'luxon'
import TimelineLogDetailsModal from '../../components/modals/TimelineLogDetailsModal'
import ReplacementHistoryModal from '../../components/modals/ReplacementHistoryModal'
import { useUserContext } from '../../contexts/UserContext'
import { useSettingsContext } from '../../contexts/SettingsContext'
import {
  TableEmpty,
  TableError,
  TableLoading
} from '../../components/TablesState'

const defaultFilters = {
  sort: 'latest',
  status: '',
  subcon: '',
  hybrid: '',
  flagging: '',
  territory: '',
  dateFrom: '',
  dateTo: '',
  search: '',
  perPage: 100,
  page: 1
}

const formatDate = dateString => {
  try {
    if (!dateString) return '—'
    let dt
    if (dateString instanceof Date) {
      dt = DateTime.fromJSDate(dateString, { zone: 'Asia/Manila' })
    } else {
      dt = DateTime.fromISO(dateString, { zone: 'Asia/Manila' })
      if (!dt.isValid)
        dt = DateTime.fromJSDate(new Date(dateString), { zone: 'Asia/Manila' })
    }
    return dt.isValid ? dt.toFormat('MMM dd, yyyy hh:mm a') : '—'
  } catch {
    return '—'
  }
}

const DateRangeFilter = ({ label, fromName, toName, values, onChange }) => (
  <label className='col-span-2 flex flex-col gap-1'>
    <span className='text-xxs font-semibold text-gray-500 uppercase tracking-wider'>
      {label}
    </span>
    <div className='flex items-center gap-2'>
      <div className='flex-1 flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 focus-within:border-primaryColor transition-all'>
        <input
          type='date'
          name={fromName}
          value={values[fromName]}
          onChange={onChange}
          className='w-full focus:outline-none text-xs sm:text-sm text-gray-700 bg-transparent'
        />
      </div>
      <span className='text-xxs text-gray-400 shrink-0'>to</span>
      <div className='flex-1 flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 focus-within:border-primaryColor transition-all'>
        <input
          type='date'
          name={toName}
          value={values[toName]}
          onChange={onChange}
          className='w-full focus:outline-none text-xs sm:text-sm text-gray-700 bg-transparent'
        />
      </div>
    </div>
  </label>
)

const SelectFilter = ({ label, name, value, onChange, colSpan, children }) => (
  <label
    className={clsx('flex flex-col gap-1', colSpan && `col-span-${colSpan}`)}
  >
    <span className='text-xxs font-semibold text-gray-500 uppercase tracking-wider'>
      {label}
    </span>
    <div className='flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 focus-within:border-primaryColor transition-all'>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className='w-full focus:outline-none text-xs sm:text-sm text-gray-700 bg-transparent capitalize'
      >
        {children}
      </select>
    </div>
  </label>
)

function TimelineLogs () {
  // 🚧 Set to false to restore the page
  const [isUnderConstruction] = useState(true)

  const [isTimelineLogDetailsModalOpen, setIsTimelineLogDetailsModalOpen] =
    useState(false)
  const [selectedTimelineLog, setSelectedTimelineLog] = useState({})
  const [showReplacementHistory, setShowReplacementHistory] = useState(false)

  const { getAllTimelineLogsFunction, isLoading } = useGetAllTimelineLogs()
  const [allTimelineLogs, setAllTimelineLogs] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(null)
  const [totalPages, setTotalPages] = useState(null)
  const [error, setError] = useState(null)

  const [filters, setFilters] = useState(defaultFilters)
  const [tempFilters, setTempFilters] = useState(defaultFilters)

  const { userData } = useUserContext()
  const { settings } = useSettingsContext()

  const handleChangeFilter = e => {
    const { name, value } = e.target
    setTempFilters(prev => ({ ...prev, [name]: value }))
  }

  useEffect(() => {
    if (tempFilters.search === '' && filters.search !== '') {
      const delay = setTimeout(() => {
        setFilters(prev => ({ ...prev, search: '' }))
      }, 300)
      return () => clearTimeout(delay)
    }
  }, [tempFilters.search, filters.search])

  const handleApplyFilters = e => {
    e?.preventDefault()
    setFilters(tempFilters)
  }

  const handleResetFilters = () => {
    const isDefault = Object.keys(defaultFilters).every(
      key => tempFilters[key] === defaultFilters[key]
    )
    if (!isDefault) {
      setTempFilters(defaultFilters)
      setFilters(defaultFilters)
    }
  }

  const handleClearSearch = () => {
    setTempFilters(prev => ({ ...prev, search: '' }))
    setFilters(prev => ({ ...prev, search: '' }))
  }

  const handleChangePage = direction => {
    if (direction === 'prev' && filters.page > 1)
      setFilters(prev => ({ ...prev, page: prev.page - 1 }))
    else if (direction === 'next' && filters.page < totalPages)
      setFilters(prev => ({ ...prev, page: prev.page + 1 }))
  }

  const handleShowTimelineLogDetailsModal = data => {
    setSelectedTimelineLog(data)
    setIsTimelineLogDetailsModalOpen(true)
  }

  const getActionTimestamp = log => formatDate(log.timestamp)
  const getDeploymentCode = log => log.targetDeployment?.deploymentCode || 'N/A'

  const getDriverName = log => {
    if (log.targetDeployment?.replacement?.replacementDriverId) {
      const d = log.targetDeployment.replacement.replacementDriverId
      return `${d.firstname || ''} ${d.lastname || ''}`.trim()
    }
    if (log.targetDeployment?.driverId) {
      const d = log.targetDeployment.driverId
      return `${d.firstname || ''} ${d.lastname || ''}`.trim()
    }
    return 'Unknown Driver'
  }

  const getTruckPlate = log => {
    if (log.targetDeployment?.replacement?.replacementTruckId?.plateNo) {
      return log.targetDeployment.replacement.replacementTruckId.plateNo
    }
    return log.targetDeployment?.truckId?.plateNo || 'N/A'
  }

  const getStatusBadgeColor = status => {
    const map = {
      preparing: 'bg-orange-50 text-orange-500',
      ongoing: 'bg-emerald-50 text-emerald-600',
      completed: 'bg-blue-50 text-blue-500',
      canceled: 'bg-red-50 text-red-500'
    }
    return map[status] || 'bg-gray-100 text-gray-500'
  }

  useEffect(() => {
    const fetch = async () => {
      const { timelineLogs, total, page, totalPages, error } =
        await getAllTimelineLogsFunction(filters)
      if (error) setError(error)
      setAllTimelineLogs(timelineLogs || [])
      setTotal(total)
      setPage(page)
      setTotalPages(totalPages)
    }
    fetch()
  }, [filters])

  const btnBase =
    'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed'

  const hasActiveFilters = Object.keys(defaultFilters).some(
    k =>
      !['sort', 'perPage', 'page', 'search'].includes(k) &&
      tempFilters[k] !== defaultFilters[k]
  )

  return (
    <>
      {isUnderConstruction && (
        <div className='flex-1 flex flex-col items-center justify-center gap-4 text-center px-4'>
          <div className='w-16 h-16 rounded-2xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 flex items-center justify-center text-3xl'>
            🚧
          </div>
          <div className='bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1'>
            <span className='text-emerald-500 text-xs font-bold uppercase tracking-widest'>
              Under Construction
            </span>
          </div>
          <div>
            <h2 className='text-gray-800 font-bold text-xl'>
              This page is under maintenance
            </h2>
            <p className='text-gray-400 text-sm mt-1'>Check back soon.</p>
          </div>
        </div>
      )}

      {!isUnderConstruction && (
        <div className='flex-1 flex flex-col gap-4 lg:gap-6'>
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className='flex flex-wrap justify-between items-start gap-4'>
            <div className='flex justify-between flex-1 items-center'>
              <div>
                <h1 className='font-bold text-lg sm:text-xl md:text-2xl text-gray-800'>
                  Deployment Logs
                </h1>
                <p className='text-xs text-gray-400 mt-0.5'>
                  View and track all deployment timeline activity
                </p>
              </div>
            </div>

            <div className='flex flex-wrap justify-between gap-2 w-full xl:w-auto'>
              {/* Search */}
              <form
                onSubmit={handleApplyFilters}
                className='flex flex-1 min-w-0 xl:w-64 items-center bg-white border border-gray-200 rounded-xl px-3 py-2 gap-2 focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20 transition-all shadow-sm'
              >
                <FaSearch className='text-gray-400 text-xs shrink-0' />
                <input
                  type='text'
                  name='search'
                  placeholder='Search logs...'
                  value={tempFilters.search}
                  onChange={handleChangeFilter}
                  autoComplete='off'
                  className='w-full min-w-0 focus:outline-none text-sm text-gray-700 placeholder-gray-400 bg-transparent'
                />
                <button
                  type='button'
                  onClick={handleClearSearch}
                  className={clsx(
                    'rounded-full p-0.5 hover:bg-gray-100 cursor-pointer transition-all duration-200',
                    {
                      'opacity-100': tempFilters.search,
                      'opacity-0 pointer-events-none': !tempFilters.search
                    }
                  )}
                >
                  <IoClose className='text-base text-gray-400' />
                </button>
              </form>

              <div className='flex gap-2 max-sm:justify-between max-sm:w-full'>
                {/* Filter */}
                <div className='dropdown dropdown-start sm:dropdown-center'>
                  <div
                    tabIndex={0}
                    role='button'
                    className={clsx(
                      btnBase,
                      'relative bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm'
                    )}
                  >
                    <FaFilter className='text-xs' />
                    <span>Filter</span>
                    {hasActiveFilters && (
                      <span className='w-2 aspect-square rounded-full bg-emerald-500 shrink-0 absolute -top-0.5 -right-0.5' />
                    )}
                  </div>

                  <div
                    tabIndex='0'
                    className='dropdown-content menu mt-2 bg-white shadow-md rounded-xl border border-gray-100 w-[calc(100vw-2rem)] max-w-sm p-3 sm:p-4'
                    onClick={e => e.stopPropagation()}
                  >
                    <p className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3'>
                      Filter Options
                    </p>
                    <div className='grid grid-cols-2 gap-3'>
                      <SelectFilter
                        label='Sort'
                        name='sort'
                        value={tempFilters.sort}
                        onChange={handleChangeFilter}
                      >
                        <option value='latest'>Latest</option>
                        <option value='oldest'>Oldest</option>
                      </SelectFilter>

                      <SelectFilter
                        label='Status'
                        name='status'
                        value={tempFilters.status}
                        onChange={handleChangeFilter}
                      >
                        <option value=''>All</option>
                        <option value='preparing'>Preparing</option>
                        <option value='ongoing'>Ongoing</option>
                        <option value='completed'>Completed</option>
                        <option value='canceled'>Canceled</option>
                      </SelectFilter>

                      {/* Hybrid — dynamic from settings, same as Deployments */}
                      <SelectFilter
                        label='Hybrid'
                        name='hybrid'
                        value={tempFilters.hybrid}
                        onChange={handleChangeFilter}
                      >
                        <option value=''>All</option>
                        {settings.deployments.hybrid.map((item, index) => (
                          <option key={index} value={item}>
                            {item}
                          </option>
                        ))}
                      </SelectFilter>

                      {/* Flagging — dynamic from settings, same as Deployments */}
                      <SelectFilter
                        label='Flagging'
                        name='flagging'
                        value={tempFilters.flagging}
                        onChange={handleChangeFilter}
                      >
                        <option value=''>All</option>
                        {settings.deployments.flagging.map((item, index) => (
                          <option key={index} value={item}>
                            {item}
                          </option>
                        ))}
                      </SelectFilter>

                      {userData.data.role !== 'subcon' && (
                        <>
                          {userData.data.role !== 'visitor' && (
                            <SelectFilter
                              label='Subcon'
                              name='subcon'
                              value={tempFilters.subcon}
                              onChange={handleChangeFilter}
                            >
                              <option value=''>All</option>
                              {settings.trucksDrivers.subcon.map(
                                (item, index) => (
                                  <option key={index} value={item}>
                                    {item}
                                  </option>
                                )
                              )}
                            </SelectFilter>
                          )}

                          <SelectFilter
                            label='Territory'
                            name='territory'
                            value={tempFilters.territory}
                            onChange={handleChangeFilter}
                            colSpan={
                              userData.data.role === 'visitor' ? 2 : undefined
                            }
                          >
                            <option value=''>All</option>
                            {settings.deployments.territory.map(
                              (item, index) => (
                                <option key={index} value={item}>
                                  {item}
                                </option>
                              )
                            )}
                          </SelectFilter>
                        </>
                      )}

                      <DateRangeFilter
                        label='Timestamp'
                        fromName='dateFrom'
                        toName='dateTo'
                        values={tempFilters}
                        onChange={handleChangeFilter}
                      />

                      <button
                        onClick={handleResetFilters}
                        disabled={isLoading}
                        className={clsx(
                          btnBase,
                          'justify-center bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 text-xs sm:text-sm'
                        )}
                      >
                        Reset
                      </button>
                      <button
                        onClick={handleApplyFilters}
                        disabled={isLoading}
                        className={clsx(
                          btnBase,
                          'justify-center bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 text-xs sm:text-sm'
                        )}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>

                {/* Pagination */}
                <div className='flex items-center bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden'>
                  <button
                    onClick={() => handleChangePage('prev')}
                    disabled={isLoading || filters.page === 1}
                    className='p-2 text-xl hover:bg-gray-50 cursor-pointer border-r border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
                  >
                    <MdOutlineKeyboardArrowLeft />
                  </button>
                  <p className='text-xs text-gray-600 sm:min-w-24 text-center px-2'>
                    {!isLoading &&
                      allTimelineLogs &&
                      `Page ${total > 0 ? page : 0} of ${totalPages}`}
                  </p>
                  <button
                    onClick={() => handleChangePage('next')}
                    disabled={isLoading || filters.page === totalPages}
                    className='p-2 text-xl hover:bg-gray-50 cursor-pointer border-l border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
                  >
                    <MdOutlineKeyboardArrowRight />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Table / States ──────────────────────────────────────────────── */}
          {isLoading ? (
            <TableLoading />
          ) : error ? (
            <TableError />
          ) : !allTimelineLogs || allTimelineLogs.length === 0 ? (
            <TableEmpty />
          ) : (
            <div className='relative flex-1 overflow-y-auto scrollbar-thin bg-white'>
              <div className='absolute inset-0'>
                <table className='table text-xs sm:table-sm table-pin-rows table-pin-cols'>
                  <thead>
                    <tr className='bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide'>
                      <td>{total}</td>
                      <td className='max-sm:pl-2.5'>DP Code</td>
                      <td>Action Details</td>
                      <td>Status</td>
                      <td>Truck Plate</td>
                      <td>Driver</td>
                      <td>TimeSTamp</td>
                    </tr>
                  </thead>
                  <tbody>
                    {allTimelineLogs.map((log, index) => (
                      <tr
                        key={log._id || index}
                        onClick={() => handleShowTimelineLogDetailsModal(log)}
                        className='border-b border-gray-100 last:border-none hover:bg-gray-50 cursor-pointer capitalize align-top transition-colors text-gray-600'
                      >
                        <td className='text-xxs sm:text-xs font-semibold text-gray-400'>
                          {(page - 1) * filters.perPage + index + 1}
                        </td>
                        <td className='p-0 relative max-sm:text-xxs'>
                          <div
                            className='cursor-copy h-full w-fit p-2 hover:bg-gray-100 transition-colors rounded relative group'
                            onClick={e => {
                              e.stopPropagation()
                              const code = getDeploymentCode(log)
                              navigator.clipboard.writeText(code)
                              const div = e.currentTarget
                              const tooltip = document.createElement('div')
                              tooltip.className =
                                'absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50'
                              tooltip.textContent = 'Copied'
                              div.appendChild(tooltip)
                              setTimeout(() => {
                                if (div.contains(tooltip))
                                  div.removeChild(tooltip)
                              }, 1000)
                            }}
                            title='Click to copy'
                          >
                            {getDeploymentCode(log)}
                          </div>
                        </td>

                        <td>
                          <p
                            className='max-sm:text-xxs max-w-xs line-clamp-2 min-w-40'
                            title={log.action}
                          >
                            {log.action}
                          </p>
                        </td>

                        <td>
                          <span
                            className={clsx(
                              'px-2.5 py-1 rounded-full w-fit text-xxs xs:text-xs capitalize',
                              getStatusBadgeColor(log.status)
                            )}
                          >
                            {log.status}
                          </span>
                        </td>

                        <td className='max-sm:text-xxs uppercase'>
                          {getTruckPlate(log)}
                        </td>

                        <td className='max-sm:text-xxs text-nowrap'>
                          {getDriverName(log)}
                        </td>

                        <td className='max-sm:text-xxs text-nowrap'>
                          {getActionTimestamp(log)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <TimelineLogDetailsModal
        isOpen={isTimelineLogDetailsModalOpen}
        onClose={() => setIsTimelineLogDetailsModalOpen(false)}
        timelineLog={selectedTimelineLog}
        openReplacementHistory={() => setShowReplacementHistory(true)}
      />

      <ReplacementHistoryModal
        isOpen={showReplacementHistory}
        onClose={() => setShowReplacementHistory(false)}
        deployment={selectedTimelineLog.targetDeployment}
      />
    </>
  )
}

export default TimelineLogs
