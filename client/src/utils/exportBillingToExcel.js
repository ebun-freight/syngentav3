import { DateTime } from 'luxon'
import ExcelJS from 'exceljs'

export const exportBillingToExcel = async allDeployments => {
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

  // Helper function to get minimum load for truck type
  const getMinimumLoad = truckType => {
    if (!truckType) return 0
    const lowerType = truckType.toLowerCase().trim()

    // Define minimum loads for each truck type
    const minimumLoads = {
      elf: 5000,
      forward: 9000
    }

    return minimumLoads[lowerType] || 0
  }

  // Helper function to determine if trip is underloaded
  const isUnderloaded = (truckType, actualWeight) => {
    const minLoad = getMinimumLoad(truckType)
    return minLoad > 0 && actualWeight < minLoad
  }

  // Helper function to get demurrage rate per 12 hours
  const getDemurrageRate = truckType => {
    if (!truckType) return 0
    const lowerType = truckType.toLowerCase().trim()

    const demurrageRates = {
      elf: 3500,
      forward: 5000
    }

    return demurrageRates[lowerType] || 0
  }

  // Helper function to calculate demurrage charges
  const calculateDemurrageCharges = (truckType, unloadingMinutes) => {
    if (!unloadingMinutes || unloadingMinutes < 11 * 60 + 30) {
      // Less than 11:30 hours = no charge
      return 0
    }

    const rate = getDemurrageRate(truckType)
    if (rate === 0) return 0

    // First block: 11:30 to 24:00 hours = 1 charge
    // Each additional 12 hours (or portion) = 1 additional charge

    // Convert to total 12-hour blocks
    // Subtract the first "free" 11.5 hours
    const chargeableMinutes = unloadingMinutes - (11 * 60 + 30)

    // Calculate number of 12-hour blocks (round up)
    const twelveHoursInMinutes = 12 * 60
    const blocks = Math.ceil(chargeableMinutes / twelveHoursInMinutes) + 1 // +1 for the first block

    return blocks * rate
  }

  // Get current date and time for billing period
  const billingDate = DateTime.now()
    .setZone('Asia/Manila')
    .toFormat('MMMM dd, yyyy')

  // Get company name from first deployment or use default
  const firstDeployment = allDeployments[0]
  const companyName = firstDeployment?.company || 'SMC HI-BRED PHILIPPINES INC.'

  // Rate per kg
  const ratePerKg = 1.5

  // Create a new workbook
  const workbook = new ExcelJS.Workbook()

  // Define professional color scheme
  const colors = {
    primary: 'FF001E36', // Dark Blue
    secondary: 'FF003057', // Lighter Dark Blue
    accent: 'FFE3F2FD', // Light Blue-100
    header: 'FFF5F9FC', // Very Light Blue
    border: 'FFD1D5DB', // Gray-300
    text: 'FF000000', // Black
    textLight: 'FF6B7280', // Gray-500
    warning: 'FFFEF3C7' // Yellow-100 for underload highlighting
  }

  // Define professional styles
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
      border: {
        bottom: { style: 'thin', color: { argb: colors.border } }
      }
    }
  }

  // Filter completed deployments
  const completedDeployments = allDeployments.filter(
    deployment => deployment.status === 'completed'
  )

  // Separate regular and underloaded trips
  const regularTrips = []
  const underloadedTrips = []

  completedDeployments.forEach(deployment => {
    const hasReplacement = deployment?.replacement?.replacementTruckId?._id
    const currentTruckType = hasReplacement
      ? deployment.replacement?.replacementTruckType
      : deployment.truckType
    const netWeight = deployment.loadWeightKg || 0

    if (isUnderloaded(currentTruckType, netWeight)) {
      underloadedTrips.push(deployment)
    } else {
      regularTrips.push(deployment)
    }
  })

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

  // Add data rows for REGULAR TRIPS ONLY
  let dataStartRow = 5
  regularTrips.forEach((deployment, index) => {
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
      capitalizeWords(deployment.pickupSite),
      capitalizeWords(deployment.destination),
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
  })

  // Add empty row if no data
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
    '',
    '',
    { formula: `SUM(K${dataStartRow}:K${lastDataRow})` },
    ''
  ])

  subtotalRow1.height = 25
  subtotalRow1.getCell(11).style = { ...styles.total, numFmt: '₱#,##0.00' }

  // Store the subtotal row number for Sheet 4 reference
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

  // Set column widths
  worksheet2.columns = [
    { width: 4 }, // A - Margin
    { width: 15 }, // B - DP Code
    { width: 18 }, // C - Billing Period
    { width: 12 }, // D - Series No.
    { width: 20 }, // E - From
    { width: 20 }, // F - To
    { width: 12 }, // G - Plate
    { width: 12 }, // H - Truck Type
    { width: 14 }, // I - Actual Weight (kg)
    { width: 14 }, // J - Min Load (kg)
    { width: 10 }, // K - Rate/Kg
    { width: 15 }, // L - Amount
    { width: 4 } // M - Margin
  ]

  // Add title (row 2)
  worksheet2.mergeCells('B2:L2')
  const titleCell2 = worksheet2.getCell('B2')
  titleCell2.value = 'UNDERLOAD CHARGES'
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
    'Billing Period',
    'Series No.',
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

  // Apply header style
  for (let col = 2; col <= 12; col++) {
    headerRow2.getCell(col).style = styles.header
  }

  // Add data rows for UNDERLOADED TRIPS
  const underloadDataStartRow = 5
  underloadedTrips.forEach((deployment, index) => {
    const hasReplacement = deployment?.replacement?.replacementTruckId?._id
    const replacement = deployment?.replacement

    const currentPlateNo = hasReplacement
      ? replacement.replacementTruckId?.plateNo || ''
      : deployment.truckId?.plateNo || ''

    const currentTruckType = hasReplacement
      ? replacement.replacementTruckType
      : deployment.truckType

    const actualWeight = deployment.loadWeightKg || 0
    const minLoad = getMinimumLoad(currentTruckType)

    // Format billing period (dest departure)
    const billingPeriod = deployment.destDeparture
      ? DateTime.fromISO(deployment.destDeparture)
          .setZone('Asia/Manila')
          .toFormat('MMM dd, yyyy')
      : ''

    const rowNum = worksheet2.rowCount + 1

    const row = worksheet2.addRow([
      '',
      deployment.deploymentCode || '',
      billingPeriod,
      '', // Series No. - blank
      capitalizeWords(deployment.pickupSite),
      capitalizeWords(deployment.destination),
      currentPlateNo.toUpperCase(),
      formatTruckType(currentTruckType),
      actualWeight,
      minLoad,
      ratePerKg,
      { formula: `J${rowNum}*K${rowNum}` }, // Use minimum load for billing
      ''
    ])

    row.height = 20

    // Apply styles with warning color
    row.getCell(2).style = styles.data
    row.getCell(3).style = styles.data
    row.getCell(4).style = styles.data
    row.getCell(5).style = styles.dataLeft
    row.getCell(6).style = styles.dataLeft
    row.getCell(7).style = styles.data
    row.getCell(8).style = styles.data
    row.getCell(9).style = { ...styles.data, numFmt: '#,##0.00' }
    row.getCell(10).style = { ...styles.data, numFmt: '#,##0.00' }
    row.getCell(11).style = { ...styles.data, numFmt: '#,##0.00' }
    row.getCell(12).style = { ...styles.data, numFmt: '#,##0.00' }
  })

  // Add empty row if no data
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
      ratePerKg,
      0,
      ''
    ])
    emptyRow.height = 20
    for (let col = 2; col <= 12; col++) {
      emptyRow.getCell(col).style = styles.data
    }
  }

  // Add subtotal row
  const lastUnderloadRow = worksheet2.rowCount
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
    '',
    '',
    { formula: `SUM(L${underloadDataStartRow}:L${lastUnderloadRow})` },
    ''
  ])

  subtotalRow2.height = 25
  subtotalRow2.getCell(12).style = { ...styles.total, numFmt: '₱#,##0.00' }

  // Store the subtotal row number for Sheet 4 reference
  const underloadChargesSubtotalRow = worksheet2.rowCount

  // ======================= SHEET 3: Demurrage Fee =======================
  const worksheet3 = workbook.addWorksheet('Demurrage Fee', {
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
  worksheet3.mergeCells('B2:K2')
  const titleCell3 = worksheet3.getCell('B2')
  titleCell3.value = 'DEMURRAGE FEE'
  titleCell3.style = styles.title
  titleCell3.alignment = { horizontal: 'center', vertical: 'middle' }
  worksheet3.getRow(2).height = 30

  // Add empty row (row 3)
  worksheet3.addRow([])

  // Add header row (row 4)
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

  // Apply header style
  for (let col = 2; col <= 11; col++) {
    headerRow3.getCell(col).style = styles.header
  }

  // Add demurrage data (only deployments with 11:30+ unloading time)
  const demurrageDataStartRow = 5

  // Filter deployments that qualify for demurrage (11:30 hours or more)
  const demurrageDeployments = completedDeployments.filter(deployment => {
    if (!deployment.destArrival || !deployment.destDeparture) return false

    const arrival = DateTime.fromISO(deployment.destArrival)
    const departure = DateTime.fromISO(deployment.destDeparture)
    const diffMinutes = departure.diff(arrival, 'minutes').minutes

    return diffMinutes >= 11 * 60 + 30 // 11:30 hours or more
  })

  demurrageDeployments.forEach((deployment, index) => {
    const hasReplacement = deployment?.replacement?.replacementTruckId?._id
    const currentPlateNo = hasReplacement
      ? deployment.replacement?.replacementTruckId?.plateNo || ''
      : deployment.truckId?.plateNo || ''
    const currentTruckType = hasReplacement
      ? deployment.replacement?.replacementTruckType
      : deployment.truckType

    // Calculate unloading time
    const arrival = DateTime.fromISO(deployment.destArrival)
    const departure = DateTime.fromISO(deployment.destDeparture)
    const { hours, minutes } = departure.diff(arrival, ['hours', 'minutes'])
    const totalMinutes = departure.diff(arrival, 'minutes').minutes
    const unloadingTime = `${hours}h ${Math.floor(minutes)}m`

    // Calculate demurrage charges
    const demurrageAmount = calculateDemurrageCharges(
      currentTruckType,
      totalMinutes
    )
    const demurrageRate = getDemurrageRate(currentTruckType)

    const row = worksheet3.addRow([
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
      capitalizeWords(deployment.pickupSite),
      capitalizeWords(deployment.destination),
      currentPlateNo.toUpperCase(),
      formatTruckType(currentTruckType),
      demurrageRate,
      demurrageAmount,
      ''
    ])

    row.height = 20

    // Apply styles
    row.getCell(2).style = styles.data
    row.getCell(3).style = styles.data
    row.getCell(4).style = styles.data
    row.getCell(5).style = styles.data
    row.getCell(6).style = styles.dataLeft
    row.getCell(7).style = styles.dataLeft
    row.getCell(8).style = styles.data
    row.getCell(9).style = styles.data
    row.getCell(10).style = { ...styles.data, numFmt: '#,##0.00' }
    row.getCell(11).style = { ...styles.data, numFmt: '#,##0.00' }
  })

  // Add empty row if no data
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
    for (let col = 2; col <= 11; col++) {
      emptyRow.getCell(col).style = styles.data
    }
  }

  // Add subtotal row
  const lastDemurrageRow = worksheet3.rowCount
  worksheet3.addRow([]) // Empty row

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

  // Store the subtotal row number for Sheet 4 reference
  const demurrageFeeSubtotalRow = worksheet3.rowCount

  // ======================= SHEET 4: Summary =======================
  const worksheet4 = workbook.addWorksheet('Summary', {
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
  worksheet4.columns = [
    { width: 4 }, // A - Margin
    { width: 25 }, // B
    { width: 25 }, // C
    { width: 20 }, // D
    { width: 20 }, // E
    { width: 20 }, // F
    { width: 4 } // G - Margin
  ]

  // Add title (row 2)
  worksheet4.mergeCells('B2:E2')
  const titleCell4 = worksheet4.getCell('B2')
  titleCell4.value = 'STATEMENT OF ACCOUNT'
  titleCell4.style = {
    ...styles.title,
    font: { ...styles.title.font, size: 18 }
  }
  titleCell4.alignment = { horizontal: 'center', vertical: 'middle' }
  worksheet4.getRow(2).height = 35

  // Add empty row
  worksheet4.addRow([])

  // Billed To section (row 4)
  const billedToRow = worksheet4.getRow(4)
  billedToRow.values = ['', 'BILLED TO:', companyName, '', '', '', '']
  billedToRow.height = 25
  billedToRow.getCell(2).style = {
    ...styles.label,
    alignment: { horizontal: 'left', vertical: 'middle' }
  }
  billedToRow.getCell(3).style = {
    font: { bold: true, size: 10, color: { argb: 'FF000000' } },
    alignment: { horizontal: 'left', vertical: 'middle' },
    border: {
      bottom: { style: 'thin', color: { argb: colors.border } }
    }
  }

  // Date (row 5)
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
    border: {
      bottom: { style: 'thin', color: { argb: colors.border } }
    }
  }

  // SOA Number (row 6)
  const soaRow = worksheet4.getRow(6)
  soaRow.values = ['', 'SOA NUMBER:', 'EFO26001', '', '', '', '']
  soaRow.height = 20
  soaRow.getCell(2).style = {
    ...styles.label,
    alignment: { horizontal: 'left', vertical: 'middle' }
  }
  soaRow.getCell(3).style = {
    font: { size: 10, color: { argb: 'FF000000' } },
    alignment: { horizontal: 'left', vertical: 'middle' },
    border: {
      bottom: { style: 'thin', color: { argb: colors.border } }
    }
  }

  // P.O. Number (row 7)
  const poRow = worksheet4.getRow(7)
  poRow.values = ['', 'P.O. NUMBER:', '', '', '', '', '']
  poRow.height = 20
  poRow.getCell(2).style = {
    ...styles.label,
    alignment: { horizontal: 'left', vertical: 'middle' }
  }
  poRow.getCell(3).style = {
    font: { size: 10, color: { argb: 'FF000000' } },
    alignment: { horizontal: 'left', vertical: 'middle' },
    border: {
      bottom: { style: 'thin', color: { argb: colors.border } }
    }
  }

  // Add empty rows
  worksheet4.addRow([])
  worksheet4.addRow([])

  // Breakdown section header (row 10)
  worksheet4.mergeCells('B10:E10')
  const breakdownHeader = worksheet4.getCell('B10')
  breakdownHeader.value = 'BILLING BREAKDOWN'
  breakdownHeader.style = styles.subtitle
  breakdownHeader.alignment = { horizontal: 'center', vertical: 'middle' }
  worksheet4.getRow(10).height = 25

  // Regular Trips (row 11)
  const regularRow = worksheet4.getRow(11)
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

  // Underload Charges (row 12)
  const underloadRow = worksheet4.getRow(12)
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
  underloadRow.getCell(3).style = styles.dataLeft
  underloadRow.getCell(4).style = { ...styles.data, numFmt: '₱#,##0.00' }

  // Demurrage Fee (row 13)
  const demurrageRow = worksheet4.getRow(13)
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
  worksheet4.addRow([])

  // Subtotal (row 15) - Grand Total minus 12% VAT
  const subtotalRow4 = worksheet4.getRow(15)
  subtotalRow4.values = [
    '',
    '',
    'SUBTOTAL',
    { formula: 'SUM(D11:D13)-(SUM(D11:D13)*0.12)' },
    '',
    '',
    ''
  ]
  subtotalRow4.height = 25
  subtotalRow4.getCell(3).style = {
    ...styles.total,
    alignment: { horizontal: 'left', vertical: 'middle' }
  }
  subtotalRow4.getCell(4).style = {
    ...styles.total,
    numFmt: '₱#,##0.00',
    alignment: { horizontal: 'center', vertical: 'middle' }
  }

  // ADD 12% VAT (row 16) - 12% of the sum
  const vatRow = worksheet4.getRow(16)
  vatRow.values = [
    '',
    '',
    'ADD 12% VAT',
    { formula: 'SUM(D11:D13)*0.12' },
    '',
    '',
    ''
  ]
  vatRow.height = 22
  vatRow.getCell(3).style = styles.dataLeft
  vatRow.getCell(4).style = { ...styles.data, numFmt: '₱#,##0.00' }

  // Grand Total (row 17) - Sum of Regular Trips + Underload Charges + Demurrage Fee
  const grandTotalRow = worksheet4.getRow(17)
  grandTotalRow.values = [
    '',
    '',
    'GRAND TOTAL',
    { formula: 'SUM(D11:D13)' },
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

  // Prepared by (row 20)
  const preparedRow = worksheet4.getRow(20)
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
  worksheet4.addRow([])
  worksheet4.addRow([])

  // Name (row 23)
  const nameRow = worksheet4.getRow(23)
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

  // Title (row 24)
  const titleRowSig = worksheet4.getRow(24)
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
