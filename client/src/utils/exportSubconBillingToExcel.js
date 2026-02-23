import { DateTime } from 'luxon'
import ExcelJS from 'exceljs'

export const exportSubconBillingToExcel = async (allDeployments, userData) => {
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
    const typeMappings = {
      elf: 'Elf',
      'single-tire': 'Single-Tire',
      forward: 'Forward',
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

  const getMinimumLoad = truckType => {
    if (!truckType) return 0
    const minimumLoads = { elf: 5000, forward: 9000 }
    return minimumLoads[truckType.toLowerCase().trim()] || 0
  }

  const isUnderloaded = (truckType, actualWeight) => {
    const minLoad = getMinimumLoad(truckType)
    return minLoad > 0 && actualWeight < minLoad
  }

  const getDemurrageRate = truckType => {
    if (!truckType) return 0
    const demurrageRates = { elf: 3500, forward: 5000 }
    return demurrageRates[truckType.toLowerCase().trim()] || 0
  }

  const calculateDemurrageCharges = (truckType, unloadingMinutes) => {
    if (!unloadingMinutes || unloadingMinutes < 11 * 60 + 30) return 0
    const rate = getDemurrageRate(truckType)
    if (rate === 0) return 0
    const chargeableMinutes = unloadingMinutes - (11 * 60 + 30)
    const blocks = Math.ceil(chargeableMinutes / (12 * 60)) + 1
    return blocks * rate
  }

  // Returns the rate per kg based on truck type:
  //   elf     → 0.80
  //   forward → 0.75
  //   others  → 0.80 (fallback)
  const getRatePerKg = truckType => {
    const rates = { elf: 0.8, forward: 0.75 }
    return rates[truckType?.toLowerCase().trim()] ?? 0.8
  }

  // ─── meta ────────────────────────────────────────────────────────────────────

  const billingDate = DateTime.now()
    .setZone('Asia/Manila')
    .toFormat('MMMM dd, yyyy')

  const firstDeployment = allDeployments[0]
  const companyName = (
    firstDeployment?.truckId?.subcon || 'NO SUBCON COMPANY INDICATED'
  )
    .replace(/_/g, ' ')
    .toUpperCase()

  // ─── workbook setup ──────────────────────────────────────────────────────────

  const workbook = new ExcelJS.Workbook()

  const colors = {
    primary: 'FF001E36',
    secondary: 'FF003057',
    accent: 'FFE3F2FD',
    header: 'FFF5F9FC',
    border: 'FFD1D5DB',
    text: 'FF000000',
    textLight: 'FF6B7280',
    warning: 'FFFEF3C7'
  }

  const styles = {
    title: {
      font: { bold: true, size: 16, color: { argb: 'FF000000' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: colors.accent }
      }
    },
    subtitle: {
      font: { bold: true, size: 12, color: { argb: 'FF000000' } },
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
      font: { bold: true, size: 11, color: { argb: 'FF000000' } },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F0F0' }
      },
      border: {
        top: { style: 'thin', color: { argb: colors.border } },
        left: { style: 'thin', color: { argb: colors.border } },
        bottom: { style: 'thin', color: { argb: colors.border } },
        right: { style: 'thin', color: { argb: colors.border } }
      }
    },
    data: {
      font: { size: 10, color: { argb: 'FF000000' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin', color: { argb: colors.border } },
        left: { style: 'thin', color: { argb: colors.border } },
        bottom: { style: 'thin', color: { argb: colors.border } },
        right: { style: 'thin', color: { argb: colors.border } }
      }
    },
    dataLeft: {
      font: { size: 10, color: { argb: 'FF000000' } },
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
      font: { bold: true, size: 10, color: { argb: 'FF000000' } },
      alignment: { horizontal: 'right', vertical: 'middle' }
    },
    value: {
      font: { size: 10, color: { argb: 'FF000000' } },
      alignment: { horizontal: 'left', vertical: 'middle' },
      border: { bottom: { style: 'thin', color: { argb: colors.border } } }
    }
  }

  // ─── filter & split deployments ──────────────────────────────────────────────

  const completedDeployments = allDeployments.filter(
    d => d.status === 'completed'
  )

  const regularTrips = []
  const underloadedTrips = []

  completedDeployments.forEach(deployment => {
    const hasReplacement = deployment?.replacement?.replacementTruckId?._id
    const currentTruckType = hasReplacement
      ? deployment.replacement?.replacementTruckType
      : deployment.truckType

    // Sum actualWeightKg from each pickup stop — the ground truth for total weight.
    // This is more reliable than deployment.totalWeightKg which may lag behind
    // if pickup weights were updated after the deployment was last saved.
    const totalPickupWeight =
      deployment.pickups?.reduce(
        (sum, p) => sum + (Number(p.actualWeightKg) || 0),
        0
      ) ?? 0

    if (isUnderloaded(currentTruckType, totalPickupWeight)) {
      underloadedTrips.push(deployment)
    } else {
      regularTrips.push(deployment)
    }
  })

  // ======================= SHEET 1: Regular Trips =======================

  const worksheet1 = workbook.addWorksheet('Regular Trips', {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    }
  })

  worksheet1.columns = [
    { width: 4 }, // A - Margin
    { width: 15 }, // B - DP Code
    { width: 22 }, // C - TMO No. (may have multiple lines)
    { width: 18 }, // D - Billing Period
    { width: 30 }, // E - From (all pickup stops — wider for multi-line)
    { width: 20 }, // F - To
    { width: 12 }, // G - Plate
    { width: 12 }, // H - Truck Type
    { width: 14 }, // I - Net Weight (kg)
    { width: 10 }, // J - Rate/Kg
    { width: 15 }, // K - Amount
    { width: 4 } // L - Margin
  ]

  worksheet1.mergeCells('B2:K2')
  const titleCell1 = worksheet1.getCell('B2')
  titleCell1.value = 'REGULAR TRIPS'
  titleCell1.style = styles.title
  titleCell1.alignment = { horizontal: 'center', vertical: 'middle' }
  worksheet1.getRow(2).height = 30

  worksheet1.addRow([]) // row 3 spacer

  const headerRow1 = worksheet1.getRow(4)
  headerRow1.values = [
    '',
    'DP Code',
    'TMO No.',
    'Billing Period',
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
  for (let col = 2; col <= 11; col++)
    headerRow1.getCell(col).style = styles.header

  const dataStartRow1 = 5

  regularTrips.forEach(deployment => {
    const hasReplacement = deployment?.replacement?.replacementTruckId?._id
    const replacement = deployment?.replacement

    const currentPlateNo = hasReplacement
      ? replacement.replacementTruckId?.plateNo || ''
      : deployment.truckId?.plateNo || ''
    const currentTruckType = hasReplacement
      ? replacement.replacementTruckType
      : deployment.truckType

    // Rate depends on truck type: elf → 0.80, forward → 0.75
    const ratePerKg = getRatePerKg(currentTruckType)

    const billingPeriod = deployment.destDeparture
      ? DateTime.fromISO(deployment.destDeparture)
          .setZone('Asia/Manila')
          .toFormat('MMM dd, yyyy')
      : ''

    const pickups = deployment.pickups?.length ? deployment.pickups : [{}]
    const startRow = worksheet1.rowCount + 1

    pickups.forEach((pickup, idx) => {
      const stopLabel = [
        capitalizeWords(pickup.pickupSite),
        capitalizeWords(pickup.municipality)
      ]
        .filter(Boolean)
        .join(', ')
      const pickupWeight = Number(pickup.actualWeightKg) || 0
      const rowNum = worksheet1.rowCount + 1

      const row = worksheet1.addRow([
        '',
        idx === 0 ? deployment.deploymentCode || '' : '',
        pickup.tmoNo || '',
        idx === 0 ? billingPeriod : '',
        stopLabel,
        idx === 0 ? capitalizeWords(deployment.destination) : '',
        idx === 0 ? currentPlateNo.toUpperCase() : '',
        idx === 0 ? formatTruckType(currentTruckType) : '',
        pickupWeight, // I — per pickup
        idx === 0 ? ratePerKg : '', // J — shared (merged)
        { formula: `I${rowNum}*J${startRow}` }, // K — per pickup, rate always from first row
        ''
      ])
      row.height = 20
      row.getCell(2).style = styles.data
      row.getCell(3).style = styles.data
      row.getCell(4).style = styles.data
      row.getCell(5).style = styles.data
      row.getCell(6).style = styles.data
      row.getCell(7).style = styles.data
      row.getCell(8).style = styles.data
      row.getCell(9).style = { ...styles.data, numFmt: '#,##0.00' }
      row.getCell(10).style = { ...styles.data, numFmt: '#,##0.00' }
      row.getCell(11).style = { ...styles.data, numFmt: '#,##0.00' }
    })

    // I=Weight and K=Amount NOT merged (per stop). J=Rate merged (one rate for the whole trip).
    if (pickups.length > 1) {
      const endRow = startRow + pickups.length - 1
      // B=DP Code, D=Billing Period, F=To, G=Plate, H=Truck Type, J=Rate
      for (const col of [2, 4, 6, 7, 8, 10]) {
        worksheet1.mergeCells(startRow, col, endRow, col)
      }
      const topRow = worksheet1.getRow(startRow)
      const m = {
        ...styles.data,
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
      topRow.getCell(2).style = m
      topRow.getCell(4).style = m
      topRow.getCell(6).style = m
      topRow.getCell(7).style = m
      topRow.getCell(8).style = m
      topRow.getCell(10).style = { ...m, numFmt: '#,##0.00' }
    }
  })

  if (regularTrips.length === 0) {
    const emptyRow = worksheet1.addRow([
      '',
      '',
      '',
      '',
      '',
      'No regular trips',
      '',
      '',
      0,
      0,
      0,
      ''
    ])
    emptyRow.height = 20
    for (let col = 2; col <= 11; col++)
      emptyRow.getCell(col).style = styles.data
  }

  const lastDataRow1 = worksheet1.rowCount
  worksheet1.addRow([])

  const subtotalRow1 = worksheet1.addRow([
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
    { formula: `SUM(K${dataStartRow1}:K${lastDataRow1})` },
    ''
  ])
  subtotalRow1.height = 25
  subtotalRow1.getCell(11).style = { ...styles.total, numFmt: '₱#,##0.00' }

  const regularTripsSubtotalRow = worksheet1.rowCount

  // ======================= SHEET 2: Underload Charges =======================

  const worksheet2 = workbook.addWorksheet('Underload Charges', {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    }
  })

  worksheet2.columns = [
    { width: 4 }, // A - Margin
    { width: 15 }, // B - DP Code
    { width: 22 }, // C - TMO No.
    { width: 18 }, // D - Billing Period
    { width: 30 }, // E - From (all pickup stops)
    { width: 20 }, // F - To
    { width: 12 }, // G - Plate
    { width: 12 }, // H - Truck Type
    { width: 14 }, // I - Actual Weight (kg)
    { width: 14 }, // J - Min Load (kg)
    { width: 10 }, // K - Rate/Kg
    { width: 15 }, // L - Amount
    { width: 4 } // M - Margin
  ]

  worksheet2.mergeCells('B2:L2')
  const titleCell2 = worksheet2.getCell('B2')
  titleCell2.value = 'UNDERLOAD CHARGES'
  titleCell2.style = styles.title
  titleCell2.alignment = { horizontal: 'center', vertical: 'middle' }
  worksheet2.getRow(2).height = 30

  worksheet2.addRow([]) // row 3 spacer

  const headerRow2 = worksheet2.getRow(4)
  headerRow2.values = [
    '',
    'DP Code',
    'TMO No.',
    'Billing Period',
    'From',
    'To',
    'Plate',
    'Truck Type',
    'Actual Weight (kg)',
    'Min Load (kg)',
    'Rate/Kg',
    'Amount (₱)',
    ''
  ]
  headerRow2.height = 25
  for (let col = 2; col <= 12; col++)
    headerRow2.getCell(col).style = styles.header

  const underloadDataStartRow = 5

  underloadedTrips.forEach(deployment => {
    const hasReplacement = deployment?.replacement?.replacementTruckId?._id
    const replacement = deployment?.replacement

    const currentPlateNo = hasReplacement
      ? replacement.replacementTruckId?.plateNo || ''
      : deployment.truckId?.plateNo || ''
    const currentTruckType = hasReplacement
      ? replacement.replacementTruckType
      : deployment.truckType

    // Rate depends on truck type: elf → 0.80, forward → 0.75
    const ratePerKg = getRatePerKg(currentTruckType)

    const minLoad = getMinimumLoad(currentTruckType)
    const billingPeriod = deployment.destDeparture
      ? DateTime.fromISO(deployment.destDeparture)
          .setZone('Asia/Manila')
          .toFormat('MMM dd, yyyy')
      : ''

    const pickups = deployment.pickups?.length ? deployment.pickups : [{}]
    const startRow = worksheet2.rowCount + 1

    pickups.forEach((pickup, idx) => {
      const stopLabel = [
        capitalizeWords(pickup.pickupSite),
        capitalizeWords(pickup.municipality)
      ]
        .filter(Boolean)
        .join(', ')
      const pickupWeight = Number(pickup.actualWeightKg) || 0

      const row = worksheet2.addRow([
        '',
        idx === 0 ? deployment.deploymentCode || '' : '',
        pickup.tmoNo || '',
        idx === 0 ? billingPeriod : '',
        stopLabel,
        idx === 0 ? capitalizeWords(deployment.destination) : '',
        idx === 0 ? currentPlateNo.toUpperCase() : '',
        idx === 0 ? formatTruckType(currentTruckType) : '',
        pickupWeight, // I — per pickup
        idx === 0 ? minLoad : '', // J — merged (trip-level)
        idx === 0 ? ratePerKg : '', // K — merged (trip-level)
        idx === 0 ? { formula: `J${startRow}*K${startRow}` } : '', // L — merged (trip-level)
        ''
      ])
      row.height = 20
      row.getCell(2).style = styles.data
      row.getCell(3).style = styles.data
      row.getCell(4).style = styles.data
      row.getCell(5).style = styles.data
      row.getCell(6).style = styles.data
      row.getCell(7).style = styles.data
      row.getCell(8).style = styles.data
      row.getCell(9).style = { ...styles.data, numFmt: '#,##0.00' }
      row.getCell(10).style = { ...styles.data, numFmt: '#,##0.00' }
      row.getCell(11).style = { ...styles.data, numFmt: '#,##0.00' }
      row.getCell(12).style = { ...styles.data, numFmt: '#,##0.00' }
    })

    // Merge shared columns vertically when there are multiple pickup stops
    // I=Actual Weight is NOT merged — each stop has its own weight
    // J=Min Load, K=Rate, L=Amount remain merged (one underload charge for the whole trip)
    if (pickups.length > 1) {
      const endRow = startRow + pickups.length - 1
      // B=DP Code, D=Billing Period, F=To, G=Plate, H=Truck Type, J=Min Load, K=Rate, L=Amount
      for (const col of [2, 4, 6, 7, 8, 10, 11, 12]) {
        worksheet2.mergeCells(startRow, col, endRow, col)
      }
      const topRow = worksheet2.getRow(startRow)
      topRow.getCell(2).style = {
        ...styles.data,
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
      topRow.getCell(4).style = {
        ...styles.data,
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
      topRow.getCell(6).style = {
        ...styles.data,
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
      topRow.getCell(7).style = {
        ...styles.data,
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
      topRow.getCell(8).style = {
        ...styles.data,
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
      topRow.getCell(10).style = {
        ...styles.data,
        numFmt: '#,##0.00',
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
      topRow.getCell(11).style = {
        ...styles.data,
        numFmt: '#,##0.00',
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
      topRow.getCell(12).style = {
        ...styles.data,
        numFmt: '#,##0.00',
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
    }
  })

  if (underloadedTrips.length === 0) {
    const emptyRow = worksheet2.addRow([
      '',
      '',
      '',
      '',
      '',
      'No underloaded trips',
      '',
      '',
      0,
      0,
      0,
      0,
      ''
    ])
    emptyRow.height = 20
    for (let col = 2; col <= 12; col++)
      emptyRow.getCell(col).style = styles.data
  }

  const lastUnderloadRow = worksheet2.rowCount
  worksheet2.addRow([])

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
    '',
    '',
    { formula: `SUM(L${underloadDataStartRow}:L${lastUnderloadRow})` },
    ''
  ])
  subtotalRow2.height = 25
  subtotalRow2.getCell(12).style = { ...styles.total, numFmt: '₱#,##0.00' }

  const underloadChargesSubtotalRow = worksheet2.rowCount

  // ======================= SHEET 3: Demurrage Fee =======================

  const worksheet3 = workbook.addWorksheet('Demurrage Fee', {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    }
  })

  worksheet3.columns = [
    { width: 4 }, // A - Margin
    { width: 15 }, // B - DP Code
    { width: 22 }, // C - Dest Arrival
    { width: 22 }, // D - Dest Departure
    { width: 14 }, // E - Unloading Time
    { width: 30 }, // F - From (all pickup stops)
    { width: 20 }, // G - To
    { width: 12 }, // H - Plate No
    { width: 12 }, // I - Truck Type
    { width: 12 }, // J - Rate
    { width: 15 }, // K - Amount
    { width: 4 } // L - Margin
  ]

  worksheet3.mergeCells('B2:K2')
  const titleCell3 = worksheet3.getCell('B2')
  titleCell3.value = 'DEMURRAGE FEE'
  titleCell3.style = styles.title
  titleCell3.alignment = { horizontal: 'center', vertical: 'middle' }
  worksheet3.getRow(2).height = 30

  worksheet3.addRow([]) // row 3 spacer

  const headerRow3 = worksheet3.getRow(4)
  headerRow3.values = [
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
  headerRow3.height = 25
  for (let col = 2; col <= 11; col++)
    headerRow3.getCell(col).style = styles.header

  const demurrageDataStartRow = 5

  const demurrageDeployments = completedDeployments.filter(deployment => {
    if (!deployment.destArrival || !deployment.destDeparture) return false
    const arrival = DateTime.fromISO(deployment.destArrival)
    const departure = DateTime.fromISO(deployment.destDeparture)
    return departure.diff(arrival, 'minutes').minutes >= 11 * 60 + 30
  })

  demurrageDeployments.forEach(deployment => {
    const hasReplacement = deployment?.replacement?.replacementTruckId?._id
    const currentPlateNo = hasReplacement
      ? deployment.replacement?.replacementTruckId?.plateNo || ''
      : deployment.truckId?.plateNo || ''
    const currentTruckType = hasReplacement
      ? deployment.replacement?.replacementTruckType
      : deployment.truckType

    const arrival = DateTime.fromISO(deployment.destArrival)
    const departure = DateTime.fromISO(deployment.destDeparture)
    const { hours, minutes } = departure.diff(arrival, ['hours', 'minutes'])
    const totalMinutes = departure.diff(arrival, 'minutes').minutes
    const unloadingTime = `${hours}h ${Math.floor(minutes)}m`
    const demurrageAmount = calculateDemurrageCharges(
      currentTruckType,
      totalMinutes
    )
    const demurrageRate = getDemurrageRate(currentTruckType)

    const destArrivalFmt = DateTime.fromISO(deployment.destArrival)
      .setZone('Asia/Manila')
      .toFormat('MMM dd, yyyy hh:mm a')
    const destDepartureFmt = DateTime.fromISO(deployment.destDeparture)
      .setZone('Asia/Manila')
      .toFormat('MMM dd, yyyy hh:mm a')

    const pickups = deployment.pickups?.length ? deployment.pickups : [{}]
    const startRow = worksheet3.rowCount + 1

    pickups.forEach((pickup, idx) => {
      const stopLabel = [
        capitalizeWords(pickup.pickupSite),
        capitalizeWords(pickup.municipality)
      ]
        .filter(Boolean)
        .join(', ')

      const row = worksheet3.addRow([
        '',
        idx === 0 ? deployment.deploymentCode || '' : '',
        idx === 0 ? destArrivalFmt : '',
        idx === 0 ? destDepartureFmt : '',
        idx === 0 ? unloadingTime : '',
        stopLabel,
        idx === 0 ? capitalizeWords(deployment.destination) : '',
        idx === 0 ? currentPlateNo.toUpperCase() : '',
        idx === 0 ? formatTruckType(currentTruckType) : '',
        idx === 0 ? demurrageRate : '',
        idx === 0 ? demurrageAmount : '',
        ''
      ])
      row.height = 20
      row.getCell(2).style = styles.data
      row.getCell(3).style = styles.data
      row.getCell(4).style = styles.data
      row.getCell(5).style = styles.data
      row.getCell(6).style = styles.data
      row.getCell(7).style = styles.data
      row.getCell(8).style = styles.data
      row.getCell(9).style = styles.data
      row.getCell(10).style = { ...styles.data, numFmt: '#,##0.00' }
      row.getCell(11).style = { ...styles.data, numFmt: '#,##0.00' }
    })

    // Merge shared columns vertically when there are multiple pickup stops
    if (pickups.length > 1) {
      const endRow = startRow + pickups.length - 1
      // B=DP Code, C=Dest Arrival, D=Dest Departure, E=Unloading Time, G=To, H=Plate, I=Truck Type, J=Rate, K=Amount
      for (const col of [2, 3, 4, 5, 7, 8, 9, 10, 11]) {
        worksheet3.mergeCells(startRow, col, endRow, col)
      }
      const topRow = worksheet3.getRow(startRow)
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
      topRow.getCell(5).style = {
        ...styles.data,
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
      topRow.getCell(7).style = {
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
        numFmt: '#,##0.00',
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
      topRow.getCell(11).style = {
        ...styles.data,
        numFmt: '#,##0.00',
        alignment: { ...styles.data.alignment, vertical: 'middle' }
      }
    }
  })

  if (demurrageDeployments.length === 0) {
    const emptyRow = worksheet3.addRow([
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
    for (let col = 2; col <= 11; col++)
      emptyRow.getCell(col).style = styles.data
  }

  const lastDemurrageRow = worksheet3.rowCount
  worksheet3.addRow([])

  const subtotalRow3 = worksheet3.addRow([
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
    { formula: `SUM(K${demurrageDataStartRow}:K${lastDemurrageRow})` },
    ''
  ])
  subtotalRow3.height = 25
  subtotalRow3.getCell(11).style = { ...styles.total, numFmt: '₱#,##0.00' }

  const demurrageFeeSubtotalRow = worksheet3.rowCount

  // ======================= SHEET 4: Summary =======================

  const worksheet4 = workbook.addWorksheet('Summary', {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    }
  })

  worksheet4.columns = [
    { width: 4 }, // A - Margin
    { width: 25 }, // B
    { width: 25 }, // C
    { width: 20 }, // D
    { width: 20 }, // E
    { width: 20 }, // F
    { width: 4 } // G - Margin
  ]

  worksheet4.mergeCells('B2:E2')
  const titleCell4 = worksheet4.getCell('B2')
  titleCell4.value = 'STATEMENT OF ACCOUNT'
  titleCell4.style = {
    ...styles.title,
    font: { ...styles.title.font, size: 18 }
  }
  titleCell4.alignment = { horizontal: 'center', vertical: 'middle' }
  worksheet4.getRow(2).height = 35

  worksheet4.addRow([])

  const paidToRow = worksheet4.getRow(4)
  paidToRow.values = ['', 'PAID TO:', companyName, '', '', '', '']
  paidToRow.height = 25
  paidToRow.getCell(2).style = {
    ...styles.label,
    alignment: { horizontal: 'left', vertical: 'middle' }
  }
  paidToRow.getCell(3).style = {
    font: { bold: true, size: 10, color: { argb: 'FF000000' } },
    alignment: { horizontal: 'left', vertical: 'middle' },
    border: { bottom: { style: 'thin', color: { argb: colors.border } } }
  }

  const dateRow = worksheet4.getRow(5)
  dateRow.values = ['', 'DATE:', billingDate, '', '', '', '']
  dateRow.height = 20
  dateRow.getCell(2).style = {
    ...styles.label,
    alignment: { horizontal: 'left', vertical: 'middle' }
  }
  dateRow.getCell(3).style = {
    font: { size: 10, color: { argb: 'FF000000' } },
    alignment: { horizontal: 'left', vertical: 'middle' },
    border: { bottom: { style: 'thin', color: { argb: colors.border } } }
  }

  worksheet4.addRow([])
  worksheet4.addRow([])

  worksheet4.mergeCells('B8:E8')
  const breakdownHeader = worksheet4.getCell('B8')
  breakdownHeader.value = 'BILLING BREAKDOWN'
  breakdownHeader.style = styles.subtitle
  breakdownHeader.alignment = { horizontal: 'center', vertical: 'middle' }
  worksheet4.getRow(8).height = 25

  const regularRow = worksheet4.getRow(9)
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
  regularRow.getCell(3).style = styles.data
  regularRow.getCell(4).style = { ...styles.data, numFmt: '₱#,##0.00' }

  const underloadRow = worksheet4.getRow(10)
  underloadRow.values = [
    '',
    '',
    'Underload Charges',
    { formula: `='Underload Charges'!L${underloadChargesSubtotalRow}` },
    '',
    '',
    ''
  ]
  underloadRow.height = 22
  underloadRow.getCell(3).style = styles.data
  underloadRow.getCell(4).style = { ...styles.data, numFmt: '₱#,##0.00' }

  const demurrageRow = worksheet4.getRow(11)
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
  demurrageRow.getCell(3).style = styles.data
  demurrageRow.getCell(4).style = { ...styles.data, numFmt: '₱#,##0.00' }

  worksheet4.addRow([])

  const grandTotalRow = worksheet4.getRow(13)
  grandTotalRow.values = [
    '',
    '',
    'GRAND TOTAL',
    { formula: 'SUM(D9:D11)' },
    '',
    '',
    ''
  ]
  grandTotalRow.height = 28
  grandTotalRow.getCell(3).style = {
    ...styles.total,
    alignment: { horizontal: 'center', vertical: 'middle' },
    font: { ...styles.total.font, size: 12 }
  }
  grandTotalRow.getCell(4).style = {
    ...styles.total,
    numFmt: '₱#,##0.00',
    font: { ...styles.total.font, size: 12 },
    alignment: { horizontal: 'center', vertical: 'middle' }
  }

  const preparedRow = worksheet4.getRow(16)
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

  worksheet4.addRow([])
  worksheet4.addRow([])

  const adminName = `${userData?.data?.firstname} ${userData?.data?.lastname}`

  const nameRow = worksheet4.getRow(19)
  nameRow.values = [
    '',
    adminName.toUpperCase(),
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
    border: { top: { style: 'thin', color: { argb: 'FF000000' } } }
  }
  nameRow.getCell(5).style = {
    alignment: { horizontal: 'center' },
    border: { top: { style: 'thin', color: { argb: 'FF000000' } } }
  }

  const titleRowSig = worksheet4.getRow(20)
  titleRowSig.values = [
    '',
    'PROPRIETOR',
    '',
    '',
    'AUTHORIZED SIGNATURE',
    '',
    ''
  ]
  titleRowSig.height = 18
  titleRowSig.getCell(2).style = {
    font: { size: 9, color: { argb: colors.textLight } },
    alignment: { horizontal: 'left' }
  }
  titleRowSig.getCell(5).style = {
    font: { size: 9, color: { argb: colors.textLight } },
    alignment: { horizontal: 'center' }
  }

  // ─── export ──────────────────────────────────────────────────────────────────

  const timestamp = DateTime.now().toFormat('yyyy-MM-dd_HHmmss')
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.href = url
  link.download = `Subcon_Billing_Statement_${timestamp}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
