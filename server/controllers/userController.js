const createError = require('http-errors')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const {
  validateFields,
  validateRole,
  validateStatus
} = require('../utils/validationFields')
const { isValidFileType } = require('../utils/validationFile')
const sharp = require('sharp')
const { uploadImageToCloudinary } = require('../utils/cloudinaryUtils')
const User = require('../models/userModel')
const { cloudinary } = require('../middlewares/multerCloudinary')
const sendStatusEmail = require('../utils/emailService')
const ActivityLog = require('../models/activityLogsModel')

const hasInvalidChars = input => {
  if (typeof input !== 'string') return false

  // Check for dangerous characters and patterns
  const dangerousPatterns = [
    /<script/i, // Script tags
    /javascript:/i, // JavaScript protocol
    /on\w+\s*=/i, // Event handlers (onload, onerror, etc.)
    /eval\(/i, // eval() function
    /document\./i, // Document object access
    /window\./i, // Window object access
    /alert\(/i, // alert() function
    /confirm\(/i, // confirm() function
    /prompt\(/i, // prompt() function
    /<\/?iframe/i, // Iframe tags
    /<\/?object/i, // Object tags
    /<\/?embed/i, // Embed tags
    /data:/i, // Data URLs
    /vbscript:/i // VBScriptp
  ]

  return dangerousPatterns.some(pattern => pattern.test(input))
}

// create user
const createUser = async (req, res, next) => {
  try {
    const {
      firstname,
      middlename,
      lastname,
      email,
      phoneNo,
      password,
      confirmPassword
    } = req.body

    // Force signup role and status server-side to prevent tampering
    const forcedRole = 'visitor'
    const forcedStatus = 'pending'

    console.log(req.body)

    // XSS VALIDATION - CHECK ALL INPUTS FOR MALICIOUS CONTENT
    const fieldsToCheck = [
      { name: 'firstname', value: firstname },
      { name: 'middlename', value: middlename },
      { name: 'lastname', value: lastname },
      { name: 'email', value: email },
      { name: 'phoneNo', value: phoneNo }
    ]

    for (const field of fieldsToCheck) {
      if (field.value && hasInvalidChars(field.value)) {
        console.warn(
          `XSS attempt detected in ${field.name}:`,
          field.value.substring(0, 100)
        )
        return next(createError(400, `Invalid characters in ${field.name}`))
      }
    }

    // validate fields
    validateFields({
      firstname,
      lastname,
      email,
      phoneNo,
      password,
      confirmPassword
    })

    // Do not trust client-supplied role/status on public signup
    // role must always be 'visitor' and status 'pending' for self-signup

    // validate if password match
    if (password !== confirmPassword) {
      return next(createError(400, 'Password do not match'))
    }

    // valdate password strength
    if (password.length < 8) {
      return next(createError(400, 'Password must be at least  8 characters'))
    }

    // check if email already exist
    const isUserAlreadyExist = await User.findOne({ email })
    if (isUserAlreadyExist) {
      return next(createError(409, 'Email already exist'))
    }

    // hash the password
    const hashedPassword = await bcrypt.hash(password, 12)

    // upload profile picture to cloudinary (if provided)
    let imageData = {
      url: '',
      publicId: ''
    }

    if (req.file) {
      console.log(req.file)

      try {
        // validate file type
        if (!isValidFileType(req.file.mimetype)) {
          return next(
            createError(400, 'Invalid file type. Only images are allowed')
          )
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

        // folder path (use forced role for public signup)
        const folderPath =
          forcedRole === 'head_admin' || forcedRole === 'admin'
            ? 'Ebun/admin'
            : 'Ebun/visitor'

        // upload the image to cloudinary
        const uploadResult = await uploadImageToCloudinary(
          compressedImage,
          folderPath
        )

        imageData = {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id
        }
      } catch (error) {
        return next(error)
      }
    }

    // create new user (use forced role/status)
    const newUser = await User.create({
      firstname,
      middlename,
      lastname,
      email,
      phoneNo,
      password: hashedPassword,
      role: forcedRole,
      status: forcedStatus,
      imageUrl: imageData.url,
      imagePublicId: imageData.publicId
    })

    // convert to object and remove password
    const userWithoutPassword = newUser.toObject()
    delete userWithoutPassword.password

    // create activity log
    await ActivityLog.create({
      type: 'visitor',
      performedBy: newUser._id,
      action: 'Account registration request submitted',
      targetUser: newUser._id
    })

    return res.status(201).json({
      message: 'User created successfully',
      user: userWithoutPassword
    })
  } catch (error) {
    next(error)
  }
}

// create admin
const createAdmin = async (req, res, next) => {
  try {
    const {
      firstname,
      middlename,
      lastname,
      email,
      phoneNo,
      password,
      confirmPassword,
      role,
      status,
      subcon
    } = req.body

    console.log(req.body)

    if (!['head_admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    // validate fields
    validateFields({
      firstname,
      lastname,
      email,
      phoneNo,
      password,
      confirmPassword
    })

    // validate if password match
    if (password !== confirmPassword) {
      return next(createError(400, 'Password do not match'))
    }

    // valdate password strength
    if (password.length < 8) {
      return next(createError(400, 'Password must be at least  8 characters'))
    }

    // check if email already exist
    const isUserAlreadyExist = await User.findOne({ email })
    if (isUserAlreadyExist) {
      return next(createError(409, 'Email already exist'))
    }

    // validate role
    validateRole(role)

    // validate status
    validateStatus(status)

    // hash the password
    const hashedPassword = await bcrypt.hash(password, 12)

    // upload profile picture to cloudinary (if provided)
    let imageData = {
      url: '',
      publicId: ''
    }

    if (req.file) {
      console.log(req.file)

      try {
        // validate file type
        if (!isValidFileType(req.file.mimetype)) {
          return next(
            createError(400, 'Invalid file type. Only images are allowed')
          )
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

        const folderPath = role === 'subcon' ? 'Ebun/subcon' : 'Ebun/admin'

        // upload the image to cloudinary
        const uploadResult = await uploadImageToCloudinary(
          compressedImage,
          folderPath
        )

        imageData = {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id
        }
      } catch (error) {
        return next(error)
      }
    }

    // create new user
    const newUser = await User.create({
      firstname,
      middlename,
      lastname,
      email,
      phoneNo,
      password: hashedPassword,
      role,
      status,
      subcon,
      imageUrl: imageData.url,
      imagePublicId: imageData.publicId
    })

    // convert to object and remove password
    const userWithoutPassword = newUser.toObject()
    delete userWithoutPassword.password

    // create activity log
    await ActivityLog.create({
      type: role === 'subcon' ? 'subcon' : 'admin',
      performedBy: req.user._id,
      action:
        role === 'subcon'
          ? 'Created a subcon account'
          : 'Created an admin account',
      targetUser: newUser._id
    })

    const successMessage =
      role === 'subcon'
        ? 'Subcon account created successfully'
        : 'User created successfully'

    return res.status(201).json({
      message: successMessage,
      user: userWithoutPassword
    })
  } catch (error) {
    next(error)
  }
}

// login user
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body

    // Validate required fields
    if (!email || !password) {
      return next(createError(400, 'Email and password are required'))
    }

    // Find user with password field
    const user = await User.findOne({ email: email.trim().toLowerCase() })
      .select('+password')
      .lean()

    // Check if user exists and password is valid
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return next(createError(401, 'Invalid email or password'))
    }

    // Check account status with a single condition
    const invalidStatuses = {
      inactive: 'This account is deactivated',
      pending: 'This account approval is still pending',
      rejected: 'This account request has been rejected',
      revoked: 'This account access has been revoked'
    }

    if (invalidStatuses[user.status]) {
      return next(createError(401, invalidStatuses[user.status]))
    }

    if (user.status !== 'active') {
      return next(createError(401, 'This account is not authorized to login'))
    }

    // Update user login stats
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        $inc: { loginCount: 1 },
        lastLogin: new Date()
      },
      { new: true }
    ).select('-password')

    // Generate token
    const token = jwt.sign(
      { id: updatedUser._id, role: updatedUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    )

    // Create activity log (fire and forget)
    ActivityLog.create({
      type: user.role === 'visitor' ? 'visitor' : 'admin',
      performedBy: user._id,
      action: 'Logged in to the system',
      targetUser: user._id
    }).catch(err => console.error('Activity log failed:', err))

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: updatedUser._id,
        firstname: updatedUser.firstname,
        middlename: updatedUser.middlename,
        lastname: updatedUser.lastname,
        email: updatedUser.email,
        phone: updatedUser.phoneNo,
        role: updatedUser.role,
        status: updatedUser.status,
        loginCount: updatedUser.loginCount,
        lastLogin: updatedUser.lastLogin,
        imageUrl: updatedUser.imageUrl,
        imagePublicId: updatedUser.imagePublicId
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    next(createError(500, 'An error occurred during login. Please try again.'))
  }
}

// logout user
const logoutUser = async (req, res, next) => {
  try {
    // create activity log
    await ActivityLog.create({
      type: req.user.role === 'visitor' ? 'visitor' : 'admin',
      performedBy: req.user._id,
      action: 'Logged out to the system',
      targetUser: req.user._id
    })

    res.status(200).json({
      message: 'Logged out successfully'
    })
  } catch (error) {
    next(error)
  }
}

// get current user
const getCurrentUser = async (req, res, next) => {
  try {
    res.status(200).json({
      message: 'Admin fetched successfully',
      user: req.user
    })
  } catch (error) {
    next(createError(500, 'Failed to fetch user. Please try again'))
  }
}

// get all user
const getAllUsers = async (req, res, next) => {
  try {
    const {
      status,
      role,
      sort,
      search,
      perPage,
      page = 1,
      showDeleted
    } = req.query

    const query = {}

    if (!['head_admin', 'admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    query._id = { $ne: req.user._id }

    if (showDeleted !== 'true') {
      query.$or = [
        { isSoftDeleted: false },
        { isSoftDeleted: { $exists: false } }
      ]
    }

    // filters
    if (status) query.status = status
    if (role) {
      if (role === 'admin') {
        query.role = { $in: ['admin', 'head_admin'] } // FIXED: Now includes both admin and head_admin
      } else {
        query.role = role
      }
    }

    // search - FIXED: Properly handles both showDeleted and search conditions
    if (search) {
      const regex = { $regex: search, $options: 'i' }
      const searchConditions = [
        { firstname: regex },
        { middlename: regex },
        { lastname: regex },
        { email: regex },
        { phoneNo: regex }
      ]

      // If query already has $or from showDeleted condition
      if (query.$or) {
        // Wrap both conditions in $and
        query.$and = [{ $or: query.$or }, { $or: searchConditions }]
        delete query.$or // Remove the original $or
      } else {
        query.$or = searchConditions
      }
    }

    // pagination with defaults
    const limit = perPage ? parseInt(perPage) : 20
    const skip = (parseInt(page) - 1) * limit

    // sorting
    const sortOptions = {
      oldest: { createdAt: 1 },
      latest: { createdAt: -1 },
      'a-z': { firstname: 1 },
      'z-a': { firstname: -1 }
    }

    const sortQuery = sortOptions[sort] || sortOptions.latest

    // query database
    const [total, users] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .select('-password')
        .skip(skip)
        .limit(limit)
        .sort(sortQuery)
    ])

    return res.status(200).json({
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      users
    })
  } catch (error) {
    next(error)
  }
}

// udpate user
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params
    const {
      firstname,
      middlename,
      lastname,
      email,
      phoneNo,
      role,
      status,
      subcon,
      password,
      confirmPassword
    } = req.body

    console.log('Update request body:', req.body)

    // Check permissions
    if (!['head_admin', 'admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    // find the user
    const existingUser = await User.findById(id)
    if (!existingUser) {
      return next(createError(404, 'User not found'))
    }

    // PERMISSION LOGIC FIX:
    // Admin can only edit themselves or visitors
    if (req.user.role === 'admin') {
      const isEditingSelf = req.user._id.toString() === id.toString()
      const isEditingVisitor = existingUser.role === 'visitor'

      if (!isEditingSelf && !isEditingVisitor) {
        return next(createError(403, 'Access denied'))
      }
    }

    // password
    if (password) {
      if (!confirmPassword) {
        return next(createError(400, 'Password confirmation is required'))
      }

      if (password !== confirmPassword) {
        return next(createError(400, 'Passwords do not match'))
      }

      if (password.length < 8) {
        return next(
          createError(400, 'Password must be at least 8 characters long')
        )
      }

      // Check permission for password update
      const isUpdatingOwnPassword = req.user._id.toString() === id.toString()

      // Only allow password update if:
      // 1. User is updating their own password, OR
      // 2. Head admin is updating someone else's password
      if (!isUpdatingOwnPassword && req.user.role !== 'head_admin') {
        return next(createError(403, 'Access denied'))
      }

      // hash password
      const hashedPassword = await bcrypt.hash(password, 12)
      existingUser.password = hashedPassword
    }

    // Head admin can edit anyone (no restrictions)
    // So we don't need additional checks for head_admin

    // Track if status is being changed
    const isStatusChanged = status && status !== existingUser.status

    // Restrict who can change status: only head_admin may change another user's status
    if (status && status !== existingUser.status) {
      if (req.user.role !== 'head_admin') {
        return next(createError(403, 'Only head admin can change user status'))
      }
    }

    // handle file upload if provided
    let imageUrl = existingUser.imageUrl
    let imagePublicId = existingUser.imagePublicId

    // if images are provided
    if (req.file) {
      console.log('IMAGE FOR UPDATE', req.file)

      try {
        // validate file type
        if (!isValidFileType(req.file.mimetype)) {
          return next(
            createError(400, 'Invalid file type. Only images are allowed')
          )
        }

        // Validate file size (16MB max)
        const MAX_FILE_SIZE = 16 * 1024 * 1024
        if (req.file.size > MAX_FILE_SIZE) {
          return next(createError(400, 'Image size must be less than 16MB'))
        }

        // delete old picture if exist
        if (imagePublicId) {
          await cloudinary.uploader.destroy(imagePublicId)
        }

        // upload new image
        const uploadResult = await uploadImageToCloudinary(
          req.file.buffer,
          existingUser.role === 'head_admin' || existingUser.role === 'admin'
            ? 'Ebun/admin'
            : 'Ebun/visitor'
        )

        imageUrl = uploadResult.secure_url
        imagePublicId = uploadResult.public_id
      } catch (error) {
        console.error('Cloudinary error:', error)
        return next(createError(500, 'Failed to upload image'))
      }
    }

    // Track which fields are being updated for activity log
    const updatedFields = []
    if (firstname && firstname !== existingUser.firstname)
      updatedFields.push('firstname')
    if (lastname && lastname !== existingUser.lastname)
      updatedFields.push('lastname')
    if (email && email !== existingUser.email) updatedFields.push('email')
    if (phoneNo && phoneNo !== existingUser.phoneNo)
      updatedFields.push('phone number')
    if (status && status !== existingUser.status) updatedFields.push('status')
    if (role && role !== existingUser.role) updatedFields.push('role')
    if (subcon && subcon !== existingUser.subcon) updatedFields.push('subcon')
    if (req.file) updatedFields.push('profile picture')
    if (password) updatedFields.push('password')

    // Check if user is updating their own profile
    const isUpdatingOwnProfile = req.user._id.toString() === id.toString()
    let actionMessage = ''
    if (updatedFields.length > 0) {
      if (isUpdatingOwnProfile) {
        // User is updating their own profile
        const roleString =
          existingUser.role === 'head_admin'
            ? 'Head admin'
            : existingUser.role === 'admin'
            ? 'Admin'
            : 'Visitor'

        actionMessage = `${roleString} updated their own ${updatedFields.join(
          ', '
        )}`
      } else {
        // User is updating another user's profile
        const targetRole =
          existingUser.role === 'head_admin'
            ? "Head admin's"
            : existingUser.role === 'admin'
            ? "Admin's"
            : "Visitor's"

        actionMessage = `Updated ${targetRole} ${updatedFields.join(', ')}`
      }
    } else {
      // No fields were actually changed
      if (isUpdatingOwnProfile) {
        const roleString =
          existingUser.role === 'head_admin'
            ? 'Head admin'
            : existingUser.role === 'admin'
            ? 'Admin'
            : 'Visitor'

        actionMessage = `${roleString} attempted to update their own profile (no changes)`
      } else {
        const targetRole =
          existingUser.role === 'head_admin'
            ? 'Head admin'
            : existingUser.role === 'admin'
            ? 'Admin'
            : 'Visitor'

        actionMessage = `Attempted to update ${targetRole} profile (no changes)`
      }
    }

    // Additional permission check for role changes
    if (role && role !== existingUser.role) {
      // Only head_admin can change roles
      if (req.user.role !== 'head_admin') {
        return next(createError(403, 'Only head admin can change user roles'))
      }

      // Prevent demoting the last head_admin
      if (existingUser.role === 'head_admin') {
        const headAdminCount = await User.countDocuments({ role: 'head_admin' })
        if (headAdminCount <= 1) {
          return next(createError(400, 'Cannot demote the last head admin'))
        }
      }
    }

    // update fields
    const updatedFieldsData = {
      firstname: firstname || existingUser.firstname,
      middlename: middlename || existingUser.middlename,
      lastname: lastname || existingUser.lastname,
      email: email || existingUser.email,
      phoneNo: phoneNo || existingUser.phoneNo,
      role: role || existingUser.role,
      status: status || existingUser.status,
      subcon: subcon || existingUser.subcon,
      imageUrl,
      imagePublicId
    }

    Object.assign(existingUser, updatedFieldsData)
    await existingUser.save()

    // Send email notification if status was changed
    if (isStatusChanged) {
      try {
        sendStatusEmail({
          user: {
            firstname: existingUser.firstname,
            email: existingUser.email
          },
          status: existingUser.status
        })
          .then(() => {
            console.log(
              `Status email sent to ${existingUser.email} for new status: ${existingUser.status}`
            )
          })
          .catch(error => {
            console.error('Failed to send status email:', error)
          })
      } catch (emailError) {
        console.error('Error sending status email:', emailError)
      }
    }

    // create activity log
    await ActivityLog.create({
      type: 'admin',
      performedBy: req.user._id,
      action: actionMessage,
      targetUser: existingUser._id
    })

    res.status(200).json({
      message: 'User updated successfully',
      user: existingUser,
      statusChanged: isStatusChanged,
      newStatus: existingUser.status
    })
  } catch (error) {
    next(error)
  }
}

// hard delete user
const hardDeleteUser = async (req, res, next) => {
  try {
    const { id } = req.params

    console.log('DELETE USER ID', id)

    if (!['head_admin', 'admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    // Find the user to delete
    const userToDelete = await User.findByIdAndDelete(id)
    if (!userToDelete) {
      return next(createError(404, 'User not found'))
    }

    // Delete profile picture from Cloudinary if it exists
    if (userToDelete.imagePublicId) {
      await cloudinary.uploader.destroy(userToDelete.imagePublicId)
    }

    return res.status(200).json({
      message: 'User deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    next(createError(500, 'Failed to delete user'))
  }
}

// soft delete user
const softDeleteUser = async (req, res, next) => {
  try {
    const { id } = req.params

    if (!['head_admin', 'admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    const user = await User.findById(id)
    if (!user) {
      return next(createError(404, 'User not found'))
    }

    // Check if already deleted
    if (user.isSoftDeleted) {
      return next(createError(400, 'User is already deleted'))
    }

    // Soft delete the user
    user.isSoftDeleted = true

    await user.save()

    // create activity log
    await ActivityLog.create({
      type: 'admin',
      performedBy: req.user._id,
      action:
        user.role === 'admin'
          ? 'Deleted an admin account'
          : 'Deleted a visitor account',
      targetUser: user._id
    })

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    })
  } catch (error) {
    next()
  }
}

module.exports = {
  createUser,
  createAdmin,
  loginUser,
  logoutUser,
  getCurrentUser,
  getAllUsers,
  updateUser,
  hardDeleteUser,
  softDeleteUser
}
