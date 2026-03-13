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

    // validate fields
    validateFields(
      {
        firstname,
        lastname,
        phoneNo,
        subcon
      },
      false
    )
    // check if driver already exist
    const isDriverAlreadyExist = await Driver.findOne({
      firstname: { $regex: new RegExp(`^${firstname}$`, 'i') },
      lastname: { $regex: new RegExp(`^${lastname}$`, 'i') }
    })

    if (isDriverAlreadyExist) {
      return res.status(400).json({
        message: 'Driver with this firstname and lastname already exists'
      })
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

        // FIX #6 — File size was not validated on driver creation (only on update).
        // Added the same 16 MB guard that already exists in updateDriver.
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

    // create new driver
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

    // create activity log
    await ActivityLog.create({
      type: 'driver',
      performedBy: req.user._id,
      action: 'Created new driver',
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

    //  filters
    if (status) query.status = status

    if (req.user.role === 'subcon') {
      query.subcon = req.user.subcon
    } else if (subcon) {
      if (subcon) query.subcon = subcon
    }

    // search
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

    // sorting
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

    // FIX #7 — Original code called parseInt(perPage) unconditionally and used the
    // result even when perPage was undefined. parseInt(undefined) === NaN, so:
    //   - skip = (page - 1) * NaN  →  NaN  →  MongoDB ignores the skip entirely
    //   - limit = NaN              →  MongoDB returns ALL documents
    //   - totalPages = Math.ceil(total / NaN)  →  NaN
    // Fixed by mirroring the hasPagination guard used in getAllTrucks.
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

      return res.status(200).json({
        total: drivers.length,
        drivers
      })
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

    // find the driver
    const existingDriver = await Driver.findById(id)
    if (!existingDriver) {
      return next(createError(404, 'Driver not found'))
    }

    // handle file upload if provided
    let imageUrl = existingDriver.imageUrl
    let imagePublicId = existingDriver.imagePublicId

    // if images are provided
    if (req.file) {
      try {
        // validate file type
        if (!isValidFileType(req.file.mimetype)) {
          return next(
            createError(400, 'Invalid file type. Only images are allowed')
          )
        }

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
          'Ebun/driver'
        )

        imageUrl = uploadResult.secure_url
        imagePublicId = uploadResult.public_id
      } catch (error) {
        return next(createError(500, 'Failed to upload image'))
      }
    }

    // Track which fields are being updated for activity log
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
    if (tripCount && parseInt(tripCount) !== existingDriver.tripCount)
      updatedFields.push('trip count')
    if (subcon && subcon !== existingDriver.subcon) updatedFields.push('subcon')
    if (req.file) updatedFields.push('profile picture')

    const actionMessage =
      updatedFields.length > 0
        ? `Updated driver's ${updatedFields.join(', ')}`
        : 'Updated driver details'

    // FIX #8 — Original code used `|| existingDriver.X` (falsy fallback) for all fields.
    // Sending an empty string to intentionally clear subcon, licenseNo, etc. would silently
    // keep the old value. Fixed by using `!== undefined` checks so only truly absent
    // fields fall back to the existing value.
    const updatedFieldsData = {
      firstname: firstname !== undefined ? firstname : existingDriver.firstname,
      lastname: lastname !== undefined ? lastname : existingDriver.lastname,
      phoneNo: phoneNo !== undefined ? phoneNo : existingDriver.phoneNo,
      status: status !== undefined ? status : existingDriver.status,
      licenseNo: licenseNo !== undefined ? licenseNo : existingDriver.licenseNo,
      subcon: subcon !== undefined ? subcon : existingDriver.subcon,
      tripCount: tripCount !== undefined ? tripCount : existingDriver.tripCount,
      imageUrl,
      imagePublicId
    }

    Object.assign(existingDriver, updatedFieldsData)
    await existingDriver.save()

    // create activity log
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

    // FIX #9 — Original code called findByIdAndDelete immediately, which means:
    //   (a) If the driver didn't exist, driverToDelete was null and calling
    //       cloudinary.uploader.destroy(null.imagePublicId) would throw a crash
    //       instead of returning a clean 404.
    //   (b) There was no activity log entry for a permanent delete, leaving a
    //       gap in the audit trail (hardDeleteUser correctly logs this).
    // Fixed by finding first, returning 404 cleanly if missing, then deleting,
    // then logging.
    const driverToDelete = await Driver.findById(id)
    if (!driverToDelete) {
      return next(createError(404, 'Driver not found'))
    }

    await Driver.findByIdAndDelete(id)

    // Delete profile picture from Cloudinary if it exists
    if (driverToDelete.imagePublicId) {
      await cloudinary.uploader.destroy(driverToDelete.imagePublicId)
    }

    // FIX #9 (cont.) — Added missing activity log for hard delete.
    await ActivityLog.create({
      type: 'driver',
      performedBy: req.user._id,
      action: `Permanently deleted driver ${driverToDelete.firstname} ${driverToDelete.lastname}`,
      targetDriver: driverToDelete._id
    })

    return res.status(200).json({
      message: 'Driver deleted successfully'
    })
  } catch (error) {
    next(createError(500, 'Failed to delete driver'))
  }
}

// soft delete
const softDeleteDriver = async (req, res, next) => {
  try {
    const { id } = req.params

    if (!['head_admin', 'admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    // Find the driver
    const driver = await Driver.findById(id)
    if (!driver) {
      return next(createError(404, 'Driver not found'))
    }

    // Check if already deleted
    if (driver.isSoftDeleted) {
      return next(createError(400, 'Driver is already deleted'))
    }

    // Soft delete the driver
    driver.isSoftDeleted = true

    await driver.save()

    // create activity log
    await ActivityLog.create({
      type: 'driver',
      performedBy: req.user._id,
      action: 'Deleted a driver',
      targetDriver: driver._id
    })

    res.status(200).json({
      success: true,
      message: 'Driver deleted successfully'
    })
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
