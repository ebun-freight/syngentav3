import React, { useEffect, useState } from 'react'
import DeploymentDetailsModal from '../../components/modals/DeploymentDetailsModal'
import CreateDeploymentModal from '../../components/modals/CreateDeploymentModal'
import useGetAllTruck from '../../hooks/useGetAllTruck'
import useGetAllDriver from '../../hooks/useGetAllDriver'
import { FaFilter, FaPlus, FaSearch } from 'react-icons/fa'
import { DEPLOYMENT_STATUS } from '../../utils/generalOptions'
import { IoClose } from 'react-icons/io5'
import {
  MdOutlineKeyboardArrowLeft,
  MdOutlineKeyboardArrowRight
} from 'react-icons/md'
import { BiExport } from 'react-icons/bi'
import { FaFolderOpen } from 'react-icons/fa'
import { IoReceipt } from 'react-icons/io5'
import clsx from 'clsx'
import useGetAllDeployment from '../../hooks/useGetAllDeployment'
import { empty_illustration, error_illustration } from '../../consts/images'
import { DateTime } from 'luxon'
import ReplacementModal from '../../components/modals/ReplacementModal'
import ReplacementHistoryModal from '../../components/modals/ReplacementHistoryModal'
import { useUserContext } from '../../contexts/UserContext'
import DeleteDeploymentModal from '../../components/modals/DeleteDeploymentModal'
import { TbReceiptFilled } from 'react-icons/tb'
import { exportDeploymentToExcel } from '../../utils/exportDeploymentToExcel'
import { exportBillingToExcel } from '../../utils/exportBillingToExcel'
import { exportSubconBillingToExcel } from '../../utils/exportSubconBillingToExcel'
import { useSettingsContext } from '../../contexts/SettingsContext'

const defaultFilters = {
  status: '',
  sort: 'latest',
  subcon: '',
  territory: '',
  assignedAt: '',
  departedAt: '',
  search: '',
  perPage: 200,
  page: 1
}

const formatISO = iso =>
  iso
    ? DateTime.fromISO(iso)
        .setZone('Asia/Manila')
        .toFormat('MMM d, yyyy hh:mm a')
    : null

const PickupStopsCell = ({ pickups = [], field, status }) => {
  const stopsWithValue = pickups.filter(p => p[field])

  if (stopsWithValue.length === 0) {
    return (
      <p className='italic text-gray-400 font-light text-xxs sm:text-xs'>
        {status === 'canceled' ? 'Canceled' : 'Pending'}
      </p>
    )
  }

  return (
    <div className='space-y-1'>
      {pickups.map((stop, i) => (
        <div key={i} className='flex items-center gap-1.5 text-nowrap'>
          <span className='text-xxs font-semibold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full leading-none shrink-0'>
            S{i + 1}
          </span>
          {stop[field] ? (
            <span className='text-xxs sm:text-xs'>
              {formatISO(stop[field])}
            </span>
          ) : (
            <span className='italic text-gray-400 font-light text-xxs sm:text-xs'>
              {status === 'canceled' ? 'Canceled' : 'Pending'}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function Deployments () {
  const { userData } = useUserContext()
  const { settings } = useSettingsContext()

  const [isDeploymentDetailsModalOpen, setIsDeploymentDetailsModalOpen] =
    useState(false)
  const [isCreateDeploymentModalOpen, setIsCreateDeploymentModalOpen] =
    useState(false)
  const [isReplacementModalOpen, setIsReplacementModalOpen] = useState(false)
  const [showReplacementHistory, setShowReplacementHistory] = useState(false)
  const [isDeleteDeploymentModalOpen, setIsDeleteDeploymentModalOpen] =
    useState(false)

  const { getAllDeploymentFunction, isLoading: isDeploymentLoading } =
    useGetAllDeployment()
  const { getAllTruckFunction, isLoading: isTruckLoading } = useGetAllTruck()
  const { getAllDriverFunction, isLoading: isDriverLoading } = useGetAllDriver()

  const [allDeployments, setAllDeployments] = useState([])
  const [allTrucks, setAllTrucks] = useState([])
  const [allDrivers, setAllDrivers] = useState([])
  const [deploymentError, setDeploymentError] = useState(null)
  const [truckError, setTruckError] = useState(null)
  const [driverError, setDriverError] = useState(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(null)
  const [totalPages, setTotalPages] = useState(null)
  const [selectedDeployment, setSelectedDeployment] = useState({})
  const [selectedIds, setSelectedIds] = useState(new Set())

  const isAllSelected =
    allDeployments.length > 0 &&
    allDeployments.every(d => selectedIds.has(d._id))
  const isIndeterminate = selectedIds.size > 0 && !isAllSelected

  const handleToggleSelectAll = () => {
    if (isAllSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(allDeployments.map(d => d._id)))
  }

  const handleToggleSelect = (e, id) => {
    e.stopPropagation()
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleClearSelection = () => setSelectedIds(new Set())

  const deploymentsForExport =
    selectedIds.size > 0
      ? allDeployments.filter(d => selectedIds.has(d._id))
      : allDeployments

  const [filters, setFilters] = useState(defaultFilters)
  const [tempFilters, setTempFilters] = useState(defaultFilters)

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

  const handleExportToExcel = () =>
    exportDeploymentToExcel(deploymentsForExport)
  const handleExportToBillingToExcel = async () =>
    await exportBillingToExcel(deploymentsForExport)
  const handleExportToSubconBillingToExcel = async () =>
    await exportSubconBillingToExcel(deploymentsForExport, userData)

  const handleAddNewDeployment = newDeployment => {
    setAllDeployments(prev => [newDeployment, ...prev])
  }

  const handleShowTruckDetailsModal = async data => {
    setSelectedDeployment(data)
    setIsDeploymentDetailsModalOpen(true)
  }

  const handleUpdateAllDeployments = updatedDeployment => {
    setAllDeployments(prev =>
      prev.map(d => (d._id === updatedDeployment._id ? updatedDeployment : d))
    )
  }

  const handleRemoveDeletedDeployment = deletedDeployment => {
    setAllDeployments(prev => prev.filter(d => d._id !== deletedDeployment))
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.delete(deletedDeployment)
      return next
    })
    setIsDeleteDeploymentModalOpen(false)
    setIsDeploymentDetailsModalOpen(false)
  }

  useEffect(() => {
    const handleGetAllDeployment = async () => {
      const { deployments, total, page, totalPages, error } =
        await getAllDeploymentFunction(filters)
      if (error) setDeploymentError(error)
      setAllDeployments(deployments)
      setTotal(total)
      setPage(page)
      setTotalPages(totalPages)
      setSelectedIds(new Set())
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
    handleGetAllDeployment()
    handleGetAllTrucks()
    handleGetAllDrivers()
  }, [filters])

  /* ── shared button/control styles ── */
  const btnBase =
    'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed'

  /* ── Export dropdown (shared content) ── */
  const ExportDropdownContent = () => (
    <div
      tabIndex='0'
      className='dropdown-content menu mt-2 bg-white shadow-md rounded-xl border border-gray-100 w-[calc(100vw-2rem)] max-w-xs p-1.5'
    >
      {selectedIds.size > 0 ? (
        <div className='px-3 py-2 flex items-center justify-between'>
          <p className='text-xs text-blue-600 font-semibold'>
            {selectedIds.size} row{selectedIds.size > 1 ? 's' : ''} selected
          </p>
          <button
            onClick={handleClearSelection}
            className='text-xs text-gray-400 hover:text-gray-600 cursor-pointer'
          >
            Clear
          </button>
        </div>
      ) : (
        <p className='px-3 pt-2 pb-1 text-xs text-gray-400'>
          Exporting all {allDeployments.length} rows
        </p>
      )}

      <div className='border-t border-gray-100 my-1' />

      <button
        onClick={handleExportToExcel}
        disabled={isDeploymentLoading || allDeployments.length === 0}
        className='w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 rounded-xl flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95 transition-all'
      >
        <FaFolderOpen className='text-lg text-blue-500 shrink-0' />
        <div>
          <p className='font-medium text-gray-700'>Full Export</p>
          <p className='text-xs text-gray-400'>All deployment details</p>
        </div>
      </button>

      <div className='border-t border-gray-100 my-1' />

      <button
        onClick={handleExportToBillingToExcel}
        disabled={isDeploymentLoading || allDeployments.length === 0}
        className='w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 rounded-xl flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95 transition-all'
      >
        <IoReceipt className='text-lg text-purple-500 shrink-0' />
        <div>
          <p className='font-medium text-gray-700'>Billing Export</p>
          <p className='text-xs text-gray-400'>Simplified billing data</p>
        </div>
      </button>

      <div className='border-t border-gray-100 my-1' />

      <button
        onClick={handleExportToSubconBillingToExcel}
        disabled={isDeploymentLoading || allDeployments.length === 0}
        className='w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 rounded-xl flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95 transition-all'
      >
        <TbReceiptFilled className='text-lg text-orange-500 shrink-0' />
        <div>
          <p className='font-medium text-gray-700'>Subcon Billing Export</p>
          <p className='text-xs text-gray-400'>Subcon billing data</p>
        </div>
      </button>
    </div>
  )

  return (
    <>
      {/* ── Copied exact container structure from ActivityLogsPage ── */}
      <div className='flex-1 flex flex-col gap-2 sm:gap-4 lg:gap-6'>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className='flex flex-wrap max-xl:flex-col justify-between xl:items-start max-xs:gap-x-36 gap-x-99 gap-y-4'>
          {/* Left: title + description + sm/md export+create */}
          <div className='flex justify-between flex-1 items-center'>
            <div>
              <h1 className='font-bold text-lg sm:text-xl md:text-2xl text-gray-800'>
                Deployments
              </h1>
              <p className='text-xs text-gray-400 mt-0.5'>
                Manage and track all truck deployments
              </p>
            </div>

            <div className='flex gap-2 max-sm:hidden xl:hidden'>
              {['head_admin', 'admin'].includes(userData.data.role) && (
                <div className='dropdown dropdown-end sm:dropdown-center'>
                  <div
                    tabIndex={0}
                    role='button'
                    className={clsx(
                      btnBase,
                      'bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100'
                    )}
                  >
                    <BiExport className='text-base' />
                    <span>Export</span>
                    {selectedIds.size > 0 && (
                      <span className='bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none'>
                        {selectedIds.size}
                      </span>
                    )}
                  </div>
                  <ExportDropdownContent />
                </div>
              )}

              {['head_admin', 'admin'].includes(userData.data.role) && (
                <button
                  onClick={() => setIsCreateDeploymentModalOpen(true)}
                  disabled={isDeploymentLoading}
                  className={clsx(
                    btnBase,
                    'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'
                  )}
                >
                  <FaPlus className='text-xs' />
                  <span>Deploy Truck</span>
                </button>
              )}
            </div>
          </div>

          {/* Right: search + filter + pagination + xl export+create */}
          <div className='flex-1 flex max-sm:flex-col justify-between gap-2 sm:gap-4'>
            {/* Search */}
            <form
              onSubmit={handleApplyFilters}
              className='flex flex-1 min-w-0 xl:w-64 items-center bg-white border border-gray-200 rounded-xl px-3 py-2 gap-2 focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20 transition-all shadow-sm'
            >
              <FaSearch className='text-gray-400 text-xs shrink-0' />
              <input
                type='text'
                name='search'
                placeholder='Search deployments...'
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
                        Status
                      </span>
                      <div className='flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 focus-within:border-primaryColor transition-all'>
                        <select
                          name='status'
                          value={tempFilters.status}
                          onChange={handleChangeFilter}
                          className='w-full focus:outline-none text-sm text-gray-700 bg-transparent'
                        >
                          <option value=''>All</option>
                          {DEPLOYMENT_STATUS.map((item, index) => (
                            <option key={index} value={item.value}>
                              {item.label}
                            </option>
                          ))}
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
                        </select>
                      </div>
                    </label>

                    {userData.data.role !== 'subcon' && (
                      <>
                        {userData.data.role !== 'visitor' && (
                          <label className='flex flex-col gap-1'>
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

                        <label
                          className={clsx('flex flex-col gap-1', {
                            'col-span-2': userData.data.role === 'visitor'
                          })}
                        >
                          <span className='text-xxs font-semibold text-gray-500 uppercase tracking-wider'>
                            Territory
                          </span>
                          <div className='flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 focus-within:border-primaryColor transition-all'>
                            <select
                              name='territory'
                              value={tempFilters.territory}
                              onChange={handleChangeFilter}
                              className='w-full focus:outline-none text-sm text-gray-700 bg-transparent capitalize'
                            >
                              <option value=''>All</option>
                              {settings.deployments.territory.map(
                                (item, index) => (
                                  <option key={index} value={item}>
                                    {item}
                                  </option>
                                )
                              )}
                            </select>
                          </div>
                        </label>
                      </>
                    )}

                    <label className='col-span-2 flex flex-col gap-1'>
                      <span className='text-xxs font-semibold text-gray-500 uppercase tracking-wider'>
                        Assigned At
                      </span>
                      <div className='flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 focus-within:border-primaryColor transition-all'>
                        <input
                          type='date'
                          name='assignedAt'
                          value={tempFilters.assignedAt}
                          onChange={handleChangeFilter}
                          className='w-full focus:outline-none text-sm text-gray-700 bg-transparent'
                        />
                      </div>
                    </label>

                    <label className='col-span-2 flex flex-col gap-1'>
                      <span className='text-xxs font-semibold text-gray-500 uppercase tracking-wider'>
                        Departed At
                      </span>
                      <div className='flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 focus-within:border-primaryColor transition-all'>
                        <input
                          type='date'
                          name='departedAt'
                          value={tempFilters.departedAt}
                          onChange={handleChangeFilter}
                          className='w-full focus:outline-none text-sm text-gray-700 bg-transparent'
                        />
                      </div>
                    </label>

                    <button
                      onClick={handleResetFilters}
                      disabled={isDeploymentLoading}
                      className={clsx(
                        btnBase,
                        'justify-center bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                      )}
                    >
                      Reset
                    </button>
                    <button
                      onClick={handleApplyFilters}
                      disabled={isDeploymentLoading}
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
                  disabled={isDeploymentLoading || filters.page === 1}
                  className='p-2 text-xl hover:bg-gray-50 cursor-pointer border-r border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
                >
                  <MdOutlineKeyboardArrowLeft />
                </button>
                <p className='text-xs text-gray-600 sm:min-w-24 text-center px-2'>
                  {!isDeploymentLoading &&
                    allDeployments &&
                    `Page ${total > 0 ? page : 0} of ${totalPages}`}
                </p>
                <button
                  onClick={() => handleChangePage('next')}
                  disabled={isDeploymentLoading || filters.page === totalPages}
                  className='p-2 text-xl hover:bg-gray-50 cursor-pointer border-l border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
                >
                  <MdOutlineKeyboardArrowRight />
                </button>
              </div>

              {/* xl Export */}
              {['head_admin', 'admin'].includes(userData.data.role) && (
                <div className='dropdown dropdown-end sm:dropdown-center max-xl:hidden'>
                  <div
                    tabIndex={0}
                    role='button'
                    className={clsx(
                      btnBase,
                      'bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100'
                    )}
                  >
                    <BiExport className='text-base' />
                    <span>Export</span>
                    {selectedIds.size > 0 && (
                      <span className='bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none'>
                        {selectedIds.size}
                      </span>
                    )}
                  </div>
                  <ExportDropdownContent />
                </div>
              )}

              {/* xl Create */}
              {['head_admin', 'admin'].includes(userData.data.role) && (
                <button
                  onClick={() => setIsCreateDeploymentModalOpen(true)}
                  disabled={isDeploymentLoading}
                  className={clsx(
                    btnBase,
                    'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 max-xl:hidden'
                  )}
                >
                  <FaPlus className='text-xs' />
                  <span>Deploy Truck</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Table / States ──────────────────────────────────────────────── */}
        {isDeploymentLoading ? (
          <div className='flex-1 flex items-center justify-center'>
            <div className='flex flex-col items-center gap-4 text-center'>
              <span className='loading loading-spinner loading-lg text-primaryColor' />
              <p className='text-gray-500 text-sm font-medium'>
                Loading content...
              </p>
            </div>
          </div>
        ) : deploymentError ? (
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
        ) : allDeployments.length === 0 ? (
          <div className='flex-1 flex justify-center items-center'>
            <div className='flex flex-col items-center gap-4 text-center px-4'>
              <img src={empty_illustration} alt='empty' className='w-52' />
              <div>
                <h1 className='text-lg font-semibold text-gray-700'>
                  Nothing to show here
                </h1>
                <p className='text-gray-400 text-sm mt-1 max-w-md leading-relaxed'>
                  {filters.search || filters.status
                    ? 'Try adjusting your search terms or filters to see more results'
                    : 'Get started by adding your first deployment to the system'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className='relative flex-1 overflow-y-auto scrollbar-thin bg-white'>
            <div className='absolute inset-0'>
              <table className='table text-xs sm:table-sm table-pin-rows table-pin-cols'>
                <thead>
                  <tr className='bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide'>
                    {['head_admin', 'admin'].includes(userData.data.role) && (
                      <td className='max-sm:hidden w-8'>
                        <input
                          type='checkbox'
                          className='checkbox checkbox-sm'
                          checked={isAllSelected}
                          ref={el => {
                            if (el) el.indeterminate = isIndeterminate
                          }}
                          onChange={handleToggleSelectAll}
                        />
                      </td>
                    )}
                    <td>{total}</td>
                    <td>DP Code</td>
                    <td>Truck Details</td>
                    <td>Status</td>
                    <td>Departed</td>
                    <td>Pick-up In</td>
                    <td>Pick-up Out</td>
                    <td>Dest. Arrival</td>
                    <td>Dest. Departure</td>
                    <td>Unloading</td>
                  </tr>
                </thead>
                <tbody>
                  {allDeployments?.map((deployment, index) => (
                    <tr
                      key={index}
                      onClick={() => handleShowTruckDetailsModal(deployment)}
                      className={clsx(
                        'border-b border-gray-100 last:border-none hover:bg-gray-50 cursor-pointer capitalize align-top transition-colors text-gray-600',
                        {
                          'bg-blue-50 hover:bg-blue-100': selectedIds.has(
                            deployment._id
                          )
                        }
                      )}
                    >
                      {['head_admin', 'admin'].includes(userData.data.role) && (
                        <td
                          onClick={e => handleToggleSelect(e, deployment._id)}
                          className='cursor-default max-sm:hidden'
                        >
                          <input
                            type='checkbox'
                            className='checkbox checkbox-sm'
                            checked={selectedIds.has(deployment._id)}
                            onChange={() => {}}
                          />
                        </td>
                      )}

                      <td className='text-xxs sm:text-xs font-semibold text-gray-400'>
                        {(filters.page - 1) * filters.perPage + index + 1}
                      </td>

                      <td className='p-0 relative max-sm:text-xxs'>
                        <div
                          className='cursor-copy h-full w-fit p-2 hover:bg-gray-100 transition-colors rounded relative group'
                          onClick={e => {
                            e.stopPropagation()
                            navigator.clipboard.writeText(
                              deployment.deploymentCode
                            )
                            const div = e.currentTarget
                            const tooltip = document.createElement('div')
                            tooltip.className =
                              'absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap z-50'
                            tooltip.textContent = 'Copied!'
                            div.appendChild(tooltip)
                            setTimeout(() => {
                              if (div.contains(tooltip))
                                div.removeChild(tooltip)
                            }, 1000)
                          }}
                          title='Click to copy'
                        >
                          {deployment.deploymentCode}
                        </div>
                      </td>

                      <td>
                        <div className='space-y-0.5'>
                          {deployment?.replacement?.replacementTruckId?._id ? (
                            <>
                              <p className='text-nowrap'>
                                <span className='uppercase'>
                                  {
                                    deployment.replacement.replacementTruckId
                                      .plateNo
                                  }{' '}
                                </span>
                                <span className='text-gray-400'>
                                  ({deployment.replacement.replacementTruckType}
                                  )
                                </span>
                              </p>
                              <p className='text-nowrap text-gray-500'>
                                {`${deployment.replacement.replacementDriverId.firstname} ${deployment.replacement.replacementDriverId.lastname}`}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className='text-nowrap'>
                                <span className='uppercase font-medium max-xs:text-xxs'>
                                  {deployment.truckId.plateNo}{' '}
                                </span>
                                <span className='text-gray-400 max-xs:text-xxs'>
                                  ({deployment.truckType})
                                </span>
                              </p>
                              <p className='text-nowrap text-gray-500 font-light max-sm:text-xxs'>
                                {`${deployment.driverId.firstname} ${deployment.driverId.lastname}`}
                              </p>
                            </>
                          )}
                        </div>
                      </td>

                      <td>
                        <div
                          className={clsx(
                            'px-2.5 py-1 rounded-full w-fit text-xxs sm:text-xs',
                            {
                              'bg-orange-50 text-orange-500':
                                deployment.status === 'preparing',
                              'bg-emerald-50 text-emerald-600':
                                deployment.status === 'ongoing',
                              'bg-blue-50 text-blue-500':
                                deployment.status === 'completed',
                              'bg-red-50 text-red-500':
                                deployment.status === 'canceled'
                            }
                          )}
                        >
                          {deployment.status}
                        </div>
                      </td>

                      <td>
                        {deployment.departed ? (
                          <span className='text-nowrap text-xxs sm:text-xs'>
                            {formatISO(deployment.departed)}
                          </span>
                        ) : (
                          <p className='italic text-gray-400 font-light text-xxs sm:text-xs'>
                            {deployment.status === 'canceled'
                              ? 'Canceled'
                              : 'Pending'}
                          </p>
                        )}
                      </td>

                      <td>
                        <PickupStopsCell
                          pickups={deployment.pickups}
                          field='pickupIn'
                          status={deployment.status}
                        />
                      </td>
                      <td>
                        <PickupStopsCell
                          pickups={deployment.pickups}
                          field='pickupOut'
                          status={deployment.status}
                        />
                      </td>

                      <td>
                        {deployment.destArrival ? (
                          <span className='text-nowrap text-xxs sm:text-xs'>
                            {formatISO(deployment.destArrival)}
                          </span>
                        ) : (
                          <p className='italic text-gray-400 font-light text-xxs sm:text-xs'>
                            {deployment.status === 'canceled'
                              ? 'Canceled'
                              : 'Pending'}
                          </p>
                        )}
                      </td>

                      <td>
                        {deployment.destDeparture ? (
                          <span className='text-nowrap text-xxs sm:text-xs'>
                            {formatISO(deployment.destDeparture)}
                          </span>
                        ) : (
                          <p className='italic text-gray-400 font-light text-xxs sm:text-xs'>
                            {deployment.status === 'canceled'
                              ? 'Canceled'
                              : 'Pending'}
                          </p>
                        )}
                      </td>

                      <td>
                        {deployment.destArrival && deployment.destDeparture ? (
                          <div className='text-nowrap w-fit px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xxs sm:text-xs border border-emerald-100'>
                            {(() => {
                              const { hours, minutes } = DateTime.fromISO(
                                deployment.destDeparture
                              ).diff(DateTime.fromISO(deployment.destArrival), [
                                'hours',
                                'minutes'
                              ])
                              return hours
                                ? `${hours}h ${Math.floor(minutes)}m`
                                : `${Math.floor(minutes)}m`
                            })()}
                          </div>
                        ) : (
                          <p className='italic text-gray-400 font-light text-xxs sm:text-xs'>
                            {deployment.status === 'canceled'
                              ? 'Canceled'
                              : 'Pending'}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <DeploymentDetailsModal
        isOpen={isDeploymentDetailsModalOpen}
        onClose={() => setIsDeploymentDetailsModalOpen(false)}
        deployment={selectedDeployment}
        drivers={allDrivers}
        trucks={allTrucks}
        onUpdate={handleUpdateAllDeployments}
        openDeleteModal={() => setIsDeleteDeploymentModalOpen(true)}
        openReplacementModal={() => setIsReplacementModalOpen(true)}
        openReplacementHistory={() => setShowReplacementHistory(true)}
        updatable={['head_admin', 'admin'].includes(userData.data.role)}
      />
      <CreateDeploymentModal
        isOpen={isCreateDeploymentModalOpen}
        onClose={() => setIsCreateDeploymentModalOpen(false)}
        trucks={allTrucks}
        drivers={allDrivers}
        onCreate={handleAddNewDeployment}
      />
      <ReplacementModal
        isOpen={isReplacementModalOpen}
        onClose={() => setIsReplacementModalOpen(false)}
        deployment={selectedDeployment}
        drivers={allDrivers}
        trucks={allTrucks}
        onUpdate={data => {
          setSelectedDeployment(data)
          handleUpdateAllDeployments(data)
        }}
      />
      <ReplacementHistoryModal
        isOpen={showReplacementHistory}
        onClose={() => setShowReplacementHistory(false)}
        deployment={selectedDeployment}
      />
      <DeleteDeploymentModal
        isOpen={isDeleteDeploymentModalOpen}
        onClose={() => setIsDeleteDeploymentModalOpen(false)}
        deployment={selectedDeployment}
        onDelete={handleRemoveDeletedDeployment}
      />
    </>
  )
}

export default Deployments
