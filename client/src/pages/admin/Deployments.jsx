import React, { useEffect, useState } from 'react'
import DeploymentDetailsModal from '../../components/modals/DeploymentDetailsModal'
import CreateDeploymentModal from '../../components/modals/CreateDeploymentModal'
import useGetAllTruck from '../../hooks/useGetAllTruck'
import useGetAllDriver from '../../hooks/useGetAllDriver'
import { FaFilter, FaPlus, FaSearch, FaFileExport } from 'react-icons/fa'
import {
  DEPLOYMENT_STATUS,
  SUBCON_OPTIONS,
  TRUCK_TYPES
} from '../../utils/generalOptions'
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
import { TERRITORY_OPTIONS } from '../../utils/deploymentOptions'
import ExcelJS from 'exceljs'

// Add defaultFilters constant
const defaultFilters = {
  status: '',
  sort: 'latest',
  subcon: '',
  territory: '',
  assignedAt: '',
  departedAt: '',
  search: '',
  perPage: 100,
  page: 1
}

function Deployments () {
  const { userData } = useUserContext()

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

  // Initialize with defaultFilters
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

  const handleExportToCSV = () => {
    if (!allDeployments || allDeployments.length === 0) {
      alert('No data to export')
      return
    }

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
      return TRUCK_TYPES[lowerType] || capitalizeWords(type.replace(/-/g, ' '))
    }

    // Helper function to format replacement reason (replace underscores with spaces)
    const formatReplacementReason = reason => {
      if (!reason) return ''
      // Replace underscores with spaces and capitalize each word
      return reason
        .replace(/_/g, ' ')
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    }

    // Custom 12-hour time formatter for replacement dates
    const formatReplacementDateTime = dateStr => {
      if (!dateStr) return ''

      try {
        const date = DateTime.fromISO(dateStr).setZone('Asia/Manila')

        // Extract components for manual formatting
        const month = date.toFormat('MMM') // Dec, Jan, etc.
        const day = date.day
        const year = date.year
        const hour = date.hour
        const minute = date.minute.toString().padStart(2, '0')

        // Convert to 12-hour format
        const period = hour >= 12 ? 'PM' : 'AM'
        const hour12 = hour % 12 || 12 // Convert 0 to 12 for 12 AM

        // Format: "Dec 27, 2025 2:21 PM"
        return `${month} ${day}, ${year} ${hour12}:${minute} ${period}`
      } catch (error) {
        console.error('Error formatting replacement date:', dateStr, error)
        return ''
      }
    }

    // Custom 12-hour time formatter for timeline fields
    const formatTimelineDateTime = dateStr => {
      if (!dateStr || dateStr === 'Pending') return ''

      try {
        const date = DateTime.fromISO(dateStr).setZone('Asia/Manila')

        // Extract components for manual formatting
        const month = date.toFormat('MMM') // Dec, Jan, etc.
        const day = date.day
        const year = date.year
        const hour = date.hour
        const minute = date.minute.toString().padStart(2, '0')

        // Convert to 12-hour format
        const period = hour >= 12 ? 'PM' : 'AM'
        const hour12 = hour % 12 || 12 // Convert 0 to 12 for 12 AM

        // Format: "Dec 27, 2025 2:21 PM"
        return `${month} ${day}, ${year} ${hour12}:${minute} ${period}`
      } catch (error) {
        console.error('Error formatting timeline date:', dateStr, error)
        return ''
      }
    }

    // Calculate unloading time
    const calculateUnloadingTime = (destArrival, destDeparture) => {
      if (!destArrival || !destDeparture) return ''

      try {
        const arrival = DateTime.fromISO(destArrival)
        const departure = DateTime.fromISO(destDeparture)
        const { hours, minutes } = departure.diff(arrival, ['hours', 'minutes'])

        if (hours === 0) {
          return `${Math.floor(minutes)}m`
        } else if (minutes < 1) {
          return `${hours}h`
        } else {
          return `${hours}h ${Math.floor(minutes)}m`
        }
      } catch (error) {
        console.error('Error calculating unloading time:', error)
        return 'Error'
      }
    }

    // Define CSV headers with NEW FIELDS added after Unloading Time
    const headers = [
      'Code',
      // CURRENT details (shows replacement if exists, otherwise original)
      'Plate No',
      'Truck Type',
      'Driver',
      'Destination',
      'Status',
      'Departed',
      'Pick-up In',
      'Pick-up Out',
      'Dest. Arrival',
      'Dest. Departure',
      'Unloading Time',
      // NEW FIELDS ADDED HERE (after Unloading Time)
      'Territory',
      'Hybrid',
      'Flagging',
      'Flagging Remarks',
      // ORIGINAL details that were replaced (only populated if there was a replacement)
      'Orig Plate No',
      'Orig Truck Type',
      'Orig Driver',
      'Replaced At',
      'Replacement Reason',
      'Replacement Remarks'
    ]

    // Convert deployments to CSV rows
    const rows = allDeployments.map((deployment, index) => {
      // Determine if there's a replacement
      const hasReplacement = deployment?.replacement?.replacementTruckId?._id
      const replacement = deployment?.replacement

      // CURRENT details (show replacement if exists, otherwise original)
      const currentPlateNo = hasReplacement
        ? replacement.replacementTruckId?.plateNo || ''
        : deployment.truckId?.plateNo || ''

      const currentTruckType = hasReplacement
        ? replacement.replacementTruckType
        : deployment.truckType

      const currentDriverObj = hasReplacement
        ? replacement.replacementDriverId
        : deployment.driverId

      const currentDriverName = currentDriverObj
        ? `${capitalizeWords(currentDriverObj.firstname)} ${capitalizeWords(
            currentDriverObj.lastname
          )}`
        : ''

      // ORIGINAL details that were replaced (only if there was a replacement)
      const origPlateNo = hasReplacement
        ? deployment.truckId?.plateNo || ''
        : ''

      const origTruckType = hasReplacement ? deployment.truckType || '' : ''

      const origDriverName =
        hasReplacement && deployment.driverId
          ? `${capitalizeWords(
              deployment.driverId.firstname
            )} ${capitalizeWords(deployment.driverId.lastname)}`
          : ''

      const replacementDate = hasReplacement
        ? formatReplacementDateTime(replacement.replacedAt)
        : ''

      const replacementReason = hasReplacement
        ? formatReplacementReason(replacement.reason || '')
        : ''

      const replacementRemarks = hasReplacement ? replacement.remarks || '' : ''

      // Format status
      const status = deployment.status
        ? deployment.status === 'ongoing'
          ? 'Ongoing'
          : capitalizeWords(deployment.status)
        : ''

      // Format destination
      const destination = deployment.destination || ''

      // Handle canceled status - leave timeline fields blank
      if (deployment.status === 'canceled') {
        return [
          // No "No." column
          deployment.deploymentCode || '',
          // CURRENT details
          currentPlateNo.toUpperCase(),
          formatTruckType(currentTruckType),
          currentDriverName,
          destination,
          'Canceled',
          '', // Departed - blank
          '', // Pick-up In - blank
          '', // Pick-up Out - blank
          '', // Dest. Arrival - blank
          '', // Dest. Departure - blank
          '', // Unloading Time - blank
          // NEW FIELDS DATA
          deployment.territory || '',
          deployment.hybrid || '',
          deployment.flagging || '',
          deployment.flaggingRemarks || '',
          // ORIGINAL details (only if replaced)
          origPlateNo.toUpperCase(),
          formatTruckType(origTruckType),
          origDriverName,
          replacementDate,
          replacementReason,
          replacementRemarks
        ]
      }

      // For non-canceled deployments
      return [
        // No "No." column
        deployment.deploymentCode || '',
        // CURRENT details
        currentPlateNo.toUpperCase(),
        formatTruckType(currentTruckType),
        currentDriverName,
        destination,
        status,
        formatTimelineDateTime(deployment.departed),
        formatTimelineDateTime(deployment.pickupIn),
        formatTimelineDateTime(deployment.pickupOut),
        formatTimelineDateTime(deployment.destArrival),
        formatTimelineDateTime(deployment.destDeparture),
        calculateUnloadingTime(
          deployment.destArrival,
          deployment.destDeparture
        ),
        // NEW FIELDS DATA
        deployment.territory || '',
        deployment.hybrid || '',
        deployment.flagging || '',
        deployment.flaggingRemarks || '',
        // ORIGINAL details (only if replaced)
        origPlateNo.toUpperCase(),
        formatTruckType(origTruckType),
        origDriverName,
        replacementDate,
        replacementReason,
        replacementRemarks
      ]
    })

    // Create CSV content with proper escaping
    const escapeCSV = cell => {
      if (cell == null || cell === undefined) return '""'
      const stringCell = String(cell)
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (
        stringCell.includes(',') ||
        stringCell.includes('"') ||
        stringCell.includes('\n')
      ) {
        return `"${stringCell.replace(/"/g, '""')}"`
      }
      return stringCell
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n')

    // Create blob and download
    const blob = new Blob(['\ufeff' + csvContent], {
      type: 'text/csv;charset=utf-8;'
    })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    const timestamp = DateTime.now().toFormat('yyyy-MM-dd_HHmmss')
    link.setAttribute('href', url)
    link.setAttribute('download', `deployments_export_${timestamp}.csv`)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExportToBillingCSV = async () => {
    if (!allDeployments || allDeployments.length === 0) {
      alert('No data to export')
      return
    }

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
      const typeMappings = {
        elf: 'ELF',
        'single-tire': 'Single-Tire',
        forward: 'FORWARD',
        'wing-van': 'Wing Van',
        'closed-van': 'Closed Van',
        '10-wheeler': '10 Wheeler',
        '6-wheeler': '6 Wheeler'
      }
      const lowerType = type.toLowerCase().trim()
      return (
        typeMappings[lowerType] ||
        capitalizeWords(type.replace(/-/g, ' ')).toUpperCase()
      )
    }

    // Get current date and time for billing period
    const billingDate = DateTime.now()
      .setZone('Asia/Manila')
      .toFormat('MMMM dd, yyyy')

    // Get company name from first deployment or use default
    const firstDeployment = allDeployments[0]
    const companyName =
      firstDeployment?.company || 'SMC HI-BRED PHILIPPINES INC.'

    // Rate per kg
    const ratePerKg = 2.0

    // Create a new workbook
    const workbook = new ExcelJS.Workbook()

    // Define professional color scheme
    const colors = {
      primary: 'FF001E36', // Dark Blue
      secondary: 'FF003057', // Lighter Dark Blue
      accent: 'FFE3F2FD', // Light Blue-100
      header: 'FFF5F9FC', // Very Light Blue
      border: 'FFD1D5DB', // Gray-300
      text: 'FF111827', // Gray-900
      textLight: 'FF6B7280' // Gray-500
    }

    // Define professional styles
    const styles = {
      title: {
        font: { bold: true, size: 16, color: { argb: colors.text } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: colors.header }
        }
      },
      subtitle: {
        font: { bold: true, size: 12, color: { argb: colors.text } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: colors.accent }
        },
        border: {
          top: { style: 'thin', color: { argb: colors.border } },
          left: { style: 'thin', color: { argb: colors.border } },
          bottom: { style: 'thin', color: { argb: colors.border } },
          right: { style: 'thin', color: { argb: colors.border } }
        }
      },
      header: {
        font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: colors.primary }
        },
        border: {
          top: { style: 'thin', color: { argb: colors.border } },
          left: { style: 'thin', color: { argb: colors.border } },
          bottom: { style: 'thin', color: { argb: colors.border } },
          right: { style: 'thin', color: { argb: colors.border } }
        }
      },
      data: {
        font: { size: 10, color: { argb: colors.text } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin', color: { argb: colors.border } },
          left: { style: 'thin', color: { argb: colors.border } },
          bottom: { style: 'thin', color: { argb: colors.border } },
          right: { style: 'thin', color: { argb: colors.border } }
        }
      },
      dataLeft: {
        font: { size: 10, color: { argb: colors.text } },
        alignment: { horizontal: 'left', vertical: 'middle' },
        border: {
          top: { style: 'thin', color: { argb: colors.border } },
          left: { style: 'thin', color: { argb: colors.border } },
          bottom: { style: 'thin', color: { argb: colors.border } },
          right: { style: 'thin', color: { argb: colors.border } }
        }
      },
      total: {
        font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: colors.secondary }
        }
      },
      label: {
        font: { bold: true, size: 10, color: { argb: colors.text } },
        alignment: { horizontal: 'right', vertical: 'middle' }
      },
      value: {
        font: { size: 10, color: { argb: colors.text } },
        alignment: { horizontal: 'left', vertical: 'middle' },
        border: {
          bottom: { style: 'thin', color: { argb: colors.border } }
        }
      }
    }

    // Filter completed deployments
    const completedDeployments = allDeployments.filter(
      deployment => deployment.status === 'completed'
    )

    // ======================= SHEET 1: Regular Trips =======================
    const worksheet1 = workbook.addWorksheet('Regular Trips', {
      views: [{ showGridLines: false }],
      pageSetup: {
        paperSize: 9, // A4
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0
      }
    })

    // Set column widths
    worksheet1.columns = [
      { width: 4 }, // A - Margin
      { width: 15 }, // B - DP Code
      { width: 18 }, // C - Billing Period
      { width: 12 }, // D - Series No.
      { width: 20 }, // E - From
      { width: 20 }, // F - To
      { width: 12 }, // G - Plate
      { width: 12 }, // H - Truck Type
      { width: 14 }, // I - Net Weight (kg)
      { width: 10 }, // J - Rate/Kg
      { width: 15 }, // K - Amount
      { width: 4 } // L - Margin
    ]

    // Add title (row 2)
    worksheet1.mergeCells('B2:K2')
    const titleCell1 = worksheet1.getCell('B2')
    titleCell1.value = 'REGULAR TRIPS'
    titleCell1.style = styles.title
    titleCell1.alignment = { horizontal: 'center', vertical: 'middle' }
    worksheet1.getRow(2).height = 30

    // Add empty row (row 3)
    worksheet1.addRow([])

    // Add header row (row 4)
    const headerRow1 = worksheet1.getRow(4)
    headerRow1.values = [
      '',
      'DP Code',
      'Billing Period',
      'Series No.',
      'From',
      'To',
      'Plate',
      'Truck Type',
      'Net Weight (kg)',
      'Rate/Kg',
      'Amount (₱)',
      ''
    ]
    headerRow1.height = 25

    // Apply header style
    for (let col = 2; col <= 11; col++) {
      headerRow1.getCell(col).style = styles.header
    }

    // Add data rows
    let dataStartRow = 5
    completedDeployments.forEach((deployment, index) => {
      const hasReplacement = deployment?.replacement?.replacementTruckId?._id
      const replacement = deployment?.replacement

      const currentPlateNo = hasReplacement
        ? replacement.replacementTruckId?.plateNo || ''
        : deployment.truckId?.plateNo || ''

      const currentTruckType = hasReplacement
        ? replacement.replacementTruckType
        : deployment.truckType

      const netWeight = deployment.loadWeightKg || 0

      // Format billing period (dest departure)
      const billingPeriod = deployment.destDeparture
        ? DateTime.fromISO(deployment.destDeparture)
            .setZone('Asia/Manila')
            .toFormat('MMM dd, yyyy')
        : ''

      const rowNum = worksheet1.rowCount + 1

      const row = worksheet1.addRow([
        '',
        deployment.deploymentCode || '',
        billingPeriod,
        '', // Series No. - blank
        deployment.pickupSite || '',
        deployment.destination || '',
        currentPlateNo.toUpperCase(),
        formatTruckType(currentTruckType),
        netWeight,
        ratePerKg,
        { formula: `I${rowNum}*J${rowNum}` },
        ''
      ])

      row.height = 20

      // Apply styles
      row.getCell(2).style = styles.data // DP Code
      row.getCell(3).style = styles.data // Billing Period
      row.getCell(4).style = styles.data // Series No.
      row.getCell(5).style = styles.dataLeft // From
      row.getCell(6).style = styles.dataLeft // To
      row.getCell(7).style = styles.data // Plate
      row.getCell(8).style = styles.data // Truck Type
      row.getCell(9).style = { ...styles.data, numFmt: '#,##0.00' } // Net Weight
      row.getCell(10).style = { ...styles.data, numFmt: '#,##0.00' } // Rate
      row.getCell(11).style = { ...styles.data, numFmt: '#,##0.00' } // Amount

      // Alternate row coloring
      if (index % 2 === 0) {
        for (let col = 2; col <= 11; col++) {
          const cell = row.getCell(col)
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFAFAFA' }
          }
        }
      }
    })

    // Add empty row if no data
    if (completedDeployments.length === 0) {
      const emptyRow = worksheet1.addRow([
        '',
        '',
        '',
        '',
        '',
        'No completed deployments',
        '',
        '',
        0,
        ratePerKg,
        0,
        ''
      ])
      emptyRow.height = 20
      for (let col = 2; col <= 11; col++) {
        emptyRow.getCell(col).style = styles.data
      }
    }

    // Add subtotal row
    const lastDataRow = worksheet1.rowCount
    worksheet1.addRow([]) // Empty row

    const subtotalRow1 = worksheet1.addRow([
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      { formula: `SUM(I${dataStartRow}:I${lastDataRow})` },
      'SUBTOTAL:',
      { formula: `SUM(K${dataStartRow}:K${lastDataRow})` },
      ''
    ])

    subtotalRow1.height = 25
    subtotalRow1.getCell(9).style = { ...styles.total, numFmt: '#,##0.00' }
    subtotalRow1.getCell(10).style = styles.total
    subtotalRow1.getCell(11).style = { ...styles.total, numFmt: '₱#,##0.00' }

    // Store the subtotal row number for Sheet 3 reference
    const regularTripsSubtotalRow = worksheet1.rowCount

    // ======================= SHEET 2: Demurrage Fee =======================
    const worksheet2 = workbook.addWorksheet('Demurrage Fee', {
      views: [{ showGridLines: false }],
      pageSetup: {
        paperSize: 9, // A4
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0
      }
    })

    // Set column widths
    worksheet2.columns = [
      { width: 4 }, // A - Margin
      { width: 15 }, // B - DP Code
      { width: 18 }, // C - Dest Arrival
      { width: 18 }, // D - Dest Departure
      { width: 14 }, // E - Unloading Time
      { width: 20 }, // F - From
      { width: 20 }, // G - To
      { width: 12 }, // H - Plate No
      { width: 12 }, // I - Truck Type
      { width: 12 }, // J - Rate
      { width: 15 }, // K - Amount
      { width: 4 } // L - Margin
    ]

    // Add title (row 2)
    worksheet2.mergeCells('B2:K2')
    const titleCell2 = worksheet2.getCell('B2')
    titleCell2.value = 'DEMURRAGE FEE'
    titleCell2.style = styles.title
    titleCell2.alignment = { horizontal: 'center', vertical: 'middle' }
    worksheet2.getRow(2).height = 30

    // Add empty row (row 3)
    worksheet2.addRow([])

    // Add header row (row 4)
    const headerRow2 = worksheet2.getRow(4)
    headerRow2.values = [
      '',
      'DP Code',
      'Dest Arrival',
      'Dest Departure',
      'Unloading Time',
      'From',
      'To',
      'Plate No',
      'Truck Type',
      'Rate',
      'Amount (₱)',
      ''
    ]
    headerRow2.height = 25

    // Apply header style
    for (let col = 2; col <= 11; col++) {
      headerRow2.getCell(col).style = styles.header
    }

    // Add demurrage data
    const demurrageDataStartRow = 5
    completedDeployments.forEach((deployment, index) => {
      const hasReplacement = deployment?.replacement?.replacementTruckId?._id
      const currentPlateNo = hasReplacement
        ? deployment.replacement?.replacementTruckId?.plateNo || ''
        : deployment.truckId?.plateNo || ''
      const currentTruckType = hasReplacement
        ? deployment.replacement?.replacementTruckType
        : deployment.truckType

      // Calculate unloading time
      const unloadingTime =
        deployment.destArrival && deployment.destDeparture
          ? (() => {
              const { hours, minutes } = DateTime.fromISO(
                deployment.destDeparture
              ).diff(DateTime.fromISO(deployment.destArrival), [
                'hours',
                'minutes'
              ])
              return `${hours}h ${Math.floor(minutes)}m`
            })()
          : ''

      const row = worksheet2.addRow([
        '',
        deployment.deploymentCode || '',
        deployment.destArrival
          ? DateTime.fromISO(deployment.destArrival)
              .setZone('Asia/Manila')
              .toFormat('MMM dd, yyyy hh:mm a')
          : '',
        deployment.destDeparture
          ? DateTime.fromISO(deployment.destDeparture)
              .setZone('Asia/Manila')
              .toFormat('MMM dd, yyyy hh:mm a')
          : '',
        unloadingTime,
        deployment.pickupSite || '',
        deployment.destination || '',
        currentPlateNo.toUpperCase(),
        formatTruckType(currentTruckType),
        '', // Rate - can be filled manually
        '', // Amount - can be filled manually
        ''
      ])

      row.height = 20

      // Apply styles
      row.getCell(2).style = styles.data // DP Code
      row.getCell(3).style = styles.data // Dest Arrival
      row.getCell(4).style = styles.data // Dest Departure
      row.getCell(5).style = styles.data // Unloading Time
      row.getCell(6).style = styles.dataLeft // From
      row.getCell(7).style = styles.dataLeft // To
      row.getCell(8).style = styles.data // Plate No
      row.getCell(9).style = styles.data // Truck Type
      row.getCell(10).style = { ...styles.data, numFmt: '#,##0.00' } // Rate
      row.getCell(11).style = { ...styles.data, numFmt: '#,##0.00' } // Amount

      // Alternate row coloring
      if (index % 2 === 0) {
        for (let col = 2; col <= 11; col++) {
          const cell = row.getCell(col)
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFAFAFA' }
          }
        }
      }
    })

    // Add empty row if no data
    if (completedDeployments.length === 0) {
      const emptyRow = worksheet2.addRow([
        '',
        '',
        '',
        '',
        'No demurrage fees',
        '',
        '',
        '',
        '',
        0,
        0,
        ''
      ])
      emptyRow.height = 20
      for (let col = 2; col <= 11; col++) {
        emptyRow.getCell(col).style = styles.data
      }
    }

    // Add subtotal row
    const lastDemurrageRow = worksheet2.rowCount
    worksheet2.addRow([]) // Empty row

    const subtotalRow2 = worksheet2.addRow([
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'SUBTOTAL:',
      { formula: `SUM(K${demurrageDataStartRow}:K${lastDemurrageRow})` },
      ''
    ])

    subtotalRow2.height = 25
    subtotalRow2.getCell(10).style = styles.total
    subtotalRow2.getCell(11).style = { ...styles.total, numFmt: '₱#,##0.00' }

    // Store the subtotal row number for Sheet 3 reference
    const demurrageFeeSubtotalRow = worksheet2.rowCount

    // ======================= SHEET 3: Summary =======================
    const worksheet3 = workbook.addWorksheet('Summary', {
      views: [{ showGridLines: false }],
      pageSetup: {
        paperSize: 9, // A4
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0
      }
    })

    // Set column widths
    worksheet3.columns = [
      { width: 4 }, // A - Margin
      { width: 25 }, // B
      { width: 25 }, // C
      { width: 20 }, // D
      { width: 20 }, // E
      { width: 20 }, // F
      { width: 4 } // G - Margin
    ]

    // Add title (row 2)
    worksheet3.mergeCells('B2:E2')
    const titleCell3 = worksheet3.getCell('B2')
    titleCell3.value = 'STATEMENT OF ACCOUNT'
    titleCell3.style = {
      ...styles.title,
      font: { ...styles.title.font, size: 18 }
    }
    titleCell3.alignment = { horizontal: 'center', vertical: 'middle' }
    worksheet3.getRow(2).height = 35

    // Add empty row
    worksheet3.addRow([])

    // Billed To section (row 4)
    const billedToRow = worksheet3.getRow(4)
    billedToRow.values = ['', 'BILLED TO:', companyName, '', '', '', '']
    billedToRow.height = 25
    billedToRow.getCell(2).style = styles.label
    billedToRow.getCell(3).style = {
      ...styles.value,
      font: { ...styles.value.font, bold: true }
    }

    // Date (row 5)
    const dateRow = worksheet3.getRow(5)
    dateRow.values = ['', 'DATE:', billingDate, '', '', '', '']
    dateRow.height = 20
    dateRow.getCell(2).style = styles.label
    dateRow.getCell(3).style = styles.value

    // SOA Number (row 6)
    const soaRow = worksheet3.getRow(6)
    soaRow.values = ['', 'SOA NUMBER:', 'KTS-2026-001', '', '', '', '']
    soaRow.height = 20
    soaRow.getCell(2).style = styles.label
    soaRow.getCell(3).style = styles.value

    // P.O. Number (row 7)
    const poRow = worksheet3.getRow(7)
    poRow.values = ['', 'P.O. NUMBER:', '', '', '', '', '']
    poRow.height = 20
    poRow.getCell(2).style = styles.label
    poRow.getCell(3).style = styles.value

    // Add empty rows
    worksheet3.addRow([])
    worksheet3.addRow([])

    // Breakdown section header (row 10)
    worksheet3.mergeCells('B10:E10')
    const breakdownHeader = worksheet3.getCell('B10')
    breakdownHeader.value = 'BILLING BREAKDOWN'
    breakdownHeader.style = styles.subtitle
    breakdownHeader.alignment = { horizontal: 'center', vertical: 'middle' }
    worksheet3.getRow(10).height = 25

    // Regular Trips (row 11) - FIXED: Reference column K instead of J
    const regularRow = worksheet3.getRow(11)
    regularRow.values = [
      '',
      '',
      'Regular Trips',
      { formula: `='Regular Trips'!K${regularTripsSubtotalRow}` },
      '',
      '',
      ''
    ]
    regularRow.height = 22
    regularRow.getCell(3).style = styles.dataLeft
    regularRow.getCell(4).style = { ...styles.data, numFmt: '₱#,##0.00' }

    // Demurrage Fee (row 12) - FIXED: Reference column K instead of L
    const demurrageRow = worksheet3.getRow(12)
    demurrageRow.values = [
      '',
      '',
      'Demurrage Fee',
      { formula: `='Demurrage Fee'!K${demurrageFeeSubtotalRow}` },
      '',
      '',
      ''
    ]
    demurrageRow.height = 22
    demurrageRow.getCell(3).style = styles.dataLeft
    demurrageRow.getCell(4).style = { ...styles.data, numFmt: '₱#,##0.00' }

    // Add empty rows
    worksheet3.addRow([])

    // Subtotal (row 14)
    const subtotalRow3 = worksheet3.getRow(14)
    subtotalRow3.values = [
      '',
      '',
      'SUBTOTAL',
      { formula: 'SUM(D11:D12)' },
      '',
      '',
      ''
    ]
    subtotalRow3.height = 25
    subtotalRow3.getCell(3).style = {
      ...styles.total,
      alignment: { horizontal: 'left', vertical: 'middle' }
    }
    subtotalRow3.getCell(4).style = {
      ...styles.total,
      numFmt: '₱#,##0.00',
      alignment: { horizontal: 'center', vertical: 'middle' }
    }

    // VAT (row 15)
    const vatRow = worksheet3.getRow(15)
    vatRow.values = ['', '', 'ADD 12% VAT', { formula: 'D14*0.12' }, '', '', '']
    vatRow.height = 22
    vatRow.getCell(3).style = styles.dataLeft
    vatRow.getCell(4).style = { ...styles.data, numFmt: '₱#,##0.00' }

    // Grand Total (row 16)
    const grandTotalRow = worksheet3.getRow(16)
    grandTotalRow.values = [
      '',
      '',
      'GRAND TOTAL',
      { formula: 'D14+D15' },
      '',
      '',
      ''
    ]
    grandTotalRow.height = 28
    grandTotalRow.getCell(3).style = {
      ...styles.total,
      alignment: { horizontal: 'left', vertical: 'middle' },
      font: { ...styles.total.font, size: 12 }
    }
    grandTotalRow.getCell(4).style = {
      ...styles.total,
      numFmt: '₱#,##0.00',
      font: { ...styles.total.font, size: 12 },
      alignment: { horizontal: 'center', vertical: 'middle' }
    }

    // Add empty rows
    // for (let i = 0; i < 1; i++) {
    //   worksheet3.addRow([])
    // }

    // Prepared by (row 19)
    const preparedRow = worksheet3.getRow(19)
    preparedRow.values = [
      '',
      'PREPARED BY:',
      '',
      '',
      'CHECKED/APPROVED BY:',
      '',
      ''
    ]
    preparedRow.height = 20
    preparedRow.getCell(2).style = {
      font: { bold: true, size: 10 },
      alignment: { horizontal: 'left' }
    }
    preparedRow.getCell(5).style = {
      font: { bold: true, size: 10 },
      alignment: { horizontal: 'left' }
    }

    // Add empty rows for signature
    worksheet3.addRow([])
    worksheet3.addRow([])

    // Name (row 22)
    const nameRow = worksheet3.getRow(22)
    nameRow.values = [
      '',
      'JOHN ROBERT M. OCUMEN',
      '',
      '',
      '_____________________',
      '',
      ''
    ]
    nameRow.height = 20
    nameRow.getCell(2).style = {
      font: { bold: true, size: 10 },
      alignment: { horizontal: 'left' },
      border: {
        top: { style: 'thin', color: { argb: 'FF000000' } }
      }
    }
    nameRow.getCell(5).style = {
      alignment: { horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { argb: 'FF000000' } }
      }
    }

    // Title (row 25)
    const titleRow = worksheet3.getRow(23)
    titleRow.values = ['', 'PROPRIETOR', '', '', 'AUTHORIZED SIGNATURE', '', '']
    titleRow.height = 18
    titleRow.getCell(2).style = {
      font: { size: 9, color: { argb: colors.textLight } },
      alignment: { horizontal: 'left' }
    }
    titleRow.getCell(5).style = {
      font: { size: 9, color: { argb: colors.textLight } },
      alignment: { horizontal: 'center' }
    }

    // Generate Excel file
    const timestamp = DateTime.now().toFormat('yyyy-MM-dd_HHmmss')

    // Write to buffer and create download link
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.href = url
    link.download = `Billing_Statement_${timestamp}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleAddNewDeployment = newDeployment => {
    console.log('NEW DEPLOYMENT', newDeployment)
    setAllDeployments(prev => [newDeployment, ...prev])
  }

  const handleShowTruckDetailsModal = async data => {
    setSelectedDeployment(data)
    setIsDeploymentDetailsModalOpen(true)
    console.log(data)
  }

  // for updating the all deployment with the updated deployment
  const handleUpdateAllDeployments = updatedDeployment => {
    console.log(updatedDeployment)
    setAllDeployments(prevAllDeployments =>
      prevAllDeployments.map(deployment =>
        deployment._id === updatedDeployment._id
          ? updatedDeployment
          : deployment
      )
    )
  }

  // for removing the deleted deployment
  const handleRemoveDeletedDeployment = deletedDeployment => {
    setAllDeployments(prev =>
      prev.filter(deployment => deployment._id !== deletedDeployment)
    )
    setIsDeleteDeploymentModalOpen(false)
    setIsDeploymentDetailsModalOpen(false)
  }

  useEffect(() => {
    const handleGetAllDeployment = async () => {
      // Pass filters to the function
      const { deployments, total, page, totalPages, error } =
        await getAllDeploymentFunction(filters)

      if (error) {
        setDeploymentError(error)
      }
      setAllDeployments(deployments)
      setTotal(total)
      setPage(page)
      setTotalPages(totalPages)
    }

    const handleGetAllTrucks = async () => {
      const { trucks, error } = await getAllTruckFunction({})

      if (error) {
        setTruckError(error)
      }
      setAllTrucks(trucks || [])
    }

    const handleGetAllDrivers = async () => {
      const { drivers, error } = await getAllDriverFunction({})

      if (error) {
        setDriverError(error)
      }
      setAllDrivers(drivers || [])
    }

    handleGetAllDeployment()
    handleGetAllTrucks()
    handleGetAllDrivers()
  }, [filters])

  return (
    <>
      <div className='flex-1 flex flex-col gap-10'>
        {/* header */}
        <div className='flex items-center flex-wrap gap-x-12 gap-y-4'>
          <h1 className='font-semibold text-2xl mr-auto'>Deployments</h1>

          {/* right side */}
          <div className='flex flex-wrap gap-4'>
            {/* filters */}
            <div className='dropdown dropdown-center'>
              {/* button */}
              <div
                tabIndex={0}
                role='button'
                className='flex items-center gap-4 ring-1 ring-gray-200 hover:bg-gray-50 rounded px-3 py-1 cursor-pointer active:scale-95 transition-all'
              >
                <FaFilter className='text-sm' />
                <p>Filter</p>
              </div>

              {/* menu */}
              <div
                tabIndex='0'
                className='dropdown-content menu mt-3 bg-white shadow-sm rounded w-sm ring-1 ring-gray-300'
              >
                <div className='grid grid-cols-2 gap-4 p-4'>
                  <label className='flex items-center text-sm outline outline-gray-200 rounded py-2 px-3 gap-2'>
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

                  <label className='flex items-center text-sm outline outline-gray-200 rounded py-2 px-3 gap-2'>
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
                      <label className='flex items-center text-sm outline outline-gray-200 rounded py-2 px-3 gap-2'>
                        <p className='font-semibold'>Subcon</p>
                        <select
                          name='subcon'
                          value={tempFilters.subcon}
                          onChange={handleChangeFilter}
                          className='w-full focus:outline-none'
                        >
                          <option value=''>All</option>
                          {SUBCON_OPTIONS.map((item, index) => (
                            <option key={index} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className='flex items-center text-sm outline outline-gray-200 rounded py-2 px-3 gap-2'>
                        <p className='font-semibold'>Territory</p>
                        <select
                          name='territory'
                          value={tempFilters.territory}
                          onChange={handleChangeFilter}
                          className='w-full focus:outline-none'
                        >
                          <option value=''>All</option>
                          {TERRITORY_OPTIONS.map((item, index) => (
                            <option key={index} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}

                  <label className='col-span-2 flex items-center justify-between text-sm outline outline-gray-200 rounded py-2 px-3 gap-2'>
                    <p className='font-semibold text-nowrap'>Assigned At</p>
                    <input
                      type='date'
                      name='assignedAt'
                      value={tempFilters.assignedAt}
                      onChange={handleChangeFilter}
                      className='focus:outline-none'
                    />
                  </label>

                  <label className='col-span-2 flex items-center justify-between text-sm outline outline-gray-200 rounded py-2 px-3 gap-2'>
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
                    className='bg-linear-to-b from-gray-100 to-gray-200 text-gray-600  rounded py-2 px-8 font-semibold uppercase active:scale-95 transition-all text-sm cursor-pointer hover:brightness-95'
                  >
                    Reset
                  </button>

                  <button
                    onClick={handleApplyFilters}
                    disabled={isDeploymentLoading}
                    className='bg-linear-to-b from-emerald-500 to-emerald-600 text-white  rounded py-2 px-8 font-semibold uppercase active:scale-95 transition-all text-sm cursor-pointer hover:brightness-95'
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>

            {/* search */}
            <form
              onSubmit={handleApplyFilters}
              className='flex items-center outline outline-gray-200 rounded pl-3 pr-1 focus-within:outline-gray-300 transition-all max-xl:mr-auto'
            >
              <FaSearch className='text-sm' />
              <input
                type='text'
                name='search'
                placeholder='Search'
                value={tempFilters.search}
                onChange={handleChangeFilter}
                autoComplete='off'
                className='max-w-60 focus:outline-none ml-3 mr-1'
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
                <IoClose className='text-xl' />
              </button>
            </form>

            {/* pagination */}
            <div className='flex gap-4 items-center outline outline-gray-200 rounded'>
              <button
                onClick={() => handleChangePage('prev')}
                disabled={isDeploymentLoading || filters.page === 1}
                className='p-1 text-2xl hover:bg-gray-50 cursor-pointer border-r border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <MdOutlineKeyboardArrowLeft />
              </button>

              <p className='text-sm min-w-22 text-center'>
                {!isDeploymentLoading &&
                  allDeployments &&
                  `Page ${total > 0 ? page : 0} of ${totalPages}`}
              </p>

              <button
                onClick={() => handleChangePage('next')}
                disabled={isDeploymentLoading || filters.page === totalPages}
                className='p-1 text-2xl hover:bg-gray-50 cursor-pointer border-l border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <MdOutlineKeyboardArrowRight />
              </button>
            </div>

            {/* Export dropdown */}
            {['head_admin', 'admin'].includes(userData.data.role) && (
              <div className='dropdown dropdown-center'>
                {/* button */}
                <div
                  tabIndex={0}
                  role='button'
                  className='flex items-center gap-4 bg-linear-to-b from-blue-500 to-blue-600 text-white rounded px-3 py-1 cursor-pointer active:scale-95 transition-all hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed'
                  disabled={isDeploymentLoading || allDeployments.length === 0}
                >
                  <BiExport className='text-lg' />
                  <p>Export</p>
                </div>

                {/* menu */}
                <div
                  tabIndex='0'
                  className='dropdown-content menu mt-3 bg-white shadow-sm rounded w-64 ring-1 ring-gray-300'
                >
                  <button
                    onClick={handleExportToCSV}
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

                  <div className='border-t border-gray-200 my-1'></div>

                  <button
                    onClick={handleExportToBillingCSV}
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
                </div>
              </div>
            )}

            {/* create button */}
            {['head_admin', 'admin'].includes(userData.data.role) && (
              <button
                onClick={() => setIsCreateDeploymentModalOpen(true)}
                disabled={isDeploymentLoading}
                className='flex items-center gap-4 bg-linear-to-b from-emerald-500 to-emerald-600 text-white rounded px-3 py-1 cursor-pointer active:scale-95 transition-all hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <FaPlus className='text-sm' />
                <p>Deploy Truck</p>
              </button>
            )}
          </div>
        </div>

        {/* table */}
        {isDeploymentLoading ? (
          <div className='flex-1 flex items-center justify-center'>
            <div className='flex flex-col items-center justify-center gap-4 text-center'>
              <div className='relative'>
                <span className='loading loading-spinner loading-lg text-primaryColor'></span>
              </div>
              <p className='text-gray-600 font-medium'>Loading content...</p>
            </div>
          </div>
        ) : deploymentError ? (
          <div className='flex-1 flex justify-center items-center'>
            <div className='flex flex-col justify-center items-center gap-4 px-4 text-center'>
              <img src={error_illustration} alt='empty list' className='w-56' />
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
              <img src={empty_illustration} alt='empty list' className='w-56' />
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
              <table className='table table-sm table-pin-rows table-pin-cols'>
                <thead>
                  <tr className='bg-white border-b border-gray-200  text-gray-800'>
                    <td>{total}</td>
                    <td>Code</td>
                    <td>Truck Details</td>
                    <td>Destination</td>
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
                      className='border-b border-gray-200 last:border-none hover:bg-gray-50 cursor-pointer capitalize'
                    >
                      <td className='text-xs font-bold text-gray-600'>
                        {(filters.page - 1) * filters.perPage + index + 1}
                      </td>

                      <td className='p-0 relative'>
                        <div
                          className='cursor-copy h-full w-fit p-2 hover:bg-gray-100 transition-colors rounded relative group'
                          onClick={e => {
                            e.stopPropagation()
                            navigator.clipboard.writeText(
                              deployment.deploymentCode
                            )

                            // Show feedback tooltip
                            const div = e.currentTarget
                            const tooltip = document.createElement('div')
                            tooltip.className =
                              'absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50'
                            tooltip.textContent = 'Copied'

                            div.appendChild(tooltip)

                            // Remove after 1 second
                            setTimeout(() => {
                              if (div.contains(tooltip)) {
                                div.removeChild(tooltip)
                              }
                            }, 1000)
                          }}
                          title='Click to copy'
                        >
                          {deployment.deploymentCode}
                        </div>
                      </td>

                      <td>
                        <div className='space-y-1'>
                          {deployment?.replacement?.replacementTruckId?._id ? (
                            <>
                              <p className='text-nowrap font-semibold'>
                                <span className='uppercase'>
                                  {
                                    deployment.replacement.replacementTruckId
                                      .plateNo
                                  }{' '}
                                </span>
                                ({deployment.replacement.replacementTruckType})
                              </p>
                              <p className='text-nowrap font-light'>{`${deployment.replacement.replacementDriverId.firstname} ${deployment.replacement.replacementDriverId.lastname}`}</p>
                            </>
                          ) : (
                            <>
                              <p className='text-nowrap font-semibold'>
                                <span className='uppercase'>
                                  {deployment.truckId.plateNo}{' '}
                                </span>
                                ({deployment.truckType})
                              </p>
                              <p className='text-nowrap font-light'>{`${deployment.driverId.firstname} ${deployment.driverId.lastname}`}</p>
                            </>
                          )}{' '}
                        </div>
                      </td>

                      <td className='max-w-28'>{deployment.destination}</td>

                      <td>
                        <div
                          className={clsx('px-2 py-1 rounded-full w-fit', {
                            'bg-orange-500/10 text-orange-500':
                              deployment.status === 'preparing',
                            'bg-emerald-500/10 text-emerald-500':
                              deployment.status === 'ongoing',
                            'bg-blue-500/10 text-blue-500':
                              deployment.status === 'completed',
                            'bg-red-500/10 text-red-500':
                              deployment.status === 'canceled'
                          })}
                        >
                          {deployment.status}
                        </div>
                      </td>

                      <td>
                        {deployment.departed ? (
                          <div className='text-nowrap w-fit px-2 py-1 rounded-full'>
                            {DateTime.fromISO(deployment.departed)
                              .setZone('Asia/Manila')
                              .toFormat('MMM d, yyyy hh:mm a')}
                          </div>
                        ) : deployment.status === 'canceled' ? (
                          <p className='italic text-gray-400 font-light'>
                            Canceled
                          </p>
                        ) : (
                          <p className='italic text-gray-400 font-light'>
                            Pending
                          </p>
                        )}
                      </td>

                      <td>
                        {deployment.pickupIn ? (
                          <div className='text-nowrap w-fit px-2 py-1 rounded-full'>
                            {DateTime.fromISO(deployment.pickupIn)
                              .setZone('Asia/Manila')
                              .toFormat('MMM d, yyyy hh:mm a')}
                          </div>
                        ) : deployment.status === 'canceled' ? (
                          <p className='italic text-gray-400 font-light'>
                            Canceled
                          </p>
                        ) : (
                          <p className='italic text-gray-400 font-light'>
                            Pending
                          </p>
                        )}
                      </td>

                      <td>
                        {deployment.pickupOut ? (
                          <div className='text-nowrap w-fit px-2 py-1 rounded-full'>
                            {DateTime.fromISO(deployment.pickupOut)
                              .setZone('Asia/Manila')
                              .toFormat('MMM d, yyyy hh:mm a')}
                          </div>
                        ) : deployment.status === 'canceled' ? (
                          <p className='italic text-gray-400 font-light'>
                            Canceled
                          </p>
                        ) : (
                          <p className='italic text-gray-400 font-light'>
                            Pending
                          </p>
                        )}
                      </td>

                      <td>
                        {deployment.destArrival ? (
                          <div className='text-nowrap w-fit px-2 py-1 rounded-full'>
                            {DateTime.fromISO(deployment.destArrival)
                              .setZone('Asia/Manila')
                              .toFormat('MMM d, yyyy hh:mm a')}
                          </div>
                        ) : deployment.status === 'canceled' ? (
                          <p className='italic text-gray-400 font-light'>
                            Canceled
                          </p>
                        ) : (
                          <p className='italic text-gray-400 font-light'>
                            Pending
                          </p>
                        )}
                      </td>

                      <td>
                        {deployment.destDeparture ? (
                          <div className='text-nowrap w-fit px-2 py-1 rounded-full'>
                            {DateTime.fromISO(deployment.destDeparture)
                              .setZone('Asia/Manila')
                              .toFormat('MMM d, yyyy hh:mm a')}
                          </div>
                        ) : deployment.status === 'canceled' ? (
                          <p className='italic text-gray-400 font-light'>
                            Canceled
                          </p>
                        ) : (
                          <p className='italic text-gray-400 font-light'>
                            Pending
                          </p>
                        )}
                      </td>

                      <td>
                        {deployment.destArrival && deployment.destDeparture ? (
                          <div className='text-nowrap w-fit px-3 py-1 rounded-full bg-emerald-500 text-white'>
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
                          <p className='italic text-gray-400 font-light'>
                            Canceled
                          </p>
                        ) : (
                          <p className='italic text-gray-400 font-light'>
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
