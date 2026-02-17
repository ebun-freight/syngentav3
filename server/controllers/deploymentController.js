const createError = require('http-errors')
const { validateFields } = require('../utils/validationFields')
const Deployment = require('../models/deploymentModel')
const Truck = require('../models/truckModel')
const Driver = require('../models/driverModel')
const ActivityLog = require('../models/activityLogsModel')
const TimelineLog = require('../models/timelineLogsModel')
const { DateTime } = require('luxon')

// Create deployment
const createDeployment = async (req, res, next) => {
  try {
    const {
      // pickup details
      pickupSite,
      municipality,
      fieldContactPerson,
      fieldContactPersonNo,
      scheduledPickupTime,
      estimatedQuantityKg,

      // truck & driver details
      truckId,
      driverId,
      truckType,
      helperCount,

      // delivery details
      destination,
      receivingContactPerson,
      receivingContactPersonNo,
      hybrid,
      territory,
      flagging,
      flaggingRemarks,
      sacksCount,

      // load details
      loadWeightKg,

      // timeline details
      departed,
      pickupIn,
      pickupOut,
      destArrival,
      destDeparture,

      // other tags
      subcon,
      isTMOPrinted = false
    } = req.body

    // Check permissions
    if (!['head_admin', 'admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    // Validate fields
    validateFields({
      // pickup details
      pickupSite,
      municipality,
      fieldContactPerson,
      fieldContactPersonNo,
      scheduledPickupTime,
      estimatedQuantityKg,

      // truck & driver details
      truckId,
      driverId,
      truckType,
      helperCount,

      // delivery details
      destination,
      receivingContactPerson,
      receivingContactPersonNo,
      hybrid,
      territory,
      flagging
    })

    // Check if truck exists and available
    const truck = await Truck.findById(truckId)
    if (!truck) {
      return next(createError(404, 'Truck not found'))
    }
    if (truck.status === 'deployed') {
      return next(createError(400, 'Truck is already deployed'))
    }

    // Check if driver exists and available
    const driver = await Driver.findById(driverId)
    if (!driver) {
      return next(createError(404, 'Driver not found'))
    }
    if (driver.status === 'deployed') {
      return next(createError(400, 'Driver is already deployed'))
    }

    // Create deployment
    const newDeployment = await Deployment.create({
      // pickup details
      pickupSite,
      municipality,
      fieldContactPerson,
      fieldContactPersonNo,
      scheduledPickupTime,
      estimatedQuantityKg,

      // truck & driver details
      truckId,
      driverId,
      truckType,
      helperCount,

      // delivery details
      destination,
      receivingContactPerson,
      receivingContactPersonNo,
      hybrid,
      territory,
      flagging,
      flaggingRemarks,
      sacksCount: sacksCount || 0,

      // load details
      loadWeightKg: loadWeightKg || 0,

      // timeline details
      departed: departed || '',
      pickupIn: pickupIn || '',
      pickupOut: pickupOut || '',
      destArrival: destArrival || '',
      destDeparture: destDeparture || '',

      // other tags
      subcon: subcon || truck.subcon,
      isTMOPrinted,
      isSoftDeleted: false
    })

    // Update truck and driver status
    await Promise.all([
      Truck.findByIdAndUpdate(truckId, { status: 'deployed' }),
      Driver.findByIdAndUpdate(driverId, { status: 'deployed' })
    ])

    // Determine initial status
    const initialStatus = departed ? 'ongoing' : 'preparing'
    const now = DateTime.now().setZone('Asia/Manila').toISO()

    // Create timeline logs
    const timelinePromises = [
      TimelineLog.create({
        performedBy: req.user._id,
        action: 'Truck assigned for deployment',
        status: initialStatus,
        timestamp: now,
        targetDeployment: newDeployment._id
      })
    ]

    await Promise.all(timelinePromises)

    // Create activity log
    await ActivityLog.create({
      type: 'deployment',
      performedBy: req.user._id,
      action: `${
        newDeployment.deploymentCode
      }: Assigned ${truck.plateNo.toUpperCase()} to deployment`,
      targetDeployment: newDeployment._id
    })

    // Populate and return
    const populatedDeployment = await Deployment.findById(newDeployment._id)
      .populate('truckId')
      .populate('driverId')

    res.status(201).json({
      message: 'Deployment created successfully',
      deployment: populatedDeployment
    })
  } catch (error) {
    next(error)
  }
}

// Get all deployments
const getAllDeployments = async (req, res, next) => {
  try {
    const {
      status,
      search,
      sort = 'latest',
      assignedAt,
      departedAt,
      perPage = 200,
      page = 1,
      includeDeleted = false,
      subcon, // This is the query parameter for non-subcon users
      territory // NEW: territory filter parameter
    } = req.query

    console.log(req.query)

    // Build base query
    let baseQuery = Deployment.find()

    if (includeDeleted !== 'true') {
      baseQuery = baseQuery.where('isSoftDeleted').ne(true)
    }

    // Apply subcon filter based on user role
    if (req.user.role === 'subcon' && req.user.subcon) {
      // For subcon users: auto-filter by their subcon (ignore any subcon query parameter)
      baseQuery = baseQuery.where('subcon').equals(req.user.subcon)
    } else if (subcon && subcon !== '') {
      // For non-subcon users: filter by subcon query parameter if provided
      baseQuery = baseQuery.where('subcon').equals(subcon)
    }
    // If not subcon and no subcon query parameter: no subcon filter applied

    // NEW: Territory filter
    if (territory && territory !== '') {
      baseQuery = baseQuery.where('territory').equals(territory)
    }

    // Status filter
    if (status && status !== '') {
      baseQuery = baseQuery.where('status').equals(status)
    }

    // assignedAt filter (filters by createdAt date)
    if (assignedAt) {
      const targetDate = new Date(assignedAt)

      if (isNaN(targetDate.getTime())) {
        return next(
          createError(400, 'Invalid assignedAt date format. Use YYYY-MM-DD')
        )
      }

      const startOfDay = new Date(targetDate)
      startOfDay.setHours(0, 0, 0, 0)

      const endOfDay = new Date(targetDate)
      endOfDay.setHours(23, 59, 59, 999)

      baseQuery = baseQuery.where('createdAt').gte(startOfDay).lt(endOfDay)
    }

    // departedAt filter (filters by departed timestamp)
    if (departedAt) {
      const targetDate = new Date(departedAt)

      if (isNaN(targetDate.getTime())) {
        return next(
          createError(400, 'Invalid departedAt date format. Use YYYY-MM-DD')
        )
      }

      const startOfDay = new Date(targetDate)
      startOfDay.setHours(0, 0, 0, 0)

      const endOfDay = new Date(targetDate)
      endOfDay.setHours(23, 59, 59, 999)

      baseQuery = baseQuery
        .where('departed')
        .gte(startOfDay.toISOString())
        .lt(endOfDay.toISOString())
    }

    // Sorting
    const sortOptions = {
      oldest: { createdAt: 1 },
      latest: { createdAt: -1 }
    }
    baseQuery = baseQuery.sort(sortOptions[sort] || sortOptions.latest)

    // Pagination
    const limit = parseInt(perPage)
    const skip = (parseInt(page) - 1) * limit
    baseQuery = baseQuery.skip(skip).limit(limit)

    // Populate
    baseQuery = baseQuery.populate([
      {
        path: 'truckId',
        select: 'plateNo truckType condition status imageUrl subcon'
      },
      {
        path: 'driverId',
        select: 'firstname lastname licenseNo contact subcon'
      },
      {
        path: 'replacement.replacementTruckId',
        select: 'plateNo truckType condition status imageUrl subcon'
      },
      {
        path: 'replacement.replacementDriverId',
        select: 'firstname lastname licenseNo contact subcon'
      }
    ])

    // Execute query
    let deployments = await baseQuery

    // Client-side search filter
    if (search && search !== '') {
      const searchLower = search.toLowerCase()
      deployments = deployments.filter(deployment => {
        const activeTruckPlate = (
          deployment.replacement?.replacementTruckId?.plateNo ||
          deployment.truckId?.plateNo ||
          ''
        ).toLowerCase()
        const activeDriverFirstname = (
          deployment.replacement?.replacementDriverId?.firstname ||
          deployment.driverId?.firstname ||
          ''
        ).toLowerCase()
        const activeDriverLastname = (
          deployment.replacement?.replacementDriverId?.lastname ||
          deployment.driverId?.lastname ||
          ''
        ).toLowerCase()
        const destination = (deployment.destination || '').toLowerCase()
        const pickupSite = (deployment.pickupSite || '').toLowerCase()
        const truckType = (deployment.truckType || '').toLowerCase()
        const deploymentCode = (deployment.deploymentCode || '').toLowerCase()
        const subconValue = (deployment.subcon || '').toLowerCase()
        const territoryValue = (deployment.territory || '').toLowerCase() // NEW: include territory in search

        return (
          activeTruckPlate.includes(searchLower) ||
          activeDriverFirstname.includes(searchLower) ||
          activeDriverLastname.includes(searchLower) ||
          destination.includes(searchLower) ||
          pickupSite.includes(searchLower) ||
          truckType.includes(searchLower) ||
          deploymentCode.includes(searchLower) ||
          subconValue.includes(searchLower) ||
          territoryValue.includes(searchLower) // NEW: search by territory
        )
      })
    }

    // Get total count (should match the filters)
    let totalQuery = Deployment.find()

    if (includeDeleted !== 'true') {
      totalQuery = totalQuery.where('isSoftDeleted').ne(true)
    }

    // Apply same subcon filter logic to total query
    if (req.user.role === 'subcon' && req.user.subcon) {
      // For subcon users: auto-filter by their subcon
      totalQuery = totalQuery.where('subcon').equals(req.user.subcon)
    } else if (subcon && subcon !== '') {
      // For non-subcon users: filter by subcon query parameter if provided
      totalQuery = totalQuery.where('subcon').equals(subcon)
    }
    // If not subcon and no subcon query parameter: no subcon filter applied

    // NEW: Apply same territory filter to total query
    if (territory && territory !== '') {
      totalQuery = totalQuery.where('territory').equals(territory)
    }

    if (status && status !== '') {
      totalQuery = totalQuery.where('status').equals(status)
    }

    if (assignedAt) {
      const targetDate = new Date(assignedAt)
      const startOfDay = new Date(targetDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(targetDate)
      endOfDay.setHours(23, 59, 59, 999)
      totalQuery = totalQuery.where('createdAt').gte(startOfDay).lt(endOfDay)
    }
    if (departedAt) {
      const targetDate = new Date(departedAt)
      const startOfDay = new Date(targetDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(targetDate)
      endOfDay.setHours(23, 59, 59, 999)
      totalQuery = totalQuery
        .where('departed')
        .gte(startOfDay.toISOString())
        .lt(endOfDay.toISOString())
    }
    const total = await totalQuery.countDocuments()

    return res.status(200).json({
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      deployments
    })
  } catch (error) {
    next(error)
  }
}

// Update deployment
const updateDeployment = async (req, res, next) => {
  try {
    const { id } = req.params
    const {
      // Pickup details
      pickupSite,
      municipality,
      fieldContactPerson,
      fieldContactPersonNo,
      scheduledPickupTime,
      estimatedQuantityKg,

      // Truck & Driver details
      truckId,
      driverId,
      truckType,
      helperCount,

      // Delivery details
      destination,
      receivingContactPerson,
      receivingContactPersonNo,
      hybrid,
      territory,
      flagging,
      flaggingRemarks,
      sacksCount,

      // Load details
      loadWeightKg,

      // Replacement details
      replacement,

      // Timeline details
      departed,
      pickupIn,
      pickupOut,
      destArrival,
      destDeparture,

      // Other tags
      subcon,
      status,
      cancellationReason,
      isTMOPrinted
    } = req.body

    // Check permissions
    if (!['head_admin', 'admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    // Validate cancellationReason when status is being changed to 'canceled'
    if (
      status === 'canceled' &&
      (!cancellationReason || cancellationReason.trim() === '')
    ) {
      return next(
        createError(
          400,
          'Cancellation reason is required when canceling a deployment'
        )
      )
    }

    // Find deployment
    const existingDeployment = await Deployment.findOne({
      _id: id,
      isSoftDeleted: { $ne: true }
    })

    if (!existingDeployment) {
      return next(createError(404, 'Deployment not found'))
    }

    // ✅ Validate TMO is printed before allowing departed updates
    if (departed !== undefined && departed !== null && departed.trim() !== '') {
      const currentIsTMOPrinted =
        isTMOPrinted !== undefined
          ? isTMOPrinted
          : existingDeployment.isTMOPrinted

      if (!currentIsTMOPrinted) {
        return next(
          createError(
            400,
            'TMO must be exported/printed before updating departure time'
          )
        )
      }
    }

    // Get deployment code for logging
    const deploymentCode = existingDeployment.deploymentCode

    // Extract IDs
    const extractedTruckId = truckId?._id || truckId
    const extractedDriverId = driverId?._id || driverId

    // Store original values
    const originalValues = {
      // Pickup details
      pickupSite: existingDeployment.pickupSite,
      municipality: existingDeployment.municipality,
      fieldContactPerson: existingDeployment.fieldContactPerson,
      fieldContactPersonNo: existingDeployment.fieldContactPersonNo,
      scheduledPickupTime: existingDeployment.scheduledPickupTime,
      estimatedQuantityKg: existingDeployment.estimatedQuantityKg,

      // Truck & Driver details
      truckId: existingDeployment.truckId?.toString(),
      driverId: existingDeployment.driverId?.toString(),
      truckType: existingDeployment.truckType,
      helperCount: existingDeployment.helperCount,

      // Delivery details
      destination: existingDeployment.destination,
      receivingContactPerson: existingDeployment.receivingContactPerson,
      receivingContactPersonNo: existingDeployment.receivingContactPersonNo,
      hybrid: existingDeployment.hybrid,
      territory: existingDeployment.territory,
      flagging: existingDeployment.flagging,
      flaggingRemarks: existingDeployment.flaggingRemarks,
      sacksCount: existingDeployment.sacksCount,

      // Load details
      loadWeightKg: existingDeployment.loadWeightKg,

      // Timeline details
      departed: existingDeployment.departed,
      pickupIn: existingDeployment.pickupIn,
      pickupOut: existingDeployment.pickupOut,
      destArrival: existingDeployment.destArrival,
      destDeparture: existingDeployment.destDeparture,

      // Other tags
      subcon: existingDeployment.subcon,
      status: existingDeployment.status,
      cancellationReason: existingDeployment.cancellationReason,
      isTMOPrinted: existingDeployment.isTMOPrinted,

      // Replacement details
      replacementTruckId:
        existingDeployment.replacement?.replacementTruckId?.toString(),
      replacementDriverId:
        existingDeployment.replacement?.replacementDriverId?.toString()
    }

    const originalStatus = existingDeployment.status
    const hasExistingReplacement =
      existingDeployment.replacement?.replacementTruckId
    const hasExistingDriverReplacement =
      existingDeployment.replacement?.replacementDriverId

    // Determine active resources (for trip count)
    const activeTruckId = hasExistingReplacement
      ? existingDeployment.replacement.replacementTruckId
      : existingDeployment.truckId
    const activeDriverId = hasExistingDriverReplacement
      ? existingDeployment.replacement.replacementDriverId
      : existingDeployment.driverId

    // Track replacements
    let performedReplacement = false
    let performedDriverReplacement = false
    let replacementTruckDetails = null
    let replacementDriverDetails = null
    let newSubcon = existingDeployment.subcon

    // Helper function to create timeline log for replacement
    const createReplacementTimelineLog = async (action, timestamp) => {
      await TimelineLog.create({
        performedBy: req.user._id,
        action,
        status: existingDeployment.status,
        timestamp: timestamp || new Date(),
        targetDeployment: existingDeployment._id
      })
    }

    // Handle truck replacement
    if (replacement?.replacementTruckId) {
      const replacementTruckId =
        replacement.replacementTruckId._id || replacement.replacementTruckId
      const isNewReplacement =
        !hasExistingReplacement ||
        hasExistingReplacement.toString() !== replacementTruckId.toString()

      if (isNewReplacement) {
        performedReplacement = true

        const [newTruck, oldTruck, oldReplacementTruck] = await Promise.all([
          Truck.findById(replacementTruckId),
          Truck.findById(existingDeployment.truckId),
          hasExistingReplacement
            ? Truck.findById(existingDeployment.replacement.replacementTruckId)
            : Promise.resolve(null)
        ])

        const oldPlateNo = (oldTruck?.plateNo || 'Unknown').toUpperCase()
        const newPlateNo = (newTruck?.plateNo || 'Unknown').toUpperCase()
        const oldReplacementPlateNo = (
          oldReplacementTruck?.plateNo || 'Unknown'
        ).toUpperCase()

        replacementTruckDetails = {
          oldPlateNo,
          newPlateNo,
          oldReplacementPlateNo,
          newTruck: newTruck,
          oldTruck: oldTruck,
          oldReplacementTruck: oldReplacementTruck
        }

        if (newTruck) {
          newSubcon = newTruck.subcon
        }

        const updatePromises = []

        updatePromises.push(
          Truck.findByIdAndUpdate(replacementTruckId, { status: 'deployed' })
        )

        if (hasExistingReplacement && oldReplacementTruck) {
          updatePromises.push(
            Truck.findByIdAndUpdate(
              existingDeployment.replacement.replacementTruckId,
              { status: 'available' }
            )
          )
        }

        if (!hasExistingReplacement) {
          updatePromises.push(
            Truck.findByIdAndUpdate(existingDeployment.truckId, {
              status: 'available'
            })
          )
        }

        await Promise.all(updatePromises)

        if (hasExistingReplacement) {
          await createReplacementTimelineLog(
            `Truck ${oldReplacementPlateNo} has been replaced to ${newPlateNo}`,
            replacement?.replacedAt || new Date()
          )
        } else {
          await createReplacementTimelineLog(
            `Truck ${oldPlateNo} has been replaced to ${newPlateNo}`,
            replacement?.replacedAt || new Date()
          )
        }
      }

      existingDeployment.replacement = {
        replacementTruckId,
        replacementDriverId:
          replacement.replacementDriverId?._id ||
          replacement.replacementDriverId ||
          existingDeployment.replacement?.replacementDriverId,
        replacementTruckType:
          replacement.replacementTruckType ||
          existingDeployment.replacement?.replacementTruckType ||
          existingDeployment.truckType,
        replacementHelperCount:
          replacement.replacementHelperCount ||
          existingDeployment.replacement?.replacementHelperCount ||
          existingDeployment.helperCount,
        replacedAt: replacement.replacedAt || new Date().toISOString(),
        reason: replacement.reason,
        remarks: replacement.remarks
      }
    }

    // Handle driver replacement
    if (replacement?.replacementDriverId) {
      const replacementDriverId =
        replacement.replacementDriverId._id || replacement.replacementDriverId
      const isNewDriverReplacement =
        !hasExistingDriverReplacement ||
        hasExistingDriverReplacement.toString() !==
          replacementDriverId.toString()

      if (isNewDriverReplacement) {
        performedDriverReplacement = true

        const [newDriver, oldDriver, oldReplacementDriver] = await Promise.all([
          Driver.findById(replacementDriverId),
          existingDeployment.driverId
            ? Driver.findById(existingDeployment.driverId)
            : null,
          hasExistingDriverReplacement
            ? Driver.findById(
                existingDeployment.replacement.replacementDriverId
              )
            : Promise.resolve(null)
        ])

        replacementDriverDetails = {
          oldDriverName: oldDriver
            ? `${oldDriver.firstname} ${oldDriver.lastname}`
            : 'Unknown',
          newDriverName: newDriver
            ? `${newDriver.firstname} ${newDriver.lastname}`
            : 'Unknown',
          oldReplacementDriverName: oldReplacementDriver
            ? `${oldReplacementDriver.firstname} ${oldReplacementDriver.lastname}`
            : 'Unknown',
          newDriver: newDriver,
          oldDriver: oldDriver,
          oldReplacementDriver: oldReplacementDriver
        }

        const updatePromises = []

        updatePromises.push(
          Driver.findByIdAndUpdate(replacementDriverId, { status: 'deployed' })
        )

        if (hasExistingDriverReplacement && oldReplacementDriver) {
          updatePromises.push(
            Driver.findByIdAndUpdate(
              existingDeployment.replacement.replacementDriverId,
              { status: 'available' }
            )
          )
        }

        if (!hasExistingDriverReplacement) {
          updatePromises.push(
            Driver.findByIdAndUpdate(existingDeployment.driverId, {
              status: 'available'
            })
          )
        }

        await Promise.all(updatePromises)

        if (hasExistingDriverReplacement) {
          await createReplacementTimelineLog(
            `Driver ${replacementDriverDetails.oldReplacementDriverName} has been replaced to ${replacementDriverDetails.newDriverName}`,
            replacement?.replacedAt || new Date()
          )
        } else {
          await createReplacementTimelineLog(
            `Driver ${replacementDriverDetails.oldDriverName} has been replaced to ${replacementDriverDetails.newDriverName}`,
            replacement?.replacedAt || new Date()
          )
        }
      }

      if (existingDeployment.replacement) {
        existingDeployment.replacement.replacementDriverId = replacementDriverId
        if (replacement.replacedAt)
          existingDeployment.replacement.replacedAt = replacement.replacedAt
        if (replacement.reason)
          existingDeployment.replacement.reason = replacement.reason
        if (replacement.remarks)
          existingDeployment.replacement.remarks = replacement.remarks
      } else {
        existingDeployment.replacement = {
          replacementTruckId: existingDeployment.truckId,
          replacementDriverId,
          replacementTruckType: existingDeployment.truckType,
          replacementHelperCount: existingDeployment.helperCount,
          replacedAt: replacement.replacedAt || new Date().toISOString(),
          reason: replacement.reason,
          remarks: replacement.remarks
        }
      }
    }

    // Handle regular truck change (not replacement)
    if (
      extractedTruckId &&
      extractedTruckId.toString() !== originalValues.truckId
    ) {
      if (!performedReplacement) {
        const newTruck = await Truck.findById(extractedTruckId)
        const oldTruck = await Truck.findById(originalValues.truckId)

        if (newTruck) {
          newSubcon = newTruck.subcon

          const oldPlateNo = (oldTruck?.plateNo || 'Unknown').toUpperCase()
          const newPlateNo = (newTruck?.plateNo || 'Unknown').toUpperCase()

          await createReplacementTimelineLog(
            `Truck ${oldPlateNo} has been changed to ${newPlateNo}`
          )
        }
      }
    }

    // Handle regular driver change (not replacement)
    if (
      extractedDriverId &&
      extractedDriverId.toString() !== originalValues.driverId &&
      !performedDriverReplacement
    ) {
      const newDriver = await Driver.findById(extractedDriverId)
      const oldDriver = await Driver.findById(originalValues.driverId)

      if (newDriver) {
        const oldDriverName = oldDriver
          ? `${oldDriver.firstname} ${oldDriver.lastname}`
          : 'Unknown'
        const newDriverName = `${newDriver.firstname} ${newDriver.lastname}`

        await createReplacementTimelineLog(
          `Driver ${oldDriverName} has been changed to ${newDriverName}`
        )
      }
    }

    // Determine final status
    const isDepartedSet =
      departed !== undefined && departed !== '' && departed !== null
    const isDestDepartureSet =
      destDeparture !== undefined &&
      destDeparture !== '' &&
      destDeparture !== null

    let finalStatus = status || existingDeployment.status
    if (isDepartedSet && !isDestDepartureSet && finalStatus !== 'canceled') {
      finalStatus = 'ongoing'
    } else if (isDestDepartureSet && finalStatus !== 'canceled') {
      finalStatus = 'completed'
    }

    // Handle cancellationReason
    let finalCancellationReason = existingDeployment.cancellationReason

    if (originalStatus === 'canceled' && finalStatus !== 'canceled') {
      finalCancellationReason = undefined
    }

    if (finalStatus === 'canceled' && originalStatus !== 'canceled') {
      finalCancellationReason = cancellationReason
    }

    if (
      originalStatus === 'canceled' &&
      finalStatus === 'canceled' &&
      cancellationReason !== undefined
    ) {
      finalCancellationReason = cancellationReason
    }

    // Recalculate active IDs AFTER processing replacements
    const currentActiveTruckId = performedReplacement
      ? replacement?.replacementTruckId?._id ||
        replacement?.replacementTruckId ||
        existingDeployment.truckId
      : hasExistingReplacement
      ? existingDeployment.replacement.replacementTruckId
      : existingDeployment.truckId

    const currentActiveDriverId = performedDriverReplacement
      ? replacement?.replacementDriverId?._id ||
        replacement?.replacementDriverId ||
        existingDeployment.driverId
      : hasExistingDriverReplacement
      ? existingDeployment.replacement.replacementDriverId
      : existingDeployment.driverId

    // Handle status-based resource updates
    const statusUpdates = []
    if (
      finalStatus === 'canceled' ||
      (isDestDepartureSet && finalStatus === 'completed')
    ) {
      if (currentActiveTruckId) {
        statusUpdates.push(
          Truck.findByIdAndUpdate(currentActiveTruckId, { status: 'available' })
        )
      }
      if (currentActiveDriverId) {
        statusUpdates.push(
          Driver.findByIdAndUpdate(currentActiveDriverId, {
            status: 'available'
          })
        )
      }
    } else if (finalStatus === 'ongoing' || finalStatus === 'preparing') {
      if (
        currentActiveTruckId &&
        !performedReplacement &&
        (!hasExistingReplacement ||
          currentActiveTruckId.toString() !== originalValues.truckId)
      ) {
        statusUpdates.push(
          Truck.findByIdAndUpdate(currentActiveTruckId, { status: 'deployed' })
        )
      }
      if (
        currentActiveDriverId &&
        !performedDriverReplacement &&
        (!hasExistingDriverReplacement ||
          currentActiveDriverId.toString() !== originalValues.driverId)
      ) {
        statusUpdates.push(
          Driver.findByIdAndUpdate(currentActiveDriverId, {
            status: 'deployed'
          })
        )
      }
    }
    await Promise.all(statusUpdates)

    // Handle truck change - ONLY if no replacement happened
    if (
      extractedTruckId &&
      extractedTruckId.toString() !== originalValues.truckId &&
      !hasExistingReplacement &&
      !performedReplacement
    ) {
      const updates = []
      if (originalValues.truckId) {
        updates.push(
          Truck.findByIdAndUpdate(originalValues.truckId, {
            status: 'available'
          })
        )
      }
      if (finalStatus !== 'canceled' && finalStatus !== 'completed') {
        updates.push(
          Truck.findByIdAndUpdate(extractedTruckId, { status: 'deployed' })
        )
      }
      await Promise.all(updates)
    }

    // Handle driver change - ONLY if no replacement happened
    if (
      extractedDriverId &&
      extractedDriverId.toString() !== originalValues.driverId &&
      !hasExistingDriverReplacement &&
      !performedDriverReplacement
    ) {
      const updates = []
      if (originalValues.driverId) {
        updates.push(
          Driver.findByIdAndUpdate(originalValues.driverId, {
            status: 'available'
          })
        )
      }
      if (finalStatus !== 'canceled' && finalStatus !== 'completed') {
        updates.push(
          Driver.findByIdAndUpdate(extractedDriverId, { status: 'deployed' })
        )
      }
      await Promise.all(updates)
    }

    // INCREMENT TRIP COUNTS ON COMPLETION
    if (finalStatus === 'completed' && originalStatus !== 'completed') {
      const tripUpdates = []

      if (currentActiveDriverId) {
        tripUpdates.push(
          Driver.findByIdAndUpdate(currentActiveDriverId, {
            $inc: { tripCount: 1 }
          })
        )
      }

      if (currentActiveTruckId) {
        tripUpdates.push(
          Truck.findByIdAndUpdate(currentActiveTruckId, {
            $inc: { tripCount: 1 }
          })
        )
      }

      try {
        await Promise.all(tripUpdates)
      } catch (error) {
        console.error('Error incrementing trip counts:', error)
      }
    }

    // Update deployment fields
    const updateObj = {
      // Pickup details
      pickupSite:
        pickupSite !== undefined ? pickupSite : existingDeployment.pickupSite,
      municipality:
        municipality !== undefined
          ? municipality
          : existingDeployment.municipality,
      fieldContactPerson:
        fieldContactPerson !== undefined
          ? fieldContactPerson
          : existingDeployment.fieldContactPerson,
      fieldContactPersonNo:
        fieldContactPersonNo !== undefined
          ? fieldContactPersonNo
          : existingDeployment.fieldContactPersonNo,
      scheduledPickupTime:
        scheduledPickupTime !== undefined
          ? scheduledPickupTime
          : existingDeployment.scheduledPickupTime,
      estimatedQuantityKg:
        estimatedQuantityKg !== undefined
          ? estimatedQuantityKg
          : existingDeployment.estimatedQuantityKg,

      // Truck & Driver details
      truckId: extractedTruckId || existingDeployment.truckId,
      driverId: extractedDriverId || existingDeployment.driverId,
      truckType:
        truckType !== undefined ? truckType : existingDeployment.truckType,
      helperCount:
        helperCount !== undefined
          ? helperCount
          : existingDeployment.helperCount,

      // Delivery details
      destination:
        destination !== undefined
          ? destination
          : existingDeployment.destination,
      receivingContactPerson:
        receivingContactPerson !== undefined
          ? receivingContactPerson
          : existingDeployment.receivingContactPerson,
      receivingContactPersonNo:
        receivingContactPersonNo !== undefined
          ? receivingContactPersonNo
          : existingDeployment.receivingContactPersonNo,
      hybrid: hybrid !== undefined ? hybrid : existingDeployment.hybrid,
      territory:
        territory !== undefined ? territory : existingDeployment.territory,
      flagging: flagging !== undefined ? flagging : existingDeployment.flagging,
      flaggingRemarks:
        flaggingRemarks !== undefined
          ? flaggingRemarks
          : existingDeployment.flaggingRemarks,
      sacksCount:
        sacksCount !== undefined ? sacksCount : existingDeployment.sacksCount,

      // Load details
      loadWeightKg:
        loadWeightKg !== undefined
          ? loadWeightKg
          : existingDeployment.loadWeightKg,

      // Timeline details
      departed: departed !== undefined ? departed : existingDeployment.departed,
      pickupIn: pickupIn !== undefined ? pickupIn : existingDeployment.pickupIn,
      pickupOut:
        pickupOut !== undefined ? pickupOut : existingDeployment.pickupOut,
      destArrival:
        destArrival !== undefined
          ? destArrival
          : existingDeployment.destArrival,
      destDeparture:
        destDeparture !== undefined
          ? destDeparture
          : existingDeployment.destDeparture,

      // Other tags
      subcon: newSubcon,
      status:
        finalStatus !== undefined ? finalStatus : existingDeployment.status,
      cancellationReason: finalCancellationReason,
      isTMOPrinted:
        isTMOPrinted !== undefined
          ? isTMOPrinted
          : existingDeployment.isTMOPrinted
    }

    // Validate that subcon is not empty
    if (!updateObj.subcon || updateObj.subcon.trim() === '') {
      return next(createError(400, 'Subcon is required'))
    }

    Object.assign(existingDeployment, updateObj)
    await existingDeployment.save()

    // Create logs
    const timelineLogs = []
    const activityLogs = []

    // Helper to create or update timeline log
    const createOrUpdateTimelineLog = async (
      actionType,
      newTimestamp,
      logStatus
    ) => {
      const actionMap = {
        departed: 'Departed from station',
        pickupIn: 'Arrived at pickup location',
        pickupOut: 'Departed from pickup location',
        destArrival: 'Arrived at destination',
        destDeparture: 'Departed from destination',
        canceled: 'Deployment has been canceled'
      }

      const action = actionMap[actionType]

      if (!action) {
        console.error(`Invalid action type: ${actionType}`)
        return
      }

      const existingLog = await TimelineLog.findOne({
        targetDeployment: existingDeployment._id,
        action: { $regex: `^${action}` }
      }).sort({ timestamp: -1 })

      if (existingLog) {
        existingLog.timestamp = newTimestamp
        existingLog.status = logStatus
        await existingLog.save()
        timelineLogs.push(`${action} (updated)`)
      } else {
        await TimelineLog.create({
          performedBy: req.user._id,
          action,
          status: logStatus,
          timestamp: newTimestamp,
          targetDeployment: existingDeployment._id
        })
        timelineLogs.push(action)
      }
    }

    // Helper to create activity log
    const createActivityLog = async action => {
      await ActivityLog.create({
        type: 'deployment',
        performedBy: req.user._id,
        action: `${deploymentCode}: ${action}`,
        targetDeployment: existingDeployment._id
      })
      activityLogs.push(action)
    }

    // Status change logs
    const now = DateTime.now().setZone('Asia/Manila').toISO()

    if (finalStatus === 'canceled' && originalStatus !== 'canceled') {
      await TimelineLog.create({
        performedBy: req.user._id,
        action: 'Deployment has been canceled',
        status: 'canceled',
        timestamp: now,
        targetDeployment: existingDeployment._id
      })
      timelineLogs.push('Deployment has been canceled')
    } else if (finalStatus === 'canceled' && originalStatus === 'canceled') {
      const latestCancelLog = await TimelineLog.findOne({
        targetDeployment: existingDeployment._id,
        action: 'Deployment has been canceled',
        status: 'canceled'
      }).sort({ timestamp: -1 })

      let shouldCreateNewCancelLog = false
      if (latestCancelLog) {
        const resumedLogAfterCancel = await TimelineLog.findOne({
          targetDeployment: existingDeployment._id,
          action: /^Deployment resumed as/,
          timestamp: { $gt: latestCancelLog.timestamp }
        })

        if (resumedLogAfterCancel) {
          shouldCreateNewCancelLog = true
        }
      }

      if (shouldCreateNewCancelLog || !latestCancelLog) {
        await TimelineLog.create({
          performedBy: req.user._id,
          action: 'Deployment has been canceled',
          status: 'canceled',
          timestamp: now,
          targetDeployment: existingDeployment._id
        })
        timelineLogs.push('Deployment has been canceled')
      } else {
        latestCancelLog.timestamp = now
        await latestCancelLog.save()
        timelineLogs.push('Deployment has been canceled (timestamp updated)')
      }
    }

    if (originalStatus === 'canceled' && finalStatus !== 'canceled') {
      const statusMap = {
        preparing: 'preparing',
        ongoing: 'ongoing',
        completed: 'completed'
      }
      await TimelineLog.create({
        performedBy: req.user._id,
        action: `Deployment resumed as ${
          statusMap[finalStatus] || finalStatus
        }`,
        status: finalStatus,
        timestamp: now,
        targetDeployment: existingDeployment._id
      })
      timelineLogs.push('Deployment resumed')
    }

    // Timeline logs - only if field was empty before
    if (
      departed !== undefined &&
      departed !== originalValues.departed &&
      departed &&
      !originalValues.departed &&
      finalStatus !== 'canceled'
    ) {
      await createOrUpdateTimelineLog(
        'departed',
        departed,
        finalStatus || 'ongoing'
      )
      await createActivityLog('Departed from station')
    }

    if (
      pickupIn !== undefined &&
      pickupIn !== originalValues.pickupIn &&
      pickupIn &&
      !originalValues.pickupIn &&
      finalStatus !== 'canceled'
    ) {
      await createOrUpdateTimelineLog(
        'pickupIn',
        pickupIn,
        finalStatus || 'ongoing'
      )
      await createActivityLog('Arrived at pickup location')
    }

    if (
      pickupOut !== undefined &&
      pickupOut !== originalValues.pickupOut &&
      pickupOut &&
      !originalValues.pickupOut &&
      finalStatus !== 'canceled'
    ) {
      await createOrUpdateTimelineLog(
        'pickupOut',
        pickupOut,
        finalStatus || 'ongoing'
      )
      await createActivityLog('Departed from pickup location')
    }

    if (
      destArrival !== undefined &&
      destArrival !== originalValues.destArrival &&
      destArrival &&
      !originalValues.destArrival &&
      finalStatus !== 'canceled'
    ) {
      await createOrUpdateTimelineLog(
        'destArrival',
        destArrival,
        finalStatus || 'ongoing'
      )
      await createActivityLog('Arrived at destination')
    }

    if (
      destDeparture !== undefined &&
      destDeparture !== originalValues.destDeparture &&
      destDeparture &&
      !originalValues.destDeparture &&
      finalStatus !== 'canceled'
    ) {
      await createOrUpdateTimelineLog(
        'destDeparture',
        destDeparture,
        'completed'
      )
      await createActivityLog('Departed from destination')
    }

    // Activity logs for truck replacement
    if (performedReplacement && replacementTruckDetails) {
      if (hasExistingReplacement) {
        await createActivityLog(
          `Replacement truck changed from ${replacementTruckDetails.oldReplacementPlateNo} to ${replacementTruckDetails.newPlateNo}`
        )
      } else {
        await createActivityLog(
          `Truck replaced from ${replacementTruckDetails.oldPlateNo} to ${replacementTruckDetails.newPlateNo}`
        )
      }
    }

    // Activity logs for driver replacement
    if (performedDriverReplacement && replacementDriverDetails) {
      if (hasExistingDriverReplacement) {
        await createActivityLog(
          `Replacement driver changed from ${replacementDriverDetails.oldReplacementDriverName} to ${replacementDriverDetails.newDriverName}`
        )
      } else {
        await createActivityLog(
          `Driver replaced from ${replacementDriverDetails.oldDriverName} to ${replacementDriverDetails.newDriverName}`
        )
      }
    }

    // Activity logs for field changes
    if (
      extractedTruckId !== undefined &&
      extractedTruckId.toString() !== originalValues.truckId &&
      !performedReplacement
    ) {
      const newTruck = await Truck.findById(extractedTruckId)
      const plateNo = (newTruck?.plateNo || 'Unknown').toUpperCase()
      await createActivityLog(`Truck changed to ${plateNo}`)
    }

    if (
      extractedDriverId !== undefined &&
      extractedDriverId.toString() !== originalValues.driverId &&
      !performedDriverReplacement
    ) {
      const newDriver = await Driver.findById(extractedDriverId)
      const name = newDriver
        ? `${newDriver.firstname} ${newDriver.lastname}`
        : 'Unknown'
      await createActivityLog(`Driver changed to ${name}`)
    }

    // Activity logs for other field changes
    if (truckType !== undefined && truckType !== originalValues.truckType) {
      await createActivityLog(`Truck type changed to ${truckType}`)
    }

    if (
      helperCount !== undefined &&
      helperCount !== originalValues.helperCount
    ) {
      await createActivityLog(`Helper count changed to ${helperCount}`)
    }

    if (pickupSite !== undefined && pickupSite !== originalValues.pickupSite) {
      await createActivityLog(`Pickup site changed to ${pickupSite}`)
    }

    if (
      municipality !== undefined &&
      municipality !== originalValues.municipality
    ) {
      await createActivityLog(`Municipality changed to ${municipality}`)
    }

    if (
      fieldContactPerson !== undefined &&
      fieldContactPerson !== originalValues.fieldContactPerson
    ) {
      await createActivityLog(
        `Field contact person changed to ${fieldContactPerson}`
      )
    }

    if (
      fieldContactPersonNo !== undefined &&
      fieldContactPersonNo !== originalValues.fieldContactPersonNo
    ) {
      await createActivityLog(`Field contact person number changed`)
    }

    if (
      scheduledPickupTime !== undefined &&
      scheduledPickupTime !== originalValues.scheduledPickupTime
    ) {
      await createActivityLog(
        `Scheduled pickup time changed to ${scheduledPickupTime}`
      )
    }

    if (
      estimatedQuantityKg !== undefined &&
      estimatedQuantityKg !== originalValues.estimatedQuantityKg
    ) {
      await createActivityLog(
        `Estimated quantity changed to ${estimatedQuantityKg} kg`
      )
    }

    if (
      destination !== undefined &&
      destination !== originalValues.destination
    ) {
      await createActivityLog(`Destination changed to ${destination}`)
    }

    if (
      receivingContactPerson !== undefined &&
      receivingContactPerson !== originalValues.receivingContactPerson
    ) {
      await createActivityLog(
        `Receiving contact person changed to ${receivingContactPerson}`
      )
    }

    if (
      receivingContactPersonNo !== undefined &&
      receivingContactPersonNo !== originalValues.receivingContactPersonNo
    ) {
      await createActivityLog(`Receiving contact person number changed`)
    }

    if (sacksCount !== undefined && sacksCount !== originalValues.sacksCount) {
      await createActivityLog(`Sacks count changed to ${sacksCount}`)
    }

    if (
      loadWeightKg !== undefined &&
      loadWeightKg !== originalValues.loadWeightKg
    ) {
      await createActivityLog(`Load weight changed to ${loadWeightKg} kg`)
    }

    if (finalStatus !== undefined && finalStatus !== originalStatus) {
      await createActivityLog(`Status changed to ${finalStatus}`)
    }

    if (territory !== undefined && territory !== originalValues.territory) {
      await createActivityLog(`Territory changed to ${territory}`)
    }

    if (hybrid !== undefined && hybrid !== originalValues.hybrid) {
      await createActivityLog(`Hybrid changed to ${hybrid}`)
    }

    if (flagging !== undefined && flagging !== originalValues.flagging) {
      await createActivityLog(`Flagging changed to ${flagging}`)
    }

    if (
      flaggingRemarks !== undefined &&
      flaggingRemarks !== originalValues.flaggingRemarks
    ) {
      await createActivityLog(`Flagging remarks updated`)
    }

    if (newSubcon !== originalValues.subcon) {
      await createActivityLog(`Subcon changed to ${newSubcon}`)
    }

    if (finalCancellationReason !== originalValues.cancellationReason) {
      if (finalStatus === 'canceled' && finalCancellationReason) {
        await createActivityLog(
          `Cancellation reason: ${finalCancellationReason}`
        )
      } else if (originalStatus === 'canceled' && !finalCancellationReason) {
        await createActivityLog(`Cancellation reason cleared`)
      } else if (finalCancellationReason && originalValues.cancellationReason) {
        await createActivityLog(
          `Cancellation reason updated to: ${finalCancellationReason}`
        )
      }
    }

    if (
      isTMOPrinted !== undefined &&
      isTMOPrinted !== originalValues.isTMOPrinted
    ) {
      await createActivityLog(
        `TMO ${isTMOPrinted ? 'exported and printed' : 'not exported'}`
      )
    }

    // Populate and return
    const populatedDeployment = await Deployment.findById(id)
      .populate('truckId')
      .populate('driverId')
      .populate('replacement.replacementTruckId')
      .populate('replacement.replacementDriverId')

    res.status(200).json({
      message: 'Deployment updated successfully',
      deployment: populatedDeployment,
      timelineUpdates: timelineLogs.length > 0 ? timelineLogs : undefined
    })
  } catch (error) {
    next(error)
  }
}

module.exports = { updateDeployment }

// delete deployment
const softDeleteDeployment = async (req, res, next) => {
  try {
    const { id } = req.params

    // Check permissions
    if (!['head_admin', 'admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    // Find deployment - exclude already soft deleted
    const deployment = await Deployment.findOne({
      _id: id,
      isSoftDeleted: { $ne: true }
    })

    if (!deployment) {
      return next(createError(404, 'Deployment not found'))
    }

    // Determine active resources
    const activeTruckId =
      deployment.replacement?.replacementTruckId || deployment.truckId
    const activeDriverId =
      deployment.replacement?.replacementDriverId || deployment.driverId

    const updates = []
    if (activeTruckId) {
      updates.push(
        Truck.findByIdAndUpdate(activeTruckId, { status: 'available' })
      )
    }
    if (activeDriverId) {
      updates.push(
        Driver.findByIdAndUpdate(activeDriverId, { status: 'available' })
      )
    }
    await Promise.all(updates)

    // Get deployment code BEFORE soft deleting (for logging and timeline deletion)
    const deploymentCode = deployment.deploymentCode

    // Initialize variable for timeline log deletion count
    let timelineLogsDeleted = 0

    // Permanently delete all timeline logs associated with this deployment
    try {
      const deleteResult = await TimelineLog.deleteMany({
        targetDeployment: deployment._id
      })

      timelineLogsDeleted = deleteResult.deletedCount
      console.log(
        `Deleted ${timelineLogsDeleted} timeline logs for deployment ${deploymentCode}`
      )
    } catch (timelineError) {
      console.error(
        `Error deleting timeline logs for deployment ${deploymentCode}:`,
        timelineError
      )
      // Continue with soft deletion even if timeline deletion fails
    }

    // Soft delete the deployment
    deployment.isSoftDeleted = true
    await deployment.save()

    // Create activity log
    await ActivityLog.create({
      type: 'deployment',
      performedBy: req.user._id,
      action: `${deploymentCode}: Deployment deleted (${timelineLogsDeleted} timeline logs removed)`,
      targetDeployment: deployment._id
    })

    res.status(200).json({
      message: 'Deployment deleted successfully',
      deploymentCode: deploymentCode,
      timelineLogsDeleted: timelineLogsDeleted
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createDeployment,
  getAllDeployments,
  updateDeployment,
  softDeleteDeployment
}
