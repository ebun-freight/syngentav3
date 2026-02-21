import { DateTime } from 'luxon'
import ExcelJS from 'exceljs'
import { TRUCK_TYPES } from './generalOptions'

export const exportDeploymentToExcel = async allDeployments => {
  if (!allDeployments || allDeployments.length === 0) {
    alert('No data to export')
    return
  }

  // ─── helpers ────────────────────────────────────────────────────────────────

  const capitalizeWords = str => {
    if (!str) return ''
    return str
      .toLowerCase()
      .split(' ')
      .map(word => {
        if (word.includes('(')) {
          return word
            .replace(/(\()(\w)/g, (match, p1, p2) => p1 + p2.toUpperCase())
            .replace(/^\w/, c => c.toUpperCase())
        }
        return word.charAt(0).toUpperCase() + word.slice(1)
      })
      .join(' ')
  }

  const formatTruckType = type => {
    if (!type) return ''
    const lowerType = type.toLowerCase().trim()
    return TRUCK_TYPES[lowerType] || capitalizeWords(type.replace(/-/g, ' '))
  }

  const formatReplacementReason = reason => {
    if (!reason) return ''
    return reason
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const formatDateTime = dateStr => {
    if (!dateStr || dateStr === 'Pending') return ''
    try {
      const date = DateTime.fromISO(dateStr).setZone('Asia/Manila')
      const hour = date.hour
      const minute = date.minute.toString().padStart(2, '0')
      const period = hour >= 12 ? 'PM' : 'AM'
      const hour12 = hour % 12 || 12
      return `${date.toFormat('MMM')} ${date.day}, ${
        date.year
      } ${hour12}:${minute} ${period}`
    } catch {
      return ''
    }
  }

  const calculateUnloadingTime = (destArrival, destDeparture) => {
    if (!destArrival || !destDeparture) return ''
    try {
      const arrival = DateTime.fromISO(destArrival)
      const departure = DateTime.fromISO(destDeparture)
      const { hours, minutes } = departure.diff(arrival, ['hours', 'minutes'])
      if (hours === 0) return `${Math.floor(minutes)}m`
      if (minutes < 1) return `${hours}h`
      return `${hours}h ${Math.floor(minutes)}m`
    } catch {
      return 'Error'
    }
  }

  // ─── workbook setup ──────────────────────────────────────────────────────────

  const workbook = new ExcelJS.Workbook()

  const colors = {
    border: 'FFD1D5DB',
    headerBg: 'FFF0F0F0',
    text: 'FF000000'
  }

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

  // Column layout:
  // Shared (merged per deployment): DP Code, Plate, Truck Type, Driver,
  //   Destination, Status, Departed, Dest. Arrival, Dest. Departure,
  //   Unloading Time, Territory, Hybrid, Flagging, Flagging Remarks,
  //   Orig Plate, Orig Truck Type, Orig Driver, Replaced At,
  //   Replacement Reason, Replacement Remarks
  // Per-pickup (one row each): TMO No., Pickup Site, Municipality,
  //   Pick-up In, Pick-up Out

  worksheet.columns = [
    { width: 12 }, //  1 - DP Code         (shared)
    { width: 12 }, //  2 - Plate No         (shared)
    { width: 12 }, //  3 - Truck Type       (shared)
    { width: 20 }, //  4 - Driver           (shared)
    { width: 14 }, //  5 - TMO No.          (per pickup)
    { width: 22 }, //  6 - Pickup Site      (per pickup)
    { width: 18 }, //  7 - Municipality     (per pickup)
    { width: 25 }, //  8 - Destination      (shared)
    { width: 10 }, //  9 - Status           (shared)
    { width: 18 }, // 10 - Departed         (shared)
    { width: 18 }, // 11 - Pick-up In       (per pickup)
    { width: 18 }, // 12 - Pick-up Out      (per pickup)
    { width: 18 }, // 13 - Dest. Arrival    (shared)
    { width: 18 }, // 14 - Dest. Departure  (shared)
    { width: 12 }, // 15 - Unloading Time   (shared)
    { width: 15 }, // 16 - Territory        (shared)
    { width: 15 }, // 17 - Hybrid           (shared)
    { width: 12 }, // 18 - Flagging         (shared)
    { width: 20 }, // 19 - Flagging Remarks (shared)
    { width: 12 }, // 20 - Orig Plate No    (shared)
    { width: 12 }, // 21 - Orig Truck Type  (shared)
    { width: 20 }, // 22 - Orig Driver      (shared)
    { width: 18 }, // 23 - Replaced At      (shared)
    { width: 18 }, // 24 - Replacement Reason (shared)
    { width: 25 } // 25 - Replacement Remarks (shared)
  ]

  // Header row
  const headerRow = worksheet.addRow([
    'DP Code',
    'Plate No',
    'Truck Type',
    'Driver',
    'TMO No.',
    'Pickup Site',
    'Municipality',
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
  for (let col = 1; col <= 25; col++) {
    headerRow.getCell(col).style = styles.header
  }

  // ─── data rows ───────────────────────────────────────────────────────────────

  allDeployments.forEach(deployment => {
    const hasReplacement = deployment?.replacement?.replacementTruckId?._id
    const replacement = deployment?.replacement

    // Current truck / driver
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

    // Original truck / driver (only populated when replaced)
    const origPlateNo = hasReplacement ? deployment.truckId?.plateNo || '' : ''
    const origTruckType = hasReplacement ? deployment.truckType || '' : ''
    const origDriverName =
      hasReplacement && deployment.driverId
        ? `${capitalizeWords(deployment.driverId.firstname)} ${capitalizeWords(
            deployment.driverId.lastname
          )}`
        : ''

    const replacementDate = hasReplacement
      ? formatDateTime(replacement.replacedAt)
      : ''
    const replacementReason = hasReplacement
      ? formatReplacementReason(replacement.reason || '')
      : ''
    const replacementRemarks = hasReplacement ? replacement.remarks || '' : ''

    const isCanceled = deployment.status === 'canceled'
    const status = isCanceled
      ? 'Canceled'
      : deployment.status === 'ongoing'
      ? 'Ongoing'
      : capitalizeWords(deployment.status || '')

    // Shared column values (written only on the first pickup row, merged for the rest)
    const sharedValues = {
      dpCode: deployment.deploymentCode || '',
      plateNo: currentPlateNo.toUpperCase(),
      truckType: formatTruckType(currentTruckType),
      driver: currentDriverName,
      destination: capitalizeWords(deployment.destination),
      status,
      departed: isCanceled ? '' : formatDateTime(deployment.departed),
      destArrival: isCanceled ? '' : formatDateTime(deployment.destArrival),
      destDeparture: isCanceled ? '' : formatDateTime(deployment.destDeparture),
      unloadingTime: isCanceled
        ? ''
        : calculateUnloadingTime(
            deployment.destArrival,
            deployment.destDeparture
          ),
      territory: deployment.territory || '',
      hybrid: deployment.hybrid || '',
      flagging: deployment.flagging || '',
      flaggingRemarks: deployment.flaggingRemarks || '',
      origPlateNo: origPlateNo.toUpperCase(),
      origTruckType: formatTruckType(origTruckType),
      origDriver: origDriverName,
      replacementDate,
      replacementReason,
      replacementRemarks
    }

    const pickups = deployment.pickups?.length ? deployment.pickups : [{}]
    const startRow = worksheet.rowCount + 1

    pickups.forEach((pickup, idx) => {
      const isFirst = idx === 0
      const row = worksheet.addRow([
        isFirst ? sharedValues.dpCode : '', //  1
        isFirst ? sharedValues.plateNo : '', //  2
        isFirst ? sharedValues.truckType : '', //  3
        isFirst ? sharedValues.driver : '', //  4
        pickup.tmoNo || '', //  5 per pickup
        capitalizeWords(pickup.pickupSite || ''), //  6 per pickup
        capitalizeWords(pickup.municipality || ''), //  7 per pickup
        isFirst ? sharedValues.destination : '', //  8
        isFirst ? sharedValues.status : '', //  9
        isFirst ? sharedValues.departed : '', // 10
        isCanceled ? '' : formatDateTime(pickup.pickupIn || ''), // 11 per pickup
        isCanceled ? '' : formatDateTime(pickup.pickupOut || ''), // 12 per pickup
        isFirst ? sharedValues.destArrival : '', // 13
        isFirst ? sharedValues.destDeparture : '', // 14
        isFirst ? sharedValues.unloadingTime : '', // 15
        isFirst ? sharedValues.territory : '', // 16
        isFirst ? sharedValues.hybrid : '', // 17
        isFirst ? sharedValues.flagging : '', // 18
        isFirst ? sharedValues.flaggingRemarks : '', // 19
        isFirst ? sharedValues.origPlateNo : '', // 20
        isFirst ? sharedValues.origTruckType : '', // 21
        isFirst ? sharedValues.origDriver : '', // 22
        isFirst ? sharedValues.replacementDate : '', // 23
        isFirst ? sharedValues.replacementReason : '', // 24
        isFirst ? sharedValues.replacementRemarks : '' // 25
      ])

      row.height = 20

      row.getCell(1).style = styles.data // DP Code
      row.getCell(2).style = styles.data // Plate No
      row.getCell(3).style = styles.data // Truck Type
      row.getCell(4).style = styles.data // Driver
      row.getCell(5).style = styles.data // TMO No.
      row.getCell(6).style = styles.data // Pickup Site
      row.getCell(7).style = styles.data // Municipality
      row.getCell(8).style = styles.data // Destination
      row.getCell(9).style = styles.data // Status
      row.getCell(10).style = styles.data // Departed
      row.getCell(11).style = styles.data // Pick-up In
      row.getCell(12).style = styles.data // Pick-up Out
      row.getCell(13).style = styles.data // Dest. Arrival
      row.getCell(14).style = styles.data // Dest. Departure
      row.getCell(15).style = styles.data // Unloading Time
      row.getCell(16).style = styles.data // Territory
      row.getCell(17).style = styles.data // Hybrid
      row.getCell(18).style = styles.data // Flagging
      row.getCell(19).style = styles.data // Flagging Remarks
      row.getCell(20).style = styles.data // Orig Plate No
      row.getCell(21).style = styles.data // Orig Truck Type
      row.getCell(22).style = styles.data // Orig Driver
      row.getCell(23).style = styles.data // Replaced At
      row.getCell(24).style = styles.data // Replacement Reason
      row.getCell(25).style = styles.data // Replacement Remarks
    })

    // Merge shared columns vertically when there are multiple pickup stops
    if (pickups.length > 1) {
      const endRow = startRow + pickups.length - 1

      // Columns that are shared (all except 5=TMO No., 6=Site, 7=Municipality, 11=Pickup In, 12=Pickup Out)
      const sharedCols = [
        1, 2, 3, 4, 8, 9, 10, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25
      ]
      sharedCols.forEach(col => {
        worksheet.mergeCells(startRow, col, endRow, col)
      })

      // Re-apply styles on the merged top cells so borders + alignment stay correct
      const topRow = worksheet.getRow(startRow)
      topRow.getCell(1).style = {
        ...styles.data,
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
      topRow.getCell(2).style = {
        ...styles.data,
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
      topRow.getCell(3).style = {
        ...styles.data,
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
      topRow.getCell(4).style = {
        ...styles.data,
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
      topRow.getCell(8).style = {
        ...styles.data,
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
      topRow.getCell(9).style = {
        ...styles.data,
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
      topRow.getCell(10).style = {
        ...styles.data,
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
      topRow.getCell(13).style = {
        ...styles.data,
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
      topRow.getCell(14).style = {
        ...styles.data,
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
      topRow.getCell(15).style = {
        ...styles.data,
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
      topRow.getCell(16).style = {
        ...styles.data,
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
      topRow.getCell(17).style = {
        ...styles.data,
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
      topRow.getCell(18).style = {
        ...styles.data,
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
      topRow.getCell(19).style = {
        ...styles.data,
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
      topRow.getCell(20).style = {
        ...styles.data,
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
      topRow.getCell(21).style = {
        ...styles.data,
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
      topRow.getCell(22).style = {
        ...styles.data,
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
      topRow.getCell(23).style = {
        ...styles.data,
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
      topRow.getCell(24).style = {
        ...styles.data,
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
      topRow.getCell(25).style = {
        ...styles.data,
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
    }
  })

  // ─── export ──────────────────────────────────────────────────────────────────

  const timestamp = DateTime.now().toFormat('yyyy-MM-dd_HHmmss')
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
