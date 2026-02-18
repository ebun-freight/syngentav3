const createError = require('http-errors')
const { validateFields } = require('../utils/validationFields')
const Deployment = require('../models/deploymentModel')
const Truck = require('../models/truckModel')
const Driver = require('../models/driverModel')
const ActivityLog = require('../models/activityLogsModel')
const TimelineLog = require('../models/timelineLogsModel')
const { DateTime } = require('luxon')

// Helper: get active subcon from deployment (replacement truck takes priority)
const getActiveSubcon = deployment => {
  if (deployment.replacement?.replacementTruckId?.subcon) {
    return deployment.replacement.replacementTruckId.subcon
  }
  return deployment.truckId?.subcon || ''
}

// Create deployment
const createDeployment = async (req, res, next) => {
  try {
    const {
      pickupSite,
      municipality,
      fieldContactPerson,
      fieldContactPersonNo,
      scheduledPickupTime,
      estimatedQuantityKg,
      truckId,
      driverId,
      truckType,
      helperCount,
      destination,
      receivingContactPerson,
      receivingContactPersonNo,
      hybrid,
      territory,
      flagging,
      flaggingRemarks,
      sacksCount,
      loadWeightKg,
      departed,
      pickupIn,
      pickupOut,
      destArrival,
      destDeparture,
      isTMOPrinted = false
    } = req.body

    if (!['head_admin', 'admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    validateFields({
      pickupSite,
      municipality,
      fieldContactPerson,
      fieldContactPersonNo,
      scheduledPickupTime,
      estimatedQuantityKg,
      truckId,
      driverId,
      truckType,
      helperCount,
      destination,
      receivingContactPerson,
      receivingContactPersonNo,
      hybrid,
      territory,
      flagging
    })

    const truck = await Truck.findById(truckId)
    if (!truck) return next(createError(404, 'Truck not found'))
    if (truck.status === 'deployed')
      return next(createError(400, 'Truck is already deployed'))

    const driver = await Driver.findById(driverId)
    if (!driver) return next(createError(404, 'Driver not found'))
    if (driver.status === 'deployed')
      return next(createError(400, 'Driver is already deployed'))

    const newDeployment = await Deployment.create({
      pickupSite,
      municipality,
      fieldContactPerson,
      fieldContactPersonNo,
      scheduledPickupTime,
      estimatedQuantityKg,
      truckId,
      driverId,
      truckType,
      helperCount,
      destination,
      receivingContactPerson,
      receivingContactPersonNo,
      hybrid,
      territory,
      flagging,
      flaggingRemarks,
      sacksCount: sacksCount || 0,
      loadWeightKg: loadWeightKg || 0,
      departed: departed || '',
      pickupIn: pickupIn || '',
      pickupOut: pickupOut || '',
      destArrival: destArrival || '',
      destDeparture: destDeparture || '',
      isTMOPrinted,
      isSoftDeleted: false
    })

    await Promise.all([
      Truck.findByIdAndUpdate(truckId, { status: 'deployed' }),
      Driver.findByIdAndUpdate(driverId, { status: 'deployed' })
    ])

    const initialStatus = departed ? 'ongoing' : 'preparing'
    const now = DateTime.now().setZone('Asia/Manila').toISO()

    await TimelineLog.create({
      performedBy: req.user._id,
      action: 'Truck assigned for deployment',
      status: initialStatus,
      timestamp: now,
      targetDeployment: newDeployment._id
    })

    await ActivityLog.create({
      type: 'deployment',
      performedBy: req.user._id,
      action: `${
        newDeployment.deploymentCode
      }: Assigned ${truck.plateNo.toUpperCase()} to deployment`,
      targetDeployment: newDeployment._id
    })

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
      subcon,
      territory
    } = req.query

    console.log(req.query)

    // Determine subcon filter target
    const subconFilter =
      req.user.role === 'subcon' && req.user.subcon
        ? req.user.subcon.toLowerCase()
        : subcon && subcon !== ''
        ? subcon.toLowerCase()
        : null

    // Build base query (no subcon filter at DB level — handled in JS after populate)
    let baseQuery = Deployment.find()

    if (includeDeleted !== 'true') {
      baseQuery = baseQuery.where('isSoftDeleted').ne(true)
    }

    if (territory && territory !== '') {
      baseQuery = baseQuery.where('territory').equals(territory)
    }

    if (status && status !== '') {
      baseQuery = baseQuery.where('status').equals(status)
    }

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

    const sortOptions = {
      oldest: { createdAt: 1 },
      latest: { createdAt: -1 }
    }
    baseQuery = baseQuery.sort(sortOptions[sort] || sortOptions.latest)

    const limit = parseInt(perPage)
    const skip = (parseInt(page) - 1) * limit
    baseQuery = baseQuery.skip(skip).limit(limit)

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

    let deployments = await baseQuery

    // Filter by subcon in JS (based on active truck's subcon)
    if (subconFilter) {
      deployments = deployments.filter(
        deployment => getActiveSubcon(deployment).toLowerCase() === subconFilter
      )
    }

    // Filter by search in JS
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
        const activeSubcon = getActiveSubcon(deployment).toLowerCase()
        const destination = (deployment.destination || '').toLowerCase()
        const pickupSite = (deployment.pickupSite || '').toLowerCase()
        const truckType = (deployment.truckType || '').toLowerCase()
        const deploymentCode = (deployment.deploymentCode || '').toLowerCase()
        const territoryValue = (deployment.territory || '').toLowerCase()

        return (
          activeTruckPlate.includes(searchLower) ||
          activeDriverFirstname.includes(searchLower) ||
          activeDriverLastname.includes(searchLower) ||
          destination.includes(searchLower) ||
          pickupSite.includes(searchLower) ||
          truckType.includes(searchLower) ||
          deploymentCode.includes(searchLower) ||
          activeSubcon.includes(searchLower) ||
          territoryValue.includes(searchLower)
        )
      })
    }

    // For total count: if subcon or search filter is active, we need a full (unpaginated) query
    // Otherwise count at DB level for performance
    let total

    if (subconFilter || (search && search !== '')) {
      let countQuery = Deployment.find()

      if (includeDeleted !== 'true')
        countQuery = countQuery.where('isSoftDeleted').ne(true)
      if (territory && territory !== '')
        countQuery = countQuery.where('territory').equals(territory)
      if (status && status !== '')
        countQuery = countQuery.where('status').equals(status)

      if (assignedAt) {
        const targetDate = new Date(assignedAt)
        const startOfDay = new Date(targetDate)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(targetDate)
        endOfDay.setHours(23, 59, 59, 999)
        countQuery = countQuery.where('createdAt').gte(startOfDay).lt(endOfDay)
      }

      if (departedAt) {
        const targetDate = new Date(departedAt)
        const startOfDay = new Date(targetDate)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(targetDate)
        endOfDay.setHours(23, 59, 59, 999)
        countQuery = countQuery
          .where('departed')
          .gte(startOfDay.toISOString())
          .lt(endOfDay.toISOString())
      }

      const allForCount = await countQuery.populate([
        { path: 'truckId', select: 'subcon' },
        { path: 'replacement.replacementTruckId', select: 'subcon' }
      ])

      let filtered = allForCount

      if (subconFilter) {
        filtered = filtered.filter(
          d => getActiveSubcon(d).toLowerCase() === subconFilter
        )
      }

      if (search && search !== '') {
        const searchLower = search.toLowerCase()
        filtered = filtered.filter(deployment => {
          const activeTruckPlate = (
            deployment.replacement?.replacementTruckId?.plateNo ||
            deployment.truckId?.plateNo ||
            ''
          ).toLowerCase()
          const activeSubcon = getActiveSubcon(deployment).toLowerCase()
          const destination = (deployment.destination || '').toLowerCase()
          const pickupSite = (deployment.pickupSite || '').toLowerCase()
          const truckType = (deployment.truckType || '').toLowerCase()
          const deploymentCode = (deployment.deploymentCode || '').toLowerCase()
          const territoryValue = (deployment.territory || '').toLowerCase()
          return (
            activeTruckPlate.includes(searchLower) ||
            destination.includes(searchLower) ||
            pickupSite.includes(searchLower) ||
            truckType.includes(searchLower) ||
            deploymentCode.includes(searchLower) ||
            activeSubcon.includes(searchLower) ||
            territoryValue.includes(searchLower)
          )
        })
      }

      total = filtered.length
    } else {
      let totalQuery = Deployment.find()
      if (includeDeleted !== 'true')
        totalQuery = totalQuery.where('isSoftDeleted').ne(true)
      if (territory && territory !== '')
        totalQuery = totalQuery.where('territory').equals(territory)
      if (status && status !== '')
        totalQuery = totalQuery.where('status').equals(status)
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
      total = await totalQuery.countDocuments()
    }

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
      pickupSite,
      municipality,
      fieldContactPerson,
      fieldContactPersonNo,
      scheduledPickupTime,
      estimatedQuantityKg,
      truckId,
      driverId,
      truckType,
      helperCount,
      destination,
      receivingContactPerson,
      receivingContactPersonNo,
      hybrid,
      territory,
      flagging,
      flaggingRemarks,
      sacksCount,
      loadWeightKg,
      replacement,
      departed,
      pickupIn,
      pickupOut,
      destArrival,
      destDeparture,
      status,
      cancellationReason,
      isTMOPrinted
    } = req.body

    if (!['head_admin', 'admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

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

    const existingDeployment = await Deployment.findOne({
      _id: id,
      isSoftDeleted: { $ne: true }
    })

    if (!existingDeployment) {
      return next(createError(404, 'Deployment not found'))
    }

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

    const deploymentCode = existingDeployment.deploymentCode
    const extractedTruckId = truckId?._id || truckId
    const extractedDriverId = driverId?._id || driverId

    const originalValues = {
      pickupSite: existingDeployment.pickupSite,
      municipality: existingDeployment.municipality,
      fieldContactPerson: existingDeployment.fieldContactPerson,
      fieldContactPersonNo: existingDeployment.fieldContactPersonNo,
      scheduledPickupTime: existingDeployment.scheduledPickupTime,
      estimatedQuantityKg: existingDeployment.estimatedQuantityKg,
      truckId: existingDeployment.truckId?.toString(),
      driverId: existingDeployment.driverId?.toString(),
      truckType: existingDeployment.truckType,
      helperCount: existingDeployment.helperCount,
      destination: existingDeployment.destination,
      receivingContactPerson: existingDeployment.receivingContactPerson,
      receivingContactPersonNo: existingDeployment.receivingContactPersonNo,
      hybrid: existingDeployment.hybrid,
      territory: existingDeployment.territory,
      flagging: existingDeployment.flagging,
      flaggingRemarks: existingDeployment.flaggingRemarks,
      sacksCount: existingDeployment.sacksCount,
      loadWeightKg: existingDeployment.loadWeightKg,
      departed: existingDeployment.departed,
      pickupIn: existingDeployment.pickupIn,
      pickupOut: existingDeployment.pickupOut,
      destArrival: existingDeployment.destArrival,
      destDeparture: existingDeployment.destDeparture,
      status: existingDeployment.status,
      cancellationReason: existingDeployment.cancellationReason,
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

    let performedReplacement = false
    let performedDriverReplacement = false
    let replacementTruckDetails = null
    let replacementDriverDetails = null

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
          newTruck,
          oldTruck,
          oldReplacementTruck
        }

        const updatePromises = [
          Truck.findByIdAndUpdate(replacementTruckId, { status: 'deployed' })
        ]

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

        await createReplacementTimelineLog(
          hasExistingReplacement
            ? `Truck ${oldReplacementPlateNo} has been replaced to ${newPlateNo}`
            : `Truck ${oldPlateNo} has been replaced to ${newPlateNo}`,
          replacement?.replacedAt || new Date()
        )
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
          newDriver,
          oldDriver,
          oldReplacementDriver
        }

        const updatePromises = [
          Driver.findByIdAndUpdate(replacementDriverId, { status: 'deployed' })
        ]

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

        await createReplacementTimelineLog(
          hasExistingDriverReplacement
            ? `Driver ${replacementDriverDetails.oldReplacementDriverName} has been replaced to ${replacementDriverDetails.newDriverName}`
            : `Driver ${replacementDriverDetails.oldDriverName} has been replaced to ${replacementDriverDetails.newDriverName}`,
          replacement?.replacedAt || new Date()
        )
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
      extractedTruckId.toString() !== originalValues.truckId &&
      !performedReplacement
    ) {
      const newTruck = await Truck.findById(extractedTruckId)
      const oldTruck = await Truck.findById(originalValues.truckId)
      if (newTruck) {
        const oldPlateNo = (oldTruck?.plateNo || 'Unknown').toUpperCase()
        const newPlateNo = (newTruck?.plateNo || 'Unknown').toUpperCase()
        await createReplacementTimelineLog(
          `Truck ${oldPlateNo} has been changed to ${newPlateNo}`
        )
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
    if (originalStatus === 'canceled' && finalStatus !== 'canceled')
      finalCancellationReason = undefined
    if (finalStatus === 'canceled' && originalStatus !== 'canceled')
      finalCancellationReason = cancellationReason
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
      if (currentActiveTruckId)
        statusUpdates.push(
          Truck.findByIdAndUpdate(currentActiveTruckId, { status: 'available' })
        )
      if (currentActiveDriverId)
        statusUpdates.push(
          Driver.findByIdAndUpdate(currentActiveDriverId, {
            status: 'available'
          })
        )
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
      if (originalValues.truckId)
        updates.push(
          Truck.findByIdAndUpdate(originalValues.truckId, {
            status: 'available'
          })
        )
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
      if (originalValues.driverId)
        updates.push(
          Driver.findByIdAndUpdate(originalValues.driverId, {
            status: 'available'
          })
        )
      if (finalStatus !== 'canceled' && finalStatus !== 'completed') {
        updates.push(
          Driver.findByIdAndUpdate(extractedDriverId, { status: 'deployed' })
        )
      }
      await Promise.all(updates)
    }

    // Increment trip counts on completion
    if (finalStatus === 'completed' && originalStatus !== 'completed') {
      const tripUpdates = []
      if (currentActiveDriverId)
        tripUpdates.push(
          Driver.findByIdAndUpdate(currentActiveDriverId, {
            $inc: { tripCount: 1 }
          })
        )
      if (currentActiveTruckId)
        tripUpdates.push(
          Truck.findByIdAndUpdate(currentActiveTruckId, {
            $inc: { tripCount: 1 }
          })
        )
      try {
        await Promise.all(tripUpdates)
      } catch (error) {
        console.error('Error incrementing trip counts:', error)
      }
    }

    // Update deployment fields (no subcon field anymore)
    const updateObj = {
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
      truckId: extractedTruckId || existingDeployment.truckId,
      driverId: extractedDriverId || existingDeployment.driverId,
      truckType:
        truckType !== undefined ? truckType : existingDeployment.truckType,
      helperCount:
        helperCount !== undefined
          ? helperCount
          : existingDeployment.helperCount,
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
      loadWeightKg:
        loadWeightKg !== undefined
          ? loadWeightKg
          : existingDeployment.loadWeightKg,
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
      status:
        finalStatus !== undefined ? finalStatus : existingDeployment.status,
      cancellationReason: finalCancellationReason,
      isTMOPrinted:
        isTMOPrinted !== undefined
          ? isTMOPrinted
          : existingDeployment.isTMOPrinted
    }

    Object.assign(existingDeployment, updateObj)
    await existingDeployment.save()

    // Logging helpers
    const timelineLogs = []
    const activityLogs = []

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
      if (!action) return

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

    const createActivityLog = async action => {
      await ActivityLog.create({
        type: 'deployment',
        performedBy: req.user._id,
        action: `${deploymentCode}: ${action}`,
        targetDeployment: existingDeployment._id
      })
      activityLogs.push(action)
    }

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
        if (resumedLogAfterCancel) shouldCreateNewCancelLog = true
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

    if (truckType !== undefined && truckType !== originalValues.truckType)
      await createActivityLog(`Truck type changed to ${truckType}`)
    if (helperCount !== undefined && helperCount !== originalValues.helperCount)
      await createActivityLog(`Helper count changed to ${helperCount}`)
    if (pickupSite !== undefined && pickupSite !== originalValues.pickupSite)
      await createActivityLog(`Pickup site changed to ${pickupSite}`)
    if (
      municipality !== undefined &&
      municipality !== originalValues.municipality
    )
      await createActivityLog(`Municipality changed to ${municipality}`)
    if (
      fieldContactPerson !== undefined &&
      fieldContactPerson !== originalValues.fieldContactPerson
    )
      await createActivityLog(
        `Field contact person changed to ${fieldContactPerson}`
      )
    if (
      fieldContactPersonNo !== undefined &&
      fieldContactPersonNo !== originalValues.fieldContactPersonNo
    )
      await createActivityLog(`Field contact person number changed`)
    if (
      scheduledPickupTime !== undefined &&
      scheduledPickupTime !== originalValues.scheduledPickupTime
    )
      await createActivityLog(
        `Scheduled pickup time changed to ${scheduledPickupTime}`
      )
    if (
      estimatedQuantityKg !== undefined &&
      estimatedQuantityKg !== originalValues.estimatedQuantityKg
    )
      await createActivityLog(
        `Estimated quantity changed to ${estimatedQuantityKg} kg`
      )
    if (destination !== undefined && destination !== originalValues.destination)
      await createActivityLog(`Destination changed to ${destination}`)
    if (
      receivingContactPerson !== undefined &&
      receivingContactPerson !== originalValues.receivingContactPerson
    )
      await createActivityLog(
        `Receiving contact person changed to ${receivingContactPerson}`
      )
    if (
      receivingContactPersonNo !== undefined &&
      receivingContactPersonNo !== originalValues.receivingContactPersonNo
    )
      await createActivityLog(`Receiving contact person number changed`)
    if (sacksCount !== undefined && sacksCount !== originalValues.sacksCount)
      await createActivityLog(`Sacks count changed to ${sacksCount}`)
    if (
      loadWeightKg !== undefined &&
      loadWeightKg !== originalValues.loadWeightKg
    )
      await createActivityLog(`Load weight changed to ${loadWeightKg} kg`)
    if (finalStatus !== undefined && finalStatus !== originalStatus)
      await createActivityLog(`Status changed to ${finalStatus}`)
    if (territory !== undefined && territory !== originalValues.territory)
      await createActivityLog(`Territory changed to ${territory}`)
    if (hybrid !== undefined && hybrid !== originalValues.hybrid)
      await createActivityLog(`Hybrid changed to ${hybrid}`)
    if (flagging !== undefined && flagging !== originalValues.flagging)
      await createActivityLog(`Flagging changed to ${flagging}`)
    if (
      flaggingRemarks !== undefined &&
      flaggingRemarks !== originalValues.flaggingRemarks
    )
      await createActivityLog(`Flagging remarks updated`)

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

// Soft delete deployment
const softDeleteDeployment = async (req, res, next) => {
  try {
    const { id } = req.params

    if (!['head_admin', 'admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    const deployment = await Deployment.findOne({
      _id: id,
      isSoftDeleted: { $ne: true }
    })

    if (!deployment) {
      return next(createError(404, 'Deployment not found'))
    }

    const activeTruckId =
      deployment.replacement?.replacementTruckId || deployment.truckId
    const activeDriverId =
      deployment.replacement?.replacementDriverId || deployment.driverId

    const updates = []
    if (activeTruckId)
      updates.push(
        Truck.findByIdAndUpdate(activeTruckId, { status: 'available' })
      )
    if (activeDriverId)
      updates.push(
        Driver.findByIdAndUpdate(activeDriverId, { status: 'available' })
      )
    await Promise.all(updates)

    const deploymentCode = deployment.deploymentCode
    let timelineLogsDeleted = 0

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
    }

    deployment.isSoftDeleted = true
    await deployment.save()

    await ActivityLog.create({
      type: 'deployment',
      performedBy: req.user._id,
      action: `${deploymentCode}: Deployment deleted (${timelineLogsDeleted} timeline logs removed)`,
      targetDeployment: deployment._id
    })

    res.status(200).json({
      message: 'Deployment deleted successfully',
      deploymentCode,
      timelineLogsDeleted
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
