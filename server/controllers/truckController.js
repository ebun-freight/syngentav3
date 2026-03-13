const createError = require('http-errors')
const sharp = require('sharp')
const Truck = require('../models/truckModel')
const { validateFields } = require('../utils/validationFields')
const { isValidFileType } = require('../utils/validationFile')
const { uploadImageToCloudinary } = require('../utils/cloudinaryUtils')
const { cloudinary } = require('../middlewares/multerCloudinary')
const ActivityLog = require('../models/activityLogsModel')

const MAX_FILE_SIZE = 16 * 1024 * 1024 // 16 MB

// create truck
const createTruck = async (req, res, next) => {
  try {
    const { plateNo, truckType, maxLoad, status, subcon } = req.body

    if (!['head_admin', 'admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    // FIX #2 — Original code called validateFields(plateNo), passing a raw string.
    // Object.values('ABC123') returns individual characters so validation was a no-op:
    // any truthy character passes, meaning plateNo could be empty and none of the
    // other required fields were validated at all.
    // Fixed by passing a proper fields object so all required fields are checked.
    validateFields({ plateNo, truckType, status, subcon })

    // truckType and status are also validated against System Settings values at runtime

    // check if truck with same plate number already exists
    const isTruckAlreadyExist = await Truck.findOne({
      plateNo: { $regex: new RegExp(`^${plateNo}$`, 'i') }
    })

    if (isTruckAlreadyExist) {
      return next(
        createError(409, 'Truck with this plate number already exists')
      )
    }

    // upload profile picture to cloudinary (if provided)
    let imageData = {
      url: '',
      publicId: ''
    }

    if (req.file) {
      try {
        // validate file type
        if (!isValidFileType(req.file.mimetype)) {
          return next(
            createError(400, 'Invalid file type. Only images are allowed')
          )
        }

        // FIX #3 — File size was never checked on truck creation (only on update).
        // An oversized image would be uploaded to Cloudinary and then potentially
        // fail mid-stream or silently consume storage. Added the same 16 MB guard
        // that already exists in updateTruck and updateDriver.
        if (req.file.size > MAX_FILE_SIZE) {
          return next(createError(400, 'Image size must be less than 16MB'))
        }

        // compress the image with sharp
        const compressedImage = await sharp(req.file.buffer)
          .rotate()
          .resize({
            width: 1200,
            withoutEnlargement: true
          })
          .jpeg({
            quality: 80,
            mozjpeg: true
          })
          .toBuffer()

        // upload the image to cloudinary
        const uploadResult = await uploadImageToCloudinary(
          compressedImage,
          'Ebun/truck'
        )

        imageData = {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id
        }
      } catch (error) {
        return next(error)
      }
    }

    // create new truck
    const newTruck = await Truck.create({
      plateNo,
      truckType,
      maxLoad,
      status,
      subcon,
      imageUrl: imageData.url,
      imagePublicId: imageData.publicId
    })

    // create activity log
    await ActivityLog.create({
      type: 'truck',
      performedBy: req.user._id,
      action: 'Created new truck',
      targetTruck: newTruck._id
    })

    return res.status(201).json({
      message: 'Truck created successfully',
      truck: newTruck
    })
  } catch (error) {
    next(error)
  }
}

// get trucks
const getAllTrucks = async (req, res, next) => {
  try {
    const {
      truckType,
      status,
      subcon,
      search,
      sort,
      perPage,
      page = 1,
      showDeleted
    } = req.query

    if (!['head_admin', 'admin', 'visitor', 'subcon'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    // Build query object
    const query = {}

    // Apply soft delete filter
    if (showDeleted !== 'true') {
      query.$or = [
        { isSoftDeleted: false },
        { isSoftDeleted: { $exists: false } }
      ]
    }

    // Apply filters
    if (truckType) query.truckType = truckType
    if (status) query.status = status

    // Apply subcon filter based on user role
    if (req.user.role === 'subcon') {
      query.subcon = req.user.subcon
    } else if (subcon) {
      query.subcon = subcon
    }

    // Apply search
    if (search) {
      const regex = { $regex: search, $options: 'i' }
      query.plateNo = regex
    }

    // Apply sorting
    const sortOptions = {
      oldest: { createdAt: 1 },
      latest: { createdAt: -1 },
      'a-z': { plateNo: 1 },
      'z-a': { plateNo: -1 },
      'trips-asc': { tripCount: 1 },
      'trips-desc': { tripCount: -1 },
      'subcon-asc': { subcon: 1 },
      'subcon-desc': { subcon: -1 }
    }

    const sortQuery = sortOptions[sort] || sortOptions.latest

    // Check if pagination parameters are provided
    const hasPagination =
      perPage !== undefined &&
      perPage !== '' &&
      !isNaN(parseInt(perPage)) &&
      page !== undefined &&
      page !== '' &&
      !isNaN(parseInt(page))

    if (hasPagination) {
      const limit = parseInt(perPage)
      const skip = (parseInt(page) - 1) * limit

      // Query with pagination
      const [total, trucks] = await Promise.all([
        Truck.countDocuments(query),
        Truck.find(query).skip(skip).limit(limit).sort(sortQuery)
      ])

      return res.status(200).json({
        total,
        page: Number(page),
        totalPages: Math.ceil(total / limit),
        trucks
      })
    } else {
      // Query without pagination
      const trucks = await Truck.find(query).sort(sortQuery)

      return res.status(200).json({
        total: trucks.length,
        trucks
      })
    }
  } catch (error) {
    next(error)
  }
}

// update truck
const updateTruck = async (req, res, next) => {
  try {
    const { id } = req.params
    const { plateNo, truckType, status, maxLoad, tripCount, subcon } = req.body

    if (!['head_admin', 'admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    // find the truck
    const existingTruck = await Truck.findById(id)
    if (!existingTruck) {
      return next(createError(404, 'Truck not found'))
    }

    // handle file upload if provided
    let imageUrl = existingTruck.imageUrl
    let imagePublicId = existingTruck.imagePublicId

    // if images are provided
    if (req.file) {
      try {
        // validate file type
        if (!isValidFileType(req.file.mimetype)) {
          return next(
            createError(400, 'Invalid file type. Only images are allowed')
          )
        }

        // Validate file size (16MB max)
        if (req.file.size > MAX_FILE_SIZE) {
          return next(createError(400, 'Image size must be less than 16MB'))
        }

        // delete old picture if exist
        if (imagePublicId) {
          await cloudinary.uploader.destroy(imagePublicId)
        }

        // compress the image with sharp
        const compressedImage = await sharp(req.file.buffer)
          .rotate()
          .resize({
            width: 1200,
            withoutEnlargement: true
          })
          .jpeg({
            quality: 80,
            mozjpeg: true
          })
          .toBuffer()

        // upload new image
        const uploadResult = await uploadImageToCloudinary(
          compressedImage,
          'Ebun/truck'
        )

        imageUrl = uploadResult.secure_url
        imagePublicId = uploadResult.public_id
      } catch (error) {
        return next(createError(500, 'Failed to upload image'))
      }
    }

    const updatedFields = []
    if (plateNo && plateNo !== existingTruck.plateNo)
      updatedFields.push('plate number')
    if (truckType && truckType !== existingTruck.truckType)
      updatedFields.push('truck type')
    if (status && status !== existingTruck.status) updatedFields.push('status')
    if (maxLoad && maxLoad !== existingTruck.maxLoad)
      updatedFields.push('maximum load')
    if (tripCount && parseInt(tripCount) !== existingTruck.tripCount)
      updatedFields.push('trip count')
    if (subcon && subcon !== existingTruck.subcon) updatedFields.push('subcon')

    const actionMessage =
      updatedFields.length > 0
        ? `Updated truck's ${updatedFields.join(', ')}`
        : 'Updated truck details'

    // FIX #4 — Original code used `|| existingTruck.X` (falsy fallback) for all fields.
    // This meant sending an empty string or 0 to intentionally clear an optional field
    // (e.g. clearing subcon) would silently keep the old value instead.
    // Fixed by using `!== undefined` checks so only truly absent fields fall back to
    // the existing value, while an explicit empty string or 0 is honoured.
    const updatedFieldsData = {
      plateNo: plateNo !== undefined ? plateNo : existingTruck.plateNo,
      truckType: truckType !== undefined ? truckType : existingTruck.truckType,
      status: status !== undefined ? status : existingTruck.status,
      tripCount: tripCount !== undefined ? tripCount : existingTruck.tripCount,
      maxLoad: maxLoad !== undefined ? maxLoad : existingTruck.maxLoad,
      subcon: subcon !== undefined ? subcon : existingTruck.subcon,
      imageUrl,
      imagePublicId
    }

    Object.assign(existingTruck, updatedFieldsData)
    await existingTruck.save()

    // create activity log
    await ActivityLog.create({
      type: 'truck',
      performedBy: req.user._id,
      action: actionMessage,
      targetTruck: existingTruck._id
    })

    res.status(200).json({
      message: 'Truck updated successfully',
      truck: existingTruck
    })
  } catch (error) {
    next(error)
  }
}

// delete truck
const hardDeleteTruck = async (req, res, next) => {
  try {
    const { id } = req.params

    if (!['head_admin', 'admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    // FIX #5 — Original code called findByIdAndDelete immediately, which means if the
    // truck didn't exist we'd call cloudinary.uploader.destroy on undefined — crashing
    // the handler. Also there was no activity log for a permanent delete action.
    // Fixed by finding first (to confirm existence and retrieve details for the log),
    // then deleting, then logging.
    const truckToDelete = await Truck.findById(id)
    if (!truckToDelete) {
      return next(createError(404, 'Truck not found'))
    }

    await Truck.findByIdAndDelete(id)

    // Delete profile picture from Cloudinary if it exists
    if (truckToDelete.imagePublicId) {
      await cloudinary.uploader.destroy(truckToDelete.imagePublicId)
    }

    // FIX #5 (cont.) — Added missing activity log for hard delete (matches the
    // pattern already established in hardDeleteUser).
    await ActivityLog.create({
      type: 'truck',
      performedBy: req.user._id,
      action: `Permanently deleted truck ${truckToDelete.plateNo.toUpperCase()} (${
        truckToDelete.truckType
      })`,
      targetTruck: truckToDelete._id
    })

    return res.status(200).json({
      message: 'Truck deleted successfully'
    })
  } catch (error) {
    next(createError(500, 'Failed to delete truck'))
  }
}

const softDeleteTruck = async (req, res, next) => {
  try {
    const { id } = req.params

    if (!['head_admin', 'admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    // Find the truck
    const truck = await Truck.findById(id)
    if (!truck) {
      return next(createError(404, 'Truck not found'))
    }

    // Check if already deleted
    if (truck.isSoftDeleted) {
      return next(createError(400, 'Truck is already deleted'))
    }

    // Soft delete the truck
    truck.isSoftDeleted = true

    await truck.save()

    // create activity log
    await ActivityLog.create({
      type: 'truck',
      performedBy: req.user._id,
      action: 'Deleted a truck',
      targetTruck: truck._id
    })

    res.status(200).json({
      success: true,
      message: 'Truck deleted successfully'
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createTruck,
  getAllTrucks,
  updateTruck,
  hardDeleteTruck,
  softDeleteTruck
}
