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
      .toFormat('yyyy-MM-dd HH:mm:ss')

    // Get company name from first deployment or use default
    const firstDeployment = allDeployments[0]
    const companyName =
      firstDeployment?.company || 'SMC HI-BRED PHILIPPINES INC.'

    // Rate per kg (fixed at 2.00 as per your Excel)
    const ratePerKg = 2.0

    // Create a new workbook
    const workbook = new ExcelJS.Workbook()

    // Define styles
    const borderStyle = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    }

    const headerStyle = {
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFF00' } // Yellow
      },
      font: {
        bold: true
      },
      alignment: {
        horizontal: 'center',
        vertical: 'center'
      },
      border: borderStyle
    }

    const borderedStyle = {
      border: borderStyle
    }

    // ======================= SHEET 1: Regular Trips =======================
    const worksheet1 = workbook.addWorksheet('1')

    // Set column widths
    worksheet1.columns = [
      { width: 5 }, // A
      { width: 15 }, // B
      { width: 12 }, // C
      { width: 25 }, // D
      { width: 25 }, // E
      { width: 12 }, // F
      { width: 15 }, // G
      { width: 10 }, // H
      { width: 10 }, // I
      { width: 15 } // J
    ]

    // Add 4 empty rows (rows 1-4)
    for (let i = 0; i < 4; i++) {
      worksheet1.addRow(['', '', '', '', '', '', '', '', '', ''])
    }

    // Add header row (row 5)
    const headerRow1 = worksheet1.addRow([
      '',
      'BILLING PERIOD',
      'SERIES NO.',
      'FROM',
      'TO',
      'PLATE',
      'TRUCK TYPE',
      'NET WT',
      'RATE/KG',
      'TOTAL AMOUNT'
    ])

    // Apply header style only to columns B-J (skip column A)
    for (let col = 2; col <= 10; col++) {
      const cell = headerRow1.getCell(col)
      cell.style = headerStyle
    }

    // Initialize summary variables
    let completedDeployments = []

    // Filter completed deployments and prepare data
    allDeployments.forEach((deployment, index) => {
      if (deployment.status === 'completed') {
        completedDeployments.push(deployment)
      }
    })

    // Starting row for data (row 6 - directly after header)
    let dataStartRow = 6

    // Add deployment rows (starting from row 6)
    completedDeployments.forEach((deployment, index) => {
      const hasReplacement = deployment?.replacement?.replacementTruckId?._id
      const replacement = deployment?.replacement

      // Get current plate no
      const currentPlateNo = hasReplacement
        ? replacement.replacementTruckId?.plateNo || ''
        : deployment.truckId?.plateNo || ''

      // Get current truck type
      const currentTruckType = hasReplacement
        ? replacement.replacementTruckType
        : deployment.truckType

      // Get weight (loadWeightKg)
      const netWeight = deployment.loadWeightKg || 0

      const rowNum = worksheet1.rowCount + 1
      const row = worksheet1.addRow([
        '',
        '', // Billing Period (empty in new template)
        '', // Series No.
        deployment.pickupSite || '', // From
        deployment.destination || '', // To
        currentPlateNo.toUpperCase(), // Plate
        formatTruckType(currentTruckType), // Truck Type
        netWeight, // NET WT
        ratePerKg, // RATE/KG
        { formula: `H${rowNum}*I${rowNum}` } // TOTAL AMOUNT formula
      ])

      // Apply border style only to columns B-J (skip column A)
      for (let col = 2; col <= 10; col++) {
        const cell = row.getCell(col)
        cell.style = borderedStyle
        if (col >= 8 && col <= 10) {
          // Columns H, I, J (NET WT, RATE/KG, TOTAL AMOUNT)
          cell.alignment = { horizontal: 'center', vertical: 'center' }
        }
      }
    })

    // If no completed deployments, add at least one empty row with borders
    if (completedDeployments.length === 0) {
      const emptyRowNum = worksheet1.rowCount + 1
      const emptyRow = worksheet1.addRow([
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ratePerKg,
        { formula: `H${emptyRowNum}*I${emptyRowNum}` }
      ])
      // Apply border only to columns B-J
      for (let col = 2; col <= 10; col++) {
        const cell = emptyRow.getCell(col)
        cell.style = borderedStyle
        if (col >= 8 && col <= 10) {
          cell.alignment = { horizontal: 'center', vertical: 'center' }
        }
      }
    }

    // Row number for NET WT total
    const netWtTotalRowNum = worksheet1.rowCount + 1
    const lastDataRow =
      completedDeployments.length > 0 ? worksheet1.rowCount : 6

    // Add summary row for NET WT total
    const netWtTotalRow = worksheet1.addRow([
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      { formula: `SUM(H${dataStartRow}:H${lastDataRow})` }, // SUM of NET WT column
      '',
      ''
    ])

    // Apply border only to columns H for the total row
    const netWtCell = netWtTotalRow.getCell(8) // Column H
    netWtCell.style = borderedStyle
    netWtCell.alignment = { horizontal: 'center', vertical: 'center' }

    // Add 2 empty rows (no borders)
    worksheet1.addRow(['', '', '', '', '', '', '', '', '', ''])
    worksheet1.addRow(['', '', '', '', '', '', '', '', '', ''])

    // Calculate the last row for TOTAL AMOUNT sum (excluding the last 3 rows)
    const lastAmountRow = worksheet1.rowCount - 3

    // Add TOTAL: row (only columns I and J should have borders)
    const totalRow1 = worksheet1.addRow([
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'TOTAL:',
      { formula: `SUM(J${dataStartRow}:J${lastAmountRow})` } // SUM of TOTAL AMOUNT column
    ])

    // Apply border only to columns I and J
    const totalLabelCell = totalRow1.getCell(9) // Column I
    const totalValueCell = totalRow1.getCell(10) // Column J

    totalLabelCell.style = borderedStyle
    totalLabelCell.alignment = { horizontal: 'center', vertical: 'center' }

    totalValueCell.style = borderedStyle
    totalValueCell.alignment = { horizontal: 'center', vertical: 'center' }

    // ======================= SHEET 2: Demurrage Fee =======================
    const worksheet2 = workbook.addWorksheet('2')

    // Set column widths
    worksheet2.columns = [
      { width: 5 }, // A
      { width: 12 }, // B
      { width: 20 }, // C
      { width: 20 }, // D
      { width: 15 }, // E
      { width: 12 }, // F
      { width: 25 }, // G
      { width: 25 }, // H
      { width: 12 }, // I
      { width: 15 }, // J
      { width: 10 }, // K
      { width: 15 } // L
    ]

    // Add 2 empty rows (rows 1-2)
    for (let i = 0; i < 2; i++) {
      worksheet2.addRow(['', '', '', '', '', '', '', '', '', '', '', ''])
    }

    // Add DEMURRAGE FEE title (row 3)
    worksheet2.mergeCells(`B3:L3`)
    const demurrageCell = worksheet2.getCell('B3')
    demurrageCell.value = 'DEMURRAGE FEE'
    demurrageCell.style = {
      ...headerStyle,
      alignment: { horizontal: 'center', vertical: 'center' }
    }

    // Add BILLING PERIOD title (row 4)
    worksheet2.mergeCells(`B4:L4`)
    const periodCell = worksheet2.getCell('B4')
    periodCell.value = 'BILLING PERIOD'
    periodCell.style = {
      ...headerStyle,
      alignment: { horizontal: 'center', vertical: 'center' }
    }

    // Add header row (row 5)
    const headerRow2 = worksheet2.addRow([
      '',
      'DP CODE',
      'DEST ARRIVAL',
      'DEST DEPARTURE',
      'UNLOADING TIME',
      'SERIES NO.',
      'FROM',
      'TO',
      'PLATE NO',
      'TRUCK TYPE',
      'RATE',
      'TOTAL AMOUNT'
    ])

    // Apply header style only to columns B-L (skip column A)
    for (let col = 2; col <= 12; col++) {
      const cell = headerRow2.getCell(col)
      cell.style = headerStyle
    }

    // Starting row for demurrage data (row 6 - directly after header)
    const demurrageDataStartRow = 6

    // Add demurrage rows starting from row 6
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

      const rowNum = worksheet2.rowCount + 1
      const row = worksheet2.addRow([
        '',
        deployment.deploymentCode || '',
        deployment.destArrival
          ? DateTime.fromISO(deployment.destArrival)
              .setZone('Asia/Manila')
              .toFormat('yyyy-MM-dd HH:mm:ss')
          : '',
        deployment.destDeparture
          ? DateTime.fromISO(deployment.destDeparture)
              .setZone('Asia/Manila')
              .toFormat('yyyy-MM-dd HH:mm:ss')
          : '',
        unloadingTime,
        '', // Series No.
        deployment.pickupSite || '',
        deployment.destination || '',
        currentPlateNo.toUpperCase(),
        formatTruckType(currentTruckType),
        ratePerKg,
        '' // Empty TOTAL AMOUNT
      ])

      // Apply border style only to columns B-L (skip column A)
      for (let col = 2; col <= 12; col++) {
        const cell = row.getCell(col)
        cell.style = borderedStyle
        cell.alignment = { horizontal: 'center', vertical: 'center' }
      }
    })

    // If no completed deployments, add an empty row with borders
    if (completedDeployments.length === 0) {
      const emptyRow = worksheet2.addRow([
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ''
      ])
      for (let col = 2; col <= 12; col++) {
        const cell = emptyRow.getCell(col)
        cell.style = borderedStyle
        cell.alignment = { horizontal: 'center', vertical: 'center' }
      }
    }

    // Add GRAND TOTAL row (only columns K and L should have borders)
    const lastDemurrageRow =
      completedDeployments.length > 0 ? worksheet2.rowCount : 6
    const grandTotalRow2 = worksheet2.addRow([
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'GRAND TOTAL',
      { formula: `SUM(L${demurrageDataStartRow}:L${lastDemurrageRow})` }
    ])

    // Apply style only to columns K and L
    const grandTotalLabelCell = grandTotalRow2.getCell(11) // Column K
    const grandTotalValueCell = grandTotalRow2.getCell(12) // Column L

    grandTotalLabelCell.style = borderedStyle
    grandTotalLabelCell.alignment = { horizontal: 'center', vertical: 'center' }
    grandTotalLabelCell.font = { bold: true }

    grandTotalValueCell.style = borderedStyle
    grandTotalValueCell.alignment = { horizontal: 'center', vertical: 'center' }
    grandTotalValueCell.font = { bold: true }

    // ======================= SHEET 3: BILLING Summary =======================
    const worksheet3 = workbook.addWorksheet('BILLING')

    // Set column widths
    worksheet3.columns = [
      { width: 20 }, // A
      { width: 20 }, // B
      { width: 20 }, // C
      { width: 15 }, // D
      { width: 20 }, // E
      { width: 15 }, // F
      { width: 15 }, // G
      { width: 20 } // H
    ]

    // Add 3 empty rows (rows 1-3)
    for (let i = 0; i < 3; i++) {
      worksheet3.addRow(['', '', '', '', '', '', '', ''])
    }

    // Add STATEMENT OF ACCOUNT title (row 4)
    worksheet3.mergeCells(`A4:H4`)
    const statementCell = worksheet3.getCell('A4')
    statementCell.value = 'STATEMENT OF ACCOUNT'
    statementCell.style = {
      ...headerStyle,
      font: { ...headerStyle.font, size: 14 },
      alignment: { horizontal: 'center', vertical: 'center' }
    }

    // Add empty row (row 5)
    worksheet3.addRow(['', '', '', '', '', '', '', ''])

    // Add BILLED TO: row (row 6)
    const billedRow = worksheet3.addRow([
      'BILLED TO:',
      '',
      companyName,
      '',
      '',
      '',
      'DATE:',
      billingDate
    ])

    // Apply borders only to specific cells
    const billedToCell = billedRow.getCell(1) // A6
    billedToCell.font = { bold: true }

    const companyCell = billedRow.getCell(3) // C6
    companyCell.style = borderedStyle
    companyCell.alignment = { horizontal: 'center', vertical: 'center' }

    const dateLabelCell = billedRow.getCell(7) // G6
    dateLabelCell.font = { bold: true }

    const dateCell = billedRow.getCell(8) // H6
    dateCell.style = borderedStyle
    dateCell.alignment = { horizontal: 'center', vertical: 'center' }

    // Add SOA NUMBER row (row 7)
    const soaRow = worksheet3.addRow([
      '',
      '',
      '',
      '',
      '',
      '',
      'SOA NUMBER:',
      'YZA25_001'
    ])

    const soaLabelCell = soaRow.getCell(7) // G7
    soaLabelCell.font = { bold: true }

    const soaValueCell = soaRow.getCell(8) // H7
    soaValueCell.style = borderedStyle
    soaValueCell.alignment = { horizontal: 'center', vertical: 'center' }

    // Add P.O. NUMBER row (row 8)
    const poRow = worksheet3.addRow([
      '',
      '',
      '',
      '',
      '',
      '',
      'P.O. NUMBER:',
      ''
    ])

    const poLabelCell = poRow.getCell(7) // G8
    poLabelCell.font = { bold: true }

    const poValueCell = poRow.getCell(8) // H8
    poValueCell.style = borderedStyle
    poValueCell.alignment = { horizontal: 'center', vertical: 'center' }

    // Add 3 empty rows (rows 9-11)
    for (let i = 0; i < 3; i++) {
      worksheet3.addRow(['', '', '', '', '', '', '', ''])
    }

    // Row numbers for calculations
    const page1RowNum = 12 // Row 12
    const page2RowNum = 13 // Row 13

    // Add PAGE 01 row (row 12)
    const page1Row = worksheet3.getRow(page1RowNum)
    page1Row.values = [
      '',
      '',
      '',
      'PAGE 01:',
      'REGULAR TRIPS',
      { formula: `='1'!J${worksheet1.rowCount}` }, // Reference to Sheet1 TOTAL cell
      '',
      ''
    ]

    // Apply borders only to columns D, E, F
    for (let col = 4; col <= 6; col++) {
      const cell = page1Row.getCell(col)
      cell.style = borderedStyle
      cell.alignment = { horizontal: 'center', vertical: 'center' }
    }

    // Add PAGE 02 row (row 13)
    const page2Row = worksheet3.getRow(page2RowNum)
    page2Row.values = [
      '',
      '',
      '',
      'PAGE 02:',
      'DEMURRAGE',
      { formula: `='2'!L${worksheet2.rowCount}` }, // Reference to Sheet2 GRAND TOTAL cell
      '',
      ''
    ]

    // Apply borders only to columns D, E, F
    for (let col = 4; col <= 6; col++) {
      const cell = page2Row.getCell(col)
      cell.style = borderedStyle
      cell.alignment = { horizontal: 'center', vertical: 'center' }
    }

    // Add 8 empty rows (rows 14-21)
    for (let i = 0; i < 8; i++) {
      worksheet3.addRow(['', '', '', '', '', '', '', ''])
    }

    // Row numbers for calculations
    const totalPhpRowNum = 22 // Row 22
    const vatRowNum = 23 // Row 23
    const grandTotalRowNum = 24 // Row 24

    // Add TOTAL (Php) row (row 22)
    const totalPhpRow = worksheet3.getRow(totalPhpRowNum)
    totalPhpRow.values = [
      '',
      '',
      '',
      '',
      '',
      'TOTAL (Php)',
      { formula: `SUM(F${page1RowNum}:F${page2RowNum})` },
      ''
    ]

    // Apply borders only to columns F and G
    const totalPhpLabelCell = totalPhpRow.getCell(6) // F22
    const totalPhpValueCell = totalPhpRow.getCell(7) // G22

    totalPhpLabelCell.style = borderedStyle
    totalPhpLabelCell.alignment = { horizontal: 'center', vertical: 'center' }
    totalPhpLabelCell.font = { bold: true }

    totalPhpValueCell.style = borderedStyle
    totalPhpValueCell.alignment = { horizontal: 'center', vertical: 'center' }

    // Add ADD 12% VAT row (row 23)
    const vatRow = worksheet3.getRow(vatRowNum)
    vatRow.values = [
      '',
      '',
      '',
      '',
      '',
      'ADD 12% VAT',
      { formula: `(F${totalPhpRowNum}*12%)` },
      ''
    ]

    // Apply borders only to columns F and G
    const vatLabelCell = vatRow.getCell(6) // F23
    const vatValueCell = vatRow.getCell(7) // G23

    vatLabelCell.style = borderedStyle
    vatLabelCell.alignment = { horizontal: 'center', vertical: 'center' }
    vatLabelCell.font = { bold: true }

    vatValueCell.style = borderedStyle
    vatValueCell.alignment = { horizontal: 'center', vertical: 'center' }

    // Add GRAND TOTAL row (row 24)
    const grandTotalRow3 = worksheet3.getRow(grandTotalRowNum)
    grandTotalRow3.values = [
      '',
      '',
      '',
      '',
      '',
      'GRAND TOTAL',
      { formula: `SUM(F${totalPhpRowNum}:F${vatRowNum})` },
      ''
    ]

    // Apply borders only to columns F and G
    const grandTotalLabel3Cell = grandTotalRow3.getCell(6) // F24
    const grandTotalValue3Cell = grandTotalRow3.getCell(7) // G24

    grandTotalLabel3Cell.style = borderedStyle
    grandTotalLabel3Cell.alignment = {
      horizontal: 'center',
      vertical: 'center'
    }
    grandTotalLabel3Cell.font = { bold: true }

    grandTotalValue3Cell.style = borderedStyle
    grandTotalValue3Cell.alignment = {
      horizontal: 'center',
      vertical: 'center'
    }

    // Add 5 empty rows (rows 25-29)
    for (let i = 0; i < 5; i++) {
      worksheet3.addRow(['', '', '', '', '', '', '', ''])
    }

    // Add PREPARED BY row (row 30)
    const preparedRow = worksheet3.getRow(30)
    preparedRow.values = [
      'PREPARED BY:',
      '',
      '',
      '',
      '',
      'CHECKED/APPROVED BY:',
      '',
      ''
    ]

    // Style labels only (no borders)
    const preparedLabelCell = preparedRow.getCell(1) // A30
    const checkedLabelCell = preparedRow.getCell(6) // F30

    preparedLabelCell.font = { bold: true }
    checkedLabelCell.font = { bold: true }

    // Add name row (row 31)
    const nameRow = worksheet3.getRow(31)
    nameRow.values = ['', 'JOHN ROBERT M. OCUMEN', '', '', '', '', '', '']

    // Add title row (row 32)
    const propRow = worksheet3.getRow(32)
    propRow.values = [
      '',
      'PROPRIETOR',
      '',
      '',
      '',
      '_____________________________________',
      '',
      ''
    ]

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
    link.download = `BILLING_KTS_${timestamp}.xlsx`
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
                className='w-60 focus:outline-none ml-3 mr-1'
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
