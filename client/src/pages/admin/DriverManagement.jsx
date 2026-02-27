import React, { useEffect, useState } from 'react'
import { FaFilter, FaPlus, FaSearch } from 'react-icons/fa'
import {
  empty_illustration,
  error_illustration,
  no_image
} from '../../consts/images'
import {
  MdOutlineKeyboardArrowLeft,
  MdOutlineKeyboardArrowRight
} from 'react-icons/md'
import { IoClose } from 'react-icons/io5'
import clsx from 'clsx'
import CreateDriverModal from '../../components/modals/CreateDriverModal'
import DriverDetailsModal from '../../components/modals/DriverDetailsModal'
import useGetAllDriver from '../../hooks/useGetAllDriver'
import DeleteDriverModal from '../../components/modals/DeleteDriverModal'
import { useUserContext } from '../../contexts/UserContext'
import { useSettingsContext } from '../../contexts/SettingsContext'

const defaultFilters = {
  status: '',
  sort: 'latest',
  subcon: '',
  search: '',
  perPage: 100,
  page: 1
}

function DriverManagement () {
  const [isDriverDetailsModalOpen, setIsDriverDetailsModalOpen] =
    useState(false)
  const [isCreateDriverModalOpen, setIsCreateDriverModalOpen] = useState(false)
  const [isDeleteDriverModalOpen, setIsDeleteDriverModalOpen] = useState(false)

  const { getAllDriverFunction, isLoading } = useGetAllDriver()
  const [allDrivers, setAllDrivers] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(null)
  const [totalPages, setTotalPages] = useState(null)
  const [error, setError] = useState(null)
  const [selectedDriver, setSelectedDriver] = useState({})

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
      const delaySearch = setTimeout(() => {
        setFilters(prev => ({ ...prev, search: '' }))
      }, 300)
      return () => clearTimeout(delaySearch)
    }
  }, [tempFilters.search, filters.search])

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

  const handleShowDriverDetailsModal = data => {
    setSelectedDriver(data)
    setIsDriverDetailsModalOpen(true)
  }

  const handleUpdateAllAdmins = updatedDriver => {
    setAllDrivers(prev =>
      prev.map(driver =>
        driver._id === updatedDriver._id ? updatedDriver : driver
      )
    )
  }

  const handleRemoveDeletedDriver = deletedDriver => {
    setAllDrivers(prev => prev.filter(driver => driver._id !== deletedDriver))
    setIsDeleteDriverModalOpen(false)
    setIsDriverDetailsModalOpen(false)
  }

  const handleAddNewDriver = newDriver => {
    setAllDrivers(prev => [newDriver, ...prev])
  }

  useEffect(() => {
    const handleGetAllDrivers = async () => {
      const { drivers, total, page, totalPages, error } =
        await getAllDriverFunction(filters)
      if (error) setError(error)
      setAllDrivers(drivers)
      setTotal(total)
      setPage(page)
      setTotalPages(totalPages)
    }
    handleGetAllDrivers()
  }, [filters])

  const btnBase =
    'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <>
      <div className='flex-1 flex flex-col gap-4 lg:gap-6'>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className='flex flex-wrap justify-between items-start gap-4'>
          <div className='flex justify-between flex-1 items-center'>
            <div>
              <h1 className='font-bold text-lg sm:text-xl md:text-2xl text-gray-800'>
                Manage Drivers
              </h1>
              <p className='text-xs text-gray-400 mt-0.5'>
                View and manage all drivers in the system
              </p>
            </div>

            <div className='flex gap-2 max-sm:hidden xl:hidden'>
              {['head_admin', 'admin'].includes(userData.data.role) && (
                <button
                  onClick={() => setIsCreateDriverModalOpen(true)}
                  disabled={isLoading}
                  className={clsx(
                    btnBase,
                    'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'
                  )}
                >
                  <FaPlus className='text-xs' />
                  <span>Create New</span>
                </button>
              )}
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
                placeholder='Search drivers...'
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
                          <option value='trips-asc'>Trip-asc</option>
                          <option value='trips-desc'>Trip-desc</option>
                          <option value='subcon-desc'>Subcon-desc</option>
                          <option value='subcon-asc'>Subcon-asc</option>
                        </select>
                      </div>
                    </label>

                    <label className='flex flex-col gap-1'>
                      <span className='text-xxs font-semibold text-gray-500 uppercase tracking-wider'>
                        Status
                      </span>
                      <div className='flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 focus-within:border-primaryColor transition-all'>
                        <select
                          name='status'
                          value={tempFilters.status}
                          onChange={handleChangeFilter}
                          className='w-full focus:outline-none text-sm text-gray-700 bg-transparent capitalize'
                        >
                          <option value=''>All</option>
                          {settings.trucksDrivers.status.map((item, index) => (
                            <option key={index} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>

                    {userData.data.role !== 'subcon' && (
                      <label className='col-span-full flex flex-col gap-1'>
                        <span className='text-xxs font-semibold text-gray-500 uppercase tracking-wider'>
                          Subcon
                        </span>
                        <div className='flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 focus-within:border-primaryColor transition-all'>
                          <select
                            name='subcon'
                            value={tempFilters.subcon}
                            onChange={handleChangeFilter}
                            className='w-full focus:outline-none text-sm text-gray-700 bg-transparent capitalize'
                          >
                            <option value=''>All</option>
                            {settings.trucksDrivers.subcon.map(
                              (item, index) => (
                                <option key={index} value={item}>
                                  {item}
                                </option>
                              )
                            )}
                          </select>
                        </div>
                      </label>
                    )}

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
                    allDrivers &&
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

              {/* xl Create */}
              {['head_admin', 'admin'].includes(userData.data.role) && (
                <button
                  onClick={() => setIsCreateDriverModalOpen(true)}
                  disabled={isLoading}
                  className={clsx(
                    btnBase,
                    'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 max-xl:hidden'
                  )}
                >
                  <FaPlus className='text-xs' />
                  <span>Create New</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Table / States ──────────────────────────────────────────────── */}
        {isLoading ? (
          <div className='flex-1 flex items-center justify-center'>
            <div className='flex flex-col items-center gap-4 text-center'>
              <span className='loading loading-spinner loading-lg text-primaryColor' />
              <p className='text-gray-500 text-sm font-medium'>
                Loading content...
              </p>
            </div>
          </div>
        ) : error ? (
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
        ) : allDrivers.length === 0 ? (
          <div className='flex-1 flex justify-center items-center'>
            <div className='flex flex-col items-center gap-4 text-center px-4'>
              <img src={empty_illustration} alt='empty' className='w-52' />
              <div>
                <h1 className='text-lg font-semibold text-gray-700'>
                  Nothing to show here
                </h1>
                <p className='text-gray-400 text-sm mt-1 max-w-md leading-relaxed'>
                  {tempFilters.search || tempFilters.status
                    ? 'Try adjusting your search terms or filters to see more results'
                    : 'Get started by adding your first driver to the system'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className='relative flex-1 overflow-y-auto scrollbar-thin bg-white border border-gray-200 rounded-xl shadow-sm'>
            <div className='absolute inset-0'>
              <table className='table text-xs sm:table-sm table-pin-rows table-pin-cols'>
                <thead>
                  <tr className='bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide'>
                    <td>{total}</td>
                    <td>Image</td>
                    <td>Fullname</td>
                    <td>Phone No.</td>
                    <td>License No.</td>
                    <td>Subcon</td>
                    <td>Trip Count</td>
                    <td>Status</td>
                  </tr>
                </thead>
                <tbody>
                  {allDrivers.map((driver, index) => (
                    <tr
                      key={index}
                      onClick={() => handleShowDriverDetailsModal(driver)}
                      className='border-b border-gray-100 last:border-none hover:bg-gray-50 capitalize cursor-pointer align-top transition-colors'
                    >
                      <td className='text-xxs sm:text-xs font-semibold text-gray-400'>
                        {(page - 1) * filters.perPage + index + 1}
                      </td>
                      <td className='py-0'>
                        <img
                          src={driver.imageUrl || no_image}
                          alt='img'
                          className={clsx(
                            'w-8 sm:w-9 aspect-square object-cover object-center mask mask-squircle',
                            { 'opacity-10': !driver.imageUrl }
                          )}
                        />
                      </td>
                      <td>
                        <p className='max-sm:text-xxs text-nowrap capitalize font-medium text-gray-800'>
                          {`${driver.firstname} ${driver.lastname}`}
                        </p>
                      </td>
                      <td className='max-sm:text-xxs text-gray-600'>
                        {driver.phoneNo}
                      </td>
                      <td>
                        {driver.licenseNo ? (
                          <p className='text-nowrap uppercase max-sm:text-xxs text-gray-600'>
                            {driver.licenseNo}
                          </p>
                        ) : (
                          <p className='text-gray-400 max-sm:text-xxs'>N/A</p>
                        )}
                      </td>
                      <td className='max-sm:text-xxs text-nowrap text-gray-600'>
                        {driver.subcon
                          ? driver.subcon.replace(/_/g, ' ')
                          : 'N/A'}
                      </td>
                      <td className='max-sm:text-xxs text-gray-600'>
                        {driver.tripCount}
                      </td>
                      <td>
                        <div
                          className={clsx(
                            'px-2.5 py-1 rounded-full w-fit text-xs font-medium',
                            {
                              'bg-emerald-50 text-emerald-600':
                                driver.status === 'available',
                              'bg-blue-50 text-blue-500':
                                driver.status === 'deployed',
                              'bg-red-50 text-red-500':
                                driver.status === 'unavailable'
                            }
                          )}
                        >
                          {driver.status}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <DriverDetailsModal
        isOpen={isDriverDetailsModalOpen}
        onClose={() => setIsDriverDetailsModalOpen(false)}
        driver={selectedDriver}
        onUpdate={handleUpdateAllAdmins}
        openDeleteModal={() => setIsDeleteDriverModalOpen(true)}
      />
      <CreateDriverModal
        isOpen={isCreateDriverModalOpen}
        onClose={() => setIsCreateDriverModalOpen(false)}
        onCreate={handleAddNewDriver}
      />
      <DeleteDriverModal
        isOpen={isDeleteDriverModalOpen}
        onClose={() => setIsDeleteDriverModalOpen(false)}
        driver={selectedDriver}
        onDelete={handleRemoveDeletedDriver}
      />
    </>
  )
}

export default DriverManagement
