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
import { IoClose } from 'react-icons/io5'
import { DEPLOYMENT_STATUS } from '../../utils/generalOptions'
import { MdKeyboardArrowDown, MdCalendarMonth } from 'react-icons/md'
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
import { PiMapPinAreaFill } from 'react-icons/pi'
import jsPDF from 'jspdf'
import { API_DEPLOYMENT } from '../../utils/APIRoutes'
import axios from 'axios'
import { SMC_HEADER_IMAGE } from '../../consts/base_64_images'
import { useRef } from 'react'
import { FaCalendar } from 'react-icons/fa'

const MAX_PICKUPS = 10

const DotPattern = () => (
  <svg
    className='absolute inset-0 w-full h-full opacity-10 pointer-events-none'
    xmlns='http://www.w3.org/2000/svg'
  >
    <defs>
      <pattern
        id='dots-deployment-details'
        x='0'
        y='0'
        width='20'
        height='20'
        patternUnits='userSpaceOnUse'
      >
        <circle cx='2' cy='2' r='1.2' fill='white' />
      </pattern>
    </defs>
    <rect width='100%' height='100%' fill='url(#dots-deployment-details)' />
  </svg>
)

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

    // Separate populated pickups from the rest of the form
    const { pickups: editPickups, ...restForm } = editForm

    // Always send pickupUpdates for timing / weight fields (keyed by PickupField _id)
    const pickupUpdates = (editPickups || []).map(pickup => ({
      id: pickup._id,
      pickupIn: pickup.pickupIn,
      pickupOut: pickup.pickupOut,
      fieldWeightKg: pickup.fieldWeightKg,
      plantWeightKg: pickup.plantWeightKg,
      sacksCount: pickup.sacksCount
    }))

    // Only include `pickups` (as IDs) when stops have been removed
    const originalIds = (deployment.pickups || []).map(p => p._id?.toString())
    const newIds = (editPickups || []).map(p => p._id?.toString())
    const stopsChanged = newIds.length !== originalIds.length

    const payload = {
      ...restForm,
      pickupUpdates,
      ...(stopsChanged ? { pickups: newIds } : {})
    }

    const result = await updateDeploymentFunction(deployment._id, payload)
    if (result.success) {
      onUpdate(result.data.deployment)
      toast.success(result.data.message)
      onClose()
    } else {
      toast.error(result.error)
    }
  }

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

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      doc.setFont('helvetica')

      const BORDER = [200, 200, 200]
      const MARGIN = 15
      const PW = 210
      const CW = PW - MARGIN * 2
      const LEFT = MARGIN + 2
      const RIGHT = PW / 2 + 2
      const FW = CW / 2 - 4

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

      pickups.forEach((pickup, idx) => {
        if (idx > 0) doc.addPage()
        let y = 12

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

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('TRANSPORT MOVEMENT ORDER', PW / 2, y, { align: 'center' })
        y += 6
        doc.setLineWidth(0.5)
        doc.setDrawColor(...BORDER)
        doc.line(MARGIN, y, PW - MARGIN, y)
        y += 10

        doc.setFontSize(10)
        const date = DateTime.now()
          .setZone('Asia/Manila')
          .toFormat('MMMM dd, yyyy')
        const RAX = PW - MARGIN

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

        const tmoLabel = pickup.tmoNo ? pickup.tmoNo.toUpperCase() : ''
        doc.setFont('helvetica', 'bold')
        doc.text('TMO No.:', MARGIN, y)
        doc.setFont('helvetica', 'normal')
        const tmoVX = MARGIN + doc.getTextWidth('TMO No.: ') + 3
        doc.text(tmoLabel, tmoVX, y)
        doc.setLineWidth(0.2)
        doc.line(tmoVX, y + 1, MARGIN + CW / 2 - 5, y + 1)
        y += 8

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

        y = sectionHeader('4. LOAD DETAILS (To be completed on-site)', y)
        const colW = CW / 3 - 2
        const loadY = y + 7
        field('Gross Weight', '', MARGIN + 2, loadY, colW)
        field('Tare Weight', '', MARGIN + CW / 3 + 1, loadY, colW)
        field('Net Weight', '', MARGIN + (CW / 3) * 2 + 1, loadY, colW)
        y = loadY + 9

        y = sectionHeader('5. CONFIRMATION', y)
        y += 7

        const sbW = CW / 2 - 2
        const sbH = 25
        doc.setDrawColor(...BORDER)
        doc.setLineWidth(0.3)

        doc.rect(MARGIN, y, sbW, sbH)
        doc.setFont('helvetica', 'bold').setFontSize(9)
        doc.text('Loaded by (Field Personnel)', MARGIN + 2, y + 4)
        doc.setFont('helvetica', 'normal').setFontSize(8)
        doc.text('Name:', MARGIN + 2, y + 10)
        doc.line(MARGIN + 12, y + 10.5, MARGIN + sbW - 2, y + 10.5)
        doc.text('Signature:', MARGIN + 2, y + 18)
        doc.line(MARGIN + 17, y + 18.5, MARGIN + sbW - 2, y + 18.5)

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

        y = sectionHeader('6. REMARKS', y)
        y += 5
        doc.setDrawColor(...BORDER).setLineWidth(0.3)
        doc.rect(MARGIN, y, CW, 20)

        doc
          .setFontSize(7)
          .setFont('helvetica', 'italic')
          .setTextColor(100, 100, 100)
        const ts = DateTime.now()
          .setZone('Asia/Manila')
          .toFormat('MMMM dd, yyyy hh:mm a')
        doc.text(`Generated on: ${ts}`, PW / 2, 287, { align: 'center' })
      })

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
    const mql = window.matchMedia('(min-width: 1024px)')
    const handler = e => {
      if (e.matches && activeTab === 'timelines') setActiveTab('info')
    }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [activeTab])

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

  const statusColorMap = {
    preparing: 'bg-orange-50 text-orange-600 border-orange-100',
    ongoing: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    completed: 'bg-blue-50 text-blue-600 border-blue-100',
    canceled: 'bg-red-50 text-red-600 border-red-100'
  }

  return (
    <Dialog
      open={isOpen}
      onClose={isLoading ? () => {} : handleCloseModal}
      className='relative z-50'
    >
      <TransitionChild
        enter='ease-out duration-300'
        enterFrom='opacity-0'
        enterTo='opacity-100'
        leave='ease-in duration-200'
        leaveFrom='opacity-100'
        leaveTo='opacity-0'
      >
        <DialogBackdrop className='fixed inset-0 bg-black/40 backdrop-blur-sm' />
      </TransitionChild>

      <div className='fixed inset-0 flex items-center justify-center p-4 max-sm:p-2'>
        <TransitionChild
          enter='ease-out duration-300'
          enterFrom='opacity-0 scale-95 translate-y-2'
          enterTo='opacity-100 scale-100 translate-y-0'
          leave='ease-in duration-200'
          leaveFrom='opacity-100 scale-100'
          leaveTo='opacity-0 scale-95'
        >
          {/* ── KEY CHANGE: removed max-lg:overflow-y-auto so only the right panel scrolls ── */}
          <DialogPanel
            className={clsx(
              'font-poppins text-gray-900 w-full max-w-6xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col lg:flex-row',
              ['head_admin', 'admin'].includes(userData.data.role)
                ? 'h-[80vh]'
                : 'h-[72vh]'
            )}
          >
            {/* ══ LEFT PANEL ════════════════════════════════════════════════════ */}
            <div
              className='relative flex flex-col overflow-hidden lg:w-72 shrink-0 max-sm:p-5 max-sm:pb-4'
              style={{
                background:
                  'linear-gradient(155deg, #020617 0%, #001e36 55%, #0f172a 100%)'
              }}
            >
              <DotPattern />
              <div
                className='absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-10 pointer-events-none'
                style={{
                  background:
                    'radial-gradient(circle, #475569 0%, transparent 70%)'
                }}
              />
              <div
                className='absolute -bottom-12 -left-12 w-44 h-44 rounded-full opacity-10 pointer-events-none'
                style={{
                  background:
                    'radial-gradient(circle, #334155 0%, transparent 70%)'
                }}
              />

              <div className='relative z-10 flex items-center gap-3 p-8 pb-4  max-sm:gap-4 max-sm:p-0'>
                <div className='w-18 h-18 rounded-2xl flex items-center justify-center border-2 border-dashed border-white/40 max-sm:w-14 max-sm:h-14 max-sm:rounded-xl shrink-0 bg-white/5'>
                  <PiMapPinAreaFill className='text-white/60 text-4xl max-sm:text-2xl' />
                </div>
                <div className='text-left'>
                  <p className='text-white font-bold text-base max-sm:text-sm leading-tight'>
                    Transport Log
                  </p>
                  <span
                    className={clsx(
                      'inline-flex mt-1.5 px-3 py-1 rounded-full text-xxs font-semibold border capitalize',
                      statusColorMap[editForm?.status] ||
                        'bg-gray-50 text-gray-600 border-gray-100'
                    )}
                  >
                    {editForm?.status || '—'}
                  </span>
                </div>
              </div>

              <div className='relative z-10 px-8 max-sm:px-0 max-sm:mt-3 sm:max-lg:pb-4'>
                {/* sm+: stacked rows */}
                <div className='hidden md:flex flex-col gap-1'>
                  <div className='flex items-center justify-between gap-2'>
                    <span className='text-white/40 text-xxs uppercase tracking-wider font-semibold'>
                      DP Code
                    </span>
                    <span className='text-white/70 text-xs font-mono font-medium truncate max-w-32'>
                      #{editForm?.deploymentCode}
                    </span>
                  </div>
                  <div className='flex items-center justify-between gap-2'>
                    <span className='text-white/40 text-xxs uppercase tracking-wider font-semibold'>
                      Stops
                    </span>
                    <span className='text-white/70 text-xs font-medium'>
                      {pickups.length} {pickups.length === 1 ? 'stop' : 'stops'}
                    </span>
                  </div>
                </div>

                {/* xs: 2-column grid */}
                <div className='md:hidden flex justify-between gap-x-4 gap-y-2.5'>
                  <div className='flex flex-col gap-0.5'>
                    <span className='text-white/40 text-xxs uppercase tracking-wider font-semibold'>
                      DP Code
                    </span>
                    <span className='text-white/70 text-xxs sm:text-xs font-mono font-medium truncate'>
                      #{editForm?.deploymentCode}
                    </span>
                  </div>

                  <div className='flex flex-col gap-0.5'>
                    <span className='text-white/40 text-xxs uppercase tracking-wider font-semibold'>
                      Stops
                    </span>
                    <span className='text-white/70 text-xxs sm:text-xs font-medium'>
                      {pickups.length} {pickups.length === 1 ? 'stop' : 'stops'}
                    </span>
                  </div>

                  <div className='flex flex-col gap-0.5'>
                    <span className='text-white/40 text-xxs uppercase tracking-wider font-semibold'>
                      Assigned
                    </span>
                    <span className='text-white/70 text-xxs sm:text-xs font-medium'>
                      {DateTime.fromISO(editForm?.createdAt)
                        .setZone('Asia/Manila')
                        .toFormat('MMM d, yyyy')}
                    </span>
                  </div>

                  {['head_admin', 'admin'].includes(userData?.data?.role) && (
                    <div className='flex flex-col gap-0.5'>
                      <span className='text-white/40 text-xxs uppercase tracking-wider font-semibold'>
                        TMO
                      </span>
                      <div className='flex items-center gap-1'>
                        <span className='text-white/70 text-xxs sm:text-xs font-medium'>
                          {editForm?.isTMOPrinted ? 'Printed' : 'Not Printed'}
                        </span>
                        <div
                          className={clsx(
                            'w-1.5 aspect-square rounded-full shrink-0',
                            {
                              'bg-emerald-500': editForm?.isTMOPrinted,
                              'bg-red-400': !editForm?.isTMOPrinted
                            }
                          )}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className='relative z-10 w-full h-px bg-white/10 my-4 mx-auto max-lg:hidden' />

              {/* Timeline — desktop only */}
              <div className='relative z-10 flex-1 overflow-y-auto px-8 pb-4 max-lg:hidden [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/30 [scrollbar-color:rgba(255,255,255,0.2)_transparent] scrollbar-thin'>
                <div className='flex flex-col'>
                  <DarkTimelineStop
                    isActive={!!editForm.departed?.trim()}
                    isLast={false}
                  >
                    {isEditMode ? (
                      <DarkInputField
                        label='Departed'
                        type='datetime-local'
                        name='departed'
                        value={editForm?.departed}
                        onChange={handleChange}
                      />
                    ) : (
                      <DarkTimelineDisplay
                        label='Departed'
                        value={deployment.departed}
                      />
                    )}
                  </DarkTimelineStop>

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
                          <DarkTimelineLabel
                            isActive={!!prevPickupOut}
                            label={`Stop #${index + 1}`}
                          />
                        )}
                        <DarkTimelineStop
                          isActive={!!pickup.pickupIn?.trim()}
                          isLast={false}
                        >
                          {isEditMode ? (
                            <DarkInputField
                              label='Pick-up In'
                              type='datetime-local'
                              name='pickupIn'
                              value={pickup.pickupIn}
                              disabled={!prevPickupOut}
                              onChange={e => handlePickupChange(index, e)}
                            />
                          ) : (
                            <DarkTimelineDisplay
                              label='Pick-up In'
                              value={pickup.pickupIn}
                            />
                          )}
                        </DarkTimelineStop>
                        <DarkTimelineStop
                          isActive={!!pickup.pickupOut?.trim()}
                          isLast={false}
                        >
                          {isEditMode ? (
                            <DarkInputField
                              label='Pick-up Out'
                              type='datetime-local'
                              name='pickupOut'
                              value={pickup.pickupOut}
                              disabled={!pickup.pickupIn}
                              onChange={e => handlePickupChange(index, e)}
                            />
                          ) : (
                            <DarkTimelineDisplay
                              label='Pick-up Out'
                              value={pickup.pickupOut}
                            />
                          )}
                        </DarkTimelineStop>
                      </div>
                    )
                  })}

                  <DarkTimelineStop
                    isActive={!!editForm.destArrival?.trim()}
                    isLast={false}
                  >
                    {isEditMode ? (
                      <DarkInputField
                        label='Dest Arrival'
                        type='datetime-local'
                        name='destArrival'
                        value={editForm?.destArrival}
                        disabled={!lastPickupOut}
                        onChange={handleChange}
                      />
                    ) : (
                      <DarkTimelineDisplay
                        label='Dest Arrival'
                        value={deployment.destArrival}
                      />
                    )}
                  </DarkTimelineStop>

                  <DarkTimelineStop
                    isActive={!!editForm.destDeparture?.trim()}
                    isLast={false}
                  >
                    {isEditMode ? (
                      <DarkInputField
                        label='Dest Departure'
                        type='datetime-local'
                        name='destDeparture'
                        value={editForm?.destDeparture}
                        disabled={!editForm?.destArrival}
                        onChange={handleChange}
                      />
                    ) : (
                      <DarkTimelineDisplay
                        label='Dest Departure'
                        value={deployment.destDeparture}
                      />
                    )}
                  </DarkTimelineStop>

                  <DarkTimelineStop
                    isActive={!!editForm.destDeparture?.trim()}
                    isLast={true}
                  >
                    <div className='flex flex-col gap-1'>
                      <p className='text-white/40 text-xxs font-semibold uppercase tracking-wider'>
                        Unloading Time
                      </p>
                      {editForm?.destDeparture && editForm?.destArrival ? (
                        <div className='bg-white/10 border border-white/15 px-3 py-1 rounded-lg break-all'>
                          <span className='text-white/80 text-xs'>
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
                          </span>
                        </div>
                      ) : (
                        <p className='italic text-white/30 text-xs font-light bg-white/5 border border-white/10 px-3 py-2 rounded-lg'>
                          Pending
                        </p>
                      )}
                    </div>
                  </DarkTimelineStop>
                </div>
              </div>

              {/* Edit mode indicator */}
              <div
                className='relative z-10 mx-5 mb-5 shrink-0 flex items-center gap-2 bg-orange-500/20 border border-orange-400/30 rounded-xl px-3 py-2 max-lg:hidden mt-2'
                style={{
                  opacity: isEditMode ? 1 : 0,
                  maxHeight: isEditMode ? '40px' : '0px',
                  marginBottom: isEditMode ? '20px' : '0px',
                  overflow: 'hidden',
                  transition:
                    'opacity 500ms cubic-bezier(0.4,0,0.2,1), max-height 500ms cubic-bezier(0.4,0,0.2,1), margin 500ms cubic-bezier(0.4,0,0.2,1)',
                  pointerEvents: isEditMode ? 'auto' : 'none'
                }}
              >
                <span className='w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse shrink-0' />
                <p className='text-orange-300 text-xs max-sm:text-xxs font-semibold uppercase tracking-wide leading-snug whitespace-nowrap'>
                  Edit mode active
                </p>
              </div>

              {/* Edit mode indicator - small screen */}
              <div
                className='absolute -top-1 -right-1 z-10 flex items-center gap-2 bg-orange-500/20 border border-orange-400/30 rounded-bl-xl pl-3 pb-1 pt-2.5 pr-3 sm:pl-4 sm:pb-1.5 sm:pt-3 sm:pr-3.5 lg:hidden'
                style={{
                  opacity: isEditMode ? 1 : 0,
                  transition: 'opacity 500ms cubic-bezier(0.4,0,0.2,1)',
                  pointerEvents: isEditMode ? 'auto' : 'none'
                }}
              >
                <span className='w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse shrink-0' />
                <p className='text-orange-300 text-xxs sm:text-xs font-semibold uppercase tracking-wide leading-snug whitespace-nowrap'>
                  Edit mode active
                </p>
              </div>
            </div>

            {/* ══ RIGHT PANEL ═════════════════════════════════════════════════════ */}
            <div className='flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden'>
              {/* Header */}
              <div className='flex items-start justify-between px-6 pt-5 pb-4 max-sm:px-4 max-sm:pt-4 max-sm:pb-3 border-b border-gray-100 shrink-0'>
                <div className='flex items-start gap-3 min-w-0'>
                  <div>
                    <h2 className='text-gray-900 font-bold text-lg max-sm:text-base'>
                      Deployment Details
                    </h2>
                    <p className='text-gray-400 text-xs mt-0.5'>
                      {isEditMode
                        ? 'Make changes and save to update.'
                        : 'View deployment information.'}
                    </p>
                  </div>
                  <div
                    className='bg-gray-100 px-2 py-1 rounded-md text-sm font-medium relative cursor-copy shrink-0 max-md:hidden'
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

                <div className='flex items-center gap-2 shrink-0 ml-4'>
                  <div className='dropdown dropdown-bottom dropdown-end'>
                    <div
                      tabIndex={0}
                      role='button'
                      className='hover:bg-gray-100 p-1.5 rounded-lg text-xl text-gray-500 cursor-pointer transition-all'
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
                    disabled={isLoading}
                    className='text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg text-xl transition-all cursor-pointer disabled:opacity-40'
                  >
                    <IoClose />
                  </button>
                </div>
              </div>

              {/* Tabs row */}
              <div className='flex gap-0 border-b border-gray-100 px-6 max-sm:px-4 shrink-0 overflow-x-auto'>
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
                {/* Timelines tab — only visible below lg where the left panel timeline is hidden */}
                <div className='lg:hidden'>
                  <TabButton
                    label='Timelines'
                    tab='timelines'
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                  />
                </div>

                <div className='ml-auto flex items-center max-md:hidden'>
                  <p className='text-xs text-gray-400 pr-3'>
                    {!['head_admin', 'admin'].includes(
                      userData?.data?.role
                    ) && <>Assigned: </>}
                    {DateTime.fromISO(editForm?.createdAt)
                      .setZone('Asia/Manila')
                      .toFormat('MMM d, yyyy - hh:mm a')}
                  </p>
                  {['head_admin', 'admin'].includes(userData?.data?.role) && (
                    <div className='flex items-center gap-1.5 border-l border-gray-100 pl-3 text-xs font-medium text-gray-500'>
                      {editForm?.isTMOPrinted
                        ? 'TMO PRINTED'
                        : 'TMO NOT PRINTED'}
                      <div
                        className={clsx('w-2 aspect-square rounded-full', {
                          'bg-emerald-500': editForm?.isTMOPrinted,
                          'bg-red-400': !editForm?.isTMOPrinted
                        })}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Scrollable content */}
              <form
                onSubmit={handleUpdateDeployment}
                className='flex-1 flex flex-col min-h-0 overflow-hidden'
              >
                <div className='flex-1 overflow-hidden flex flex-col min-h-0'>
                  {activeTab === 'info' && (
                    <div className='flex-1 overflow-y-auto scrollbar-thin px-6 py-5 max-sm:px-4 max-sm:py-4'>
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
                    </div>
                  )}
                  {activeTab === 'pickups' && (
                    <PickupSitesTab
                      isEditMode={isEditMode}
                      editForm={editForm}
                      handlePickupChange={handlePickupChange}
                      handlePickupNumericChange={handlePickupNumericChange}
                      removePickupStop={removePickupStop}
                    />
                  )}
                  {/* ── Timelines tab: small/medium screens only ── */}
                  {activeTab === 'timelines' && (
                    <TimelineTab
                      isEditMode={isEditMode}
                      editForm={editForm}
                      deployment={deployment}
                      handleChange={handleChange}
                      handlePickupChange={handlePickupChange}
                      lastPickupOut={lastPickupOut}
                    />
                  )}
                </div>

                {/* Action buttons */}
                {updatable && (
                  <div className='flex items-start gap-3 px-6 py-4 max-sm:px-4 border-t border-gray-100 shrink-0 overflow-x-auto max-sm:hidden'>
                    {isEditMode ? (
                      <>
                        <button
                          type='button'
                          onClick={handleCancelEditMode}
                          disabled={isLoading}
                          className='px-6 py-2.5 rounded-xl font-semibold text-sm uppercase tracking-wide bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
                        >
                          Cancel
                        </button>
                        <button
                          type='submit'
                          disabled={isLoading}
                          className='px-8 py-2.5 rounded-xl font-semibold text-white text-sm uppercase tracking-wide shadow-md hover:shadow-lg cursor-pointer active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2'
                          style={{
                            background:
                              'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                          }}
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
                          className='px-6 py-2.5 rounded-xl font-semibold text-white text-sm uppercase tracking-wide shadow-md hover:shadow-lg cursor-pointer active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2'
                          style={{
                            background:
                              'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                          }}
                        >
                          <TbPencilMinus className='text-lg -mt-0.5' /> Update
                        </button>
                        <button
                          type='button'
                          onClick={handlePrintTMO}
                          disabled={isLoading}
                          className='px-6 py-2.5 rounded-xl font-semibold text-white text-sm uppercase tracking-wide shadow-md hover:shadow-lg cursor-pointer active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-nowrap'
                          style={{
                            background:
                              'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                          }}
                        >
                          <TbPrinter className='text-lg -mt-0.5' />
                          Print TMO
                        </button>
                        {!isReplacementShow && (
                          <button
                            type='button'
                            onClick={openReplacementModal}
                            disabled={isLoading}
                            className='px-6 py-2.5 rounded-xl font-semibold text-white text-sm uppercase tracking-wide shadow-md hover:shadow-lg cursor-pointer active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-nowrap'
                            style={{
                              background:
                                'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                            }}
                          >
                            <TbExchange className='text-lg -mt-0.5' /> Replace
                            Truck
                          </button>
                        )}
                        <button
                          type='button'
                          onClick={openDeleteModal}
                          disabled={isLoading}
                          className='px-6 py-2.5 rounded-xl font-semibold text-white text-sm uppercase tracking-wide shadow-md hover:shadow-lg cursor-pointer active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 ml-auto text-nowrap'
                          style={{
                            background:
                              'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                          }}
                        >
                          <TbTrash className='text-lg -mt-0.5' /> Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </form>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  )
}

// ── DARK TIMELINE HELPERS (left panel / desktop) ───────────────────────────────

const DarkTimelineLabel = ({ isActive, label }) => (
  <div className='flex gap-4'>
    <div className='relative w-4 shrink-0'>
      <div
        className={clsx(
          'w-0.5 h-full absolute top-0 left-1/2 -translate-x-1/2',
          { 'bg-emerald-500': isActive, 'bg-[#263e54]': !isActive }
        )}
      />
    </div>
    <div className='mb-1 flex-1 bg-emerald-500/15 px-2 rounded-sm'>
      <span className='text-xxs font-semibold text-emerald-400 uppercase tracking-wide'>
        {label}
      </span>
    </div>
  </div>
)

const DarkTimelineStop = ({ isActive, isLast, children }) => (
  <div className='flex gap-4'>
    <div className='relative w-4 shrink-0'>
      {!isLast && (
        <div
          className={clsx(
            'w-0.5 h-full absolute top-0 left-1/2 -translate-x-1/2',
            { 'bg-emerald-500': isActive, 'bg-[#263e54]': !isActive }
          )}
        />
      )}
      <div
        className={clsx(
          'w-3.5 aspect-square rounded-full absolute z-10 left-1/2 -translate-x-1/2',
          {
            'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]': isActive,
            'bg-[#263e54]': !isActive
          }
        )}
      />
    </div>
    <div className='pb-5 flex-1 min-w-0'>{children}</div>
  </div>
)

const DarkTimelineDisplay = ({ label, value }) => (
  <div className='flex flex-col gap-1'>
    <p className='text-white/40 text-xxs font-semibold uppercase tracking-wider'>
      {label}
    </p>
    {value ? (
      <p className='bg-white/10 border border-white/15 text-white/80 text-xs px-3 py-2 rounded-lg break-all'>
        {DateTime.fromISO(value)
          .setZone('Asia/Manila')
          .toFormat('MMM d, yyyy - hh:mm a')}
      </p>
    ) : (
      <p className='italic text-white/30 text-xs font-light bg-white/5 border border-white/10 px-3 py-2 rounded-lg'>
        Pending
      </p>
    )}
  </div>
)

const DarkInputField = ({ label, type, name, value, onChange, disabled }) => {
  const inputRef = useRef(null)
  return (
    <div className='flex flex-col gap-1'>
      <p className='text-white/40 text-xxs font-semibold uppercase tracking-wider'>
        {label}
      </p>
      <div className='relative flex items-center'>
        <input
          ref={inputRef}
          type={type}
          name={name}
          value={value || ''}
          onChange={onChange}
          disabled={disabled}
          className={clsx(
            'text-xs px-3 py-2 pr-8 rounded-lg border focus:outline-none transition-colors w-full',
            '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-8 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer',
            disabled
              ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
              : 'bg-white/10 border-white/15 text-white/80 focus:border-emerald-500/60 focus:bg-white/15'
          )}
        />
        <FaCalendar
          onClick={() => !disabled && inputRef.current?.showPicker()}
          className={clsx(
            'absolute right-2.5 text-xs pointer-events-none',
            disabled ? 'text-white/20' : 'text-white/40'
          )}
        />
      </div>
    </div>
  )
}

// ── TAB BUTTON ─────────────────────────────────────────────────────────────────

const TabButton = ({ label, tab, activeTab, setActiveTab }) => (
  <button
    type='button'
    onClick={() => setActiveTab(tab)}
    className={clsx(
      'px-4 py-3 text-sm max-sm:text-xs font-medium transition-colors relative text-nowrap',
      {
        'text-emerald-600': activeTab === tab,
        'text-gray-500 hover:text-gray-700': activeTab !== tab
      }
    )}
  >
    {label}
    {activeTab === tab && (
      <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full' />
    )}
  </button>
)

// ── TIMELINE TAB (small / medium screens) ─────────────────────────────────────

const TimelineTab = ({
  isEditMode,
  editForm,
  deployment,
  handleChange,
  handlePickupChange,
  lastPickupOut
}) => {
  const pickups = isEditMode ? editForm.pickups || [] : deployment.pickups || []
  const multiStop = pickups.length > 1

  return (
    <div className='flex-1 overflow-y-auto scrollbar-thin px-5 py-5 max-sm:px-4'>
      {isEditMode && (
        <div className='flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5 mb-5'>
          <span className='w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse shrink-0' />
          <p className='text-orange-600 text-xs font-semibold uppercase tracking-wide'>
            Edit mode — changes are saved with the main form
          </p>
        </div>
      )}

      <div className='flex flex-col'>
        <LightTimelineStop
          isActive={
            !!(isEditMode ? editForm.departed : deployment.departed)?.trim()
          }
          isLast={false}
        >
          {isEditMode ? (
            <LightInputField
              label='Departed'
              type='datetime-local'
              name='departed'
              value={editForm?.departed}
              onChange={handleChange}
            />
          ) : (
            <LightTimelineDisplay
              label='Departed'
              value={deployment.departed}
            />
          )}
        </LightTimelineStop>

        {pickups.map((pickup, index) => {
          const prevPickupOut =
            index === 0
              ? isEditMode
                ? editForm.departed
                : deployment.departed
              : isEditMode
              ? editForm.pickups?.[index - 1]?.pickupOut
              : deployment.pickups?.[index - 1]?.pickupOut

          return (
            <div key={index}>
              {multiStop && (
                <LightTimelineLabel
                  isActive={!!prevPickupOut}
                  label={`Stop #${index + 1}${
                    pickup.pickupSite ? ` — ${pickup.pickupSite}` : ''
                  }`}
                />
              )}
              <LightTimelineStop
                isActive={!!pickup.pickupIn?.trim()}
                isLast={false}
              >
                {isEditMode ? (
                  <LightInputField
                    label='Pick-up In'
                    type='datetime-local'
                    name='pickupIn'
                    value={pickup.pickupIn}
                    disabled={!prevPickupOut}
                    onChange={e => handlePickupChange(index, e)}
                  />
                ) : (
                  <LightTimelineDisplay
                    label='Pick-up In'
                    value={pickup.pickupIn}
                  />
                )}
              </LightTimelineStop>
              <LightTimelineStop
                isActive={!!pickup.pickupOut?.trim()}
                isLast={false}
              >
                {isEditMode ? (
                  <LightInputField
                    label='Pick-up Out'
                    type='datetime-local'
                    name='pickupOut'
                    value={pickup.pickupOut}
                    disabled={!pickup.pickupIn}
                    onChange={e => handlePickupChange(index, e)}
                  />
                ) : (
                  <LightTimelineDisplay
                    label='Pick-up Out'
                    value={pickup.pickupOut}
                  />
                )}
              </LightTimelineStop>
            </div>
          )
        })}

        <LightTimelineStop
          isActive={
            !!(
              isEditMode ? editForm.destArrival : deployment.destArrival
            )?.trim()
          }
          isLast={false}
        >
          {isEditMode ? (
            <LightInputField
              label='Dest Arrival'
              type='datetime-local'
              name='destArrival'
              value={editForm?.destArrival}
              disabled={!lastPickupOut}
              onChange={handleChange}
            />
          ) : (
            <LightTimelineDisplay
              label='Dest Arrival'
              value={deployment.destArrival}
            />
          )}
        </LightTimelineStop>

        <LightTimelineStop
          isActive={
            !!(
              isEditMode ? editForm.destDeparture : deployment.destDeparture
            )?.trim()
          }
          isLast={false}
        >
          {isEditMode ? (
            <LightInputField
              label='Dest Departure'
              type='datetime-local'
              name='destDeparture'
              value={editForm?.destDeparture}
              disabled={!editForm?.destArrival}
              onChange={handleChange}
            />
          ) : (
            <LightTimelineDisplay
              label='Dest Departure'
              value={deployment.destDeparture}
            />
          )}
        </LightTimelineStop>

        {/* ── Unloading Time (derived) ── */}
        <LightTimelineStop
          isActive={!!(editForm?.destDeparture && editForm?.destArrival)}
          isLast={true}
        >
          <div className='flex flex-col gap-1'>
            <p className='text-xxs font-semibold text-gray-500 uppercase tracking-wider'>
              Unloading Time
            </p>
            {editForm?.destDeparture && editForm?.destArrival ? (
              <div className='bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg'>
                <span className='text-emerald-700 text-xs font-semibold'>
                  {(() => {
                    const dep = isEditMode
                      ? editForm.destDeparture
                      : deployment.destDeparture
                    const arr = isEditMode
                      ? editForm.destArrival
                      : deployment.destArrival
                    const { days, hours, minutes } = DateTime.fromISO(dep).diff(
                      DateTime.fromISO(arr),
                      ['days', 'hours', 'minutes']
                    )
                    const totalHours = days * 24 + hours
                    const fmt = () => {
                      const p = []
                      if (days > 0) p.push(`${days}d`)
                      if (hours > 0) p.push(`${hours}h`)
                      if (minutes > 0) p.push(`${Math.floor(minutes)}m`)
                      return p.join(' ') || `${Math.floor(minutes)}m`
                    }
                    const fmtH = () =>
                      totalHours > 0
                        ? `${totalHours}h${
                            minutes > 0 ? ` ${Math.floor(minutes)}m` : ''
                          }`
                        : `${Math.floor(minutes)}m`
                    if (totalHours >= 24) return `${fmt()} (${fmtH()})`
                    if (hours > 0) return `${hours}h ${Math.floor(minutes)}m`
                    return `${Math.floor(minutes)}m`
                  })()}
                </span>
              </div>
            ) : (
              <p className='italic text-gray-400 text-xs font-light bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg'>
                Pending
              </p>
            )}
          </div>
        </LightTimelineStop>
      </div>
    </div>
  )
}

// ── LIGHT TIMELINE PRIMITIVES (used only in TimelineTab) ──────────────────────

const LightTimelineStop = ({ isActive, isLast, children }) => (
  <div className='flex gap-4'>
    <div className='relative w-4 shrink-0'>
      {!isLast && (
        <div
          className={clsx(
            'w-0.5 h-full absolute top-0 left-1/2 -translate-x-1/2',
            isActive ? 'bg-emerald-500' : 'bg-gray-200'
          )}
        />
      )}
      <div
        className={clsx(
          'w-3.5 aspect-square rounded-full absolute z-10 left-1/2 -translate-x-1/2',
          isActive ? 'bg-emerald-500' : 'bg-gray-200'
        )}
      />
    </div>
    <div className='pb-5 flex-1 min-w-0'>{children}</div>
  </div>
)

const LightTimelineLabel = ({ isActive, label }) => (
  <div className='flex gap-4'>
    <div className='relative w-4 shrink-0'>
      <div
        className={clsx(
          'w-0.5 h-full absolute top-0 left-1/2 -translate-x-1/2',
          isActive ? 'bg-emerald-500' : 'bg-gray-200'
        )}
      />
    </div>
    <div className='mb-1 flex-1 bg-emerald-500/10 px-2 rounded-sm'>
      <span className='text-xxs font-semibold text-emerald-600 uppercase tracking-wide'>
        {label}
      </span>
    </div>
  </div>
)

const LightTimelineDisplay = ({ label, value }) => (
  <div className='flex flex-col gap-1'>
    <p className='text-xxs font-semibold text-gray-500 uppercase tracking-wider'>
      {label}
    </p>
    {value ? (
      <p className='bg-white border border-gray-200 text-gray-700 text-xs px-3 py-2 rounded-lg shadow-sm'>
        {DateTime.fromISO(value)
          .setZone('Asia/Manila')
          .toFormat('MMM d, yyyy — hh:mm a')}
      </p>
    ) : (
      <p className='italic text-gray-400 text-xs font-light bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg'>
        Pending
      </p>
    )}
  </div>
)

const LightInputField = ({ label, type, name, value, onChange, disabled }) => {
  const inputRef = useRef(null)
  return (
    <div className='flex flex-col gap-1'>
      <p className='text-xxs font-semibold text-gray-500 uppercase tracking-wider'>
        {label}
      </p>
      <div className='relative flex items-center'>
        <input
          ref={inputRef}
          type={type}
          name={name}
          value={value || ''}
          onChange={onChange}
          disabled={disabled}
          className={clsx(
            'text-xs px-3 py-2 pr-8 rounded-lg border focus:outline-none transition-colors w-full shadow-sm',
            '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-8 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer',
            disabled
              ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-white border-gray-200 text-gray-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
          )}
        />
        <FaCalendar
          onClick={() => !disabled && inputRef.current?.showPicker()}
          className={clsx(
            'absolute right-2.5 text-xs',
            disabled
              ? 'text-gray-300 pointer-events-none'
              : 'text-gray-400 cursor-pointer'
          )}
        />
      </div>
    </div>
  )
}

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
    <div className='space-y-5'>
      <div className='space-y-2'>
        <div className='flex justify-between items-center'>
          <h3 className='text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider'>
            Truck & Driver Details
          </h3>
          {isReplacementShow && (
            <p className='text-xs max-sm:text-xxs text-red-500 font-medium'>
              *Replacement truck
            </p>
          )}
        </div>
        <div className='grid grid-cols-1 xs:grid-cols-2 gap-x-5 gap-y-4 border border-gray-200 rounded-xl p-5 max-sm:p-4'>
          <InfoField label='Plate No.'>
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
                    className='w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 max-sm:px-3 max-sm:py-2 min-h-[42px] max-sm:min-h-9 text-sm max-sm:text-xs focus:outline-none focus:border-primaryColor focus:ring-2 focus:ring-primaryColor/20 shadow-sm uppercase transition-all'
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
                  <ComboboxButton className='absolute inset-y-0 right-3 flex items-center text-gray-400'>
                    <MdKeyboardArrowDown className='text-lg' />
                  </ComboboxButton>
                  <ComboboxOptions className='absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white border border-gray-200 shadow-md py-1 text-sm focus:outline-none'>
                    {(isReplacementShow
                      ? filteredReplacementTrucks
                      : filteredTrucks
                    ).map(t => (
                      <ComboboxOption
                        key={t._id}
                        value={t._id}
                        className={({ focus }) =>
                          `cursor-default select-none py-2 px-4 ${
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
              <InfoValue className='uppercase'>
                {isReplacementShow
                  ? editForm?.replacement?.replacementTruckId?.plateNo
                  : currentTruck?.plateNo}
              </InfoValue>
            )}
          </InfoField>

          <div className='grid grid-cols-2 gap-4'>
            <InfoField label='Truck Type'>
              {isEditMode ? (
                <SelectWrapper
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
                >
                  {settings.trucksDrivers.truckType.map((item, i) => (
                    <option key={i} value={item}>
                      {item}
                    </option>
                  ))}
                </SelectWrapper>
              ) : (
                <InfoValue className='capitalize'>
                  {isReplacementShow
                    ? editForm?.replacement?.replacementTruckType
                    : editForm?.truckType}
                </InfoValue>
              )}
            </InfoField>
            <InputField
              label='Helper Count'
              type='number'
              name='helperCount'
              value={editForm?.helperCount}
              disabled={!isEditMode}
              onChange={handleChange}
              formatNumber
            />
          </div>

          <InfoField label='Driver'>
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
                    className='w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 max-sm:px-3 max-sm:py-2 min-h-[42px] max-sm:min-h-9 text-sm max-sm:text-xs focus:outline-none focus:border-primaryColor focus:ring-2 focus:ring-primaryColor/20 shadow-sm capitalize transition-all'
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
                  <ComboboxButton className='absolute inset-y-0 right-3 flex items-center text-gray-400'>
                    <MdKeyboardArrowDown className='text-lg' />
                  </ComboboxButton>
                  <ComboboxOptions className='absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white border border-gray-200 shadow-md py-1 text-sm focus:outline-none'>
                    {(isReplacementShow
                      ? filteredReplacementDrivers
                      : filteredDrivers
                    ).map(d => (
                      <ComboboxOption
                        key={d._id}
                        value={d._id}
                        className={({ focus }) =>
                          `cursor-default select-none py-2 px-4 ${
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
              <InfoValue className='capitalize'>
                {isReplacementShow
                  ? editForm?.replacement?.replacementDriverId
                    ? `${editForm.replacement.replacementDriverId.firstname} ${editForm.replacement.replacementDriverId.lastname}`
                    : 'N/A'
                  : editForm?.driverId?._id
                  ? `${editForm.driverId.firstname} ${editForm.driverId.lastname}`
                  : 'N/A'}
              </InfoValue>
            )}
          </InfoField>

          <div className='grid grid-cols-2 gap-4'>
            <InputField
              label='Total Sacks'
              type='number'
              name='totalSacksCount'
              value={editForm?.totalSacksCount}
              disabled
              formatNumber
              thousandSeparator
              decimalScale={0}
              isRequired={false}
              onChange={handleChange}
            />
            <InputField
              label='Load Weight (kg)'
              type='number'
              name='totalWeightKg'
              value={editForm?.totalWeightKg}
              disabled
              formatNumber
              thousandSeparator
              decimalScale={2}
              isRequired={false}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      <div className='space-y-2'>
        <h3 className='text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider'>
          Delivery Details
        </h3>
        <div className='grid grid-cols-1 xs:grid-cols-2 gap-x-5 gap-y-4 border border-gray-200 rounded-xl p-5 max-sm:p-4'>
          <InputField
            label='Receiving Contact Person'
            type='text'
            name='receivingContactPerson'
            placeholder='Contact Person'
            value={editForm?.receivingContactPerson}
            disabled={!isEditMode}
            onChange={handleChange}
            isRequired={true}
          />
          <InputField
            label='Receiving Contact No.'
            type='text'
            name='receivingContactPersonNo'
            placeholder='Contact Number'
            value={editForm?.receivingContactPersonNo}
            disabled={!isEditMode}
            onChange={handleChange}
            maxLength={11}
            isRequired={true}
          />

          <InfoField label='Destination'>
            {isEditMode ? (
              <SelectWrapper
                name='destination'
                value={editForm?.destination}
                onChange={handleChange}
              >
                {settings.deployments.destination.map((item, i) => (
                  <option key={i} value={item}>
                    {item}
                  </option>
                ))}
              </SelectWrapper>
            ) : (
              <InfoValue className='capitalize'>
                {editForm?.destination}
              </InfoValue>
            )}
          </InfoField>

          <div className='grid grid-cols-2 gap-4'>
            <InfoField label='Territory'>
              {isEditMode ? (
                <SelectWrapper
                  name='territory'
                  value={editForm?.territory}
                  onChange={handleChange}
                >
                  {settings.deployments.territory.map((item, i) => (
                    <option key={i} value={item}>
                      {item}
                    </option>
                  ))}
                </SelectWrapper>
              ) : (
                <InfoValue className='capitalize'>
                  {editForm?.territory}
                </InfoValue>
              )}
            </InfoField>
            <InfoField label='Hybrid'>
              {isEditMode ? (
                <SelectWrapper
                  name='hybrid'
                  value={editForm?.hybrid}
                  onChange={handleChange}
                >
                  {settings.deployments.hybrid.map((item, i) => (
                    <option key={i} value={item}>
                      {item}
                    </option>
                  ))}
                </SelectWrapper>
              ) : (
                <InfoValue className='capitalize'>{editForm?.hybrid}</InfoValue>
              )}
            </InfoField>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <InfoField label='Flagging'>
              {isEditMode ? (
                <SelectWrapper
                  name='flagging'
                  value={editForm?.flagging}
                  onChange={handleChange}
                >
                  {settings.deployments.flagging.map((item, i) => (
                    <option key={i} value={item}>
                      {item}
                    </option>
                  ))}
                </SelectWrapper>
              ) : (
                <InfoValue className='capitalize'>
                  {editForm?.flagging || 'N/A'}
                </InfoValue>
              )}
            </InfoField>
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

          <div className='grid grid-cols-2 gap-4'>
            <InfoField label='Status'>
              {isEditMode ? (
                <SelectWrapper
                  name='status'
                  value={editForm?.status}
                  onChange={handleChange}
                >
                  {DEPLOYMENT_STATUS.map((item, i) => (
                    <option key={i} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </SelectWrapper>
              ) : (
                <InfoValue className='capitalize'>{editForm?.status}</InfoValue>
              )}
            </InfoField>
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
    <div className='flex flex-col flex-1 overflow-hidden min-h-0 px-6 py-5 max-sm:px-4 max-sm:py-4'>
      <div className='flex items-center justify-between pb-3 mb-1 shrink-0'>
        <div className='flex items-center gap-2'>
          <h3 className='text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider'>
            Pickup Stops
          </h3>
          <span className='text-xs max-sm:text-xxs text-gray-400'>
            ({pickups.length}/{MAX_PICKUPS})
          </span>
        </div>
      </div>

      <div className='flex-1 overflow-y-auto scrollbar-thin flex flex-col gap-3 min-h-0'>
        {pickups.map((pickup, index) => (
          <div
            key={index}
            ref={index === pickups.length - 1 ? lastStopRef : null}
            className='border border-gray-200 rounded-xl p-4 max-sm:p-3 bg-gray-50/50 relative'
          >
            <div className='flex items-center gap-2 mb-3'>
              <p className='text-xxs sm:text-xs font-semibold text-emerald-600 uppercase tracking-wide'>
                Stop #{index + 1}
              </p>
              {pickup.tmoNo && (
                <span className='text-sm max-sm:text-xs font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded'>
                  {pickup.tmoNo}
                </span>
              )}
            </div>

            {isEditMode && pickups.length > 1 && (
              <button
                type='button'
                onClick={() => removePickupStop(index)}
                className='text-red-400 hover:text-red-600 hover:bg-red-50 p-2 flex items-center justify-center aspect-square rounded-full transition-colors absolute top-2 right-2 cursor-pointer'
              >
                <FiTrash2 className='text-lg' />
              </button>
            )}

            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3'>
              {/* Row 1: Pick-up Site · Municipality · Sched Pickup Time */}
              <InputField
                label='Pick-up Site'
                type='text'
                name='pickupSite'
                placeholder='Pick-up Site'
                value={pickup.pickupSite}
                disabled
                onChange={() => {}}
                isRequired={false}
              />
              <InputField
                label='Municipality'
                type='text'
                name='municipality'
                placeholder='Municipality'
                value={pickup.municipality}
                disabled
                onChange={() => {}}
                isRequired={false}
              />
              <InfoField label='Scheduled Pickup Time'>
                {pickup.scheduledPickupTime ? (
                  <InfoValue>
                    {DateTime.fromISO(pickup.scheduledPickupTime)
                      .setZone('Asia/Manila')
                      .toFormat('MMM d, yyyy - hh:mm a')}
                  </InfoValue>
                ) : (
                  <div className='flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 max-sm:px-3 max-sm:py-2 shadow-sm'>
                    <p className='italic text-gray-400 text-sm max-sm:text-xs'>
                      Not set
                    </p>
                  </div>
                )}
              </InfoField>

              {/* Row 2: Field Contact Person · Field Contact No. · Sacks Count */}
              <InputField
                label='Field Contact Person'
                type='text'
                name='fieldContactPerson'
                placeholder='Contact Person'
                value={pickup.fieldContactPerson}
                disabled
                onChange={() => {}}
                isRequired={false}
              />
              <InputField
                label='Field Contact No.'
                type='text'
                name='fieldContactPersonNo'
                placeholder='Contact Number'
                value={pickup.fieldContactPersonNo}
                disabled
                onChange={() => {}}
                isRequired={false}
              />
              {(() => {
                const readOnly = false
                return (
                  <div className='flex flex-col gap-1.5'>
                    <span className='text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider text-nowrap'>
                      Sacks Count
                    </span>
                    <div
                      className={clsx(
                        'flex items-center border rounded-xl px-3 py-2.5 shadow-sm transition-all',
                        !isEditMode || readOnly
                          ? 'bg-gray-50 border-gray-200'
                          : 'bg-white border-gray-200 focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20'
                      )}
                    >
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
                        className='flex-1 text-sm text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none min-w-0'
                      />
                    </div>
                  </div>
                )
              })()}

              {/* Row 3: Est. Weight · Field Weight · Plant Weight — always 3 cols */}
              <div className='col-span-full grid grid-cols-3 gap-x-4 gap-y-3'>
                {[
                  {
                    label: 'Est. Weight (Kg)',
                    field: 'estimatedWeightKg',
                    readOnly: true
                  },
                  {
                    label: 'Field Weight (Kg)',
                    field: 'fieldWeightKg',
                    readOnly: false
                  },
                  {
                    label: 'Plant Weight (Kg)',
                    field: 'plantWeightKg',
                    readOnly: false
                  }
                ].map(({ label, field, readOnly }) => (
                  <div key={field} className='flex flex-col gap-1.5'>
                    <span className='text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider text-nowrap'>
                      {label}
                    </span>
                    <div
                      className={clsx(
                        'flex items-center border rounded-xl px-3 py-2.5 shadow-sm transition-all',
                        !isEditMode || readOnly
                          ? 'bg-gray-50 border-gray-200'
                          : 'bg-white border-gray-200 focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20'
                      )}
                    >
                      <NumericFormat
                        thousandSeparator
                        decimalScale={2}
                        allowNegative={false}
                        value={pickup[field]}
                        onValueChange={v =>
                          handlePickupNumericChange(index, field, v.floatValue)
                        }
                        disabled={!isEditMode || readOnly}
                        className='flex-1 text-sm text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none min-w-0'
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {isEditMode && pickups.length >= MAX_PICKUPS && (
          <p className='text-xs text-gray-400 text-center mt-2'>
            Maximum of {MAX_PICKUPS} pickup stops reached.
          </p>
        )}
      </div>
    </div>
  )
}

// ── SHARED UI HELPERS ──────────────────────────────────────────────────────────

const InfoField = ({ label, children }) => (
  <div className='flex flex-col gap-1.5'>
    <span className='text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider truncate'>
      {label}
    </span>
    {children}
  </div>
)

const InfoValue = ({ children, className = '' }) => (
  <div
    className={clsx(
      'flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 max-sm:px-3 max-sm:py-2 shadow-sm text-sm max-sm:text-xs text-gray-700 min-h-[42px] max-sm:min-h-9 truncate',
      className
    )}
  >
    {children || (
      <span className='text-gray-400 italic text-sm max-sm:text-xs'>—</span>
    )}
  </div>
)

const SelectWrapper = ({ name, value, onChange, children }) => (
  <div className='relative flex items-center bg-white border border-gray-200 rounded-xl px-4 py-2.5 max-sm:px-3 max-sm:py-2 min-h-[42px] max-sm:min-h-9 focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20 transition-all shadow-sm'>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className='w-full h-full appearance-none bg-transparent text-sm max-sm:text-xs text-gray-800 focus:outline-none capitalize'
    >
      {children}
    </select>
    <MdKeyboardArrowDown className='absolute right-3 max-sm:right-2.5 text-gray-400 text-lg pointer-events-none' />
  </div>
)

const InputField = ({
  colSpan = 1,
  label,
  type,
  name,
  placeholder = '',
  value,
  onChange,
  disabled,
  maxLength,
  isRequired = false,
  isCapitalize = true,
  isUpperCase = false,
  formatNumber = false,
  thousandSeparator = true,
  decimalScale = 0,
  allowNegative = false
}) => {
  const labelEl = (
    <span className='text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider text-nowrap truncate'>
      {label}
    </span>
  )
  const wrapperClass = clsx(
    'flex items-center border rounded-xl px-4 py-2.5 max-sm:px-3 max-sm:py-2 min-h-[42px] max-sm:min-h-[36px] transition-all duration-200 shadow-sm',
    disabled
      ? 'bg-gray-50 border-gray-200'
      : 'bg-white border-gray-200 focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20'
  )
  const inputClass = clsx(
    'flex-1 min-w-0 text-sm max-sm:text-xs placeholder-gray-400 bg-transparent focus:outline-none',
    disabled ? 'text-gray-500' : 'text-gray-800',
    {
      capitalize: isCapitalize && type !== 'datetime-local',
      uppercase: isUpperCase
    }
  )

  if (formatNumber && type === 'number') {
    return (
      <label className={`col-span-${colSpan} flex flex-col gap-1.5`}>
        {labelEl}
        <div className={wrapperClass}>
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
            className={inputClass}
          />
        </div>
      </label>
    )
  }

  return (
    <label className={`col-span-${colSpan} flex flex-col gap-1.5`}>
      {labelEl}
      <div className={wrapperClass}>
        <input
          type={type}
          name={name}
          value={value || ''}
          minLength={2}
          maxLength={maxLength || 50}
          onChange={onChange}
          disabled={disabled}
          required={isRequired}
          placeholder={placeholder}
          className={inputClass}
        />
      </div>
    </label>
  )
}

export default DeploymentDetailsModal
