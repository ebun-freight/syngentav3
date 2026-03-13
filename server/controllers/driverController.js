const Driver = require('../models/driverModel')
const createError = require('http-errors')
const sharp = require('sharp')
const { isValidFileType } = require('../utils/validationFile')
const { uploadImageToCloudinary } = require('../utils/cloudinaryUtils')
const { validateFields } = require('../utils/validationFields')
const { cloudinary } = require('../middlewares/multerCloudinary')
const ActivityLog = require('../models/activityLogsModel')

const MAX_FILE_SIZE = 16 * 1024 * 1024 // 16 MB

// create driver
const createDriver = async (req, res, next) => {
  try {
    const { firstname, lastname, phoneNo, status, licenseNo, subcon } = req.body

    if (!['head_admin', 'admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    // FIX 1: Only firstname, lastname, phoneNo, and subcon are required:true
    // in driverModel. status is NOT required — it has a default of 'available'.
    // Removing it prevents false "Required fields are missing" errors when
    // a client submits without a status.
    validateFields({ firstname, lastname, phoneNo, subcon }, false)

    // check if driver already exists
    const isDriverAlreadyExist = await Driver.findOne({
      firstname: { $regex: new RegExp(`^${firstname}$`, 'i') },
      lastname: { $regex: new RegExp(`^${lastname}$`, 'i') }
    })

    if (isDriverAlreadyExist) {
      return res.status(400).json({
        message: 'Driver with this firstname and lastname already exists'
      })
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
          'Ebun/driver'
        )
        imageData = {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id
        }
      } catch (error) {
        return next(error)
      }
    }

    const newDriver = await Driver.create({
      firstname,
      lastname,
      phoneNo,
      status,
      subcon,
      licenseNo,
      imageUrl: imageData.url,
      imagePublicId: imageData.publicId
    })

    await ActivityLog.create({
      type: 'driver',
      performedBy: req.user._id,
      action: `Created new driver ${newDriver.firstname} ${newDriver.lastname}`,
      targetDriver: newDriver._id
    })

    return res.status(201).json({
      message: 'Driver created successfully',
      driver: newDriver
    })
  } catch (error) {
    next(error)
  }
}

// get all drivers
const getAllDrivers = async (req, res, next) => {
  try {
    const {
      status,
      sort,
      search,
      perPage,
      page = 1,
      showDeleted,
      subcon
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

    if (status) query.status = status

    if (req.user.role === 'subcon') {
      query.subcon = req.user.subcon
    } else if (subcon) {
      query.subcon = subcon
    }

    if (search) {
      const regex = { $regex: search, $options: 'i' }
      const searchConditions = [
        { firstname: regex },
        { lastname: regex },
        { phoneNo: regex }
      ]
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }]
        delete query.$or
      } else {
        query.$or = searchConditions
      }
    }

    const sortOptions = {
      oldest: { createdAt: 1 },
      latest: { createdAt: -1 },
      'a-z': { firstname: 1 },
      'z-a': { firstname: -1 },
      'trips-asc': { tripCount: 1 },
      'trips-desc': { tripCount: -1 },
      'subcon-asc': { subcon: 1 },
      'subcon-desc': { subcon: -1 }
    }

    const sortQuery = sortOptions[sort] || sortOptions.latest

    // FIX 3: parseInt(undefined) === NaN, which causes MongoDB to skip pagination
    // entirely and return ALL documents. totalPages also becomes NaN.
    // Added the same hasPagination guard used in getAllTrucks.
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

      const [total, drivers] = await Promise.all([
        Driver.countDocuments(query),
        Driver.find(query).skip(skip).limit(limit).sort(sortQuery)
      ])

      return res.status(200).json({
        total,
        page: Number(page),
        totalPages: Math.ceil(total / limit),
        drivers
      })
    } else {
      const drivers = await Driver.find(query).sort(sortQuery)
      return res.status(200).json({ total: drivers.length, drivers })
    }
  } catch (error) {
    next(error)
  }
}

// update driver
const updateDriver = async (req, res, next) => {
  try {
    const { id } = req.params
    const {
      firstname,
      lastname,
      phoneNo,
      status,
      licenseNo,
      tripCount,
      subcon
    } = req.body

    if (!['head_admin', 'admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    const existingDriver = await Driver.findById(id)
    if (!existingDriver) {
      return next(createError(404, 'Driver not found'))
    }

    let imageUrl = existingDriver.imageUrl
    let imagePublicId = existingDriver.imagePublicId

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
          'Ebun/driver'
        )
        imageUrl = uploadResult.secure_url
        imagePublicId = uploadResult.public_id
      } catch (error) {
        return next(createError(500, 'Failed to upload image'))
      }
    }

    const updatedFields = []
    if (firstname && firstname !== existingDriver.firstname)
      updatedFields.push('firstname')
    if (lastname && lastname !== existingDriver.lastname)
      updatedFields.push('lastname')
    if (phoneNo && phoneNo !== existingDriver.phoneNo)
      updatedFields.push('phone number')
    if (status && status !== existingDriver.status) updatedFields.push('status')
    if (licenseNo && licenseNo !== existingDriver.licenseNo)
      updatedFields.push('license number')
    if (
      tripCount !== undefined &&
      tripCount !== '' &&
      parseInt(tripCount) !== existingDriver.tripCount
    )
      updatedFields.push('trip count')
    if (subcon && subcon !== existingDriver.subcon) updatedFields.push('subcon')
    if (req.file) updatedFields.push('profile picture')

    const actionMessage =
      updatedFields.length > 0
        ? `Updated driver's ${updatedFields.join(', ')}`
        : 'Updated driver details'

    // FIX 4: Use !== undefined (not ||) so optional fields can be cleared.
    // FIX 5: tripCount is Number in the model — parse from the string FormData sends.
    const updatedFieldsData = {
      firstname: firstname !== undefined ? firstname : existingDriver.firstname,
      lastname: lastname !== undefined ? lastname : existingDriver.lastname,
      phoneNo: phoneNo !== undefined ? phoneNo : existingDriver.phoneNo,
      status: status !== undefined ? status : existingDriver.status,
      licenseNo: licenseNo !== undefined ? licenseNo : existingDriver.licenseNo,
      subcon: subcon !== undefined ? subcon : existingDriver.subcon,
      tripCount:
        tripCount !== undefined && tripCount !== ''
          ? parseInt(tripCount)
          : existingDriver.tripCount,
      imageUrl,
      imagePublicId
    }

    Object.assign(existingDriver, updatedFieldsData)
    await existingDriver.save()

    await ActivityLog.create({
      type: 'driver',
      performedBy: req.user._id,
      action: actionMessage,
      targetDriver: existingDriver._id
    })

    res.status(200).json({
      message: 'Driver updated successfully',
      driver: existingDriver
    })
  } catch (error) {
    next(error)
  }
}

// hard delete driver
const hardDeleteDriver = async (req, res, next) => {
  try {
    const { id } = req.params

    if (!['head_admin', 'admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    // FIX 6: Find before delete — avoids crash on null.imagePublicId,
    // and captures data needed for the activity log.
    const driverToDelete = await Driver.findById(id)
    if (!driverToDelete) {
      return next(createError(404, 'Driver not found'))
    }

    await Driver.findByIdAndDelete(id)

    if (driverToDelete.imagePublicId) {
      await cloudinary.uploader.destroy(driverToDelete.imagePublicId)
    }

    // FIX 7: Added missing activity log for hard delete.
    await ActivityLog.create({
      type: 'driver',
      performedBy: req.user._id,
      action: `Permanently deleted driver ${driverToDelete.firstname} ${driverToDelete.lastname}`,
      targetDriver: driverToDelete._id
    })

    return res.status(200).json({ message: 'Driver deleted successfully' })
  } catch (error) {
    next(createError(500, 'Failed to delete driver'))
  }
}

// soft delete driver
const softDeleteDriver = async (req, res, next) => {
  try {
    const { id } = req.params

    if (!['head_admin', 'admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    const driver = await Driver.findById(id)
    if (!driver) {
      return next(createError(404, 'Driver not found'))
    }

    if (driver.isSoftDeleted) {
      return next(createError(400, 'Driver is already deleted'))
    }

    driver.isSoftDeleted = true
    await driver.save()

    await ActivityLog.create({
      type: 'driver',
      performedBy: req.user._id,
      action: `Deleted driver ${driver.firstname} ${driver.lastname}`,
      targetDriver: driver._id
    })

    res
      .status(200)
      .json({ success: true, message: 'Driver deleted successfully' })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createDriver,
  getAllDrivers,
  updateDriver,
  hardDeleteDriver,
  softDeleteDriver
}
