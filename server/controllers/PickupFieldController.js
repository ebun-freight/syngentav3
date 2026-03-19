const createError = require('http-errors')
const { validateFields } = require('../utils/validationFields')
const PickupField = require('../models/pickupFieldModel')
const ActivityLog = require('../models/activityLogsModel')

// ─── Create Pickup Field ───────────────────────────────────────────────────────

const createPickupField = async (req, res, next) => {
  try {
    if (!['head_admin', 'admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    const {
      pickupSite,
      municipality,
      fieldContactPerson,
      fieldContactPersonNo,
      scheduledPickupTime,
      estimatedWeightKg,
      fieldId,
      growerName,
      areaHectares
    } = req.body

    validateFields(
      {
        pickupSite,
        municipality,
        fieldContactPerson,
        fieldContactPersonNo,
        estimatedWeightKg
      },
      false
    )

    const existing = await PickupField.findOne({
      pickupSite,
      municipality,
      fieldContactPerson,
      estimatedWeightKg
    })
    if (existing) {
      return next(createError(400, `Field stop already exists`))
    }

    const newField = await PickupField.create({
      pickupSite,
      municipality,
      fieldContactPerson,
      fieldContactPersonNo,
      scheduledPickupTime: scheduledPickupTime || undefined,
      estimatedWeightKg,
      fieldId,
      growerName,
      areaHectares,
      status: 'not_done',
      deploymentId: null
    })

    ActivityLog.create({
      type: 'pickup_field',
      performedBy: req.user._id,
      action: `Pickup field created: ${newField.fieldId} — ${newField.growerName} (${newField.pickupSite})`
    }).catch(err =>
      console.error('ActivityLog error (createPickupField):', err)
    )

    return res.status(201).json({
      message: 'Pickup field created successfully',
      pickupField: newField
    })
  } catch (error) {
    next(error)
  }
}

// ─── Get All Pickup Fields ─────────────────────────────────────────────────────

const getAllPickupFields = async (req, res, next) => {
  try {
    const {
      status,
      search,
      sort = 'latest',
      page = 1,
      perPage = 200,
      unassignedOnly
    } = req.query

    let query = PickupField.find()

    if (status && status !== '') {
      query = query.where('status').equals(status)
    }

    // Only return fields not yet linked to a deployment
    if (unassignedOnly === 'true') {
      query = query.where('status').equals('not_done')
    }

    const sortOptions = { oldest: { createdAt: 1 }, latest: { createdAt: -1 } }
    query = query.sort(sortOptions[sort] || sortOptions.latest)

    const limit = parseInt(perPage)
    const skip = (parseInt(page) - 1) * limit
    query = query.skip(skip).limit(limit)

    let fields = await query.populate(
      'deploymentId',
      'deploymentCode status pickups'
    )

    if (search && search !== '') {
      const s = search.toLowerCase()
      fields = fields.filter(
        f =>
          f.fieldId?.toLowerCase().includes(s) ||
          f.growerName?.toLowerCase().includes(s) ||
          f.pickupSite?.toLowerCase().includes(s) ||
          f.municipality?.toLowerCase().includes(s) ||
          f.fieldContactPerson?.toLowerCase().includes(s) ||
          f.tmoNo?.toLowerCase().includes(s)
      )
    }

    const total = await PickupField.countDocuments(
      status && status !== '' ? { status } : {}
    )

    return res.status(200).json({
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      pickupFields: fields
    })
  } catch (error) {
    next(error)
  }
}

// ─── Update Pickup Field ───────────────────────────────────────────────────────

const updatePickupField = async (req, res, next) => {
  try {
    if (!['head_admin', 'admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    const { id } = req.params
    const {
      pickupSite,
      municipality,
      fieldContactPerson,
      fieldContactPersonNo,
      scheduledPickupTime,
      estimatedWeightKg,
      growerName,
      areaHectares,
      fieldWeightKg,
      plantWeightKg,
      sacksCount,
      pickupIn,
      pickupOut
    } = req.body

    const field = await PickupField.findById(id)
    if (!field) return next(createError(404, 'Pickup field not found'))

    // Coerce numeric-string fields: empty string -> '0' to satisfy Mongoose
    // regex validator (/^\d+(\.\d{1,2})?$/) which rejects an empty string.
    const safeNumStr = (val, fallback) =>
      val !== undefined && val !== null
        ? String(val).trim() === ''
          ? '0'
          : String(val)
        : fallback

    Object.assign(field, {
      pickupSite: pickupSite ?? field.pickupSite,
      municipality: municipality ?? field.municipality,
      fieldContactPerson: fieldContactPerson ?? field.fieldContactPerson,
      fieldContactPersonNo: fieldContactPersonNo ?? field.fieldContactPersonNo,
      scheduledPickupTime: scheduledPickupTime || undefined,
      estimatedWeightKg: safeNumStr(estimatedWeightKg, field.estimatedWeightKg),
      growerName: growerName ?? field.growerName,
      areaHectares: areaHectares ?? field.areaHectares,
      fieldWeightKg: safeNumStr(fieldWeightKg, field.fieldWeightKg),
      plantWeightKg: safeNumStr(plantWeightKg, field.plantWeightKg),
      sacksCount:
        sacksCount !== undefined && sacksCount !== ''
          ? Number(sacksCount)
          : field.sacksCount,
      pickupIn: pickupIn !== undefined ? pickupIn || '' : field.pickupIn,
      pickupOut: pickupOut !== undefined ? pickupOut || '' : field.pickupOut
    })

    await field.save()

    // ── Sync changes to linked deployment stop ────────────────────────────
    if (field.deploymentId && field.tmoNo) {
      try {
        const { Deployment } = require('../models/deploymentModel')
        const deployment = await Deployment.findById(field.deploymentId)
        if (deployment) {
          let synced = false
          deployment.pickups = deployment.pickups.map(stop => {
            if (stop.tmoNo === field.tmoNo) {
              synced = true
              return {
                ...stop.toObject(),
                pickupSite: field.pickupSite,
                municipality: field.municipality,
                fieldContactPerson: field.fieldContactPerson,
                fieldContactPersonNo: field.fieldContactPersonNo,
                scheduledPickupTime: field.scheduledPickupTime,
                estimatedWeightKg: field.estimatedWeightKg
              }
            }
            return stop
          })
          if (synced) {
            deployment.markModified('pickups')
            await deployment.save()
          }
        }
      } catch (err) {
        console.error('Error syncing pickup field update to deployment:', err)
      }
    }

    ActivityLog.create({
      type: 'pickup_field',
      performedBy: req.user._id,
      action: `Pickup field updated: ${field.fieldId} — ${field.growerName}`
    }).catch(err =>
      console.error('ActivityLog error (updatePickupField):', err)
    )

    // Populate deploymentId so the client modal can read deploymentCode
    await field.populate('deploymentId', 'deploymentCode status')

    return res.status(200).json({
      message: 'Pickup field updated successfully',
      pickupField: field
    })
  } catch (error) {
    next(error)
  }
}

// ─── Delete Pickup Field ───────────────────────────────────────────────────────

const deletePickupField = async (req, res, next) => {
  try {
    if (!['head_admin', 'admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    const { id } = req.params
    const field = await PickupField.findById(id)
    if (!field) return next(createError(404, 'Pickup field not found'))

    if (field.status !== 'not_done') {
      return next(
        createError(
          400,
          'Cannot delete a pickup field that is ongoing or completed'
        )
      )
    }

    const label = `${field.fieldId} — ${field.growerName}`
    await field.deleteOne()

    ActivityLog.create({
      type: 'pickup_field',
      performedBy: req.user._id,
      action: `Pickup field deleted: ${label}`
    }).catch(err =>
      console.error('ActivityLog error (deletePickupField):', err)
    )

    return res
      .status(200)
      .json({ message: 'Pickup field deleted successfully' })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createPickupField,
  getAllPickupFields,
  updatePickupField,
  deletePickupField
}
