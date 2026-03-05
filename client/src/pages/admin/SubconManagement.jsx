import React, { useEffect, useState } from 'react'
import { FaFilter, FaPlus, FaSearch } from 'react-icons/fa'
import { IoClose } from 'react-icons/io5'
import {
  MdOutlineKeyboardArrowLeft,
  MdOutlineKeyboardArrowRight
} from 'react-icons/md'
import {
  empty_illustration,
  error_illustration,
  no_image
} from '../../consts/images'
import useGetAllUser from '../../hooks/useGetAllUser'
import clsx from 'clsx'
import UserDetailsModal from '../../components/modals/UserDetailsModal'
import { USER_STATUS_TYPES } from '../../utils/userOptions'
import CreateSubconModal from '../../components/modals/CreateSubconModal'
import DeleteUserModal from '../../components/modals/DeleteUserModal'
import {
  TableEmpty,
  TableError,
  TableLoading
} from '../../components/TablesState'

const defaultFilters = {
  role: 'subcon',
  status: '',
  sort: 'latest',
  search: '',
  perPage: 100,
  page: 1
}

function SubconManagement () {
  const [isAdminDetailsModalOpen, setIsAdminDetailsModalOpen] = useState(false)
  const [isDeleteAdminModalOpen, setIsDeleteAdminModalOpen] = useState(false)
  const [isCreateAdminModalOpen, setIsCreateAdminModalOpen] = useState(false)

  const { getAllUserFunction, isLoading } = useGetAllUser()
  const [allAdmins, setAllAdmins] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(null)
  const [totalPages, setTotalPages] = useState(null)
  const [error, setError] = useState(null)
  const [selectedAdmin, setSelectedAdmin] = useState({})

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

  const handleShowDVisitorDetailsModal = data => {
    setSelectedAdmin(data)
    setIsAdminDetailsModalOpen(true)
  }

  const handleUpdateAllUsers = updatedUser => {
    setAllAdmins(prev =>
      prev.map(subcon =>
        subcon._id === updatedUser._id ? updatedUser : subcon
      )
    )
  }

  const handleRemoveDeletedUser = deletedUser => {
    setAllAdmins(prev => prev.filter(driver => driver._id !== deletedUser))
    setIsDeleteAdminModalOpen(false)
    setIsAdminDetailsModalOpen(false)
  }

  const handleAddNewAdmin = newAdmin => {
    setAllAdmins(prev => [newAdmin, ...prev])
  }

  useEffect(() => {
    const handleGetAllUsers = async () => {
      const { users, total, page, totalPages, error } =
        await getAllUserFunction(filters)
      if (error) setError(error)
      setAllAdmins(users)
      setTotal(total)
      setPage(page)
      setTotalPages(totalPages)
    }
    handleGetAllUsers()
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
                Manage Subcons
              </h1>
              <p className='text-xs text-gray-400 mt-0.5'>
                View and manage all subcontractors in the system
              </p>
            </div>

            <div className='flex gap-2 max-sm:hidden xl:hidden'>
              <button
                onClick={() => setIsCreateAdminModalOpen(true)}
                disabled={isLoading}
                className={clsx(
                  btnBase,
                  'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'
                )}
              >
                <FaPlus className='text-xs' />
                <span>Create New</span>
              </button>
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
                placeholder='Search subcons...'
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
                          className='w-full focus:outline-none text-xs sm:text-sm text-gray-700 bg-transparent'
                        >
                          <option value='latest'>Latest</option>
                          <option value='oldest'>Oldest</option>
                          <option value='a-z'>A to Z</option>
                          <option value='z-a'>Z to A</option>
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
                          className='w-full focus:outline-none text-xs sm:text-sm text-gray-700 bg-transparent'
                        >
                          <option value=''>All</option>
                          {USER_STATUS_TYPES.map((status, index) => (
                            <option key={index} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>

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
                    allAdmins &&
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
              <button
                onClick={() => setIsCreateAdminModalOpen(true)}
                disabled={isLoading}
                className={clsx(
                  btnBase,
                  'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 max-xl:hidden'
                )}
              >
                <FaPlus className='text-xs' />
                <span>Create New</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Table / States ──────────────────────────────────────────────── */}
        {isLoading ? (
          <TableLoading />
        ) : error ? (
          <TableError />
        ) : allAdmins.length === 0 ? (
          <TableEmpty />
        ) : (
          <div className='relative flex-1 overflow-y-auto scrollbar-thin bg-white'>
            <div className='absolute inset-0'>
              <table className='table text-xs sm:table-sm table-pin-rows table-pin-cols'>
                <thead>
                  <tr className='bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide'>
                    <td>{total}</td>
                    <td>Image</td>
                    <td>Fullname</td>
                    <td>Email</td>
                    <td>Phone No.</td>
                    <td>Subcon</td>
                    <td>Status</td>
                  </tr>
                </thead>
                <tbody>
                  {allAdmins.map((subcon, index) => (
                    <tr
                      key={index}
                      onClick={() => handleShowDVisitorDetailsModal(subcon)}
                      className='border-b border-gray-100 last:border-none hover:bg-gray-50 capitalize cursor-pointer align-top transition-colors text-gray-600'
                    >
                      <td className='text-xxs sm:text-xs font-semibold text-gray-400'>
                        {(page - 1) * filters.perPage + index + 1}
                      </td>
                      <td className='py-0'>
                        <img
                          src={subcon.imageUrl || no_image}
                          alt='img'
                          className={clsx(
                            'w-8 sm:w-9 aspect-square object-cover object-center mask mask-squircle',
                            { 'opacity-10': !subcon.imageUrl }
                          )}
                        />
                      </td>
                      <td>
                        <p className='max-sm:text-xxs text-nowrap capitalize'>
                          {`${subcon.firstname} ${subcon.lastname}`}
                        </p>
                      </td>
                      <td className='max-sm:text-xxs lowercase'>
                        {subcon.email}
                      </td>
                      <td className='max-sm:text-xxs'>{subcon.phoneNo}</td>
                      <td className='capitalize max-sm:text-xxs text-nowrap'>
                        {subcon.subcon
                          ? subcon.subcon.replace(/_/g, ' ')
                          : 'N/A'}
                      </td>
                      <td>
                        <div
                          className={clsx(
                            'px-2.5 py-1 rounded-full w-fit text-xxs xs:text-xs',
                            {
                              'bg-orange-50 text-orange-500':
                                subcon.status === 'pending',
                              'bg-gray-100 text-gray-500':
                                subcon.status === 'rejected' ||
                                subcon.status === 'revoked',
                              'bg-emerald-50 text-emerald-600':
                                subcon.status === 'active',
                              'bg-red-50 text-red-500':
                                subcon.status === 'inactive'
                            }
                          )}
                        >
                          {subcon.status}
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

      <UserDetailsModal
        isOpen={isAdminDetailsModalOpen}
        onClose={() => setIsAdminDetailsModalOpen(false)}
        user={selectedAdmin}
        onUpdate={handleUpdateAllUsers}
        openDeleteModal={() => setIsDeleteAdminModalOpen(true)}
      />
      <CreateSubconModal
        isOpen={isCreateAdminModalOpen}
        onClose={() => setIsCreateAdminModalOpen(false)}
        onCreate={handleAddNewAdmin}
      />
      <DeleteUserModal
        isOpen={isDeleteAdminModalOpen}
        onClose={() => setIsDeleteAdminModalOpen(false)}
        user={selectedAdmin}
        onDelete={handleRemoveDeletedUser}
      />
    </>
  )
}

export default SubconManagement
