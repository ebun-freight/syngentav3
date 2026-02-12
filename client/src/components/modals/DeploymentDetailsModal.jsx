import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild,
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  ComboboxButton
} from '@headlessui/react'
import clsx from 'clsx'
import { IoClose, IoWarning } from 'react-icons/io5'
import { DEPLOYMENT_STATUS, TRUCK_TYPES } from '../../utils/generalOptions'
import { MdKeyboardArrowDown } from 'react-icons/md'
import { useEffect, useState } from 'react'
import { DateTime } from 'luxon'
import useUpdateDeployment from '../../hooks/useUpdateDeployment'
import { toast } from 'react-toastify'
import { HiDotsHorizontal } from 'react-icons/hi'
import { NumericFormat } from 'react-number-format'
import { FLAGGING_OPTIONS } from '../../utils/deploymentOptions'
import { useUserContext } from '../../contexts/UserContext'
import {
  TbDeviceFloppy,
  TbExchange,
  TbPencilMinus,
  TbPrinter,
  TbTrash
} from 'react-icons/tb'
import jsPDF from 'jspdf'
import { API_DEPLOYMENT } from '../../utils/APIRoutes'
import axios from 'axios'

function DeploymentDetailsModal ({
  isOpen,
  onClose,
  trucks,
  drivers,
  deployment,
  onUpdate,
  openDeleteModal,
  openReplacementModal,
  openReplacementHistory,
  updatable
}) {
  const { userData } = useUserContext()
  console.log(userData.data.role)
  console.log(deployment)

  const [isEditMode, setIsEditMode] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [isReplacementShow, setIsReplacementShow] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  // Search states
  const [truckQuery, setTruckQuery] = useState('')
  const [driverQuery, setDriverQuery] = useState('')
  const [replacementTruckQuery, setReplacementTruckQuery] = useState('')
  const [replacementDriverQuery, setReplacementDriverQuery] = useState('')

  const { updateDeploymentFunction, isLoading } = useUpdateDeployment()

  const handleChange = e => {
    const { name, value } = e.target

    // check if the name contains dots (nested property)
    if (name.includes('.')) {
      const [parent, child] = name.split('.')

      setEditForm(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }))
    } else {
      // handle regular flat properties
      setEditForm(prev => ({ ...prev, [name]: value }))
    }
  }

  // Handle combobox changes
  const handleComboboxChange = (name, value) => {
    if (name.includes('.')) {
      const [parent, child] = name.split('.')
      setEditForm(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }))
    } else {
      setEditForm(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleUpdateDeployment = async e => {
    e.preventDefault()

    console.log(editForm)

    const result = await updateDeploymentFunction(deployment._id, editForm)

    if (result.success) {
      onUpdate(result.data.deployment)
      toast.success(result.data.message)
      onClose()
    } else {
      console.log(result.error)
      toast.error(result.error)
    }
  }

  const handlePrintTMO = async () => {
    if (!deployment) {
      toast.error('No deployment data available')
      return
    }

    try {
      // Helper function to capitalize words
      const capitalizeWords = str => {
        if (!str) return ''
        return str
          .toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      }

      // Helper function to format truck type
      const formatTruckType = type => {
        if (!type) return ''
        const lowerType = type.toLowerCase().trim()
        return (
          TRUCK_TYPES[lowerType] || capitalizeWords(type.replace(/-/g, ' '))
        )
      }

      // Determine active truck and driver (considering replacement)
      const hasReplacement = deployment?.replacement?.replacementTruckId?._id
      const activeTruck = hasReplacement
        ? deployment.replacement.replacementTruckId
        : deployment.truckId
      const activeDriver = hasReplacement
        ? deployment.replacement.replacementDriverId
        : deployment.driverId
      const activeTruckType = hasReplacement
        ? deployment.replacement.replacementTruckType
        : deployment.truckType

      // Create PDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      // Set font
      doc.setFont('helvetica', 'bold')

      // Title
      doc.setFontSize(18)
      doc.text('TRANSPORT MOVEMENT ORDER', 105, 20, { align: 'center' })

      // Deployment Code
      doc.setFontSize(14)
      doc.text(`TMO No: ${deployment.deploymentCode}`, 105, 30, {
        align: 'center'
      })

      // Add a line
      doc.setLineWidth(0.5)
      doc.line(20, 35, 190, 35)

      // Content section
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      let yPos = 50

      // Truck Details Section
      doc.text('TRUCK DETAILS', 20, yPos)
      yPos += 8
      doc.setFont('helvetica', 'normal')
      doc.text(
        `Plate No: ${activeTruck?.plateNo?.toUpperCase() || 'N/A'}`,
        25,
        yPos
      )
      yPos += 6
      doc.text(`Truck Type: ${formatTruckType(activeTruckType)}`, 25, yPos)
      yPos += 6
      doc.text(`Subcon: ${deployment.subcon || 'N/A'}`, 25, yPos)
      yPos += 10

      // Driver Details Section
      doc.setFont('helvetica', 'bold')
      doc.text('DRIVER DETAILS', 20, yPos)
      yPos += 8
      doc.setFont('helvetica', 'normal')
      const driverName = activeDriver
        ? `${capitalizeWords(activeDriver.firstname)} ${capitalizeWords(
            activeDriver.lastname
          )}`
        : 'N/A'
      doc.text(`Driver: ${driverName}`, 25, yPos)
      yPos += 6
      doc.text(`Helper Count: ${deployment.helperCount || 'N/A'}`, 25, yPos)
      yPos += 10

      // Pickup Details Section
      doc.setFont('helvetica', 'bold')
      doc.text('PICKUP DETAILS', 20, yPos)
      yPos += 8
      doc.setFont('helvetica', 'normal')
      doc.text(`Pickup Site: ${deployment.pickupSite || 'N/A'}`, 25, yPos)
      yPos += 6
      doc.text(`Municipality: ${deployment.municipality || 'N/A'}`, 25, yPos)
      yPos += 6
      doc.text(
        `Field Contact: ${deployment.fieldContactPerson || 'N/A'}`,
        25,
        yPos
      )
      yPos += 6
      doc.text(
        `Contact No: ${deployment.fieldContactPersonNo || 'N/A'}`,
        25,
        yPos
      )
      yPos += 6
      doc.text(
        `Scheduled Pickup: ${deployment.scheduledPickupTime || 'N/A'}`,
        25,
        yPos
      )
      yPos += 6
      doc.text(
        `Est. Quantity: ${deployment.estimatedQuantityKg || 'N/A'} kg`,
        25,
        yPos
      )
      yPos += 10

      // Delivery Details Section
      doc.setFont('helvetica', 'bold')
      doc.text('DELIVERY DETAILS', 20, yPos)
      yPos += 8
      doc.setFont('helvetica', 'normal')
      doc.text(`Destination: ${deployment.destination || 'N/A'}`, 25, yPos)
      yPos += 6
      doc.text(
        `Receiving Contact: ${deployment.receivingContactPerson || 'N/A'}`,
        25,
        yPos
      )
      yPos += 6
      doc.text(
        `Contact No: ${deployment.receivingContactPersonNo || 'N/A'}`,
        25,
        yPos
      )
      yPos += 6
      doc.text(`Territory: ${deployment.territory || 'N/A'}`, 25, yPos)
      yPos += 6
      doc.text(`Hybrid: ${deployment.hybrid || 'N/A'}`, 25, yPos)
      yPos += 6
      doc.text(`Flagging: ${deployment.flagging || 'N/A'}`, 25, yPos)
      if (deployment.flaggingRemarks) {
        yPos += 6
        doc.text(`Remarks: ${deployment.flaggingRemarks}`, 25, yPos)
      }
      yPos += 15

      // Status
      doc.setFont('helvetica', 'bold')
      doc.text(`Status: ${capitalizeWords(deployment.status)}`, 20, yPos)
      yPos += 10

      // Footer
      doc.setFontSize(9)
      doc.setFont('helvetica', 'italic')
      const timestamp = DateTime.now()
        .setZone('Asia/Manila')
        .toFormat('MMMM dd, yyyy hh:mm a')
      doc.text(`Generated on: ${timestamp}`, 105, 280, { align: 'center' })

      // Save PDF
      const filename = `TMO_${deployment.deploymentCode}.pdf`
      doc.save(filename)

      // Small delay to ensure download initiated
      await new Promise(resolve => setTimeout(resolve, 1000))

      if (!deployment.isTMOPrinted) {
        // After PDF is generated, call backend to update isTMOPrinted
        try {
          const response = await axios.patch(
            `${API_DEPLOYMENT}/${deployment._id}`,
            { isTMOPrinted: true },
            {
              headers: {
                Authorization: `Bearer ${sessionStorage.getItem('userToken')}`
              }
            }
          )

          // Update local state
          onUpdate(response.data.deployment)

          toast.success(
            `TMO exported successfully for ${deployment.deploymentCode}`
          )
        } catch (error) {
          console.error('Error updating TMO print status:', error)
          toast.warning(
            `PDF generated successfully, but failed to update print status: ${
              error.response?.data?.message || error.message
            }`
          )
        }
      } else {
        toast.success(
          `TMO exported successfully for ${deployment.deploymentCode}`
        )
      }
    } catch (error) {
      console.error('Error generating TMO PDF:', error)
      toast.error(`Error generating TMO PDF: ${error.message}`)
    }
  }

  const handleCloseModal = () => {
    setEditForm(deployment)
    setIsReplacementShow(false)
    setActiveTab('overview')
    setTruckQuery('')
    setDriverQuery('')
    setReplacementTruckQuery('')
    setReplacementDriverQuery('')
    onClose()
  }

  const handleCancelEditMode = () => {
    setIsEditMode(false)
    setEditForm(deployment)
    setTruckQuery('')
    setDriverQuery('')
    setReplacementTruckQuery('')
    setReplacementDriverQuery('')
  }

  useEffect(() => {
    console.log(deployment)
    if (isOpen && deployment) {
      setIsEditMode(false)
      setEditForm(deployment)
      setActiveTab('overview')
    }
  }, [isOpen, deployment])

  useEffect(() => {
    console.log(deployment)

    if (deployment?.replacement?.replacementTruckId?._id) {
      console.log('HAS REPLACEMENT')
      setIsReplacementShow(true)
    } else {
      console.log('NO REPLACEMENT')
      setIsReplacementShow(false)
    }
  }, [deployment, isOpen])

  // Filter trucks and drivers based on search
  const filteredTrucks =
    trucks?.filter(
      truck =>
        truck.status === 'available' &&
        (truck.plateNo.toLowerCase().includes(truckQuery.toLowerCase()) ||
          truck.truckType.toLowerCase().includes(truckQuery.toLowerCase()))
    ) || []

  const filteredDrivers =
    drivers?.filter(
      driver =>
        driver.status === 'available' &&
        (driver.firstname.toLowerCase().includes(driverQuery.toLowerCase()) ||
          driver.lastname.toLowerCase().includes(driverQuery.toLowerCase()))
    ) || []

  const filteredReplacementTrucks =
    trucks?.filter(
      truck =>
        truck.plateNo
          .toLowerCase()
          .includes(replacementTruckQuery.toLowerCase()) ||
        truck.truckType
          .toLowerCase()
          .includes(replacementTruckQuery.toLowerCase())
    ) || []

  const filteredReplacementDrivers =
    drivers?.filter(
      driver =>
        driver.firstname
          .toLowerCase()
          .includes(replacementDriverQuery.toLowerCase()) ||
        driver.lastname
          .toLowerCase()
          .includes(replacementDriverQuery.toLowerCase())
    ) || []

  // Get current values for display
  const currentTruckId = isReplacementShow
    ? editForm?.replacement?.replacementTruckId?._id
    : editForm?.truckId?._id

  const currentDriverId = isReplacementShow
    ? editForm?.replacement?.replacementDriverId?._id
    : editForm?.driverId?._id

  const currentTruck = trucks?.find(truck => truck._id === currentTruckId)
  const currentDriver = drivers?.find(driver => driver._id === currentDriverId)

  return (
    <Dialog open={isOpen} onClose={handleCloseModal} className='relative z-50'>
      {/* Backdrop */}
      <TransitionChild
        enter='ease-out duration-300'
        enterFrom='opacity-0'
        enterTo='opacity-100'
        leave='ease-in duration-200'
        leaveFrom='opacity-100'
        leaveTo='opacity-0'
      >
        <DialogBackdrop className='fixed inset-0 bg-black/30 backdrop-blur-sm' />
      </TransitionChild>

      {/* Modal container */}
      <div className='fixed inset-0 flex items-center justify-center p-4'>
        <TransitionChild
          enter='ease-out duration-300'
          enterFrom='opacity-0 -translate-y-8'
          enterTo='opacity-100 translate-y-0'
          leave='ease-in duration-200'
          leaveFrom='opacity-100 translate-y-0'
          leaveTo='opacity-0 -translate-y-8'
        >
          <DialogPanel className='font-poppins text-gray-900 w-full max-w-6xl rounded-2xl bg-white shadow-xl overflow-hidden relative max-h-[90vh] overflow-y-auto scrollbar-thin'>
            {/* edit mode warning */}
            <p
              className={clsx(
                'bg-orange-500 text-white px-4 right-26 font-medium py-3 text-sm flex items-center gap-2  transition-all absolute rounded-b-md shadow-warning tracking-wider z-10',
                {
                  '-translate-y-12': !isEditMode,
                  'translate-y-0': isEditMode
                }
              )}
            >
              <IoWarning className='text-xl' />
              EDIT MODE
            </p>

            {/* top right buttons */}
            <div className='absolute top-4 right-4 flex items-center gap-2 z-10'>
              {/* replacement history button */}
              <div className='dropdown dropdown-bottom dropdown-end'>
                <div
                  tabIndex={0}
                  role='button'
                  className='hover:bg-gray-100 p-1 rounded-full text-2xl text-gray-500 cursor-pointer transition-all'
                >
                  <HiDotsHorizontal />
                </div>
                <ul
                  tabIndex={0}
                  className='dropdown-content menu shadow-sm rounded-box p-0 bg-white'
                >
                  <li>
                    <div
                      onClick={openReplacementHistory}
                      className='px-6 py-2 text-nowrap cursor-pointer hover:bg-gray-50 bg-white border border-gray-200'
                    >
                      Replacement History
                    </div>
                  </li>
                </ul>
              </div>

              {/* close button */}
              <button
                onClick={handleCloseModal}
                className='hover:bg-gray-100 p-1 rounded-full text-2xl text-gray-600 cursor-pointer transition-all'
              >
                <IoClose />
              </button>
            </div>

            <form onSubmit={handleUpdateDeployment} className='flex'>
              {/* timeline */}
              <div className='bg-gray-100 min-w-60 px-6 py-8 border-r border-gray-200'>
                <h2 className='text-lg font-semibold mb-4 -ml-2'>
                  Transport Log
                </h2>
                <div className='flex flex-col'>
                  {/* departed */}
                  <div className='flex gap-5'>
                    <div className='relative'>
                      <div
                        className={clsx(
                          'w-4 aspect-square rounded-full absolute z-10 left-1/2 -translate-x-1/2',
                          {
                            'bg-emerald-500 shadow-warning': isEditMode
                              ? editForm.departed?.trim()
                              : deployment.departed?.trim(),
                            'bg-gray-200 shadow-[inset_0_2px_4px_0_rgb(0,0,0,0.2)]':
                              isEditMode
                                ? !editForm.departed?.trim()
                                : !deployment.departed?.trim()
                          }
                        )}
                      ></div>
                      <div
                        className={clsx(
                          'w-0.5 h-full absolute top-0 left-1/2 -translate-x-1/2',
                          {
                            'bg-emerald-500': isEditMode
                              ? editForm.departed?.trim()
                              : deployment.departed?.trim(),
                            'bg-gray-300': isEditMode
                              ? !editForm.departed?.trim()
                              : !deployment.departed?.trim()
                          }
                        )}
                      ></div>
                    </div>
                    <div className='pb-6 flex-1 w-56'>
                      {isEditMode ? (
                        <InputField
                          label='Departed'
                          type='datetime-local'
                          name='departed'
                          placeholder='Departed'
                          isCapitalize={false}
                          isRequired={false}
                          isFullWidth={false}
                          value={editForm?.departed}
                          disabled={!isEditMode}
                          onChange={handleChange}
                          isDarkerOutline={true}
                        />
                      ) : (
                        <label className='flex flex-col gap-1'>
                          <p className='text-xs font-semibold uppercase text-gray-500'>
                            Departed
                          </p>
                          {deployment.departed ? (
                            <p className='outline outline-gray-300 px-3 py-2 rounded break-all focus:outline-gray-400'>
                              {DateTime.fromISO(deployment.departed)
                                .setZone('Asia/Manila')
                                .toFormat('MMM d, yyyy - hh:mm a')}
                            </p>
                          ) : (
                            <p className='italic text-gray-400 text-sm font-light outline outline-gray-300 px-3 py-2.5 rounded break-all focus:outline-gray-400'>
                              Pending
                            </p>
                          )}
                        </label>
                      )}
                    </div>
                  </div>

                  {/* pickup in */}
                  <div className='flex gap-5'>
                    <div className='relative'>
                      <div
                        className={clsx(
                          'w-4 aspect-square rounded-full absolute z-10 left-1/2 -translate-x-1/2',
                          {
                            'bg-emerald-500 shadow-warning': isEditMode
                              ? editForm.pickupIn?.trim()
                              : deployment.pickupIn?.trim(),
                            'bg-gray-200 shadow-[inset_0_2px_4px_0_rgb(0,0,0,0.2)]':
                              isEditMode
                                ? !editForm.pickupIn?.trim()
                                : !deployment.pickupIn?.trim()
                          }
                        )}
                      ></div>
                      <div
                        className={clsx(
                          'w-0.5 h-full absolute top-0 left-1/2 -translate-x-1/2',
                          {
                            'bg-emerald-500': isEditMode
                              ? editForm.pickupIn?.trim()
                              : deployment.pickupIn?.trim(),
                            'bg-gray-300': isEditMode
                              ? !editForm.pickupIn?.trim()
                              : !deployment.pickupIn?.trim()
                          }
                        )}
                      ></div>
                    </div>
                    <div className='pb-6 flex-1 w-56'>
                      {isEditMode ? (
                        <InputField
                          label='Pick-up In'
                          type='datetime-local'
                          name='pickupIn'
                          placeholder='Pick-up In'
                          isCapitalize={false}
                          isRequired={false}
                          isFullWidth={false}
                          value={editForm?.pickupIn}
                          disabled={!isEditMode || !editForm?.departed}
                          onChange={handleChange}
                          isDarkerOutline={true}
                        />
                      ) : (
                        <label className='flex flex-col gap-1'>
                          <p className='text-xs font-semibold uppercase text-gray-500'>
                            Pick-up In
                          </p>
                          {deployment.pickupIn ? (
                            <p className='outline outline-gray-300 px-3 py-2 rounded break-all focus:outline-gray-400'>
                              {DateTime.fromISO(deployment.pickupIn)
                                .setZone('Asia/Manila')
                                .toFormat('MMM d, yyyy - hh:mm a')}
                            </p>
                          ) : (
                            <p className='italic text-gray-400 text-sm font-light outline outline-gray-300 px-3 py-2.5 rounded break-all focus:outline-gray-400'>
                              Pending
                            </p>
                          )}
                        </label>
                      )}
                    </div>
                  </div>

                  {/* pickup out */}
                  <div className='flex gap-5'>
                    <div className='relative'>
                      <div
                        className={clsx(
                          'w-4 aspect-square rounded-full absolute z-10 left-1/2 -translate-x-1/2',
                          {
                            'bg-emerald-500 shadow-warning': isEditMode
                              ? editForm.pickupOut?.trim()
                              : deployment.pickupOut?.trim(),
                            'bg-gray-200 shadow-[inset_0_2px_4px_0_rgb(0,0,0,0.2)]':
                              isEditMode
                                ? !editForm.pickupOut?.trim()
                                : !deployment.pickupOut?.trim()
                          }
                        )}
                      ></div>
                      <div
                        className={clsx(
                          'w-0.5 h-full absolute top-0 left-1/2 -translate-x-1/2',
                          {
                            'bg-emerald-500': isEditMode
                              ? editForm.pickupOut?.trim()
                              : deployment.pickupOut?.trim(),
                            'bg-gray-300': isEditMode
                              ? !editForm.pickupOut?.trim()
                              : !deployment.pickupOut?.trim()
                          }
                        )}
                      ></div>
                    </div>
                    <div className='pb-6 flex-1 w-56'>
                      {isEditMode ? (
                        <InputField
                          label='Pick-up Out'
                          type='datetime-local'
                          name='pickupOut'
                          placeholder='Pick-up Out'
                          isCapitalize={false}
                          isRequired={false}
                          isFullWidth={false}
                          value={editForm?.pickupOut}
                          disabled={!isEditMode || !editForm?.pickupIn}
                          onChange={handleChange}
                          isDarkerOutline={true}
                        />
                      ) : (
                        <label className='flex flex-col gap-1'>
                          <p className='text-xs font-semibold uppercase text-gray-500'>
                            Pick-up Out
                          </p>
                          {deployment.pickupOut ? (
                            <p className='outline outline-gray-300 px-3 py-2 rounded break-all focus:outline-gray-400'>
                              {DateTime.fromISO(deployment.pickupOut)
                                .setZone('Asia/Manila')
                                .toFormat('MMM d, yyyy - hh:mm a')}
                            </p>
                          ) : (
                            <p className='italic text-gray-400 text-sm font-light outline outline-gray-300 px-3 py-2.5 rounded break-all focus:outline-gray-400'>
                              Pending
                            </p>
                          )}
                        </label>
                      )}
                    </div>
                  </div>

                  {/* dest arrival */}
                  <div className='flex gap-5'>
                    <div className='relative'>
                      <div
                        className={clsx(
                          'w-4 aspect-square rounded-full absolute z-10 left-1/2 -translate-x-1/2',
                          {
                            'bg-emerald-500 shadow-warning': isEditMode
                              ? editForm.destArrival?.trim()
                              : deployment.destArrival?.trim(),
                            'bg-gray-200 shadow-[inset_0_2px_4px_0_rgb(0,0,0,0.2)]':
                              isEditMode
                                ? !editForm.destArrival?.trim()
                                : !deployment.destArrival?.trim()
                          }
                        )}
                      ></div>
                      <div
                        className={clsx(
                          'w-0.5 h-full absolute top-0 left-1/2 -translate-x-1/2',
                          {
                            'bg-emerald-500': isEditMode
                              ? editForm.destArrival?.trim()
                              : deployment.destArrival?.trim(),
                            'bg-gray-300 shadow-inner': isEditMode
                              ? !editForm.destArrival?.trim()
                              : !deployment.destArrival?.trim()
                          }
                        )}
                      ></div>
                    </div>
                    <div className='pb-6 flex-1 w-56'>
                      {isEditMode ? (
                        <InputField
                          label='Dest Arrival'
                          type='datetime-local'
                          name='destArrival'
                          placeholder='Dest Arrival'
                          isCapitalize={false}
                          isRequired={false}
                          isFullWidth={false}
                          value={editForm?.destArrival}
                          disabled={!isEditMode || !editForm?.pickupOut}
                          onChange={handleChange}
                          isDarkerOutline={true}
                        />
                      ) : (
                        <label className='flex flex-col gap-1'>
                          <p className='text-xs font-semibold uppercase text-gray-500'>
                            Dest Arrival
                          </p>
                          {deployment.destArrival ? (
                            <p className='outline outline-gray-300 px-3 py-2 rounded break-all focus:outline-gray-400'>
                              {DateTime.fromISO(deployment.destArrival)
                                .setZone('Asia/Manila')
                                .toFormat('MMM d, yyyy - hh:mm a')}
                            </p>
                          ) : (
                            <p className='italic text-gray-400 text-sm font-light outline outline-gray-300 px-3 py-2.5 rounded break-all focus:outline-gray-400'>
                              Pending
                            </p>
                          )}
                        </label>
                      )}
                    </div>
                  </div>

                  {/* dest departure */}
                  <div className='flex gap-5'>
                    <div className='relative'>
                      <div
                        className={clsx(
                          'w-4 aspect-square rounded-full absolute z-10 left-1/2 -translate-x-1/2',
                          {
                            'bg-emerald-500 shadow-warning': isEditMode
                              ? editForm.destDeparture?.trim()
                              : deployment.destDeparture?.trim(),
                            'bg-gray-200 shadow-[inset_0_2px_4px_0_rgb(0,0,0,0.2)]':
                              isEditMode
                                ? !editForm.destDeparture?.trim()
                                : !deployment.destDeparture?.trim()
                          }
                        )}
                      ></div>
                      <div
                        className={clsx(
                          'w-0.5 h-full absolute top-0 left-1/2 -translate-x-1/2',
                          {
                            'bg-emerald-500': isEditMode
                              ? editForm.destDeparture?.trim()
                              : deployment.destDeparture?.trim(),
                            'bg-gray-300 shadow-inner': isEditMode
                              ? !editForm.destDeparture?.trim()
                              : !deployment.destDeparture?.trim()
                          }
                        )}
                      ></div>
                    </div>
                    <div className='pb-6 flex-1 w-56'>
                      {isEditMode ? (
                        <InputField
                          label='Dest Departure'
                          type='datetime-local'
                          name='destDeparture'
                          placeholder='Dest Departure'
                          isCapitalize={false}
                          isRequired={false}
                          isFullWidth={false}
                          value={editForm?.destDeparture}
                          disabled={!isEditMode || !editForm?.destArrival}
                          onChange={handleChange}
                          isDarkerOutline={true}
                        />
                      ) : (
                        <label className='flex flex-col gap-1'>
                          <p className='text-xs font-semibold uppercase text-gray-500'>
                            Dest Departure
                          </p>
                          {deployment.destDeparture ? (
                            <p className='outline outline-gray-300 px-3 py-2 rounded break-all focus:outline-gray-400'>
                              {DateTime.fromISO(deployment.destDeparture)
                                .setZone('Asia/Manila')
                                .toFormat('MMM d, yyyy - hh:mm a')}
                            </p>
                          ) : (
                            <p className='italic text-gray-400 text-sm font-light outline outline-gray-300 px-3 py-2.5 rounded break-all focus:outline-gray-400'>
                              Pending
                            </p>
                          )}
                        </label>
                      )}
                    </div>
                  </div>

                  {/* unloading time */}
                  <div className='flex gap-5'>
                    <div className='relative'>
                      <div
                        className={clsx(
                          'w-4 aspect-square rounded-full absolute z-10 left-1/2 -translate-x-1/2',
                          {
                            'bg-emerald-500 shadow-warning': isEditMode
                              ? editForm.destDeparture?.trim()
                              : deployment.destDeparture?.trim(),
                            'bg-gray-200 shadow-[inset_0_2px_4px_0_rgb(0,0,0,0.2)]':
                              isEditMode
                                ? !editForm.destDeparture?.trim()
                                : !deployment.destDeparture?.trim()
                          }
                        )}
                      ></div>
                    </div>
                    <div className='flex-1 w-56'>
                      <label className='flex flex-col gap-1'>
                        <p className='text-xs font-semibold uppercase text-gray-500'>
                          Unloading Time
                        </p>
                        {deployment?.destDeparture ||
                        deployment?.destArrival ? (
                          <div className='outline outline-gray-300 px-3 py-2 rounded break-all focus:outline-gray-400 flex items-center gap-2'>
                            {(() => {
                              const { days, hours, minutes } = DateTime.fromISO(
                                editForm.destDeparture
                              ).diff(DateTime.fromISO(editForm.destArrival), [
                                'days',
                                'hours',
                                'minutes'
                              ])

                              const totalHours = days * 24 + hours

                              const formatDays = () => {
                                const parts = []
                                if (days > 0) parts.push(`${days}d`)
                                if (hours > 0) parts.push(`${hours}h`)
                                if (minutes > 0)
                                  parts.push(`${Math.floor(minutes)}m`)
                                return (
                                  parts.join(' ') || `${Math.floor(minutes)}m`
                                )
                              }

                              const formatTotalHours = () => {
                                if (totalHours > 0) {
                                  return `${totalHours}h${
                                    minutes > 0
                                      ? ` ${Math.floor(minutes)}m`
                                      : ''
                                  }`
                                }
                                return `${Math.floor(minutes)}m`
                              }

                              if (totalHours >= 24) {
                                return `${formatDays()} (${formatTotalHours()})`
                              } else if (hours > 0) {
                                return `${hours}h ${Math.floor(minutes)}m`
                              } else {
                                return `${Math.floor(minutes)}m`
                              }
                            })()}
                          </div>
                        ) : (
                          <p className='italic text-gray-400 text-sm font-light outline outline-gray-300 px-3 py-2.5 rounded break-all focus:outline-gray-400'>
                            Pending
                          </p>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* deployment details */}
              <div className='px-6 py-8 flex-1 flex flex-col'>
                <div className='flex items-center gap-3 mb-4'>
                  <h2 className='text-lg font-semibold'>Deployment Details</h2>
                  <div
                    className='bg-gray-100 px-2 py-1 rounded-md shadow-card3 text-sm font-medium relative cursor-copy'
                    onClick={e => {
                      e.stopPropagation()
                      navigator.clipboard.writeText(deployment.deploymentCode)

                      const div = e.currentTarget
                      const tooltip = document.createElement('div')
                      tooltip.className =
                        'absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50'
                      tooltip.textContent = 'Copied'

                      div.appendChild(tooltip)

                      setTimeout(() => {
                        if (div.contains(tooltip)) {
                          div.removeChild(tooltip)
                        }
                      }, 1000)
                    }}
                    title='Click to copy'
                  >
                    #{editForm?.deploymentCode}
                  </div>
                </div>

                {/* TABS */}
                <div className='flex gap-2 border-b border-gray-200 mb-4'>
                  <button
                    type='button'
                    onClick={() => setActiveTab('overview')}
                    className={clsx(
                      'px-4 py-2 text-sm font-medium transition-colors relative',
                      {
                        'text-emerald-600': activeTab === 'overview',
                        'text-gray-500 hover:text-gray-700':
                          activeTab !== 'overview'
                      }
                    )}
                  >
                    Overview
                    {activeTab === 'overview' && (
                      <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600'></div>
                    )}
                  </button>
                  <button
                    type='button'
                    onClick={() => setActiveTab('details')}
                    className={clsx(
                      'px-4 py-2 text-sm font-medium transition-colors relative',
                      {
                        'text-emerald-600': activeTab === 'details',
                        'text-gray-500 hover:text-gray-700':
                          activeTab !== 'details'
                      }
                    )}
                  >
                    Additional Details
                    {activeTab === 'details' && (
                      <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600'></div>
                    )}
                  </button>

                  <div
                    className={clsx(
                      'ml-auto px-4 py-2 text-sm font-medium text-gray-500 rounded-t-lg outline outline-gray-200 flex items-center justify-center gap-2 '
                    )}
                  >
                    {deployment?.isTMOPrinted
                      ? 'TMO PRINTED'
                      : 'TMO NOT PRINTED'}

                    <div
                      className={clsx('w-2 aspect-square rounded-full', {
                        'bg-green-500': deployment?.isTMOPrinted,
                        'bg-red-500': !deployment?.isTMOPrinted
                      })}
                    ></div>
                  </div>
                </div>

                {/* TAB CONTENT */}
                <div className='flex-1 overflow-y-auto'>
                  {activeTab === 'overview' && (
                    <OverviewTab
                      isEditMode={isEditMode}
                      editForm={editForm}
                      deployment={deployment}
                      isReplacementShow={isReplacementShow}
                      trucks={trucks}
                      drivers={drivers}
                      currentTruck={currentTruck}
                      currentDriver={currentDriver}
                      filteredTrucks={filteredTrucks}
                      filteredDrivers={filteredDrivers}
                      filteredReplacementTrucks={filteredReplacementTrucks}
                      filteredReplacementDrivers={filteredReplacementDrivers}
                      truckQuery={truckQuery}
                      driverQuery={driverQuery}
                      replacementTruckQuery={replacementTruckQuery}
                      replacementDriverQuery={replacementDriverQuery}
                      setTruckQuery={setTruckQuery}
                      setDriverQuery={setDriverQuery}
                      setReplacementTruckQuery={setReplacementTruckQuery}
                      setReplacementDriverQuery={setReplacementDriverQuery}
                      handleChange={handleChange}
                      handleComboboxChange={handleComboboxChange}
                    />
                  )}

                  {activeTab === 'details' && (
                    <AdditionalDetailsTab
                      isEditMode={isEditMode}
                      editForm={editForm}
                      handleChange={handleChange}
                    />
                  )}
                </div>

                {/* ACTION BUTTONS */}
                {updatable && (
                  <div className='flex gap-4 col-span-full mt-6 pt-4 border-t border-gray-200'>
                    {isEditMode ? (
                      <>
                        <button
                          type='button'
                          onClick={handleCancelEditMode}
                          disabled={isLoading}
                          className='bg-linear-to-b from-gray-100 to-gray-200 text-gray-600  px-8 py-2 uppercase text-sm font-semibold rounded flex items-center gap-2 cursor-pointer active:scale-95 transition-all hover:brightness-95'
                        >
                          Cancel
                        </button>
                        <button
                          type='submit'
                          disabled={isLoading}
                          className='bg-linear-to-b from-emerald-500 to-emerald-600 text-white px-8 py-2 uppercase text-sm font-semibold rounded flex justify-center items-center gap-2 cursor-pointer active:scale-95 transition-all hover:brightness-95'
                        >
                          {isLoading ? (
                            <>
                              <span className='loading loading-spinner loading-xs'></span>
                              Saving
                            </>
                          ) : (
                            <>
                              <TbDeviceFloppy className='text-lg -mt-0.5' />
                              Save
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type='button'
                          onClick={() => setIsEditMode(true)}
                          disabled={isLoading}
                          className='bg-linear-to-b from-blue-500 to-blue-600 text-white px-6 py-2 uppercase text-sm font-semibold rounded flex items-center gap-2 cursor-pointer active:scale-95 transition-all hover:brightness-95'
                        >
                          <TbPencilMinus className='text-lg -mt-0.5' />
                          Update
                        </button>

                        <button
                          type='button'
                          onClick={handlePrintTMO}
                          disabled={isLoading}
                          className='bg-linear-to-b from-emerald-500 to-emerald-600 text-white px-6 py-2 uppercase text-sm font-semibold rounded flex items-center gap-2 cursor-pointer active:scale-95 transition-all hover:brightness-95'
                        >
                          <TbPrinter className='text-lg -mt-0.5' />
                          Print TMO
                        </button>

                        {!isReplacementShow && (
                          <button
                            type='button'
                            onClick={openReplacementModal}
                            disabled={isLoading}
                            className='bg-linear-to-b from-amber-500 to-amber-600 text-white px-6 py-2 uppercase text-sm font-semibold rounded flex items-center gap-2 cursor-pointer active:scale-95 transition-all hover:brightness-95'
                          >
                            <TbExchange className='text-lg -mt-0.5' />
                            Replace Truck
                          </button>
                        )}

                        <button
                          type='button'
                          onClick={openDeleteModal}
                          disabled={isLoading}
                          className='bg-linear-to-b from-red-500 to-red-600 text-white px-6 py-2 uppercase text-sm font-semibold rounded flex items-center gap-2 cursor-pointer active:scale-95 transition-all hover:brightness-95  ml-auto'
                        >
                          <TbTrash className='text-lg -mt-0.5' />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </form>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  )
}

// OVERVIEW TAB COMPONENT
const OverviewTab = ({
  isEditMode,
  editForm,
  deployment,
  isReplacementShow,
  trucks,
  drivers,
  currentTruck,
  currentDriver,
  filteredTrucks,
  filteredDrivers,
  filteredReplacementTrucks,
  filteredReplacementDrivers,
  truckQuery,
  driverQuery,
  replacementTruckQuery,
  replacementDriverQuery,
  setTruckQuery,
  setDriverQuery,
  setReplacementTruckQuery,
  setReplacementDriverQuery,
  handleChange,
  handleComboboxChange
}) => {
  return (
    <div className='space-y-4'>
      {!isReplacementShow ? (
        // Original truck details
        <div className='space-y-2'>
          <h3 className='text-xs uppercase font-semibold text-gray-500'>
            Truck Details
          </h3>
          <div className='grid grid-cols-2 gap-x-6 gap-y-4 border border-gray-200 rounded-md p-6'>
            {/* plate no. */}
            <label className='flex flex-col gap-1'>
              <span className='uppercase text-xs text-gray-500 font-semibold'>
                Plate No.
              </span>
              {isEditMode ? (
                <Combobox
                  value={
                    typeof editForm?.truckId === 'object'
                      ? editForm?.truckId?._id
                      : editForm?.truckId
                  }
                  onChange={value => handleComboboxChange('truckId', value)}
                >
                  <div className='relative'>
                    <ComboboxInput
                      className='w-full outline outline-gray-300 px-3 py-2 rounded focus:outline-1 focus:outline-gray-400 uppercase'
                      displayValue={truckId => {
                        const actualId =
                          typeof truckId === 'object' ? truckId?._id : truckId
                        const truck = trucks?.find(t => t._id === actualId)
                        return truck ? truck.plateNo : ''
                      }}
                      onChange={event => setTruckQuery(event.target.value)}
                      required
                    />
                    <ComboboxButton className='absolute inset-y-0 right-0 flex items-center pr-2'>
                      <MdKeyboardArrowDown className='h-5 w-5 text-gray-400' />
                    </ComboboxButton>
                    <ComboboxOptions className='absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white outline-1 outline-gray-300 py-1 text-base shadow-sm focus:outline-none sm:text-sm'>
                      {filteredTrucks.length === 0 && truckQuery !== '' ? (
                        <div className='relative cursor-default select-none px-4 py-2 text-gray-700'>
                          Nothing found.
                        </div>
                      ) : (
                        filteredTrucks.map(truck => (
                          <ComboboxOption
                            key={truck._id}
                            value={truck._id}
                            className={({ focus }) =>
                              `relative cursor-default select-none py-2 px-4 text-base ${
                                focus ? 'bg-gray-50' : 'text-gray-900'
                              } ${
                                (typeof editForm?.truckId === 'object'
                                  ? editForm?.truckId?._id
                                  : editForm?.truckId) === truck._id
                                  ? 'bg-gray-100'
                                  : ''
                              }`
                            }
                          >
                            {({ selected }) => (
                              <span className='block truncate uppercase'>
                                {truck.plateNo}
                              </span>
                            )}
                          </ComboboxOption>
                        ))
                      )}
                    </ComboboxOptions>
                  </div>
                </Combobox>
              ) : (
                <p className='outline outline-gray-200 px-3 py-2 rounded break-all uppercase'>
                  {currentTruck?.plateNo}
                </p>
              )}
            </label>

            <div className='grid grid-cols-2 gap-x-6'>
              {/* type */}
              <label className='flex flex-col gap-1'>
                <span className='uppercase text-xs text-gray-500 font-semibold'>
                  Truck Type
                </span>
                {isEditMode ? (
                  <div className='relative'>
                    <select
                      name='truckType'
                      value={editForm?.truckType}
                      onChange={handleChange}
                      className='outline outline-gray-300 px-3 py-2 rounded focus:outline-gray-400 appearance-none w-full capitalize'
                    >
                      {TRUCK_TYPES.map((item, index) => (
                        <option key={index} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <MdKeyboardArrowDown className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 text-lg' />
                  </div>
                ) : (
                  <p className='outline outline-gray-200 px-3 py-2 rounded break-all capitalize'>
                    {editForm?.truckType}
                  </p>
                )}
              </label>

              {/* helper count */}
              <InputField
                label='Helper Count'
                type='number'
                name='helperCount'
                placeholder='Helper Count'
                value={editForm?.helperCount}
                disabled={!isEditMode}
                onChange={handleChange}
                formatNumber={true}
              />
            </div>

            {/* driver */}
            <label className='flex flex-col gap-1'>
              <span className='uppercase text-xs text-gray-500 font-semibold'>
                Driver
              </span>
              {isEditMode ? (
                <Combobox
                  value={
                    typeof editForm?.driverId === 'object'
                      ? editForm?.driverId?._id
                      : editForm?.driverId
                  }
                  onChange={value => handleComboboxChange('driverId', value)}
                >
                  <div className='relative'>
                    <ComboboxInput
                      className='w-full outline outline-gray-300 px-3 py-2 rounded focus:outline-1 focus:outline-gray-400 capitalize'
                      displayValue={driverId => {
                        const actualId =
                          typeof driverId === 'object'
                            ? driverId?._id
                            : driverId
                        const driver = drivers?.find(d => d._id === actualId)
                        return driver
                          ? `${driver.firstname} ${driver.lastname}`
                          : ''
                      }}
                      onChange={event => setDriverQuery(event.target.value)}
                      required
                    />
                    <ComboboxButton className='absolute inset-y-0 right-0 flex items-center pr-2'>
                      <MdKeyboardArrowDown className='h-5 w-5 text-gray-400' />
                    </ComboboxButton>
                    <ComboboxOptions className='absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white outline-1 outline-gray-300 py-1 text-base shadow-sm focus:outline-none sm:text-sm'>
                      {filteredDrivers.length === 0 && driverQuery !== '' ? (
                        <div className='relative cursor-default select-none px-4 py-2 text-gray-700'>
                          Nothing found.
                        </div>
                      ) : (
                        filteredDrivers.map(driver => (
                          <ComboboxOption
                            key={driver._id}
                            value={driver._id}
                            className={({ focus }) =>
                              `relative cursor-default select-none py-2 px-4 text-base ${
                                focus ? 'bg-gray-50' : 'text-gray-900'
                              } ${
                                (typeof editForm?.driverId === 'object'
                                  ? editForm?.driverId?._id
                                  : editForm?.driverId) === driver._id
                                  ? 'bg-gray-100'
                                  : ''
                              }`
                            }
                          >
                            {({ selected }) => (
                              <span className='block truncate capitalize'>
                                {`${driver.firstname} ${driver.lastname}`}
                              </span>
                            )}
                          </ComboboxOption>
                        ))
                      )}
                    </ComboboxOptions>
                  </div>
                </Combobox>
              ) : (
                <p className='outline outline-gray-200 px-3 py-2 rounded break-all capitalize'>
                  {editForm?.driverId?._id
                    ? `${editForm.driverId.firstname} ${editForm.driverId.lastname}`
                    : 'N/A'}
                </p>
              )}
            </label>

            <div className='grid grid-cols-2 gap-x-6'>
              <InputField
                label='Sacks Count'
                type='number'
                name='sacksCount'
                value={editForm?.sacksCount}
                disabled={!isEditMode}
                onChange={handleChange}
                formatNumber={true}
                thousandSeparator={true}
                decimalScale={0}
                isRequired={false}
              />

              <InputField
                label='Load Weight (kg)'
                type='number'
                name='loadWeightKg'
                value={editForm?.loadWeightKg}
                disabled={!isEditMode}
                onChange={handleChange}
                formatNumber={true}
                thousandSeparator={true}
                decimalScale={2}
                isRequired={false}
              />
            </div>
          </div>
        </div>
      ) : (
        // Replacement truck details
        <div className='space-y-2'>
          <div className='flex justify-between'>
            <h3 className='text-xs uppercase font-semibold text-gray-500'>
              Truck Details
            </h3>
            <p className='text-xs text-red-500'>*This is a replacement truck</p>
          </div>
          <div className='grid grid-cols-2 gap-x-6 gap-y-4 border border-gray-200 rounded-md p-6'>
            {/* plate no. */}
            <label className='flex flex-col gap-1'>
              <span className='uppercase text-xs text-gray-500 font-semibold'>
                Plate No.
              </span>
              {isEditMode ? (
                <Combobox
                  value={
                    typeof editForm?.replacement?.replacementTruckId ===
                    'object'
                      ? editForm?.replacement?.replacementTruckId?._id
                      : editForm?.replacement?.replacementTruckId
                  }
                  onChange={value =>
                    handleComboboxChange(
                      'replacement.replacementTruckId',
                      value
                    )
                  }
                >
                  <div className='relative'>
                    <ComboboxInput
                      className='w-full outline outline-gray-300 px-3 py-2 rounded focus:outline-1 focus:outline-gray-400 uppercase'
                      displayValue={truckId => {
                        const actualId =
                          typeof truckId === 'object' ? truckId?._id : truckId
                        const truck = trucks?.find(t => t._id === actualId)
                        return truck ? truck.plateNo : ''
                      }}
                      onChange={event =>
                        setReplacementTruckQuery(event.target.value)
                      }
                      placeholder='Search plate no.'
                      required
                    />
                    <ComboboxButton className='absolute inset-y-0 right-0 flex items-center pr-2'>
                      <MdKeyboardArrowDown className='h-5 w-5 text-gray-400' />
                    </ComboboxButton>
                    <ComboboxOptions className='absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white outline-1 outline-gray-300 py-1 text-base shadow-sm focus:outline-none sm:text-sm'>
                      {filteredReplacementTrucks.length === 0 &&
                      replacementTruckQuery !== '' ? (
                        <div className='relative cursor-default select-none px-4 py-2 text-gray-700'>
                          Nothing found.
                        </div>
                      ) : (
                        filteredReplacementTrucks.map(truck => (
                          <ComboboxOption
                            key={truck._id}
                            value={truck._id}
                            className={({ focus }) =>
                              `relative cursor-default select-none py-2 px-4 text-base ${
                                focus ? 'bg-gray-50' : 'text-gray-900'
                              } ${
                                (typeof editForm?.replacement
                                  ?.replacementTruckId === 'object'
                                  ? editForm?.replacement?.replacementTruckId
                                      ?._id
                                  : editForm?.replacement
                                      ?.replacementTruckId) === truck._id
                                  ? 'bg-gray-100'
                                  : ''
                              }`
                            }
                          >
                            {({ selected }) => (
                              <span className='block truncate uppercase'>
                                {truck.plateNo}
                              </span>
                            )}
                          </ComboboxOption>
                        ))
                      )}
                    </ComboboxOptions>
                  </div>
                </Combobox>
              ) : (
                <p className='outline outline-gray-200 px-3 py-2 rounded break-all uppercase'>
                  {editForm?.replacement?.replacementTruckId?.plateNo}
                </p>
              )}
            </label>

            {/* driver */}
            <label className='flex flex-col gap-1'>
              <span className='uppercase text-xs text-gray-500 font-semibold'>
                Driver
              </span>
              {isEditMode ? (
                <Combobox
                  value={
                    typeof editForm?.replacement?.replacementDriverId ===
                    'object'
                      ? editForm?.replacement?.replacementDriverId?._id
                      : editForm?.replacement?.replacementDriverId
                  }
                  onChange={value =>
                    handleComboboxChange(
                      'replacement.replacementDriverId',
                      value
                    )
                  }
                >
                  <div className='relative'>
                    <ComboboxInput
                      className='w-full outline outline-gray-300 px-3 py-2 rounded focus:outline-1 focus:outline-gray-400 capitalize'
                      displayValue={driverId => {
                        const actualId =
                          typeof driverId === 'object'
                            ? driverId?._id
                            : driverId
                        const driver = drivers?.find(d => d._id === actualId)
                        return driver
                          ? `${driver.firstname} ${driver.lastname}`
                          : ''
                      }}
                      onChange={event =>
                        setReplacementDriverQuery(event.target.value)
                      }
                      placeholder='Search driver name'
                      required
                    />
                    <ComboboxButton className='absolute inset-y-0 right-0 flex items-center pr-2'>
                      <MdKeyboardArrowDown className='h-5 w-5 text-gray-400' />
                    </ComboboxButton>
                    <ComboboxOptions className='absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white outline-1 outline-gray-300 py-1 text-base shadow-sm focus:outline-none sm:text-sm'>
                      {filteredReplacementDrivers.length === 0 &&
                      replacementDriverQuery !== '' ? (
                        <div className='relative cursor-default select-none px-4 py-2 text-gray-700'>
                          Nothing found.
                        </div>
                      ) : (
                        filteredReplacementDrivers.map(driver => (
                          <ComboboxOption
                            key={driver._id}
                            value={driver._id}
                            className={({ focus }) =>
                              `relative cursor-default select-none py-2 px-4 text-base ${
                                focus ? 'bg-gray-50' : 'text-gray-900'
                              } ${
                                (typeof editForm?.replacement
                                  ?.replacementDriverId === 'object'
                                  ? editForm?.replacement?.replacementDriverId
                                      ?._id
                                  : editForm?.replacement
                                      ?.replacementDriverId) === driver._id
                                  ? 'bg-gray-100'
                                  : ''
                              }`
                            }
                          >
                            {({ selected }) => (
                              <span className='block truncate capitalize'>
                                {`${driver.firstname} ${driver.lastname}`}
                              </span>
                            )}
                          </ComboboxOption>
                        ))
                      )}
                    </ComboboxOptions>
                  </div>
                </Combobox>
              ) : (
                <p className='outline outline-gray-200 px-3 py-2 rounded break-all capitalize'>
                  {editForm?.replacement?.replacementDriverId
                    ? `${editForm.replacement.replacementDriverId.firstname} ${editForm.replacement.replacementDriverId.lastname}`
                    : ''}{' '}
                </p>
              )}
            </label>

            {/* type */}
            <label className='flex flex-col gap-1'>
              <span className='uppercase text-xs text-gray-500 font-semibold'>
                Truck Type
              </span>
              {isEditMode ? (
                <div className='relative'>
                  <select
                    name='replacement.replacementTruckType'
                    value={editForm?.replacement?.replacementTruckType}
                    onChange={handleChange}
                    className='outline outline-gray-300 px-3 py-2 rounded focus:outline-gray-400 appearance-none w-full capitalize'
                  >
                    {TRUCK_TYPES.map((item, index) => (
                      <option key={index} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <MdKeyboardArrowDown className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 text-lg' />
                </div>
              ) : (
                <p className='outline outline-gray-200 px-3 py-2 rounded break-all capitalize'>
                  {editForm?.replacement?.replacementTruckType}
                </p>
              )}
            </label>

            {/* helper count */}
            <InputField
              label='Helper Count'
              type='number'
              name='helperCount'
              placeholder='Helper Count'
              value={editForm?.helperCount}
              disabled={!isEditMode}
              onChange={handleChange}
              formatNumber={true}
            />

            <InputField
              label='Sacks Count'
              type='number'
              name='sacksCount'
              value={editForm?.sacksCount}
              disabled={!isEditMode}
              onChange={handleChange}
              formatNumber={true}
              thousandSeparator={true}
              decimalScale={0}
              isRequired={false}
            />

            <InputField
              label='Load Weight (kg)'
              type='number'
              name='loadWeightKg'
              value={editForm?.loadWeightKg}
              disabled={!isEditMode}
              onChange={handleChange}
              formatNumber={true}
              thousandSeparator={true}
              decimalScale={2}
              isRequired={false}
            />
          </div>
        </div>
      )}

      {/* other details */}
      <div className='space-y-2'>
        <h3 className='col-span-full text-xs uppercase font-semibold text-gray-500'>
          Other Details
        </h3>
        <div className='grid grid-cols-2 gap-x-6 gap-y-4 border border-gray-200 rounded-md p-6'>
          <div className='grid grid-cols-2 gap-x-6'>
            <InputField
              label='Territory'
              type='text'
              name='territory'
              value={editForm?.territory}
              disabled={!isEditMode}
              onChange={handleChange}
            />

            <InputField
              label='Hybrid'
              type='text'
              name='hybrid'
              value={editForm?.hybrid}
              disabled={!isEditMode}
              onChange={handleChange}
            />
          </div>

          <div className='grid grid-cols-2 gap-x-6'>
            {/* status */}
            <label className='flex flex-col gap-1'>
              <span className='uppercase text-xs text-gray-500 font-semibold'>
                Status
              </span>
              {isEditMode ? (
                <div className='relative'>
                  <select
                    name='status'
                    value={editForm?.status}
                    onChange={handleChange}
                    className='outline outline-gray-300 px-3 py-2 rounded focus:outline-gray-400 appearance-none w-full capitalize'
                  >
                    {DEPLOYMENT_STATUS.map((item, index) => (
                      <option key={index} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <MdKeyboardArrowDown className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 text-lg' />
                </div>
              ) : (
                <div className='outline outline-gray-200 px-3 py-2 rounded break-all focus:outline-gray-400'>
                  <p
                    className={clsx(
                      'capitalize w-fit px-2 py-0.5 rounded-full text-sm',
                      {
                        'bg-orange-500/10 text-orange-500':
                          editForm?.status === 'preparing',
                        'bg-emerald-500/10 text-emerald-500':
                          editForm?.status === 'ongoing',
                        'bg-blue-500/10 text-blue-500':
                          editForm?.status === 'completed',
                        'bg-red-500/10 text-red-500':
                          editForm?.status === 'canceled'
                      }
                    )}
                  >
                    {editForm?.status}
                  </p>
                </div>
              )}
            </label>

            {/* flagging */}
            <label className='flex flex-col gap-1'>
              <span className='uppercase text-xs text-gray-500 font-semibold'>
                Flagging
              </span>
              {isEditMode ? (
                <div className='relative'>
                  <select
                    name='flagging'
                    value={editForm?.flagging}
                    onChange={handleChange}
                    className='outline outline-gray-300 px-3 py-2 rounded focus:outline-gray-400 appearance-none w-full capitalize'
                  >
                    {FLAGGING_OPTIONS.map((item, index) => (
                      <option key={index} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <MdKeyboardArrowDown className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 text-lg' />
                </div>
              ) : (
                <div className='outline outline-gray-200 px-3 py-2 rounded break-all focus:outline-gray-400'>
                  <p
                    className={clsx(
                      'capitalize w-fit px-2 py-0.5 rounded-full text-sm',
                      {
                        'bg-emerald-500/10 text-emerald-500':
                          editForm?.flagging === 'Green',
                        'bg-orange-500/10 text-orange-500':
                          editForm?.flagging === 'Orange',
                        'bg-yellow-500/10 text-yellow-500':
                          editForm?.flagging === 'Yellow',
                        'bg-red-500/10 text-red-500':
                          editForm?.flagging === 'Red'
                      }
                    )}
                  >
                    {editForm?.flagging || 'N/A'}
                  </p>
                </div>
              )}
            </label>
          </div>

          <label className='flex flex-col gap-1'>
            <span className='uppercase text-xs text-gray-500 font-semibold'>
              Assigned At
            </span>
            <p className='outline outline-gray-200 px-3 py-2 rounded break-all focus:outline-gray-400'>
              {DateTime.fromISO(editForm?.createdAt)
                .setZone('Asia/Manila')
                .toFormat('MMM d, yyyy - hh:mm a')}
            </p>
          </label>

          <InputField
            label='Flagging Remarks'
            type='text'
            name='flaggingRemarks'
            placeholder=''
            maxLength={50}
            value={editForm?.flaggingRemarks}
            disabled={!isEditMode}
            onChange={handleChange}
            isRequired={false}
          />

          <InputField
            label='Pick-up Location'
            type='text'
            name='pickupSite'
            placeholder='Pick-up Location'
            maxLength={50}
            value={editForm?.pickupSite}
            disabled={!isEditMode}
            onChange={handleChange}
          />

          <InputField
            label='Cancellation Reason'
            type='text'
            name='cancellationReason'
            placeholder=''
            maxLength={50}
            value={editForm?.cancellationReason}
            disabled={!isEditMode || editForm?.status !== 'canceled'}
            onChange={handleChange}
            isRequired={false}
            isCapitalize={false}
          />
        </div>
      </div>
    </div>
  )
}

// ADDITIONAL DETAILS TAB COMPONENT
const AdditionalDetailsTab = ({ isEditMode, editForm, handleChange }) => {
  return (
    <div className='space-y-4'>
      {/* PICKUP DETAILS SECTION */}
      <div className='space-y-2'>
        <h3 className='text-xs uppercase font-semibold text-gray-500'>
          Pickup Details
        </h3>
        <div className='grid grid-cols-2 gap-x-6 gap-y-4 border border-gray-200 rounded-md p-6'>
          <InputField
            label='Pick-up Site'
            type='text'
            name='pickupSite'
            placeholder='Pick-up Site'
            value={editForm?.pickupSite}
            disabled={!isEditMode}
            onChange={handleChange}
          />

          <InputField
            label='Municipality'
            type='text'
            name='municipality'
            placeholder='Municipality'
            value={editForm?.municipality}
            disabled={!isEditMode}
            onChange={handleChange}
          />

          <InputField
            label='Field Contact Person'
            type='text'
            name='fieldContactPerson'
            placeholder='Contact Person'
            value={editForm?.fieldContactPerson}
            disabled={!isEditMode}
            onChange={handleChange}
          />

          <InputField
            label='Field Contact No.'
            type='text'
            name='fieldContactPersonNo'
            placeholder='Contact Number'
            value={editForm?.fieldContactPersonNo}
            disabled={!isEditMode}
            onChange={handleChange}
          />

          <InputField
            label='Scheduled Pickup Time'
            type='datetime-local'
            name='scheduledPickupTime'
            placeholder='Scheduled Pickup Time'
            value={editForm?.scheduledPickupTime}
            disabled={!isEditMode}
            onChange={handleChange}
            isCapitalize={false}
          />

          <InputField
            label='Estimated Quantity (Kg)'
            type='text'
            name='estimatedQuantityKg'
            placeholder='Estimated Quantity'
            value={editForm?.estimatedQuantityKg}
            disabled={!isEditMode}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* DELIVERY DETAILS SECTION */}
      <div className='space-y-2'>
        <h3 className='text-xs uppercase font-semibold text-gray-500'>
          Delivery Details
        </h3>
        <div className='grid grid-cols-2 gap-x-6 gap-y-4 border border-gray-200 rounded-md p-6'>
          <InputField
            label='Receiving Contact Person'
            type='text'
            name='receivingContactPerson'
            placeholder='Contact Person'
            value={editForm?.receivingContactPerson}
            disabled={!isEditMode}
            onChange={handleChange}
          />

          <InputField
            label='Receiving Contact No.'
            type='text'
            name='receivingContactPersonNo'
            placeholder='Contact Number'
            value={editForm?.receivingContactPersonNo}
            disabled={!isEditMode}
            onChange={handleChange}
          />

          <InputField
            label='Territory'
            type='text'
            name='territory'
            value={editForm?.territory}
            disabled={!isEditMode}
            onChange={handleChange}
          />

          <InputField
            label='Hybrid'
            type='text'
            name='hybrid'
            value={editForm?.hybrid}
            disabled={!isEditMode}
            onChange={handleChange}
          />
        </div>
      </div>
    </div>
  )
}

const InputField = ({
  colSpan = 1,
  rowSpan = 1,
  label,
  type,
  name,
  placeholder,
  value,
  onChange,
  disabled,
  maxLength,
  isRequired = true,
  isCapitalize = true,
  isUpperCase = false,
  isFullWidth = true,
  isDarkerOutline = false,
  // New props for number formatting
  formatNumber = false,
  thousandSeparator = true,
  decimalScale = 0,
  allowNegative = false
}) => {
  // If it's a number field with formatting, use NumericFormat
  if (formatNumber && type === 'number') {
    return (
      <label className={`col-span-${colSpan} flex flex-col gap-1`}>
        <span className='uppercase text-xs text-gray-500 font-semibold text-nowrap'>
          {label}
        </span>
        <NumericFormat
          thousandSeparator={thousandSeparator}
          decimalScale={decimalScale}
          allowNegative={allowNegative}
          value={value}
          onValueChange={values => {
            const syntheticEvent = {
              target: {
                name: name,
                value: values.floatValue || ''
              }
            }
            onChange(syntheticEvent)
          }}
          placeholder={placeholder}
          disabled={disabled}
          required={isRequired}
          className={clsx(
            'outline outline-gray-200 px-3 py-2 rounded break-all focus:outline-gray-400 ',
            {
              capitalize: isCapitalize,
              uppercase: isUpperCase,
              'w-56': !isFullWidth,
              'w-full': isFullWidth,
              'outline-gray-200': !isDarkerOutline,
              'outline-gray-300': isDarkerOutline
            }
          )}
        />
      </label>
    )
  }

  // Regular input field
  return (
    <label
      className={`col-span-${colSpan} row-span-${rowSpan} flex flex-col gap-1`}
    >
      <p className='uppercase text-xs text-gray-500 font-semibold'>{label}</p>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        minLength={2}
        maxLength={maxLength || 30}
        onChange={onChange}
        disabled={disabled}
        required={isRequired}
        className={clsx(
          'outline outline-gray-200 px-3 py-2 rounded break-all focus:outline-gray-400',
          {
            capitalize: isCapitalize,
            uppercase: isUpperCase,
            'w-56': !isFullWidth,
            'w-full': isFullWidth,
            'h-full': rowSpan === 2,
            'outline-gray-200': !isDarkerOutline,
            'outline-gray-300': isDarkerOutline
          }
        )}
      />
    </label>
  )
}

export default DeploymentDetailsModal
