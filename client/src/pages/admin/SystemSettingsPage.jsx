import React, { useState } from 'react'
import { FaPlus } from 'react-icons/fa'
import { IoClose } from 'react-icons/io5'
import { useSettingsContext } from '../../contexts/SettingsContext'
import CreateOptionModal from '../../components/modals/CreateOptionModal'
import DeleteOptionModal from '../../components/modals/DeleteOptionModal'
import clsx from 'clsx'
import { TableLoading } from '../../components/TablesState'

function SystemSettingsPage () {
  const {
    settings,
    isLoadingSettings,
    isAdding,
    isRemoving,
    addOption,
    removeOption
  } = useSettingsContext()

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    category: null,
    field: null,
    value: null
  })

  const openDeleteModal = (category, field, value) => {
    setDeleteModal({ isOpen: true, category, field, value })
  }

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, category: null, field: null, value: null })
  }

  const handleConfirmDelete = async () => {
    const { category, field, value } = deleteModal
    await removeOption({ category, field, value })
    closeDeleteModal()
  }

  const handleCreateOption = async formData => {
    return await addOption({
      category: formData.category,
      field: formData.field,
      value: formData.value
    })
  }

  /* ── shared button style (matches Deployments / ActivityLogs) ── */
  const btnBase =
    'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed'

  const renderOptionsList = (category, field, fieldLabel, options) => (
    <div>
      <div className='flex items-center justify-between mb-2'>
        <h4 className='max-sm:text-xxs text-xs font-semibold text-gray-500 uppercase tracking-widest'>
          {fieldLabel}
        </h4>
        <span className='max-sm:text-xxs text-xs text-gray-500 tabular-nums'>
          {options.length}
        </span>
      </div>
      <div className='flex flex-wrap gap-2'>
        {options.length === 0 ? (
          <p className='max-sm:text-xs text-sm text-gray-300 italic self-center'>
            No options yet
          </p>
        ) : (
          options.map((option, index) => (
            <div
              key={index}
              className='flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-lg max-sm:text-xs text-sm capitalize group pl-2.5 max-sm:pr-2.5'
            >
              <span>{option}</span>
              <button
                type='button'
                onClick={() => openDeleteModal(category, field, option)}
                disabled={isRemoving}
                className='text-gray-300 hover:text-gray-600 transition-colors disabled:opacity-40 px-2 py-1 border-l border-gray-200 hover:bg-gray-100 cursor-pointer max-sm:text-sm rounded-r-lg max-sm:hidden'
              >
                <IoClose className='max-sm:text-sm text-base' />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )

  if (isLoadingSettings) {
    return <TableLoading />
  }

  return (
    <>
      <div className='flex-1 flex flex-col gap-2 sm:gap-4 lg:gap-6'>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className='flex flex-wrap justify-between items-start gap-4'>
          <div className='flex justify-between flex-1 items-center'>
            <div>
              <h1 className='font-bold text-lg sm:text-xl md:text-2xl text-gray-800'>
                System Settings
              </h1>
              <p className='text-xs text-gray-400 mt-0.5'>
                Manage dropdown options used across the platform
              </p>
            </div>

            {/* sm–lg Create button (hidden on xs and xl+) */}
            <div className='flex gap-2 max-sm:hidden xl:hidden'>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                disabled={isLoadingSettings}
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

          {/* xl+ Create button */}
          <div className='flex gap-2 max-xl:hidden'>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              disabled={isLoadingSettings}
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

        {/* ── Options panels ──────────────────────────────────────────────── */}
        <div className='flex-1 flex flex-col md:flex-row gap-5'>
          {/* Trucks & Drivers */}
          <div className='flex-1 flex flex-col bg-white rounded-xl border border-gray-200 overflow-auto'>
            <div className='px-6 py-4 border-b border-gray-100'>
              <h2 className='max-sm:text-sm font-semibold text-gray-800'>
                Trucks &amp; Drivers
              </h2>
              <p className='max-sm:text-xs text-sm text-gray-400 mt-0.5'>
                Options for truck and driver forms
              </p>
            </div>

            <div className='flex-1 relative overflow-y-auto'>
              <div className='absolute top-0 left-0 right-0 px-6 py-5'>
                {settings.trucksDrivers &&
                Object.keys(settings.trucksDrivers).length > 0 ? (
                  <div className='flex flex-col gap-6'>
                    {renderOptionsList(
                      'trucksDrivers',
                      'truckType',
                      'Truck Type',
                      settings.trucksDrivers.truckType || []
                    )}
                    <div className='border-t border-gray-100' />
                    {renderOptionsList(
                      'trucksDrivers',
                      'status',
                      'Status',
                      settings.trucksDrivers.status || []
                    )}
                    <div className='border-t border-gray-100' />
                    {renderOptionsList(
                      'trucksDrivers',
                      'subcon',
                      'Subcon',
                      settings.trucksDrivers.subcon || []
                    )}
                  </div>
                ) : (
                  <div className='flex flex-col items-center justify-center h-full text-center'>
                    <p className='text-gray-400 max-sm:text-sm text-sm'>
                      No options available
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Deployments */}
          <div className='flex-1 flex flex-col bg-white rounded-xl border border-gray-200 overflow-auto'>
            <div className='px-6 py-4 border-b border-gray-100'>
              <h2 className='max-sm:text-sm font-semibold text-gray-800'>
                Deployments
              </h2>
              <p className='max-sm:text-xs text-sm text-gray-400 mt-0.5'>
                Options used in deployment forms
              </p>
            </div>

            <div className='flex-1 relative overflow-y-auto'>
              <div className='absolute top-0 left-0 right-0 px-6 py-5'>
                {settings.deployments &&
                Object.keys(settings.deployments).length > 0 ? (
                  <div className='flex flex-col gap-6'>
                    {renderOptionsList(
                      'deployments',
                      'hybrid',
                      'Hybrid',
                      settings.deployments.hybrid || []
                    )}
                    <div className='border-t border-gray-100' />
                    {renderOptionsList(
                      'deployments',
                      'territory',
                      'Territory',
                      settings.deployments.territory || []
                    )}
                    <div className='border-t border-gray-100' />
                    {renderOptionsList(
                      'deployments',
                      'flagging',
                      'Flagging',
                      settings.deployments.flagging || []
                    )}
                    <div className='border-t border-gray-100' />
                    {renderOptionsList(
                      'deployments',
                      'destination',
                      'Destination',
                      settings.deployments.destination || []
                    )}
                  </div>
                ) : (
                  <div className='flex flex-col items-center justify-center h-full text-center'>
                    <p className='text-gray-400 max-sm:text-sm text-sm'>
                      No options available
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CreateOptionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateOption}
        isLoading={isAdding}
      />

      <DeleteOptionModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        itemName={deleteModal.value}
        isDeleting={isRemoving}
      />
    </>
  )
}

export default SystemSettingsPage
