import React, { useEffect, useState } from 'react'
import DeploymentDetailsModal from '../../components/modals/DeploymentDetailsModal'
import CreateDeploymentModal from '../../components/modals/CreateDeploymentModal'
import useGetAllTruck from '../../hooks/useGetAllTruck'
import useGetAllDriver from '../../hooks/useGetAllDriver'
import { FaFilter, FaPlus, FaSearch, FaFileExport } from 'react-icons/fa'
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

// ─── helper: format a pickup stop's in/out timestamps ─────────────────────────
const formatISO = iso =>
  iso
    ? DateTime.fromISO(iso)
        .setZone('Asia/Manila')
        .toFormat('MMM d, yyyy hh:mm a')
    : null

/**
 * Renders a stacked list of pickup stop timestamps for either pickupIn or pickupOut.
 */
const PickupStopsCell = ({ pickups = [], field, status }) => {
  const stopsWithValue = pickups.filter(p => p[field])

  if (stopsWithValue.length === 0) {
    return status === 'canceled' ? (
      <p className='italic text-gray-400 font-light max-sm:text-xxs'>
        Canceled
      </p>
    ) : (
      <p className='italic text-gray-400 font-light max-sm:text-xxs'>Pending</p>
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
            <span className='max-sm:text-xxs text-xs'>
              {formatISO(stop[field])}
            </span>
          ) : (
            <span className='italic text-gray-400 font-light max-sm:text-xxs text-xs'>
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

  // ─── checkbox selection state ────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState(new Set())

  const isAllSelected =
    allDeployments.length > 0 &&
    allDeployments.every(d => selectedIds.has(d._id))

  const isIndeterminate = selectedIds.size > 0 && !isAllSelected

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allDeployments.map(d => d._id)))
    }
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

  /** Returns only the checked deployments, or all if nothing is checked. */
  const deploymentsForExport =
    selectedIds.size > 0
      ? allDeployments.filter(d => selectedIds.has(d._id))
      : allDeployments
  // ─────────────────────────────────────────────────────────────────────────────

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
    if (direction === 'prev' && filters.page > 1) {
      setFilters(prev => ({ ...prev, page: prev.page - 1 }))
    } else if (direction === 'next' && filters.page < totalPages) {
      setFilters(prev => ({ ...prev, page: prev.page + 1 }))
    }
  }

  // ─── export handlers now use deploymentsForExport ────────────────────────────
  const handleExportToExcel = () =>
    exportDeploymentToExcel(deploymentsForExport)
  const handleExportToBillingToExcel = async () =>
    await exportBillingToExcel(deploymentsForExport)
  const handleExportToSubconBillingToExcel = async () =>
    await exportSubconBillingToExcel(deploymentsForExport, userData)
  // ─────────────────────────────────────────────────────────────────────────────

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
      // Clear selection when the result set changes
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

  return (
    <>
      <div className='flex-1 flex flex-col gap-2 sm:gap-4 lg:gap-6'>
        {/* header */}
        <div className='flex flex-wrap justify-between max-xs:gap-x-36 gap-x-16 gap-y-4'>
          {/* left side */}
          <div className='flex justify-between flex-1'>
            <h1 className='font-semibold text-lg sm:text-xl md:text-2xl text-nowrap'>
              Deployments
            </h1>

            <div className='flex gap-4 max-sm:hidden xl:hidden'>
              {/* Export dropdown */}
              {['head_admin', 'admin'].includes(userData.data.role) && (
                <div className='dropdown dropdown-end sm:dropdown-center'>
                  <div
                    tabIndex={0}
                    role='button'
                    className='flex items-center gap-2 bg-linear-to-b from-blue-500 to-blue-600 text-white rounded px-3 py-1 cursor-pointer active:scale-95 transition-all hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed '
                    disabled={
                      isDeploymentLoading || allDeployments.length === 0
                    }
                  >
                    <BiExport className='text-base sm:text-lg' />
                    <p className='text-sm sm:text-base'>Export</p>
                    {/* selection badge */}
                    {selectedIds.size > 0 && (
                      <span className='bg-white text-blue-600 text-xs font-bold px-1.5 py-0.5 rounded-full leading-none'>
                        {selectedIds.size}
                      </span>
                    )}
                  </div>

                  <div
                    tabIndex='0'
                    className='dropdown-content menu mt-3 bg-white shadow-sm rounded ring-1 ring-gray-300 w-[calc(100vw-2rem)] max-w-sm'
                  >
                    {/* selection context hint */}
                    {selectedIds.size > 0 ? (
                      <div className='px-4 py-2 flex items-center justify-between'>
                        <p className='text-xs text-blue-600 font-semibold'>
                          {selectedIds.size} row
                          {selectedIds.size > 1 ? 's' : ''} selected
                        </p>
                        <button
                          onClick={handleClearSelection}
                          className='text-xs text-gray-400 hover:text-gray-600 cursor-pointer'
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <p className='px-4 pt-2 pb-1 text-xs text-gray-400'>
                        Exporting all {allDeployments.length} rows
                      </p>
                    )}

                    <div className='border-t border-gray-200 my-1' />

                    <button
                      onClick={handleExportToExcel}
                      disabled={
                        isDeploymentLoading || allDeployments.length === 0
                      }
                      className='w-full text-left px-4 py-2 text-sm hover:bg-gray-50 rounded flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95 transition-all'
                    >
                      <FaFolderOpen className='text-xl text-blue-500' />
                      <div>
                        <p className='font-medium'>Full Export</p>
                        <p className='text-xs text-gray-500'>
                          All deployment details
                        </p>
                      </div>
                    </button>

                    <div className='border-t border-gray-200 my-1' />

                    <button
                      onClick={handleExportToBillingToExcel}
                      disabled={
                        isDeploymentLoading || allDeployments.length === 0
                      }
                      className='w-full text-left px-4 py-2 text-sm hover:bg-gray-50 rounded flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95 transition-all'
                    >
                      <IoReceipt className='text-xl text-purple-500' />
                      <div>
                        <p className='font-medium'>Billing Export</p>
                        <p className='text-xs text-gray-500'>
                          Simplified billing data
                        </p>
                      </div>
                    </button>

                    <div className='border-t border-gray-200 my-1' />

                    <button
                      onClick={handleExportToSubconBillingToExcel}
                      disabled={
                        isDeploymentLoading || allDeployments.length === 0
                      }
                      className='w-full text-left px-4 py-2 text-sm hover:bg-gray-50 rounded flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95 transition-all'
                    >
                      <TbReceiptFilled className='text-xl text-orange-500' />
                      <div>
                        <p className='font-medium'>Subcon Billing Export</p>
                        <p className='text-xs text-gray-500'>
                          Subcon billing data
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* create button */}
              {['head_admin', 'admin'].includes(userData.data.role) && (
                <button
                  onClick={() => setIsCreateDeploymentModalOpen(true)}
                  disabled={isDeploymentLoading}
                  className='flex items-center gap-4 bg-linear-to-b from-emerald-500 to-emerald-600 text-white rounded px-3 py-1 cursor-pointer active:scale-95 transition-all hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed max-sm:hidden'
                >
                  <FaPlus className='text-sm' />
                  <p>Deploy Truck</p>
                </button>
              )}
            </div>
          </div>

          {/* right side */}
          <div className='flex justify-between max-sm:flex-col gap-2 sm:gap-4 max-xs:flex-1 w-full xl:w-auto'>
            {/* search */}
            <form
              onSubmit={handleApplyFilters}
              className='flex max-md:flex-1 items-center outline outline-gray-200 rounded pl-3 pr-1 focus-within:outline-gray-300 transition-all'
            >
              <FaSearch className='text-sm' />
              <input
                type='text'
                name='search'
                placeholder='Search'
                value={tempFilters.search}
                onChange={handleChangeFilter}
                autoComplete='off'
                className='w-full focus:outline-none ml-3 mr-1 py-1 text-sm sm:text-base'
              />
              <button
                type='button'
                onClick={handleClearSearch}
                className={clsx(
                  'rounded-full p-1 hover:bg-gray-50 cursor-pointer transition-all duration-300',
                  {
                    'opacity-100': tempFilters.search,
                    'opacity-0 -z-10': !tempFilters.search
                  }
                )}
              >
                <IoClose className='text-lg sm:text-xl' />
              </button>
            </form>

            <div className='flex justify-between gap-2 sm:gap-4'>
              {/* filters */}
              <div className='dropdown dropdown-start sm:dropdown-center'>
                <div
                  tabIndex={0}
                  role='button'
                  className='flex items-center gap-4 ring-1 ring-gray-200 hover:bg-gray-50 rounded px-3 py-1 cursor-pointer active:scale-95 transition-all'
                >
                  <FaFilter className='text-xs sm:text-sm' />
                  <p className='text-sm sm:text-base'>Filter</p>
                </div>

                <div
                  tabIndex='0'
                  className='dropdown-content menu mt-3 bg-white shadow-sm rounded ring-1 ring-gray-300
           w-[calc(100vw-2rem)] max-w-sm'
                >
                  <div className='grid grid-cols-2 gap-4 p-2 sm:p-4'>
                    <label className='flex items-center text-xxs xs:text-sm outline outline-gray-200 rounded py-1.5 sm:py-2 px-1.5 sm:px-3 gap-2'>
                      <p className='font-semibold'>Status</p>
                      <select
                        name='status'
                        value={tempFilters.status}
                        onChange={handleChangeFilter}
                        className='w-full focus:outline-none'
                      >
                        <option value=''>All</option>
                        {DEPLOYMENT_STATUS.map((item, index) => (
                          <option key={index} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className='flex items-center text-xxs xs:text-sm outline outline-gray-200 rounded py-1.5 sm:py-2 px-1.5 sm:px-3 gap-2'>
                      <p className='font-semibold'>Sort</p>
                      <select
                        name='sort'
                        value={tempFilters.sort}
                        onChange={handleChangeFilter}
                        className='w-full focus:outline-none'
                      >
                        <option value='latest'>Latest</option>
                        <option value='oldest'>Oldest</option>
                      </select>
                    </label>

                    {userData.data.role !== 'subcon' && (
                      <>
                        {userData.data.role !== 'visitor' && (
                          <label className='flex items-center text-xxs xs:text-sm outline outline-gray-200 rounded py-1.5 sm:py-2 px-1.5 sm:px-3 gap-2'>
                            <p className='font-semibold'>Subcon</p>
                            <select
                              name='subcon'
                              value={tempFilters.subcon}
                              onChange={handleChangeFilter}
                              className='w-full focus:outline-none capitalize'
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
                          </label>
                        )}

                        <label
                          className={clsx(
                            'flex items-center text-xxs xs:text-sm outline outline-gray-200 rounded py-1.5 sm:py-2 px-1.5 sm:px-3 gap-2',
                            { 'col-span-2': userData.data.role === 'visitor' }
                          )}
                        >
                          <p className='font-semibold'>Territory</p>
                          <select
                            name='territory'
                            value={tempFilters.territory}
                            onChange={handleChangeFilter}
                            className='w-full focus:outline-none capitalize'
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
                        </label>
                      </>
                    )}

                    <label className='col-span-2 flex items-center justify-between text-xxs xs:text-sm outline outline-gray-200 rounded py-1.5 sm:py-2 px-1.5 sm:px-3 gap-2'>
                      <p className='font-semibold text-nowrap'>Assigned At</p>
                      <input
                        type='date'
                        name='assignedAt'
                        value={tempFilters.assignedAt}
                        onChange={handleChangeFilter}
                        className='focus:outline-none'
                      />
                    </label>

                    <label className='col-span-2 flex items-center justify-between text-xxs xs:text-sm outline outline-gray-200 rounded py-1.5 sm:py-2 px-1.5 sm:px-3 gap-2'>
                      <p className='font-semibold text-nowrap'>Departed At</p>
                      <input
                        type='date'
                        name='departedAt'
                        value={tempFilters.departedAt}
                        onChange={handleChangeFilter}
                        className='focus:outline-none'
                      />
                    </label>

                    <button
                      onClick={handleResetFilters}
                      disabled={isDeploymentLoading}
                      className='bg-linear-to-b from-gray-100 to-gray-200 text-gray-600 rounded py-2 px-8 font-semibold uppercase active:scale-95 transition-all  max-xs:text-xs cursor-pointer hover:brightness-95'
                    >
                      Reset
                    </button>

                    <button
                      onClick={handleApplyFilters}
                      disabled={isDeploymentLoading}
                      className='bg-linear-to-b from-emerald-500 to-emerald-600 text-white rounded py-2 px-8 font-semibold uppercase active:scale-95 transition-all  max-xs:text-xs cursor-pointer hover:brightness-95'
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>

              {/* pagination */}
              <div className='flex gap-4 items-center outline outline-gray-200 rounded'>
                <button
                  onClick={() => handleChangePage('prev')}
                  disabled={isDeploymentLoading || filters.page === 1}
                  className='p-1 text-xl sm:text-2xl hover:bg-gray-50 cursor-pointer border-r border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  <MdOutlineKeyboardArrowLeft />
                </button>
                <p className='text-xs sm:text-sm sm:min-w-22 text-center'>
                  {!isDeploymentLoading &&
                    allDeployments &&
                    `Page ${total > 0 ? page : 0} of ${totalPages}`}
                </p>
                <button
                  onClick={() => handleChangePage('next')}
                  disabled={isDeploymentLoading || filters.page === totalPages}
                  className='p-1 text-xl sm:text-2xl hover:bg-gray-50 cursor-pointer border-l border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  <MdOutlineKeyboardArrowRight />
                </button>
              </div>

              {/* Export dropdown */}
              {['head_admin', 'admin'].includes(userData.data.role) && (
                <div className='dropdown dropdown-end sm:dropdown-center max-xl:hidden'>
                  <div
                    tabIndex={0}
                    role='button'
                    className='flex items-center gap-2 bg-linear-to-b from-blue-500 to-blue-600 text-white rounded px-3 py-1 cursor-pointer active:scale-95 transition-all hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed '
                    disabled={
                      isDeploymentLoading || allDeployments.length === 0
                    }
                  >
                    <BiExport className='text-base sm:text-lg' />
                    <p className='text-sm sm:text-base'>Export</p>
                    {/* selection badge */}
                    {selectedIds.size > 0 && (
                      <span className='bg-white text-blue-600 text-xs font-bold px-1.5 py-0.5 rounded-full leading-none'>
                        {selectedIds.size}
                      </span>
                    )}
                  </div>

                  <div
                    tabIndex='0'
                    className='dropdown-content menu mt-3 bg-white shadow-sm rounded ring-1 ring-gray-300 w-[calc(100vw-2rem)] max-w-sm'
                  >
                    {/* selection context hint */}
                    {selectedIds.size > 0 ? (
                      <div className='px-4 py-2 flex items-center justify-between'>
                        <p className='text-xs text-blue-600 font-semibold'>
                          {selectedIds.size} row
                          {selectedIds.size > 1 ? 's' : ''} selected
                        </p>
                        <button
                          onClick={handleClearSelection}
                          className='text-xs text-gray-400 hover:text-gray-600 cursor-pointer'
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <p className='px-4 pt-2 pb-1 text-xs text-gray-400'>
                        Exporting all {allDeployments.length} rows
                      </p>
                    )}

                    <div className='border-t border-gray-200 my-1' />

                    <button
                      onClick={handleExportToExcel}
                      disabled={
                        isDeploymentLoading || allDeployments.length === 0
                      }
                      className='w-full text-left px-4 py-2 text-sm hover:bg-gray-50 rounded flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95 transition-all'
                    >
                      <FaFolderOpen className='text-xl text-blue-500' />
                      <div>
                        <p className='font-medium'>Full Export</p>
                        <p className='text-xs text-gray-500'>
                          All deployment details
                        </p>
                      </div>
                    </button>

                    <div className='border-t border-gray-200 my-1' />

                    <button
                      onClick={handleExportToBillingToExcel}
                      disabled={
                        isDeploymentLoading || allDeployments.length === 0
                      }
                      className='w-full text-left px-4 py-2 text-sm hover:bg-gray-50 rounded flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95 transition-all'
                    >
                      <IoReceipt className='text-xl text-purple-500' />
                      <div>
                        <p className='font-medium'>Billing Export</p>
                        <p className='text-xs text-gray-500'>
                          Simplified billing data
                        </p>
                      </div>
                    </button>

                    <div className='border-t border-gray-200 my-1' />

                    <button
                      onClick={handleExportToSubconBillingToExcel}
                      disabled={
                        isDeploymentLoading || allDeployments.length === 0
                      }
                      className='w-full text-left px-4 py-2 text-sm hover:bg-gray-50 rounded flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95 transition-all'
                    >
                      <TbReceiptFilled className='text-xl text-orange-500' />
                      <div>
                        <p className='font-medium'>Subcon Billing Export</p>
                        <p className='text-xs text-gray-500'>
                          Subcon billing data
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* create button */}
              {['head_admin', 'admin'].includes(userData.data.role) && (
                <button
                  onClick={() => setIsCreateDeploymentModalOpen(true)}
                  disabled={isDeploymentLoading}
                  className='flex items-center gap-4 bg-linear-to-b from-emerald-500 to-emerald-600 text-white rounded px-3 py-1 cursor-pointer active:scale-95 transition-all hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed max-xl:hidden'
                >
                  <FaPlus className='text-sm' />
                  <p>Deploy Truck</p>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* table */}
        {isDeploymentLoading ? (
          <div className='flex-1 flex items-center justify-center'>
            <div className='flex flex-col items-center justify-center gap-4 text-center'>
              <span className='loading loading-spinner loading-lg text-primaryColor' />
              <p className='text-gray-600 font-medium'>Loading content...</p>
            </div>
          </div>
        ) : deploymentError ? (
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
        ) : allDeployments.length === 0 ? (
          <div className='flex-1 flex justify-center items-center'>
            <div className='flex flex-col justify-center items-center gap-4 px-4 text-center'>
              <img src={empty_illustration} alt='empty' className='w-56' />
              <div className='space-y-2'>
                <h1 className='text-xl font-semibold text-gray-700'>
                  Nothing to show here
                </h1>
                <p className='text-gray-500 max-w-md leading-relaxed'>
                  {filters.search || filters.status
                    ? 'Try adjusting your search terms or filters to see more results'
                    : 'Get started by adding your first deployment to the system'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className='relative flex-1 overflow-y-auto scrollbar-thin'>
            <div className='absolute inset-0'>
              <table className='table text-xs sm:table-sm table-pin-rows table-pin-cols'>
                <thead>
                  <tr className='bg-white border-b border-gray-200 text-gray-800'>
                    {/* ── select-all checkbox ── */}
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
                    <td className='max-sm:text-xs'>{total}</td>
                    <td className='max-sm:text-xs'>Code</td>
                    <td className='max-sm:text-xs'>Truck Details</td>
                    <td className='max-sm:text-xs'>Status</td>
                    <td className='max-sm:text-xs'>Departed</td>
                    <td className='max-sm:text-xs'>Pick-up In</td>
                    <td className='max-sm:text-xs'>Pick-up Out</td>
                    <td className='max-sm:text-xs'>Dest. Arrival</td>
                    <td className='max-sm:text-xs'>Dest. Departure</td>
                    <td className='max-sm:text-xs'>Unloading</td>
                  </tr>
                </thead>
                <tbody>
                  {allDeployments?.map((deployment, index) => (
                    <tr
                      key={index}
                      onClick={() => handleShowTruckDetailsModal(deployment)}
                      className={clsx(
                        'border-b border-gray-200 last:border-none hover:bg-gray-50 cursor-pointer capitalize align-top',
                        {
                          'bg-blue-50 hover:bg-blue-100': selectedIds.has(
                            deployment._id
                          )
                        }
                      )}
                    >
                      {/* ── per-row checkbox ── */}
                      {['head_admin', 'admin'].includes(userData.data.role) && (
                        <td
                          onClick={e => handleToggleSelect(e, deployment._id)}
                          className='cursor-default max-sm:hidden'
                        >
                          <input
                            type='checkbox'
                            className='checkbox checkbox-sm'
                            checked={selectedIds.has(deployment._id)}
                            onChange={() => {}} // controlled via td onClick
                          />
                        </td>
                      )}

                      {/* # */}
                      <td className='text-xxs sm:text-xs font-bold text-gray-600'>
                        {(filters.page - 1) * filters.perPage + index + 1}
                      </td>

                      {/* Deployment code */}
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
                          {deployment.deploymentCode}
                        </div>
                      </td>

                      {/* Truck / driver */}
                      <td>
                        <div className='space-y-0.5 sm:space-y-1 max-sm:text-xxs'>
                          {deployment?.replacement?.replacementTruckId?._id ? (
                            <>
                              <p className='text-nowrap font-semibold '>
                                <span className='uppercase'>
                                  {
                                    deployment.replacement.replacementTruckId
                                      .plateNo
                                  }{' '}
                                </span>
                                ({deployment.replacement.replacementTruckType})
                              </p>
                              <p className='text-nowrap font-light'>
                                {`${deployment.replacement.replacementDriverId.firstname} ${deployment.replacement.replacementDriverId.lastname}`}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className='text-nowrap font-semibold'>
                                <span className='uppercase'>
                                  {deployment.truckId.plateNo}{' '}
                                </span>
                                ({deployment.truckType})
                              </p>
                              <p className='text-nowrap font-light'>
                                {`${deployment.driverId.firstname} ${deployment.driverId.lastname}`}
                              </p>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <div
                          className={clsx(
                            'px-2 py-1 rounded-full w-fit max-sm:text-xxs',
                            {
                              'bg-orange-500/10 text-orange-500':
                                deployment.status === 'preparing',
                              'bg-emerald-500/10 text-emerald-500':
                                deployment.status === 'ongoing',
                              'bg-blue-500/10 text-blue-500':
                                deployment.status === 'completed',
                              'bg-red-500/10 text-red-500':
                                deployment.status === 'canceled'
                            }
                          )}
                        >
                          {deployment.status}
                        </div>
                      </td>

                      {/* Departed */}
                      <td>
                        {deployment.departed ? (
                          <span className='text-nowrap max-sm:text-xxs text-xs'>
                            {formatISO(deployment.departed)}
                          </span>
                        ) : deployment.status === 'canceled' ? (
                          <p className='italic text-gray-400 font-light max-sm:text-xxs'>
                            Canceled
                          </p>
                        ) : (
                          <p className='italic text-gray-400 font-light max-sm:text-xxs'>
                            Pending
                          </p>
                        )}
                      </td>

                      {/* Pick-up In */}
                      <td>
                        <PickupStopsCell
                          pickups={deployment.pickups}
                          field='pickupIn'
                          status={deployment.status}
                        />
                      </td>

                      {/* Pick-up Out */}
                      <td>
                        <PickupStopsCell
                          pickups={deployment.pickups}
                          field='pickupOut'
                          status={deployment.status}
                        />
                      </td>

                      {/* Dest. Arrival */}
                      <td>
                        {deployment.destArrival ? (
                          <span className='text-nowrap max-sm:text-xxs text-xs '>
                            {formatISO(deployment.destArrival)}
                          </span>
                        ) : deployment.status === 'canceled' ? (
                          <p className='italic text-gray-400 font-light max-sm:text-xxs'>
                            Canceled
                          </p>
                        ) : (
                          <p className='italic text-gray-400 font-light max-sm:text-xxs'>
                            Pending
                          </p>
                        )}
                      </td>

                      {/* Dest. Departure */}
                      <td>
                        {deployment.destDeparture ? (
                          <span className='text-nowrap max-sm:text-xxs text-xs'>
                            {formatISO(deployment.destDeparture)}
                          </span>
                        ) : deployment.status === 'canceled' ? (
                          <p className='italic text-gray-400 font-light max-sm:text-xxs'>
                            Canceled
                          </p>
                        ) : (
                          <p className='italic text-gray-400 font-light max-sm:text-xxs'>
                            Pending
                          </p>
                        )}
                      </td>

                      {/* Unloading duration */}
                      <td>
                        {deployment.destArrival && deployment.destDeparture ? (
                          <div className='text-nowrap w-fit px-3 py-1 rounded-full bg-emerald-500 text-white max-sm:text-xxs text-xs'>
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
                        ) : deployment.status === 'canceled' ? (
                          <p className='italic text-gray-400 font-light max-sm:text-xxs'>
                            Canceled
                          </p>
                        ) : (
                          <p className='italic text-gray-400 font-light max-sm:text-xxs'>
                            Pending
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
