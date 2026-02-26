import React, { useState } from 'react'
import { FaPlus } from 'react-icons/fa'
import { IoClose } from 'react-icons/io5'
import { useSettingsContext } from '../../contexts/SettingsContext'
import CreateOptionModal from '../../components/modals/CreateOptionModal'
import DeleteOptionModal from '../../components/modals/DeleteOptionModal'

function SystemSettingsPage () {
  const {
    settings,
    isLoadingSettings,
    isAdding,
    isRemoving,
    addOption,
    removeOption
  } = useSettingsContext()

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    category: null,
    field: null,
    value: null
  })

  // Open delete confirmation modal
  const openDeleteModal = (category, field, value) => {
    setDeleteModal({
      isOpen: true,
      category,
      field,
      value
    })
  }

  // Close delete confirmation modal
  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      category: null,
      field: null,
      value: null
    })
  }

  // Handle confirmed delete
  const handleConfirmDelete = async () => {
    const { category, field, value } = deleteModal
    await removeOption({ category, field, value })
    closeDeleteModal()
  }

  // Handle create option
  const handleCreateOption = async formData => {
    return await addOption({
      category: formData.category,
      field: formData.field,
      value: formData.value
    })
  }

  const getFieldLabel = field => {
    const labels = {
      truckType: 'Truck Type',
      status: 'Status',
      subcon: 'Subcon',
      hybrid: 'Hybrid',
      territory: 'Territory',
      flagging: 'Flagging',
      destination: 'Destination'
    }
    return labels[field] || field
  }

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
              className='flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-700 rounded max-sm:text-xs text-sm font-medium capitalize group pl-2.5'
            >
              <span>{option}</span>
              <button
                type='button'
                onClick={() => openDeleteModal(category, field, option)}
                disabled={isRemoving}
                className='text-gray-300 hover:text-gray-600 transition-colors disabled:opacity-40 px-2 py-1 border-l border-gray-200 hover:bg-gray-100 cursor-pointer max-sm:text-sm'
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
    return (
      <div className='flex-1 flex items-center justify-center'>
        <div className='flex flex-col items-center justify-center gap-4 text-center'>
          <div className='relative'>
            <span className='loading loading-spinner loading-lg text-emerald-500'></span>
          </div>
          <p className='text-gray-600 font-medium'>Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className='flex-1 flex flex-col gap-2 sm:gap-4 lg:gap-6'>
        {/* header */}
        <div className='flex flex-wrap justify-between items-center gap-y-4'>
          <h1 className='font-semibold text-lg sm:text-xl md:text-2xl text-nowrap'>
            System Settings
          </h1>

          {/* create button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            disabled={isLoadingSettings}
            className='flex items-center gap-2 sm:gap-4 bg-linear-to-b from-emerald-500 to-emerald-600 text-white text-nowrap rounded px-3 py-1 cursor-pointer active:scale-95 transition-all hover:brightness-95 max-sm:text-sm'
          >
            <FaPlus className='text-xs sm:text-sm' />
            <p>Create New</p>
          </button>
        </div>

        {/* options display - side by side */}
        <div className='flex-1 flex flex-col md:flex-row gap-5'>
          {/* Trucks & Drivers */}
          <div className='flex-1 flex flex-col bg-white rounded-md border border-gray-200 overflow-auto'>
            <div className='px-6 py-4 border-b border-gray-100'>
              <h2 className='max-sm:text-sm font-semibold text-gray-800'>
                Trucks & Drivers
              </h2>
              <p className='max-sm:text-xs text-sm text-gray-500 mt-0.5'>
                Options for truck and driver forms
              </p>
            </div>

            <div className='flex-1 relative overflow-y-auto'>
              <div className='absolute top-0 left-0 right-0 px-6 py-2'>
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
                    <p className='text-gray-500 max-sm:text-sm'>
                      No options available
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Deployments */}
          <div className='flex-1 flex flex-col bg-white rounded-md border border-gray-200 overflow-auto'>
            <div className='px-6 py-4 border-b border-gray-100'>
              <h2 className='max-sm:text-sm font-semibold text-gray-800'>
                Deployments
              </h2>
              <p className='max-sm:text-xs text-sm text-gray-500 mt-0.5'>
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
                    <p className='text-gray-500 max-sm:text-sm'>
                      No options available
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Option Modal */}
      <CreateOptionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateOption}
        isLoading={isAdding}
      />

      {/* Delete Confirmation Modal */}
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
