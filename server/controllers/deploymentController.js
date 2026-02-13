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
      truckId,
      driverId,
      truckType,
      helperCount,
      pickupSite,
      destination,
      sacksCount,
      loadWeightKg,
      status,
      departed,
      pickupIn,
      pickupOut,
      destArrival,
      destDeparture,
      replacement,
      territory,
      hybrid,
      flagging,
      flaggingRemarks,
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

    // ✅ NEW: Validate TMO is printed before allowing departed updates (EARLY CATCH)
    if (departed !== undefined && departed !== null && departed.trim() !== '') {
      // Determine the current isTMOPrinted value
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

    // Store original values including cancellationReason
    const originalValues = {
      truckId: existingDeployment.truckId?.toString(),
      driverId: existingDeployment.driverId?.toString(),
      truckType: existingDeployment.truckType,
      helperCount: existingDeployment.helperCount,
      pickupSite: existingDeployment.pickupSite,
      destination: existingDeployment.destination,
      sacksCount: existingDeployment.sacksCount,
      loadWeightKg: existingDeployment.loadWeightKg,
      status: existingDeployment.status,
      departed: existingDeployment.departed,
      pickupIn: existingDeployment.pickupIn,
      pickupOut: existingDeployment.pickupOut,
      destArrival: existingDeployment.destArrival,
      destDeparture: existingDeployment.destDeparture,
      territory: existingDeployment.territory,
      hybrid: existingDeployment.hybrid,
      flagging: existingDeployment.flagging,
      flaggingRemarks: existingDeployment.flaggingRemarks,
      cancellationReason: existingDeployment.cancellationReason, // NEW
      subcon: existingDeployment.subcon,
      isTMOPrinted: existingDeployment.isTMOPrinted,
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
    let newSubcon = existingDeployment.subcon // Track subcon updates

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

        // Get truck details for logging and subcon
        const [newTruck, oldTruck, oldReplacementTruck] = await Promise.all([
          Truck.findById(replacementTruckId),
          Truck.findById(existingDeployment.truckId),
          hasExistingReplacement
            ? Truck.findById(existingDeployment.replacement.replacementTruckId)
            : Promise.resolve(null)
        ])

        // Get plate numbers in UPPERCASE
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

        // Update subcon to match replacement truck's subcon
        if (newTruck) {
          newSubcon = newTruck.subcon
        }

        const updatePromises = []

        // Set new replacement truck to deployed
        updatePromises.push(
          Truck.findByIdAndUpdate(replacementTruckId, { status: 'deployed' })
        )

        // If there was an existing replacement truck, set it back to available
        if (hasExistingReplacement && oldReplacementTruck) {
          updatePromises.push(
            Truck.findByIdAndUpdate(
              existingDeployment.replacement.replacementTruckId,
              { status: 'available' }
            )
          )
        }

        // If this is the first replacement, set original truck to available
        if (!hasExistingReplacement) {
          updatePromises.push(
            Truck.findByIdAndUpdate(existingDeployment.truckId, {
              status: 'available'
            })
          )
        }

        await Promise.all(updatePromises)

        // CREATE TIMELINE LOG FOR TRUCK REPLACEMENT
        if (hasExistingReplacement) {
          // Updating an existing replacement
          await createReplacementTimelineLog(
            `Truck ${oldReplacementPlateNo} has been replaced to ${newPlateNo}`,
            replacement?.replacedAt || new Date()
          )
        } else {
          // First-time replacement
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

    // Handle driver replacement - COPYING THE SAME LOGIC AS TRUCK
    if (replacement?.replacementDriverId) {
      const replacementDriverId =
        replacement.replacementDriverId._id || replacement.replacementDriverId
      const isNewDriverReplacement =
        !hasExistingDriverReplacement ||
        hasExistingDriverReplacement.toString() !==
          replacementDriverId.toString()

      if (isNewDriverReplacement) {
        performedDriverReplacement = true

        // Get driver details for logging
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

        // Set new replacement driver to deployed
        updatePromises.push(
          Driver.findByIdAndUpdate(replacementDriverId, { status: 'deployed' })
        )

        // If there was an existing replacement driver, set it back to available
        if (hasExistingDriverReplacement && oldReplacementDriver) {
          updatePromises.push(
            Driver.findByIdAndUpdate(
              existingDeployment.replacement.replacementDriverId,
              { status: 'available' }
            )
          )
        }

        // If this is the first replacement, set original driver to available
        if (!hasExistingDriverReplacement) {
          updatePromises.push(
            Driver.findByIdAndUpdate(existingDeployment.driverId, {
              status: 'available'
            })
          )
        }

        await Promise.all(updatePromises)

        // CREATE TIMELINE LOG FOR DRIVER REPLACEMENT
        if (hasExistingDriverReplacement) {
          // Updating an existing replacement
          await createReplacementTimelineLog(
            `Driver ${replacementDriverDetails.oldReplacementDriverName} has been replaced to ${replacementDriverDetails.newDriverName}`,
            replacement?.replacedAt || new Date()
          )
        } else {
          // First-time replacement
          await createReplacementTimelineLog(
            `Driver ${replacementDriverDetails.oldDriverName} has been replaced to ${replacementDriverDetails.newDriverName}`,
            replacement?.replacedAt || new Date()
          )
        }
      }

      // Update replacement object for driver
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

    // Handle regular truck change (not replacement) - FIXED SUBCON LOGIC
    if (
      extractedTruckId &&
      extractedTruckId.toString() !== originalValues.truckId
    ) {
      // Get the new truck to update subcon - ONLY if not already handled by replacement
      if (!performedReplacement) {
        const newTruck = await Truck.findById(extractedTruckId)
        const oldTruck = await Truck.findById(originalValues.truckId)

        if (newTruck) {
          newSubcon = newTruck.subcon // Update subcon to new truck's subcon

          // Get plate numbers in UPPERCASE
          const oldPlateNo = (oldTruck?.plateNo || 'Unknown').toUpperCase()
          const newPlateNo = (newTruck?.plateNo || 'Unknown').toUpperCase()

          // CREATE TIMELINE LOG FOR REGULAR TRUCK CHANGE (not replacement)
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

        // CREATE TIMELINE LOG FOR REGULAR DRIVER CHANGE (not replacement)
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

    // Clear cancellationReason if status is changing FROM canceled TO another status
    if (originalStatus === 'canceled' && finalStatus !== 'canceled') {
      finalCancellationReason = undefined
    }

    // Set cancellationReason if status is changing TO canceled
    if (finalStatus === 'canceled' && originalStatus !== 'canceled') {
      finalCancellationReason = cancellationReason
    }

    // Update cancellationReason if status is already canceled and reason is provided
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
      // Set current active resources to available
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
      // Set current active resources to deployed (only if not already done in replacement)
      if (
        currentActiveTruckId &&
        !performedReplacement && // Don't update if replacement was just performed
        (!hasExistingReplacement ||
          currentActiveTruckId.toString() !== originalValues.truckId)
      ) {
        statusUpdates.push(
          Truck.findByIdAndUpdate(currentActiveTruckId, { status: 'deployed' })
        )
      }
      if (
        currentActiveDriverId &&
        !performedDriverReplacement && // Don't update if driver replacement was just performed
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
      !performedReplacement // Don't run if replacement was just performed
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
      !performedDriverReplacement // Don't run if driver replacement was just performed
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
    // ===================================
    if (finalStatus === 'completed' && originalStatus !== 'completed') {
      const tripUpdates = []

      // 1. Increment DRIVER tripCount
      if (currentActiveDriverId) {
        tripUpdates.push(
          Driver.findByIdAndUpdate(currentActiveDriverId, {
            $inc: { tripCount: 1 }
          })
        )
      }

      // 2. Increment TRUCK tripCount
      if (currentActiveTruckId) {
        tripUpdates.push(
          Truck.findByIdAndUpdate(currentActiveTruckId, {
            $inc: { tripCount: 1 }
          })
        )
      }

      // 3. Execute both updates
      try {
        await Promise.all(tripUpdates)
      } catch (error) {
        console.error('Error incrementing trip counts:', error)
      }
    }
    // ===================================

    // Update deployment fields INCLUDING SUBCON, CANCELLATION REASON, AND NEW FIELDS
    const updateObj = {
      truckId: extractedTruckId || existingDeployment.truckId,
      driverId: extractedDriverId || existingDeployment.driverId,
      truckType: truckType || existingDeployment.truckType,
      helperCount:
        helperCount !== undefined
          ? helperCount
          : existingDeployment.helperCount,
      pickupSite: pickupSite || existingDeployment.pickupSite,
      destination: destination || existingDeployment.destination,
      sacksCount:
        sacksCount !== undefined ? sacksCount : existingDeployment.sacksCount,
      loadWeightKg:
        loadWeightKg !== undefined
          ? loadWeightKg
          : existingDeployment.loadWeightKg,
      status:
        finalStatus !== undefined ? finalStatus : existingDeployment.status,
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
      cancellationReason: finalCancellationReason, // NEW: Handle cancellation reason
      subcon: newSubcon, // Use the updated subcon value
      territory:
        territory !== undefined ? territory : existingDeployment.territory,
      hybrid: hybrid !== undefined ? hybrid : existingDeployment.hybrid,
      flagging: flagging !== undefined ? flagging : existingDeployment.flagging,
      flaggingRemarks:
        flaggingRemarks !== undefined
          ? flaggingRemarks
          : existingDeployment.flaggingRemarks,
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
      // Action types mapping
      const actionMap = {
        departed: 'Departed from station',
        pickupIn: 'Arrived at pickup location',
        pickupOut: 'Departed from pickup location',
        destArrival: 'Arrived at destination',
        destDeparture: 'Departed from destination',
        canceled: 'Deployment has been canceled'
      }

      const action = actionMap[actionType]

      // Validate action exists
      if (!action) {
        console.error(`Invalid action type: ${actionType}`)
        return
      }

      // Try to find existing timeline log for this action type
      const existingLog = await TimelineLog.findOne({
        targetDeployment: existingDeployment._id,
        action: { $regex: `^${action}` } // Match action starting with the text
      }).sort({ timestamp: -1 }) // Get the most recent one

      if (existingLog) {
        // Update existing log with new timestamp
        existingLog.timestamp = newTimestamp
        existingLog.status = logStatus
        await existingLog.save()
        timelineLogs.push(`${action} (updated)`)
      } else {
        // Create new log if none exists
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

    // Helper to create activity log (with deploymentCode)
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
      // Create a NEW timeline log for cancellation (not updating existing one)
      await TimelineLog.create({
        performedBy: req.user._id,
        action: 'Deployment has been canceled',
        status: 'canceled',
        timestamp: now,
        targetDeployment: existingDeployment._id
      })
      timelineLogs.push('Deployment has been canceled')
    } else if (finalStatus === 'canceled' && originalStatus === 'canceled') {
      // Already canceled - check if we should update timestamp or create new log
      // Look for the most recent canceled log
      const latestCancelLog = await TimelineLog.findOne({
        targetDeployment: existingDeployment._id,
        action: 'Deployment has been canceled',
        status: 'canceled'
      }).sort({ timestamp: -1 })

      // Look for any resumed logs after the canceled log
      let shouldCreateNewCancelLog = false
      if (latestCancelLog) {
        const resumedLogAfterCancel = await TimelineLog.findOne({
          targetDeployment: existingDeployment._id,
          action: /^Deployment resumed as/,
          timestamp: { $gt: latestCancelLog.timestamp }
        })

        // If there's a resumed log after the last cancel, create a new cancel log
        if (resumedLogAfterCancel) {
          shouldCreateNewCancelLog = true
        }
      }

      if (shouldCreateNewCancelLog || !latestCancelLog) {
        // Create new cancel log (either no previous cancel, or canceling after resume)
        await TimelineLog.create({
          performedBy: req.user._id,
          action: 'Deployment has been canceled',
          status: 'canceled',
          timestamp: now,
          targetDeployment: existingDeployment._id
        })
        timelineLogs.push('Deployment has been canceled')
      } else {
        // Update timestamp of existing cancel log
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
      // Create a new log for resume (not updating)
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

    // ✅ FIXED: Only create/update timeline logs if the field didn't have a value before
    // This prevents creating logs when updating existing timestamps
    if (
      departed !== undefined &&
      departed !== originalValues.departed &&
      departed &&
      !originalValues.departed && // ✅ Only if it was empty before
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
      !originalValues.pickupIn && // ✅ Only if it was empty before
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
      !originalValues.pickupOut && // ✅ Only if it was empty before
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
      !originalValues.destArrival && // ✅ Only if it was empty before
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
      !originalValues.destDeparture && // ✅ Only if it was empty before
      finalStatus !== 'canceled'
    ) {
      await createOrUpdateTimelineLog(
        'destDeparture',
        destDeparture,
        'completed'
      )
      await createActivityLog('Departed from destination')
    }

    // Activity logs for truck replacement (these are separate from timeline logs)
    if (performedReplacement && replacementTruckDetails) {
      if (hasExistingReplacement) {
        // This is updating an existing replacement
        await createActivityLog(
          `Replacement truck changed from ${replacementTruckDetails.oldReplacementPlateNo} to ${replacementTruckDetails.newPlateNo}`
        )
      } else {
        // This is a first-time replacement
        await createActivityLog(
          `Truck replaced from ${replacementTruckDetails.oldPlateNo} to ${replacementTruckDetails.newPlateNo}`
        )
      }
    }

    // Activity logs for driver replacement
    if (performedDriverReplacement && replacementDriverDetails) {
      if (hasExistingDriverReplacement) {
        // This is updating an existing replacement
        await createActivityLog(
          `Replacement driver changed from ${replacementDriverDetails.oldReplacementDriverName} to ${replacementDriverDetails.newDriverName}`
        )
      } else {
        // This is a first-time replacement
        await createActivityLog(
          `Driver replaced from ${replacementDriverDetails.oldDriverName} to ${replacementDriverDetails.newDriverName}`
        )
      }
    }

    // Activity logs for field changes (non-replacement truck/driver changes)
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
      destination !== undefined &&
      destination !== originalValues.destination
    ) {
      await createActivityLog(`Destination changed to ${destination}`)
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

    // Activity logs for new fields
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

    // Activity log for subcon change
    if (newSubcon !== originalValues.subcon) {
      await createActivityLog(`Subcon changed to ${newSubcon}`)
    }

    // Activity log for cancellation reason change
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

    // Activity log for isTMOPrinted change
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
