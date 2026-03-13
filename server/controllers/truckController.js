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

    // FIX 1: Only plateNo and subcon are required:true in truckModel.
    // truckType is optional, status has a default of 'available'.
    // Including them caused false "All fields are required" errors.
    validateFields({ plateNo, subcon })

    // check if truck with same plate number already exists
    const isTruckAlreadyExist = await Truck.findOne({
      plateNo: { $regex: new RegExp(`^${plateNo}$`, 'i') }
    })

    if (isTruckAlreadyExist) {
      return next(
        createError(409, 'Truck with this plate number already exists')
      )
    }

    let imageData = { url: '', publicId: '' }

    if (req.file) {
      try {
        if (!isValidFileType(req.file.mimetype)) {
          return next(
            createError(400, 'Invalid file type. Only images are allowed')
          )
        }

        // FIX 2: File size was not checked on creation, only on update.
        if (req.file.size > MAX_FILE_SIZE) {
          return next(createError(400, 'Image size must be less than 16MB'))
        }

        const compressedImage = await sharp(req.file.buffer)
          .rotate()
          .resize({ width: 1200, withoutEnlargement: true })
          .jpeg({ quality: 80, mozjpeg: true })
          .toBuffer()

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

    const newTruck = await Truck.create({
      plateNo,
      truckType,
      // FIX 3: maxLoad is Number in the model. FormData always sends strings.
      // Guard against empty string so we don't save NaN.
      maxLoad:
        maxLoad !== undefined && maxLoad !== '' ? Number(maxLoad) : undefined,
      status,
      subcon,
      imageUrl: imageData.url,
      imagePublicId: imageData.publicId
    })

    await ActivityLog.create({
      type: 'truck',
      performedBy: req.user._id,
      action: `Created new truck ${newTruck.plateNo}`,
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

    const query = {}

    if (showDeleted !== 'true') {
      query.$or = [
        { isSoftDeleted: false },
        { isSoftDeleted: { $exists: false } }
      ]
    }

    if (truckType) query.truckType = truckType
    if (status) query.status = status

    if (req.user.role === 'subcon') {
      query.subcon = req.user.subcon
    } else if (subcon) {
      query.subcon = subcon
    }

    if (search) {
      query.plateNo = { $regex: search, $options: 'i' }
    }

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
      const trucks = await Truck.find(query).sort(sortQuery)
      return res.status(200).json({ total: trucks.length, trucks })
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

    const existingTruck = await Truck.findById(id)
    if (!existingTruck) {
      return next(createError(404, 'Truck not found'))
    }

    let imageUrl = existingTruck.imageUrl
    let imagePublicId = existingTruck.imagePublicId

    if (req.file) {
      try {
        if (!isValidFileType(req.file.mimetype)) {
          return next(
            createError(400, 'Invalid file type. Only images are allowed')
          )
        }

        if (req.file.size > MAX_FILE_SIZE) {
          return next(createError(400, 'Image size must be less than 16MB'))
        }

        if (imagePublicId) {
          await cloudinary.uploader.destroy(imagePublicId)
        }

        const compressedImage = await sharp(req.file.buffer)
          .rotate()
          .resize({ width: 1200, withoutEnlargement: true })
          .jpeg({ quality: 80, mozjpeg: true })
          .toBuffer()

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
    if (
      maxLoad !== undefined &&
      maxLoad !== '' &&
      Number(maxLoad) !== existingTruck.maxLoad
    )
      updatedFields.push('maximum load')
    if (
      tripCount !== undefined &&
      tripCount !== '' &&
      parseInt(tripCount) !== existingTruck.tripCount
    )
      updatedFields.push('trip count')
    if (subcon && subcon !== existingTruck.subcon) updatedFields.push('subcon')
    if (req.file) updatedFields.push('profile picture')

    const actionMessage =
      updatedFields.length > 0
        ? `Updated truck's ${updatedFields.join(', ')}`
        : 'Updated truck details'

    // FIX 4: Use !== undefined (not ||) so optional fields can be cleared.
    // FIX 5: maxLoad and tripCount are Number in the model — parse from strings.
    const updatedFieldsData = {
      plateNo: plateNo !== undefined ? plateNo : existingTruck.plateNo,
      truckType: truckType !== undefined ? truckType : existingTruck.truckType,
      status: status !== undefined ? status : existingTruck.status,
      maxLoad:
        maxLoad !== undefined && maxLoad !== ''
          ? Number(maxLoad)
          : existingTruck.maxLoad,
      tripCount:
        tripCount !== undefined && tripCount !== ''
          ? parseInt(tripCount)
          : existingTruck.tripCount,
      subcon: subcon !== undefined ? subcon : existingTruck.subcon,
      imageUrl,
      imagePublicId
    }

    Object.assign(existingTruck, updatedFieldsData)
    await existingTruck.save()

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

// hard delete truck
const hardDeleteTruck = async (req, res, next) => {
  try {
    const { id } = req.params

    if (!['head_admin', 'admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    // FIX 6: Find before delete — avoid crash on null.imagePublicId,
    // and capture data needed for the activity log.
    const truckToDelete = await Truck.findById(id)
    if (!truckToDelete) {
      return next(createError(404, 'Truck not found'))
    }

    await Truck.findByIdAndDelete(id)

    if (truckToDelete.imagePublicId) {
      await cloudinary.uploader.destroy(truckToDelete.imagePublicId)
    }

    // FIX 7: Added missing activity log for hard delete.
    await ActivityLog.create({
      type: 'truck',
      performedBy: req.user._id,
      action: `Permanently deleted truck ${truckToDelete.plateNo} (${
        truckToDelete.truckType || 'no type'
      })`,
      targetTruck: truckToDelete._id
    })

    return res.status(200).json({ message: 'Truck deleted successfully' })
  } catch (error) {
    next(createError(500, 'Failed to delete truck'))
  }
}

// soft delete truck
const softDeleteTruck = async (req, res, next) => {
  try {
    const { id } = req.params

    if (!['head_admin', 'admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    const truck = await Truck.findById(id)
    if (!truck) {
      return next(createError(404, 'Truck not found'))
    }

    if (truck.isSoftDeleted) {
      return next(createError(400, 'Truck is already deleted'))
    }

    truck.isSoftDeleted = true
    await truck.save()

    await ActivityLog.create({
      type: 'truck',
      performedBy: req.user._id,
      action: `Deleted truck ${truck.plateNo}`,
      targetTruck: truck._id
    })

    res
      .status(200)
      .json({ success: true, message: 'Truck deleted successfully' })
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
