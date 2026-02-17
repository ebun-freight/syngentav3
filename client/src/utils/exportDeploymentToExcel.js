import { DateTime } from 'luxon'
import ExcelJS from 'exceljs'
import { TRUCK_TYPES } from './generalOptions'

export const exportDeploymentToExcel = async allDeployments => {
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
      .map(word => {
        // Handle words with parentheses - capitalize after opening parenthesis
        if (word.includes('(')) {
          return word
            .replace(/(\()(\w)/g, (match, p1, p2) => p1 + p2.toUpperCase())
            .replace(/^\w/, c => c.toUpperCase())
        }
        return word.charAt(0).toUpperCase() + word.slice(1)
      })
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
      const month = date.toFormat('MMM')
      const day = date.day
      const year = date.year
      const hour = date.hour
      const minute = date.minute.toString().padStart(2, '0')
      const period = hour >= 12 ? 'PM' : 'AM'
      const hour12 = hour % 12 || 12
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
      const month = date.toFormat('MMM')
      const day = date.day
      const year = date.year
      const hour = date.hour
      const minute = date.minute.toString().padStart(2, '0')
      const period = hour >= 12 ? 'PM' : 'AM'
      const hour12 = hour % 12 || 12
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

  // Create a new workbook
  const workbook = new ExcelJS.Workbook()

  // Define colors
  const colors = {
    border: 'FFD1D5DB', // Gray-300
    headerBg: 'FFF0F0F0', // Light gray
    text: 'FF000000' // Black
  }

  // Define styles
  const styles = {
    header: {
      font: { bold: true, size: 11, color: { argb: colors.text } },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: colors.headerBg }
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
    }
  }

  // Create worksheet
  const worksheet = workbook.addWorksheet('Deployments', {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    }
  })

  // Set column widths
  worksheet.columns = [
    { width: 12 }, // Code
    { width: 12 }, // Plate No
    { width: 12 }, // Truck Type
    { width: 20 }, // Driver
    { width: 25 }, // Destination
    { width: 10 }, // Status
    { width: 18 }, // Departed
    { width: 18 }, // Pick-up In
    { width: 18 }, // Pick-up Out
    { width: 18 }, // Dest. Arrival
    { width: 18 }, // Dest. Departure
    { width: 12 }, // Unloading Time
    { width: 15 }, // Territory
    { width: 15 }, // Hybrid
    { width: 12 }, // Flagging
    { width: 20 }, // Flagging Remarks
    { width: 12 }, // Orig Plate No
    { width: 12 }, // Orig Truck Type
    { width: 20 }, // Orig Driver
    { width: 18 }, // Replaced At
    { width: 18 }, // Replacement Reason
    { width: 25 } // Replacement Remarks
  ]

  // Add header row
  const headerRow = worksheet.addRow([
    'DP Code',
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
    'Territory',
    'Hybrid',
    'Flagging',
    'Flagging Remarks',
    'Orig Plate No',
    'Orig Truck Type',
    'Orig Driver',
    'Replaced At',
    'Replacement Reason',
    'Replacement Remarks'
  ])

  headerRow.height = 25

  // Apply header style to all columns
  for (let col = 1; col <= 22; col++) {
    headerRow.getCell(col).style = styles.header
  }

  // Add data rows
  allDeployments.forEach(deployment => {
    // Determine if there's a replacement
    const hasReplacement = deployment?.replacement?.replacementTruckId?._id
    const replacement = deployment?.replacement

    // CURRENT details
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

    // ORIGINAL details
    const origPlateNo = hasReplacement ? deployment.truckId?.plateNo || '' : ''
    const origTruckType = hasReplacement ? deployment.truckType || '' : ''
    const origDriverName =
      hasReplacement && deployment.driverId
        ? `${capitalizeWords(deployment.driverId.firstname)} ${capitalizeWords(
            deployment.driverId.lastname
          )}`
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
    const destination = capitalizeWords(deployment.destination)

    // Handle canceled status - leave timeline fields blank
    const isCanceled = deployment.status === 'canceled'

    const row = worksheet.addRow([
      deployment.deploymentCode || '',
      currentPlateNo.toUpperCase(),
      formatTruckType(currentTruckType),
      currentDriverName,
      destination,
      isCanceled ? 'Canceled' : status,
      isCanceled ? '' : formatTimelineDateTime(deployment.departed),
      isCanceled ? '' : formatTimelineDateTime(deployment.pickupIn),
      isCanceled ? '' : formatTimelineDateTime(deployment.pickupOut),
      isCanceled ? '' : formatTimelineDateTime(deployment.destArrival),
      isCanceled ? '' : formatTimelineDateTime(deployment.destDeparture),
      isCanceled
        ? ''
        : calculateUnloadingTime(
            deployment.destArrival,
            deployment.destDeparture
          ),
      deployment.territory || '',
      deployment.hybrid || '',
      deployment.flagging || '',
      deployment.flaggingRemarks || '',
      origPlateNo.toUpperCase(),
      formatTruckType(origTruckType),
      origDriverName,
      replacementDate,
      replacementReason,
      replacementRemarks
    ])

    row.height = 20

    // Apply styles to all cells
    row.getCell(1).style = styles.data // Code
    row.getCell(2).style = styles.data // Plate No
    row.getCell(3).style = styles.data // Truck Type
    row.getCell(4).style = styles.dataLeft // Driver
    row.getCell(5).style = styles.dataLeft // Destination
    row.getCell(6).style = styles.data // Status
    row.getCell(7).style = styles.data // Departed
    row.getCell(8).style = styles.data // Pick-up In
    row.getCell(9).style = styles.data // Pick-up Out
    row.getCell(10).style = styles.data // Dest. Arrival
    row.getCell(11).style = styles.data // Dest. Departure
    row.getCell(12).style = styles.data // Unloading Time
    row.getCell(13).style = styles.data // Territory
    row.getCell(14).style = styles.data // Hybrid
    row.getCell(15).style = styles.data // Flagging
    row.getCell(16).style = styles.dataLeft // Flagging Remarks
    row.getCell(17).style = styles.data // Orig Plate No
    row.getCell(18).style = styles.data // Orig Truck Type
    row.getCell(19).style = styles.dataLeft // Orig Driver
    row.getCell(20).style = styles.data // Replaced At
    row.getCell(21).style = styles.dataLeft // Replacement Reason
    row.getCell(22).style = styles.dataLeft // Replacement Remarks
  })

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
  link.download = `Deployments_Export_${timestamp}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
