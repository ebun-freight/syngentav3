import React, { useEffect, useState } from 'react'
import { FaFilter } from 'react-icons/fa'
import { empty_illustration, error_illustration } from '../../consts/images'
import {
  MdOutlineKeyboardArrowLeft,
  MdOutlineKeyboardArrowRight
} from 'react-icons/md'
import useGetAllActivityLogs from '../../hooks/useGetAllActivityLogs'
import { DateTime } from 'luxon'
import clsx from 'clsx'
import {
  TableEmpty,
  TableError,
  TableLoading
} from '../../components/TablesState'

const defaultFilters = {
  type: '',
  sort: 'latest',
  date: '',
  perPage: 100,
  page: 1
}

function ActivityLogsPage () {
  const { getAllActivityLogs, isLoading } = useGetAllActivityLogs()
  const [allActivityLogs, setAllActivityLogs] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(null)
  const [totalPages, setTotalPages] = useState(null)
  const [error, setError] = useState(null)

  const [filters, setFilters] = useState(defaultFilters)
  const [tempFilters, setTempFilters] = useState(defaultFilters)

  const handleChangeFilter = e => {
    const { name, value } = e.target
    setTempFilters(prev => ({ ...prev, [name]: value }))
  }

  const handleApplyFilters = e => {
    e.preventDefault()
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

  const handleChangePage = direction => {
    if (direction === 'prev' && filters.page > 1)
      setFilters(prev => ({ ...prev, page: prev.page - 1 }))
    else if (direction === 'next' && filters.page < totalPages)
      setFilters(prev => ({ ...prev, page: prev.page + 1 }))
  }

  useEffect(() => {
    const handleGetAllActivityLogs = async () => {
      const { activityLogs, total, page, totalPages, error } =
        await getAllActivityLogs(filters)
      if (error) setError(error)
      setAllActivityLogs(activityLogs)
      setTotal(total)
      setPage(page)
      setTotalPages(totalPages)
    }
    handleGetAllActivityLogs()
  }, [filters])

  const btnBase =
    'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <div className='flex-1 flex flex-col gap-4 lg:gap-6'>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className='flex flex-wrap justify-between items-start gap-4'>
        <div className='flex justify-between flex-1 items-center'>
          <div>
            <h1 className='font-bold text-lg sm:text-xl md:text-2xl text-gray-800'>
              Activity Logs
            </h1>
            <p className='text-xs text-gray-400 mt-0.5'>
              Track and review all system activity logs
            </p>
          </div>
        </div>

        <div className='flex flex-wrap justify-between gap-2 w-full xl:w-auto'>
          <div className='flex gap-2 max-sm:justify-between max-sm:w-full'>
            {/* Filter */}
            <div className='dropdown dropdown-start sm:dropdown-center'>
              <div
                tabIndex={0}
                role='button'
                className={clsx(
                  btnBase,
                  'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm'
                )}
              >
                <FaFilter className='text-xs' />
                <span>Filter</span>
              </div>

              <div
                tabIndex='0'
                className='dropdown-content menu mt-2 bg-white shadow-md rounded-xl border border-gray-100 w-[calc(100vw-2rem)] max-w-sm p-3 sm:p-4'
              >
                <p className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3'>
                  Filter Options
                </p>
                <div className='grid grid-cols-2 gap-3'>
                  <label className='flex flex-col gap-1'>
                    <span className='text-xxs font-semibold text-gray-500 uppercase tracking-wider'>
                      Type
                    </span>
                    <div className='flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 focus-within:border-primaryColor transition-all'>
                      <select
                        name='type'
                        value={tempFilters.type}
                        onChange={handleChangeFilter}
                        className='w-full focus:outline-none text-sm text-gray-700 bg-transparent'
                      >
                        <option value=''>All</option>
                        <option value='admin'>Admins</option>
                        <option value='deployment'>Deployments</option>
                        <option value='driver'>Drivers</option>
                        <option value='truck'>Trucks</option>
                        <option value='visitor'>Visitors</option>
                      </select>
                    </div>
                  </label>

                  <label className='flex flex-col gap-1'>
                    <span className='text-xxs font-semibold text-gray-500 uppercase tracking-wider'>
                      Sort
                    </span>
                    <div className='flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 focus-within:border-primaryColor transition-all'>
                      <select
                        name='sort'
                        value={tempFilters.sort}
                        onChange={handleChangeFilter}
                        className='w-full focus:outline-none text-sm text-gray-700 bg-transparent'
                      >
                        <option value='latest'>Latest</option>
                        <option value='oldest'>Oldest</option>
                        <option value='a-z'>A to Z</option>
                        <option value='z-a'>Z to A</option>
                      </select>
                    </div>
                  </label>

                  <label className='col-span-2 flex flex-col gap-1'>
                    <span className='text-xxs font-semibold text-gray-500 uppercase tracking-wider'>
                      Date
                    </span>
                    <div className='flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 focus-within:border-primaryColor transition-all'>
                      <input
                        name='date'
                        type='date'
                        value={tempFilters.date}
                        onChange={handleChangeFilter}
                        className='w-full focus:outline-none text-sm text-gray-700 bg-transparent'
                      />
                    </div>
                  </label>

                  <button
                    onClick={handleResetFilters}
                    disabled={isLoading}
                    className={clsx(
                      btnBase,
                      'justify-center bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                    )}
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleApplyFilters}
                    disabled={isLoading}
                    className={clsx(
                      btnBase,
                      'justify-center bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'
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
                  allActivityLogs &&
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
      ) : !allActivityLogs || allActivityLogs.length === 0 ? (
        <TableEmpty />
      ) : (
        <div className='relative flex-1 overflow-y-auto scrollbar-thin bg-white'>
          <div className='absolute inset-0'>
            <table className='table text-xs sm:table-sm table-pin-rows table-pin-cols'>
              <thead>
                <tr className='bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide'>
                  <td>{total}</td>
                  <td>Role</td>
                  <td>Performed by</td>
                  <td>Action</td>
                  <td>Performed at</td>
                </tr>
              </thead>
              <tbody>
                {allActivityLogs.map((activityLog, index) => (
                  <tr
                    key={index}
                    className='border-b border-gray-100 last:border-none hover:bg-gray-50 capitalize align-top transition-colors text-gray-600'
                  >
                    <td className='text-xxs sm:text-xs font-semibold text-gray-400'>
                      {(page - 1) * filters.perPage + index + 1}
                    </td>
                    <td className='capitalize max-sm:text-xxs text-nowrap'>
                      {activityLog?.performedBy?.role?.replace(/_/g, ' ')}
                    </td>
                    <td className='capitalize max-sm:text-xxs text-nowrap'>
                      {`${activityLog?.performedBy?.firstname} ${activityLog?.performedBy?.lastname}`}
                    </td>
                    <td className='max-sm:text-xxs line-clamp-2'>
                      {activityLog?.action}
                    </td>
                    <td className='max-sm:text-xxs text-nowrap'>
                      {DateTime.fromISO(activityLog?.createdAt)
                        .setZone('Asia/Manila')
                        .toFormat('MMM d, yyyy hh:mm a')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default ActivityLogsPage
