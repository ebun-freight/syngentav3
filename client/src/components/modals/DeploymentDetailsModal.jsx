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
import { DEPLOYMENT_STATUS } from '../../utils/generalOptions'
import { MdKeyboardArrowDown } from 'react-icons/md'
import { useEffect, useState } from 'react'
import { DateTime } from 'luxon'
import useUpdateDeployment from '../../hooks/useUpdateDeployment'
import { toast } from 'react-toastify'
import { HiDotsHorizontal } from 'react-icons/hi'
import { NumericFormat } from 'react-number-format'
import { useUserContext } from '../../contexts/UserContext'
import { useSettingsContext } from '../../contexts/SettingsContext'
import {
  TbDeviceFloppy,
  TbExchange,
  TbPencilMinus,
  TbPrinter,
  TbTrash
} from 'react-icons/tb'
import { FiPlus, FiTrash2 } from 'react-icons/fi'
import jsPDF from 'jspdf'
import { API_DEPLOYMENT } from '../../utils/APIRoutes'
import axios from 'axios'
import { SMC_HEADER_IMAGE } from '../../consts/base_64_images'
import { useRef } from 'react'

const MAX_PICKUPS = 10

const defaultPickup = {
  pickupSite: '',
  municipality: '',
  fieldContactPerson: '',
  fieldContactPersonNo: '',
  scheduledPickupTime: '',
  estimatedWeightKg: '',
  pickupIn: '',
  pickupOut: '',
  sacksCount: 0
}

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
  const { settings } = useSettingsContext()

  const [isEditMode, setIsEditMode] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [isReplacementShow, setIsReplacementShow] = useState(false)
  const [activeTab, setActiveTab] = useState('info')

  const [truckQuery, setTruckQuery] = useState('')
  const [driverQuery, setDriverQuery] = useState('')
  const [replacementTruckQuery, setReplacementTruckQuery] = useState('')
  const [replacementDriverQuery, setReplacementDriverQuery] = useState('')

  const { updateDeploymentFunction, isLoading } = useUpdateDeployment()

  const handleChange = e => {
    const { name, value } = e.target
    if (name.includes('.')) {
      const [parent, child] = name.split('.')
      setEditForm(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }))
    } else {
      setEditForm(prev => ({ ...prev, [name]: value }))
    }
  }

  const handlePickupChange = (index, e) => {
    const { name, value } = e.target
    setEditForm(prev => {
      const updated = [...(prev.pickups || [])]
      updated[index] = { ...updated[index], [name]: value }
      return { ...prev, pickups: updated }
    })
  }

  const handlePickupNumericChange = (index, name, floatValue) => {
    setEditForm(prev => {
      const updated = [...(prev.pickups || [])]
      updated[index] = { ...updated[index], [name]: floatValue || '' }
      return { ...prev, pickups: updated }
    })
  }

  const addPickupStop = () => {
    if ((editForm.pickups?.length || 0) >= MAX_PICKUPS) return
    setEditForm(prev => ({
      ...prev,
      pickups: [...(prev.pickups || []), { ...defaultPickup }]
    }))
  }

  const removePickupStop = index => {
    if ((editForm.pickups?.length || 0) <= 1) return
    setEditForm(prev => ({
      ...prev,
      pickups: prev.pickups.filter((_, i) => i !== index)
    }))
  }

  const handleComboboxChange = (name, value) => {
    if (name.includes('.')) {
      const [parent, child] = name.split('.')
      setEditForm(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }))
    } else {
      setEditForm(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleUpdateDeployment = async e => {
    e.preventDefault()
    const result = await updateDeploymentFunction(deployment._id, editForm)
    if (result.success) {
      onUpdate(result.data.deployment)
      toast.success(result.data.message)
      onClose()
    } else {
      toast.error(result.error)
    }
  }

  // ─── PDF helpers ────────────────────────────────────────────────────────────

  const capitalizeWords = str => {
    if (!str) return ''
    return str
      .toLowerCase()
      .split(' ')
      .map(word =>
        word.includes('(') || word.includes(')')
          ? word.replace(/\b\w/g, c => c.toUpperCase())
          : word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join(' ')
  }

  const formatTruckType = type =>
    type ? capitalizeWords(type.replace(/-/g, ' ')) : ''

  const formatNumber = value => {
    if (!value || value === '' || isNaN(value)) return ''
    return parseFloat(value).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })
  }

  // ─── single PDF export — one A4 page per pickup stop ────────────────────────

  const handlePrintTMO = async () => {
    if (!deployment) return toast.error('No deployment data available')

    try {
      const pickups = deployment.pickups || []
      if (!pickups.length)
        return toast.error('No pickup stops found on this deployment')

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

      // ── create document ────────────────────────────────────────────────────
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      doc.setFont('helvetica')

      const BORDER = [200, 200, 200]
      const MARGIN = 15
      const PW = 210 // page width
      const CW = PW - MARGIN * 2 // content width
      const LEFT = MARGIN + 2
      const RIGHT = PW / 2 + 2
      const FW = CW / 2 - 4 // column field width

      // ── reusable renderers ─────────────────────────────────────────────────
      const sectionHeader = (title, y) => {
        doc.setFillColor(240, 240, 240)
        doc.rect(MARGIN, y, CW, 6, 'F')
        doc.setDrawColor(...BORDER)
        doc.rect(MARGIN, y, CW, 6)
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(title, MARGIN + 2, y + 4.5)
        return y + 6
      }

      const field = (label, value, x, y, maxW = 80) => {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text(label + ':', x, y)
        const lw = doc.getTextWidth(label + ': ')
        const uw = maxW - lw - 5
        const ux = x + lw + 3
        if (value) doc.text(value, ux + uw / 2, y, { align: 'center' })
        doc.setLineWidth(0.2)
        doc.line(ux, y + 1, ux + uw, y + 1)
        return y + 6
      }

      // ── one page per pickup ────────────────────────────────────────────────
      pickups.forEach((pickup, idx) => {
        if (idx > 0) doc.addPage()

        let y = 12

        // Logo
        try {
          doc.addImage(SMC_HEADER_IMAGE, 'PNG', MARGIN, y, 28, 10.5)
          doc.setFontSize(10)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(0, 0, 160)
          doc.text('A Glocal Company', MARGIN, y + 14.5)
          doc.text('"Global Expertise, Grown Locally"', PW - MARGIN, y + 14.5, {
            align: 'right'
          })
          doc.setTextColor(0, 0, 0)
          y += 28
        } catch {
          console.warn('Could not load logo')
        }

        // Title + rule
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('TRANSPORT MOVEMENT ORDER', PW / 2, y, { align: 'center' })
        y += 6
        doc.setLineWidth(0.5)
        doc.setDrawColor(...BORDER)
        doc.line(MARGIN, y, PW - MARGIN, y)
        y += 10

        // Header meta
        doc.setFontSize(10)
        const date = DateTime.now()
          .setZone('Asia/Manila')
          .toFormat('MMMM dd, yyyy')
        const RAX = PW - MARGIN

        // Row 1: DP Code (left) | Date (right)
        doc.setFont('helvetica', 'bold')
        doc.text('DP Code:', MARGIN, y)
        doc.setFont('helvetica', 'normal')
        const dpVX = MARGIN + doc.getTextWidth('DP Code: ') + 3
        doc.text(deployment.deploymentCode.toUpperCase(), dpVX, y)
        doc.setLineWidth(0.2)
        doc.line(dpVX, y + 1, MARGIN + CW / 2 - 5, y + 1)

        doc.setFont('helvetica', 'bold')
        doc.text('Date:', RAX - 60, y)
        doc.setFont('helvetica', 'normal')
        const dateVX = RAX - 60 + doc.getTextWidth('Date: ') + 3
        doc.text(date, dateVX, y)
        doc.setLineWidth(0.2)
        doc.line(dateVX, y + 1, RAX, y + 1)
        y += 5

        // Row 2: TMO No. (left)
        const tmoLabel = pickup.tmoNo ? pickup.tmoNo.toUpperCase() : ''
        doc.setFont('helvetica', 'bold')
        doc.text('TMO No.:', MARGIN, y)
        doc.setFont('helvetica', 'normal')
        const tmoVX = MARGIN + doc.getTextWidth('TMO No.: ') + 3
        doc.text(tmoLabel, tmoVX, y)
        doc.setLineWidth(0.2)
        doc.line(tmoVX, y + 1, MARGIN + CW / 2 - 5, y + 1)
        y += 8

        // ── 1. PICKUP DETAILS ──────────────────────────────────────────────
        y = sectionHeader('1. PICKUP DETAILS', y)
        let ly = y + 5,
          ry = y + 5

        ly = field(
          'Farm / Collection Point',
          capitalizeWords(pickup.pickupSite),
          LEFT,
          ly,
          FW
        )
        ly = field(
          'Municipality',
          capitalizeWords(pickup.municipality),
          LEFT,
          ly,
          FW
        )
        ly = field(
          'Scheduled Pickup Time',
          pickup.scheduledPickupTime
            ? DateTime.fromISO(pickup.scheduledPickupTime)
                .setZone('Asia/Manila')
                .toFormat('MMM dd, yyyy hh:mm a')
            : '',
          LEFT,
          ly,
          FW
        )

        ry = field(
          'Field Contact Person',
          capitalizeWords(pickup.fieldContactPerson),
          RIGHT,
          ry,
          FW
        )
        ry = field('Contact No', pickup.fieldContactPersonNo, RIGHT, ry, FW)
        ry = field(
          'Estimated Quantity (kg)',
          formatNumber(pickup.estimatedWeightKg),
          RIGHT,
          ry,
          FW
        )

        y = Math.max(ly, ry) + 3

        // ── 2. TRUCK & DRIVER DETAILS ──────────────────────────────────────
        y = sectionHeader('2. TRUCK & DRIVER DETAILS', y)
        ly = y + 7
        ry = y + 7

        const driverName = activeDriver
          ? `${capitalizeWords(activeDriver.firstname)} ${capitalizeWords(
              activeDriver.lastname
            )}`
          : ''

        ly = field(
          'Truck Plate Number',
          activeTruck?.plateNo?.toUpperCase(),
          LEFT,
          ly,
          FW
        )
        const hw = FW / 2 - 2
        field('Truck Type', formatTruckType(activeTruckType), LEFT, ly, hw)
        field(
          'Helper Count',
          deployment.helperCount?.toString(),
          LEFT + FW / 2 + 2,
          ly,
          hw
        )
        ly += 6

        ry = field("Driver's Name", driverName, RIGHT, ry, FW)
        ry = field(
          "Driver's License No",
          activeDriver?.licenseNo?.toUpperCase() || '',
          RIGHT,
          ry,
          FW
        )

        y = Math.max(ly, ry) + 3

        // ── 3. DELIVERY DETAILS ────────────────────────────────────────────
        y = sectionHeader('3. DELIVERY DETAILS', y)
        ly = y + 7
        ry = y + 7

        ly = field(
          'Delivery / Tolling Facility',
          capitalizeWords(deployment.destination),
          LEFT,
          ly,
          FW
        )
        ly = field(
          'Receiving Contact Person',
          capitalizeWords(deployment.receivingContactPerson),
          LEFT,
          ly,
          FW
        )
        ly = field(
          'Contact No',
          deployment.receivingContactPersonNo,
          LEFT,
          ly,
          FW
        )
        ly = field(
          'No. of Sacks',
          formatNumber(deployment.totalSacksCount),
          LEFT,
          ly,
          FW
        )

        ry = field(
          'Territory',
          capitalizeWords(deployment.territory),
          RIGHT,
          ry,
          FW
        )
        ry = field('Hybrid', capitalizeWords(deployment.hybrid), RIGHT, ry, FW)
        ry = field(
          'Flagging',
          capitalizeWords(deployment.flagging),
          RIGHT,
          ry,
          FW
        )
        ry = field(
          'Reason of Flagging',
          capitalizeWords(deployment.flaggingRemarks),
          RIGHT,
          ry,
          FW
        )

        y = Math.max(ly, ry) + 3

        // ── 4. LOAD DETAILS ────────────────────────────────────────────────
        y = sectionHeader('4. LOAD DETAILS (To be completed on-site)', y)
        const colW = CW / 3 - 2
        const loadY = y + 7
        field('Gross Weight', '', MARGIN + 2, loadY, colW)
        field('Tare Weight', '', MARGIN + CW / 3 + 1, loadY, colW)
        field('Net Weight', '', MARGIN + (CW / 3) * 2 + 1, loadY, colW)
        y = loadY + 9

        // ── 5. CONFIRMATION ────────────────────────────────────────────────
        y = sectionHeader('5. CONFIRMATION', y)
        y += 7

        const sbW = CW / 2 - 2
        const sbH = 25
        doc.setDrawColor(...BORDER)
        doc.setLineWidth(0.3)

        // left sig box
        doc.rect(MARGIN, y, sbW, sbH)
        doc.setFont('helvetica', 'bold').setFontSize(9)
        doc.text('Loaded by (Field Personnel)', MARGIN + 2, y + 4)
        doc.setFont('helvetica', 'normal').setFontSize(8)
        doc.text('Name:', MARGIN + 2, y + 10)
        doc.line(MARGIN + 12, y + 10.5, MARGIN + sbW - 2, y + 10.5)
        doc.text('Signature:', MARGIN + 2, y + 18)
        doc.line(MARGIN + 17, y + 18.5, MARGIN + sbW - 2, y + 18.5)

        // right sig box
        const rbx = PW / 2 + 1
        doc.rect(rbx, y, sbW, sbH)
        doc.setFont('helvetica', 'bold').setFontSize(9)
        doc.text('Received by (Plant Personnel)', rbx + 2, y + 4)
        doc.setFont('helvetica', 'normal').setFontSize(8)
        doc.text('Name:', rbx + 2, y + 10)
        doc.line(rbx + 12, y + 10.5, rbx + sbW - 2, y + 10.5)
        doc.text('Signature:', rbx + 2, y + 18)
        doc.line(rbx + 17, y + 18.5, rbx + sbW - 2, y + 18.5)

        y += sbH + 8
        doc.setFont('helvetica', 'bold').setFontSize(9)
        doc.text('Unloading Date:', MARGIN, y)
        doc.setFont('helvetica', 'normal')
        doc.line(MARGIN + 30, y + 0.5, MARGIN + 80, y + 0.5)
        doc.setFont('helvetica', 'bold')
        doc.text('Unloading Time:', PW / 2 + 10, y)
        doc.setFont('helvetica', 'normal')
        doc.line(PW / 2 + 40, y + 0.5, PW / 2 + 90, y + 0.5)
        y += 8

        // ── 6. REMARKS ─────────────────────────────────────────────────────
        y = sectionHeader('6. REMARKS', y)
        y += 5
        doc.setDrawColor(...BORDER).setLineWidth(0.3)
        doc.rect(MARGIN, y, CW, 20)

        // Footer
        doc
          .setFontSize(7)
          .setFont('helvetica', 'italic')
          .setTextColor(100, 100, 100)
        const ts = DateTime.now()
          .setZone('Asia/Manila')
          .toFormat('MMMM dd, yyyy hh:mm a')
        doc.text(`Generated on: ${ts}`, PW / 2, 287, { align: 'center' })
      })

      // ── Save single file ───────────────────────────────────────────────────
      doc.save(`TMO_${deployment.deploymentCode}.pdf`)
      await new Promise(r => setTimeout(r, 800))

      if (!deployment.isTMOPrinted) {
        try {
          const res = await axios.patch(
            `${API_DEPLOYMENT}/${deployment._id}`,
            { isTMOPrinted: true },
            {
              headers: {
                Authorization: `Bearer ${sessionStorage.getItem('userToken')}`
              }
            }
          )
          onUpdate(res.data.deployment)
          setEditForm(prev => ({ ...prev, isTMOPrinted: true }))
        } catch (err) {
          toast.warning(
            `PDF generated but failed to update print status: ${
              err.response?.data?.message || err.message
            }`
          )
          return
        }
      }
      toast.success(
        `TMO exported — ${pickups.length} page${
          pickups.length > 1 ? 's' : ''
        } (${deployment.deploymentCode})`
      )
    } catch (err) {
      toast.error(`Error generating TMO PDF: ${err.message}`)
    }
  }

  const handleCloseModal = () => {
    setEditForm(deployment)
    setIsReplacementShow(false)
    setActiveTab('info')
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
    if (isOpen && deployment) {
      setIsEditMode(false)
      setEditForm(deployment)
      setActiveTab('info')
    }
  }, [isOpen, deployment])

  useEffect(() => {
    if (deployment?.replacement?.replacementTruckId?._id) {
      setIsReplacementShow(true)
    } else {
      setIsReplacementShow(false)
    }
  }, [deployment, isOpen])

  const filteredTrucks =
    trucks?.filter(
      t =>
        t.status === 'available' &&
        (t.plateNo.toLowerCase().includes(truckQuery.toLowerCase()) ||
          t.truckType.toLowerCase().includes(truckQuery.toLowerCase()))
    ) || []

  const filteredDrivers =
    drivers?.filter(
      d =>
        d.status === 'available' &&
        (d.firstname.toLowerCase().includes(driverQuery.toLowerCase()) ||
          d.lastname.toLowerCase().includes(driverQuery.toLowerCase()))
    ) || []

  const filteredReplacementTrucks =
    trucks?.filter(
      t =>
        t.plateNo.toLowerCase().includes(replacementTruckQuery.toLowerCase()) ||
        t.truckType.toLowerCase().includes(replacementTruckQuery.toLowerCase())
    ) || []

  const filteredReplacementDrivers =
    drivers?.filter(
      d =>
        d.firstname
          .toLowerCase()
          .includes(replacementDriverQuery.toLowerCase()) ||
        d.lastname.toLowerCase().includes(replacementDriverQuery.toLowerCase())
    ) || []

  const currentTruckId = isReplacementShow
    ? editForm?.replacement?.replacementTruckId?._id
    : editForm?.truckId?._id
  const currentDriverId = isReplacementShow
    ? editForm?.replacement?.replacementDriverId?._id
    : editForm?.driverId?._id
  const currentTruck = trucks?.find(t => t._id === currentTruckId)
  const currentDriver = drivers?.find(d => d._id === currentDriverId)

  const pickups = editForm?.pickups || []
  const lastPickupOut = pickups[pickups.length - 1]?.pickupOut

  return (
    <Dialog open={isOpen} onClose={handleCloseModal} className='relative z-50'>
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

      <div className='fixed inset-0 flex items-center justify-center p-4'>
        <TransitionChild
          enter='ease-out duration-300'
          enterFrom='opacity-0 -translate-y-8'
          enterTo='opacity-100 translate-y-0'
          leave='ease-in duration-200'
          leaveFrom='opacity-100 translate-y-0'
          leaveTo='opacity-0 -translate-y-8'
        >
          <DialogPanel className='font-poppins text-gray-900 w-full max-w-6xl rounded-2xl bg-white shadow-xl overflow-hidden relative h-[80vh] overflow-y-auto scrollbar-thin'>
            <p
              className={clsx(
                'bg-orange-500 text-white px-4 right-26 font-medium py-3 text-sm flex items-center gap-2 transition-all absolute rounded-b-md shadow-warning tracking-wider z-10',
                { '-translate-y-12': !isEditMode, 'translate-y-0': isEditMode }
              )}
            >
              <IoWarning className='text-xl' /> EDIT MODE
            </p>

            <div className='absolute top-4 right-4 flex items-center gap-2 z-10'>
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
              <button
                onClick={handleCloseModal}
                className='hover:bg-gray-100 p-1 rounded-full text-2xl text-gray-600 cursor-pointer transition-all'
              >
                <IoClose />
              </button>
            </div>

            <form onSubmit={handleUpdateDeployment} className='flex h-full'>
              {/* ── TIMELINE SIDEBAR ── */}
              <div className='bg-gray-100 min-w-60 border-r border-gray-200 flex flex-col pb-8'>
                <h2 className='text-lg font-semibold mb-4 -ml-2 px-6 pt-8'>
                  Transport Log
                </h2>
                <div className='relative flex-1 overflow-y-auto scrollbar-thin px-6 mt-4'>
                  <div className='flex flex-col'>
                    <TimelineStop
                      isActive={
                        isEditMode
                          ? !!editForm.departed?.trim()
                          : !!deployment.departed?.trim()
                      }
                      isLast={false}
                    >
                      {isEditMode ? (
                        <InputField
                          label='Departed'
                          type='datetime-local'
                          name='departed'
                          isCapitalize={false}
                          isRequired={false}
                          isFullWidth={false}
                          value={editForm?.departed}
                          onChange={handleChange}
                          isDarkerOutline={true}
                        />
                      ) : (
                        <TimelineDisplay
                          label='Departed'
                          value={deployment.departed}
                        />
                      )}
                    </TimelineStop>

                    {(isEditMode
                      ? editForm.pickups
                      : deployment.pickups || []
                    ).map((pickup, index) => {
                      const prevPickupOut =
                        index === 0
                          ? isEditMode
                            ? editForm.departed
                            : deployment.departed
                          : isEditMode
                          ? editForm.pickups?.[index - 1]?.pickupOut
                          : deployment.pickups?.[index - 1]?.pickupOut
                      const multiStop =
                        (isEditMode
                          ? editForm.pickups?.length
                          : deployment.pickups?.length) > 1
                      return (
                        <div key={index}>
                          {multiStop && (
                            <TimelineLabel
                              isActive={!!prevPickupOut}
                              label={`Stop #${index + 1}`}
                            />
                          )}
                          <TimelineStop
                            isActive={!!pickup.pickupIn?.trim()}
                            isLast={false}
                          >
                            {isEditMode ? (
                              <InputField
                                label='Pick-up In'
                                type='datetime-local'
                                name='pickupIn'
                                isCapitalize={false}
                                isRequired={false}
                                isFullWidth={false}
                                value={pickup.pickupIn}
                                disabled={!prevPickupOut}
                                onChange={e => handlePickupChange(index, e)}
                                isDarkerOutline={true}
                              />
                            ) : (
                              <TimelineDisplay
                                label='Pick-up In'
                                value={pickup.pickupIn}
                              />
                            )}
                          </TimelineStop>
                          <TimelineStop
                            isActive={!!pickup.pickupOut?.trim()}
                            isLast={false}
                          >
                            {isEditMode ? (
                              <InputField
                                label='Pick-up Out'
                                type='datetime-local'
                                name='pickupOut'
                                isCapitalize={false}
                                isRequired={false}
                                isFullWidth={false}
                                value={pickup.pickupOut}
                                disabled={!pickup.pickupIn}
                                onChange={e => handlePickupChange(index, e)}
                                isDarkerOutline={true}
                              />
                            ) : (
                              <TimelineDisplay
                                label='Pick-up Out'
                                value={pickup.pickupOut}
                              />
                            )}
                          </TimelineStop>
                        </div>
                      )
                    })}

                    <TimelineStop
                      isActive={
                        isEditMode
                          ? !!editForm.destArrival?.trim()
                          : !!deployment.destArrival?.trim()
                      }
                      isLast={false}
                    >
                      {isEditMode ? (
                        <InputField
                          label='Dest Arrival'
                          type='datetime-local'
                          name='destArrival'
                          isCapitalize={false}
                          isRequired={false}
                          isFullWidth={false}
                          value={editForm?.destArrival}
                          disabled={!lastPickupOut}
                          onChange={handleChange}
                          isDarkerOutline={true}
                        />
                      ) : (
                        <TimelineDisplay
                          label='Dest Arrival'
                          value={deployment.destArrival}
                        />
                      )}
                    </TimelineStop>

                    <TimelineStop
                      isActive={
                        isEditMode
                          ? !!editForm.destDeparture?.trim()
                          : !!deployment.destDeparture?.trim()
                      }
                      isLast={false}
                    >
                      {isEditMode ? (
                        <InputField
                          label='Dest Departure'
                          type='datetime-local'
                          name='destDeparture'
                          isCapitalize={false}
                          isRequired={false}
                          isFullWidth={false}
                          value={editForm?.destDeparture}
                          disabled={!editForm?.destArrival}
                          onChange={handleChange}
                          isDarkerOutline={true}
                        />
                      ) : (
                        <TimelineDisplay
                          label='Dest Departure'
                          value={deployment.destDeparture}
                        />
                      )}
                    </TimelineStop>

                    <TimelineStop
                      isActive={
                        isEditMode
                          ? !!editForm.destDeparture?.trim()
                          : !!deployment.destDeparture?.trim()
                      }
                      isLast={true}
                    >
                      <label className='flex flex-col gap-1'>
                        <p className='text-xs font-semibold uppercase text-gray-500'>
                          Unloading Time
                        </p>
                        {deployment?.destDeparture ||
                        deployment?.destArrival ? (
                          <div className='outline outline-gray-300 px-3 py-2 rounded break-all'>
                            {(() => {
                              const { days, hours, minutes } = DateTime.fromISO(
                                editForm.destDeparture
                              ).diff(DateTime.fromISO(editForm.destArrival), [
                                'days',
                                'hours',
                                'minutes'
                              ])
                              const totalHours = days * 24 + hours
                              const fmt = () => {
                                const p = []
                                if (days > 0) p.push(`${days}d`)
                                if (hours > 0) p.push(`${hours}h`)
                                if (minutes > 0)
                                  p.push(`${Math.floor(minutes)}m`)
                                return p.join(' ') || `${Math.floor(minutes)}m`
                              }
                              const fmtH = () =>
                                totalHours > 0
                                  ? `${totalHours}h${
                                      minutes > 0
                                        ? ` ${Math.floor(minutes)}m`
                                        : ''
                                    }`
                                  : `${Math.floor(minutes)}m`
                              if (totalHours >= 24)
                                return `${fmt()} (${fmtH()})`
                              if (hours > 0)
                                return `${hours}h ${Math.floor(minutes)}m`
                              return `${Math.floor(minutes)}m`
                            })()}
                          </div>
                        ) : (
                          <p className='italic text-gray-400 text-sm font-light outline outline-gray-300 px-3 py-2.5 rounded'>
                            Pending
                          </p>
                        )}
                      </label>
                    </TimelineStop>
                  </div>
                </div>
              </div>

              {/* ── MAIN PANEL ── */}
              <div className='pl-6 py-8 flex-1 flex flex-col'>
                <div className='flex items-center gap-3 mb-4'>
                  <h2 className='text-lg font-semibold'>Deployment Details</h2>
                  <div
                    className='bg-gray-100 px-2 py-1 rounded-md shadow-card3 text-sm font-medium relative cursor-copy '
                    onClick={e => {
                      e.stopPropagation()
                      navigator.clipboard.writeText(deployment.deploymentCode)
                      const div = e.currentTarget
                      const tip = document.createElement('div')
                      tip.className =
                        'absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50'
                      tip.textContent = 'Copied'
                      div.appendChild(tip)
                      setTimeout(() => {
                        if (div.contains(tip)) div.removeChild(tip)
                      }, 1000)
                    }}
                    title='Click to copy'
                  >
                    #{editForm?.deploymentCode}
                  </div>
                </div>

                <div className='flex gap-2 border-b border-gray-200 mb-4 mr-6'>
                  <TabButton
                    label='Deployment Info'
                    tab='info'
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                  />
                  <TabButton
                    label='Pickup Sites'
                    tab='pickups'
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                  />

                  <div className='ml-auto rounded-t-lg outline outline-gray-200 flex'>
                    <p className='px-3 py-2 text-sm text-gray-500'>
                      {!['head_admin', 'admin'].includes(
                        userData?.data?.role
                      ) && <>Assigned At: </>}
                      {DateTime.fromISO(editForm?.createdAt)
                        .setZone('Asia/Manila')
                        .toFormat('MMM d, yyyy - hh:mm a')}
                    </p>

                    {['head_admin', 'admin'].includes(userData?.data?.role) && (
                      <div className='px-4 py-2 text-sm font-medium text-gray-500 flex items-center justify-center gap-2 border-l border-gray-200'>
                        {editForm?.isTMOPrinted
                          ? 'TMO PRINTED'
                          : 'TMO NOT PRINTED'}
                        <div
                          className={clsx('w-2 aspect-square rounded-full', {
                            'bg-green-500': editForm?.isTMOPrinted,
                            'bg-red-500': !editForm?.isTMOPrinted
                          })}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className='flex-1 overflow-y-auto scrollbar-thin pr-6'>
                  {activeTab === 'info' && (
                    <DeploymentInfoTab
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
                  {activeTab === 'pickups' && (
                    <PickupSitesTab
                      isEditMode={isEditMode}
                      editForm={editForm}
                      handlePickupChange={handlePickupChange}
                      handlePickupNumericChange={handlePickupNumericChange}
                      addPickupStop={addPickupStop}
                      removePickupStop={removePickupStop}
                    />
                  )}
                </div>

                {updatable && (
                  <div className='flex gap-4 col-span-full mt-6 mr-6'>
                    {isEditMode ? (
                      <>
                        <button
                          type='button'
                          onClick={handleCancelEditMode}
                          disabled={isLoading}
                          className='bg-linear-to-b from-gray-100 to-gray-200 text-gray-600 px-8 py-2 uppercase text-sm font-semibold rounded flex items-center gap-2 cursor-pointer active:scale-95 transition-all hover:brightness-95'
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
                              <span className='loading loading-spinner loading-xs' />
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
                          <TbPencilMinus className='text-lg -mt-0.5' /> Update
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
                            <TbExchange className='text-lg -mt-0.5' /> Replace
                            Truck
                          </button>
                        )}
                        <button
                          type='button'
                          onClick={openDeleteModal}
                          disabled={isLoading}
                          className='bg-linear-to-b from-red-500 to-red-600 text-white px-6 py-2 uppercase text-sm font-semibold rounded flex items-center gap-2 cursor-pointer active:scale-95 transition-all hover:brightness-95 ml-auto'
                        >
                          <TbTrash className='text-lg -mt-0.5' /> Delete
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

// ── TIMELINE HELPERS ───────────────────────────────────────────────────────────
const TimelineLabel = ({ isActive, label }) => (
  <div className='flex gap-5'>
    <div className='relative'>
      <div
        className={clsx(
          'w-0.5 h-full absolute top-0 left-1/2 -translate-x-1/2',
          { 'bg-emerald-500': isActive, 'bg-gray-300': !isActive }
        )}
      />
    </div>
    <div className='mb-1 flex-1 bg-emerald-500/10 px-2 rounded-sm'>
      <span className='text-xs font-semibold text-emerald-600 uppercase tracking-wide'>
        {label}
      </span>
    </div>
  </div>
)

const TimelineStop = ({ isActive, isLast, children }) => (
  <div className='flex gap-5'>
    <div className='relative'>
      <div
        className={clsx(
          'w-4 aspect-square rounded-full absolute z-10 left-1/2 -translate-x-1/2',
          {
            'bg-emerald-500 shadow-warning': isActive,
            'bg-gray-200 shadow-[inset_0_2px_4px_0_rgb(0,0,0,0.2)]': !isActive
          }
        )}
      />
      {!isLast && (
        <div
          className={clsx(
            'w-0.5 h-full absolute top-0 left-1/2 -translate-x-1/2',
            { 'bg-emerald-500': isActive, 'bg-gray-300': !isActive }
          )}
        />
      )}
    </div>
    <div className='pb-6 flex-1 w-56'>{children}</div>
  </div>
)

const TimelineDisplay = ({ label, value }) => (
  <label className='flex flex-col gap-1'>
    <p className='text-xs font-semibold uppercase text-gray-500'>{label}</p>
    {value ? (
      <p className='outline outline-gray-300 px-3 py-2 rounded break-all'>
        {DateTime.fromISO(value)
          .setZone('Asia/Manila')
          .toFormat('MMM d, yyyy - hh:mm a')}
      </p>
    ) : (
      <p className='italic text-gray-400 text-sm font-light outline outline-gray-300 px-3 py-2.5 rounded'>
        Pending
      </p>
    )}
  </label>
)

const TabButton = ({ label, tab, activeTab, setActiveTab }) => (
  <button
    type='button'
    onClick={() => setActiveTab(tab)}
    className={clsx(
      'px-4 py-2 text-sm font-medium transition-colors relative',
      {
        'text-emerald-600': activeTab === tab,
        'text-gray-500 hover:text-gray-700': activeTab !== tab
      }
    )}
  >
    {label}
    {activeTab === tab && (
      <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600' />
    )}
  </button>
)

// ── DEPLOYMENT INFO TAB ────────────────────────────────────────────────────────

const DeploymentInfoTab = ({
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
  const { settings } = useSettingsContext()

  const activeTruckId = isReplacementShow
    ? typeof editForm?.replacement?.replacementTruckId === 'object'
      ? editForm?.replacement?.replacementTruckId?._id
      : editForm?.replacement?.replacementTruckId
    : typeof editForm?.truckId === 'object'
    ? editForm?.truckId?._id
    : editForm?.truckId

  const activeDriverId = isReplacementShow
    ? typeof editForm?.replacement?.replacementDriverId === 'object'
      ? editForm?.replacement?.replacementDriverId?._id
      : editForm?.replacement?.replacementDriverId
    : typeof editForm?.driverId === 'object'
    ? editForm?.driverId?._id
    : editForm?.driverId

  return (
    <div className='space-y-4'>
      <div className='space-y-2'>
        <div className='flex justify-between items-center'>
          <h3 className='text-xs uppercase font-semibold text-gray-500'>
            Truck & Driver Details
          </h3>
          {isReplacementShow && (
            <p className='text-xs text-red-500'>*Replacement truck active</p>
          )}
        </div>
        <div className='grid grid-cols-2 gap-x-6 gap-y-4 border border-gray-200 rounded-md p-6'>
          <label className='flex flex-col gap-1'>
            <span className='uppercase text-xs text-gray-500 font-semibold'>
              Plate No.
            </span>
            {isEditMode ? (
              <Combobox
                value={activeTruckId}
                onChange={v =>
                  handleComboboxChange(
                    isReplacementShow
                      ? 'replacement.replacementTruckId'
                      : 'truckId',
                    v
                  )
                }
              >
                <div className='relative'>
                  <ComboboxInput
                    className='w-full outline outline-gray-300 px-3 py-2 rounded focus:outline-1 focus:outline-gray-400 uppercase'
                    displayValue={id =>
                      trucks?.find(t => t._id === id)?.plateNo || ''
                    }
                    onChange={e =>
                      isReplacementShow
                        ? setReplacementTruckQuery(e.target.value)
                        : setTruckQuery(e.target.value)
                    }
                    required
                  />
                  <ComboboxButton className='absolute inset-y-0 right-0 flex items-center pr-2'>
                    <MdKeyboardArrowDown className='h-5 w-5 text-gray-400' />
                  </ComboboxButton>
                  <ComboboxOptions className='absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white outline-1 outline-gray-300 py-1 text-base shadow-sm'>
                    {(isReplacementShow
                      ? filteredReplacementTrucks
                      : filteredTrucks
                    ).map(t => (
                      <ComboboxOption
                        key={t._id}
                        value={t._id}
                        className={({ focus }) =>
                          `cursor-default select-none py-2 px-4 text-base ${
                            focus ? 'bg-gray-50' : 'text-gray-900'
                          }`
                        }
                      >
                        <span className='block truncate uppercase'>
                          {t.plateNo}
                        </span>
                      </ComboboxOption>
                    ))}
                  </ComboboxOptions>
                </div>
              </Combobox>
            ) : (
              <p className='outline outline-gray-200 px-3 py-2 rounded uppercase'>
                {isReplacementShow
                  ? editForm?.replacement?.replacementTruckId?.plateNo
                  : currentTruck?.plateNo}
              </p>
            )}
          </label>

          <div className='grid grid-cols-2 gap-x-6'>
            <label className='flex flex-col gap-1'>
              <span className='uppercase text-xs text-gray-500 font-semibold'>
                Truck Type
              </span>
              {isEditMode ? (
                <div className='relative'>
                  <select
                    name={
                      isReplacementShow
                        ? 'replacement.replacementTruckType'
                        : 'truckType'
                    }
                    value={
                      isReplacementShow
                        ? editForm?.replacement?.replacementTruckType
                        : editForm?.truckType
                    }
                    onChange={handleChange}
                    className='outline outline-gray-300 px-3 py-2 rounded focus:outline-gray-400 appearance-none w-full capitalize'
                  >
                    {settings.trucksDrivers.truckType.map((item, i) => (
                      <option key={i} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <MdKeyboardArrowDown className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 text-lg pointer-events-none' />
                </div>
              ) : (
                <p className='outline outline-gray-200 px-3 py-2 rounded capitalize'>
                  {isReplacementShow
                    ? editForm?.replacement?.replacementTruckType
                    : editForm?.truckType}
                </p>
              )}
            </label>
            <InputField
              label='Helper Count'
              type='number'
              name='helperCount'
              value={editForm?.helperCount}
              disabled={!isEditMode}
              onChange={handleChange}
              formatNumber={true}
            />
          </div>

          <label className='flex flex-col gap-1'>
            <span className='uppercase text-xs text-gray-500 font-semibold'>
              Driver
            </span>
            {isEditMode ? (
              <Combobox
                value={activeDriverId}
                onChange={v =>
                  handleComboboxChange(
                    isReplacementShow
                      ? 'replacement.replacementDriverId'
                      : 'driverId',
                    v
                  )
                }
              >
                <div className='relative'>
                  <ComboboxInput
                    className='w-full outline outline-gray-300 px-3 py-2 rounded focus:outline-1 focus:outline-gray-400 capitalize'
                    displayValue={id => {
                      const d = drivers?.find(d => d._id === id)
                      return d ? `${d.firstname} ${d.lastname}` : ''
                    }}
                    onChange={e =>
                      isReplacementShow
                        ? setReplacementDriverQuery(e.target.value)
                        : setDriverQuery(e.target.value)
                    }
                    required
                  />
                  <ComboboxButton className='absolute inset-y-0 right-0 flex items-center pr-2'>
                    <MdKeyboardArrowDown className='h-5 w-5 text-gray-400' />
                  </ComboboxButton>
                  <ComboboxOptions className='absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white outline-1 outline-gray-300 py-1 text-base shadow-sm'>
                    {(isReplacementShow
                      ? filteredReplacementDrivers
                      : filteredDrivers
                    ).map(d => (
                      <ComboboxOption
                        key={d._id}
                        value={d._id}
                        className={({ focus }) =>
                          `cursor-default select-none py-2 px-4 text-base ${
                            focus ? 'bg-gray-50' : 'text-gray-900'
                          }`
                        }
                      >
                        <span className='block truncate capitalize'>
                          {d.firstname} {d.lastname}
                        </span>
                      </ComboboxOption>
                    ))}
                  </ComboboxOptions>
                </div>
              </Combobox>
            ) : (
              <p className='outline outline-gray-200 px-3 py-2 rounded capitalize'>
                {isReplacementShow
                  ? editForm?.replacement?.replacementDriverId
                    ? `${editForm.replacement.replacementDriverId.firstname} ${editForm.replacement.replacementDriverId.lastname}`
                    : 'N/A'
                  : editForm?.driverId?._id
                  ? `${editForm.driverId.firstname} ${editForm.driverId.lastname}`
                  : 'N/A'}
              </p>
            )}
          </label>

          <div className='grid grid-cols-2 gap-x-6'>
            <InputField
              label='Total Sacks Count'
              type='number'
              name='totalSacksCount'
              value={editForm?.totalSacksCount}
              disabled={true}
              onChange={handleChange}
              formatNumber={true}
              thousandSeparator={true}
              decimalScale={0}
              isRequired={false}
            />
            <InputField
              label='Load Weight (kg)'
              type='number'
              name='totalWeightKg'
              value={editForm?.totalWeightKg}
              disabled={true}
              onChange={handleChange}
              formatNumber={true}
              thousandSeparator={true}
              decimalScale={2}
              isRequired={false}
            />
          </div>
        </div>
      </div>

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

          <label className='flex flex-col gap-1'>
            <span className='uppercase text-xs text-gray-500 font-semibold'>
              Destination
            </span>
            {isEditMode ? (
              <div className='relative'>
                <select
                  name='destination'
                  value={editForm?.destination}
                  onChange={handleChange}
                  className='outline outline-gray-300 px-3 py-2 rounded focus:outline-gray-400 appearance-none w-full capitalize'
                >
                  {settings.deployments.destination.map((item, i) => (
                    <option key={i} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <MdKeyboardArrowDown className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 text-lg pointer-events-none' />
              </div>
            ) : (
              <p className='outline outline-gray-200 px-3 py-2 rounded capitalize'>
                {editForm?.destination}
              </p>
            )}
          </label>

          <div className='grid grid-cols-2 gap-x-6'>
            <label className='flex flex-col gap-1'>
              <span className='uppercase text-xs text-gray-500 font-semibold'>
                Territory
              </span>
              {isEditMode ? (
                <div className='relative'>
                  <select
                    name='territory'
                    value={editForm?.territory}
                    onChange={handleChange}
                    className='outline outline-gray-300 px-3 py-2 rounded focus:outline-gray-400 appearance-none w-full capitalize'
                  >
                    {settings.deployments.territory.map((item, i) => (
                      <option key={i} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <MdKeyboardArrowDown className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 text-lg pointer-events-none' />
                </div>
              ) : (
                <p className='outline outline-gray-200 px-3 py-2 rounded capitalize'>
                  {editForm?.territory}
                </p>
              )}
            </label>
            <label className='flex flex-col gap-1'>
              <span className='uppercase text-xs text-gray-500 font-semibold'>
                Hybrid
              </span>
              {isEditMode ? (
                <div className='relative'>
                  <select
                    name='hybrid'
                    value={editForm?.hybrid}
                    onChange={handleChange}
                    className='outline outline-gray-300 px-3 py-2 rounded focus:outline-gray-400 appearance-none w-full capitalize'
                  >
                    {settings.deployments.hybrid.map((item, i) => (
                      <option key={i} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <MdKeyboardArrowDown className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 text-lg pointer-events-none' />
                </div>
              ) : (
                <p className='outline outline-gray-200 px-3 py-2 rounded capitalize'>
                  {editForm?.hybrid}
                </p>
              )}
            </label>
          </div>

          <div className='grid grid-cols-2 gap-x-6'>
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
                    {settings.deployments.flagging.map((item, i) => (
                      <option key={i} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <MdKeyboardArrowDown className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 text-lg pointer-events-none' />
                </div>
              ) : (
                <div className='outline outline-gray-200 px-3 py-2 rounded'>
                  <p
                    className={clsx(
                      'capitalize w-fit px-2 py-0.5 rounded-full text-sm',
                      {
                        'bg-emerald-500/10 text-emerald-500':
                          editForm?.flagging === 'green',
                        'bg-orange-500/10 text-orange-500':
                          editForm?.flagging === 'orange',
                        'bg-yellow-500/10 text-yellow-500':
                          editForm?.flagging === 'yellow',
                        'bg-red-500/10 text-red-500':
                          editForm?.flagging === 'red'
                      }
                    )}
                  >
                    {editForm?.flagging || 'N/A'}
                  </p>
                </div>
              )}
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
          </div>

          <div className='grid grid-cols-2 gap-x-6'>
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
                    {DEPLOYMENT_STATUS.map((item, i) => (
                      <option key={i} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <MdKeyboardArrowDown className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 text-lg pointer-events-none' />
                </div>
              ) : (
                <div className='outline outline-gray-200 px-3 py-2 rounded'>
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
    </div>
  )
}

// ── PICKUP SITES TAB ───────────────────────────────────────────────────────────

const PickupSitesTab = ({
  isEditMode,
  editForm,
  handlePickupChange,
  handlePickupNumericChange,
  addPickupStop,
  removePickupStop
}) => {
  const pickups = editForm?.pickups || []
  const lastStopRef = useRef(null)
  const prevLengthRef = useRef(pickups.length)

  useEffect(() => {
    if (pickups.length > prevLengthRef.current && lastStopRef.current) {
      lastStopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    prevLengthRef.current = pickups.length
  }, [pickups.length])

  return (
    <div>
      <div className='flex items-center justify-between sticky top-0 bg-white z-10 pb-2'>
        <div className='flex items-center gap-2'>
          <h3 className='text-xs uppercase font-semibold text-gray-500'>
            Pickup Stops
          </h3>
          <span className='text-xs text-gray-400'>
            ({pickups.length}/{MAX_PICKUPS})
          </span>
        </div>
        {isEditMode && (
          <button
            type='button'
            onClick={addPickupStop}
            disabled={pickups.length >= MAX_PICKUPS}
            className='flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors px-2 cursor-pointer'
          >
            <FiPlus className='text-sm' /> Add Stop
          </button>
        )}
      </div>

      <div className='flex flex-col gap-3'>
        {pickups.map((pickup, index) => (
          <div
            key={index}
            ref={index === pickups.length - 1 ? lastStopRef : null}
            className='border border-gray-200 rounded-xl p-4 bg-gray-50/50 relative'
          >
            <div className='flex items-center gap-2 mb-2'>
              <p className='text-xs font-semibold text-emerald-600 uppercase tracking-wide'>
                Stop #{index + 1}
              </p>
              {pickup.tmoNo && (
                <span className='text-sm font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded'>
                  {pickup.tmoNo}
                </span>
              )}
            </div>

            {isEditMode && pickups.length > 1 && (
              <button
                type='button'
                onClick={() => removePickupStop(index)}
                className='text-red-400 hover:text-red-600 hover:bg-red-50 p-2 flex items-center justify-center aspect-square rounded-full transition-colors absolute top-2 right-2 cursor-pointer'
                title='Remove stop'
              >
                <FiTrash2 className='text-lg' />
              </button>
            )}

            <div className='grid grid-cols-2 gap-x-6 gap-y-4'>
              <InputField
                label='Pick-up Site'
                type='text'
                name='pickupSite'
                placeholder='Pick-up Site'
                value={pickup.pickupSite}
                disabled={!isEditMode}
                onChange={e => handlePickupChange(index, e)}
              />
              <InputField
                label='Municipality'
                type='text'
                name='municipality'
                placeholder='Municipality'
                value={pickup.municipality}
                disabled={!isEditMode}
                onChange={e => handlePickupChange(index, e)}
              />
              <InputField
                label='Field Contact Person'
                type='text'
                name='fieldContactPerson'
                placeholder='Contact Person'
                value={pickup.fieldContactPerson}
                disabled={!isEditMode}
                onChange={e => handlePickupChange(index, e)}
              />
              <InputField
                label='Field Contact No.'
                type='text'
                name='fieldContactPersonNo'
                placeholder='Contact Number'
                value={pickup.fieldContactPersonNo}
                disabled={!isEditMode}
                onChange={e => handlePickupChange(index, e)}
              />
              {isEditMode ? (
                <InputField
                  label='Scheduled Pickup Time'
                  type='datetime-local'
                  name='scheduledPickupTime'
                  value={pickup.scheduledPickupTime}
                  onChange={e => handlePickupChange(index, e)}
                  isCapitalize={false}
                />
              ) : (
                <label className='flex flex-col gap-1'>
                  <span className='uppercase text-xs text-gray-500 font-semibold'>
                    Scheduled Pickup Time
                  </span>
                  {pickup.scheduledPickupTime ? (
                    <p className='outline outline-gray-200 px-3 py-2 rounded'>
                      {DateTime.fromISO(pickup.scheduledPickupTime)
                        .setZone('Asia/Manila')
                        .toFormat('MMM d, yyyy - hh:mm a')}
                    </p>
                  ) : (
                    <p className='italic text-gray-400 text-sm font-light outline outline-gray-200 px-3 py-2.5 rounded'>
                      Not set
                    </p>
                  )}
                </label>
              )}
              <div className='grid grid-cols-3 gap-x-3'>
                <label className='flex flex-col gap-1'>
                  <span className='uppercase text-xs text-gray-500 font-semibold text-nowrap'>
                    Est. Weight (Kg)
                  </span>
                  <NumericFormat
                    thousandSeparator
                    decimalScale={2}
                    allowNegative={false}
                    value={pickup.estimatedWeightKg}
                    onValueChange={v =>
                      handlePickupNumericChange(
                        index,
                        'estimatedWeightKg',
                        v.floatValue
                      )
                    }
                    disabled={!isEditMode}
                    required
                    className='outline outline-gray-200 px-3 py-2 rounded break-all focus:outline-gray-400 w-full'
                  />
                </label>
                <label className='flex flex-col gap-1'>
                  <span className='uppercase text-xs text-gray-500 font-semibold text-nowrap'>
                    Act. Weight (Kg)
                  </span>
                  <NumericFormat
                    thousandSeparator
                    decimalScale={2}
                    allowNegative={false}
                    value={pickup.actualWeightKg}
                    onValueChange={v =>
                      handlePickupNumericChange(
                        index,
                        'actualWeightKg',
                        v.floatValue
                      )
                    }
                    disabled={!isEditMode}
                    className='outline outline-gray-200 px-3 py-2 rounded break-all focus:outline-gray-400 w-full'
                  />
                </label>
                <label className='flex flex-col gap-1'>
                  <span className='uppercase text-xs text-gray-500 font-semibold text-nowrap'>
                    Sacks Count
                  </span>
                  <NumericFormat
                    thousandSeparator={false}
                    decimalScale={0}
                    allowNegative={false}
                    value={pickup.sacksCount}
                    onValueChange={v =>
                      handlePickupNumericChange(
                        index,
                        'sacksCount',
                        v.floatValue
                      )
                    }
                    disabled={!isEditMode}
                    className='outline outline-gray-200 px-3 py-2 rounded break-all focus:outline-gray-400 w-full'
                  />
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isEditMode && pickups.length >= MAX_PICKUPS && (
        <p className='text-xs text-gray-400 text-center mt-2'>
          Maximum of {MAX_PICKUPS} pickup stops reached.
        </p>
      )}
    </div>
  )
}

// ── INPUT FIELD ────────────────────────────────────────────────────────────────

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
  formatNumber = false,
  thousandSeparator = true,
  decimalScale = 0,
  allowNegative = false
}) => {
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
          onValueChange={v =>
            onChange({ target: { name, value: v.floatValue || '' } })
          }
          placeholder={placeholder}
          disabled={disabled}
          required={isRequired}
          className={clsx(
            'outline px-3 py-2 rounded break-all focus:outline-gray-400',
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
          'outline px-3 py-2 rounded break-all focus:outline-gray-400',
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
