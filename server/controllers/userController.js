const createError = require('http-errors')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { validateFields } = require('../utils/validationFields')
const { isValidFileType } = require('../utils/validationFile')
const sharp = require('sharp')
const { uploadImageToCloudinary } = require('../utils/cloudinaryUtils')
const User = require('../models/userModel')
const { cloudinary } = require('../middlewares/multerCloudinary')
const sendStatusEmail = require('../utils/emailService')
const ActivityLog = require('../models/activityLogsModel')

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 16 * 1024 * 1024 // 16 MB

const DANGEROUS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /eval\(/i,
  /document\./i,
  /window\./i,
  /alert\(/i,
  /confirm\(/i,
  /prompt\(/i,
  /<\/?iframe/i,
  /<\/?object/i,
  /<\/?embed/i,
  /data:/i,
  /vbscript:/i
]

// ─── Allowed enum values (must stay in sync with userSchema) ─────────────────

const ALLOWED_ROLES = ['head_admin', 'admin', 'visitor', 'subcon']
const ALLOWED_STATUSES = [
  'active',
  'inactive',
  'pending',
  'rejected',
  'revoked'
]

const validateRole = role => {
  if (!ALLOWED_ROLES.includes(role)) {
    throw createError(
      400,
      `Invalid role value: "${role}". Allowed: ${ALLOWED_ROLES.join(', ')}`
    )
  }
}

const validateStatus = status => {
  if (!ALLOWED_STATUSES.includes(status)) {
    throw createError(
      400,
      `Invalid status value: "${status}". Allowed: ${ALLOWED_STATUSES.join(
        ', '
      )}`
    )
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true if the string contains XSS / injection patterns.
 */
const hasInvalidChars = input => {
  if (typeof input !== 'string') return false
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(input))
}

/**
 * Validates a set of named string fields for XSS patterns.
 * Calls next(err) and returns true if a violation is found.
 */
const xssCheck = (fields, next) => {
  for (const { name, value } of fields) {
    if (value && hasInvalidChars(value)) {
      console.warn(
        `XSS attempt detected in ${name}:`,
        String(value).substring(0, 100)
      )
      next(createError(400, `Invalid characters in ${name}`))
      return true // signal: stop processing
    }
  }
  return false
}

/**
 * Compress and upload an image buffer to Cloudinary.
 * Returns { url, publicId } or throws.
 */
const processAndUploadImage = async (file, folderPath) => {
  if (!isValidFileType(file.mimetype)) {
    throw createError(400, 'Invalid file type. Only images are allowed')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw createError(400, 'Image size must be less than 16MB')
  }

  const compressedImage = await sharp(file.buffer)
    .rotate()
    .resize({ width: 1200, withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer()

  const result = await uploadImageToCloudinary(compressedImage, folderPath)
  return { url: result.secure_url, publicId: result.public_id }
}

/**
 * Returns a human-readable role label for activity log messages.
 */
const roleLabel = role => {
  const labels = {
    head_admin: 'Head admin',
    admin: 'Admin',
    visitor: 'Visitor',
    subcon: 'Subcon'
  }
  return labels[role] || role
}

/**
 * Normalise an email address: trim whitespace and lower-case.
 * FIX #10 — createUser/createAdmin stored raw email while loginUser
 * looked up with trim().toLowerCase(), causing login failures on mixed-case input.
 */
const normaliseEmail = email =>
  typeof email === 'string' ? email.trim().toLowerCase() : email

// ─── Controllers ──────────────────────────────────────────────────────────────

// ── Create User (public signup) ───────────────────────────────────────────────
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

    // Force role and status server-side — never trust the client
    const forcedRole = 'visitor'
    const forcedStatus = 'pending'

    // FIX #9 / #15 — XSS validation (now also applied consistently in createAdmin)
    if (
      xssCheck(
        [
          { name: 'firstname', value: firstname },
          { name: 'middlename', value: middlename },
          { name: 'lastname', value: lastname },
          { name: 'email', value: email },
          { name: 'phoneNo', value: phoneNo }
        ],
        next
      )
    )
      return

    validateFields({
      firstname,
      lastname,
      email,
      phoneNo,
      password,
      confirmPassword
    })

    if (password !== confirmPassword)
      return next(createError(400, 'Passwords do not match'))
    if (password.length < 8)
      return next(createError(400, 'Password must be at least 8 characters'))

    // FIX #10 — normalise email before lookup and storage
    const normalisedEmail = normaliseEmail(email)
    const isUserAlreadyExist = await User.findOne({ email: normalisedEmail })
    if (isUserAlreadyExist)
      return next(createError(409, 'Email already exists'))

    const hashedPassword = await bcrypt.hash(password, 12)

    // FIX #16 — use shared image helper
    let imageData = { url: '', publicId: '' }
    if (req.file) {
      try {
        imageData = await processAndUploadImage(req.file, 'Ebun/visitor')
      } catch (err) {
        return next(err)
      }
    }

    const newUser = await User.create({
      firstname: firstname?.trim(),
      middlename: middlename?.trim(),
      lastname: lastname?.trim(),
      email: normalisedEmail,
      phoneNo,
      password: hashedPassword,
      role: forcedRole,
      status: forcedStatus,
      imageUrl: imageData.url,
      imagePublicId: imageData.publicId
    })

    const userWithoutPassword = newUser.toObject()
    delete userWithoutPassword.password

    await ActivityLog.create({
      type: 'visitor',
      performedBy: newUser._id,
      action: `New visitor registration request submitted by ${firstname.trim()} ${lastname.trim()} (${email
        .trim()
        .toLowerCase()})`,
      targetUser: newUser._id
    })

    return res
      .status(201)
      .json({ message: 'User created successfully', user: userWithoutPassword })
  } catch (error) {
    next(error)
  }
}

// ── Create Admin ──────────────────────────────────────────────────────────────
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

    if (!['head_admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    // FIX #9 — XSS validation was missing from createAdmin
    if (
      xssCheck(
        [
          { name: 'firstname', value: firstname },
          { name: 'middlename', value: middlename },
          { name: 'lastname', value: lastname },
          { name: 'email', value: email },
          { name: 'phoneNo', value: phoneNo }
        ],
        next
      )
    )
      return

    validateFields({
      firstname,
      lastname,
      email,
      phoneNo,
      password,
      confirmPassword
    })

    if (password !== confirmPassword)
      return next(createError(400, 'Passwords do not match'))
    if (password.length < 8)
      return next(createError(400, 'Password must be at least 8 characters'))

    validateRole(role)
    validateStatus(status)

    // FIX #10 — normalise email before lookup and storage
    const normalisedEmail = normaliseEmail(email)
    const isUserAlreadyExist = await User.findOne({ email: normalisedEmail })
    if (isUserAlreadyExist)
      return next(createError(409, 'Email already exists'))

    const hashedPassword = await bcrypt.hash(password, 12)

    // FIX #16 — use shared image helper
    let imageData = { url: '', publicId: '' }
    if (req.file) {
      const folderPath = role === 'subcon' ? 'Ebun/subcon' : 'Ebun/admin'
      try {
        imageData = await processAndUploadImage(req.file, folderPath)
      } catch (err) {
        return next(err)
      }
    }

    const newUser = await User.create({
      firstname: firstname?.trim(),
      middlename: middlename?.trim(),
      lastname: lastname?.trim(),
      email: normalisedEmail,
      phoneNo,
      password: hashedPassword,
      role,
      status,
      subcon,
      imageUrl: imageData.url,
      imagePublicId: imageData.publicId
    })

    const userWithoutPassword = newUser.toObject()
    delete userWithoutPassword.password

    await ActivityLog.create({
      type: role === 'subcon' ? 'subcon' : 'admin',
      performedBy: req.user._id,
      action: `Created a new ${role} account for ${firstname.trim()} ${lastname.trim()} (${normaliseEmail(
        email
      )})`,
      targetUser: newUser._id
    })

    const successMessage =
      role === 'subcon'
        ? 'Subcon account created successfully'
        : 'User created successfully'

    return res
      .status(201)
      .json({ message: successMessage, user: userWithoutPassword })
  } catch (error) {
    next(error)
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return next(createError(400, 'Email and password are required'))
    }

    const user = await User.findOne({ email: normaliseEmail(email) })
      .select('+password')
      .lean()

    // FIX #13 — check password first; only then reveal status-specific messages.
    // This prevents leaking "account exists" info to unauthenticated callers
    // via status-specific error messages when the password is wrong.
    const passwordValid =
      user && (await bcrypt.compare(password, user.password))
    if (!passwordValid) {
      return next(createError(401, 'Invalid email or password'))
    }

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

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $inc: { loginCount: 1 }, lastLogin: new Date() },
      { new: true }
    ).select('-password')

    const token = jwt.sign(
      { id: updatedUser._id, role: updatedUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    )

    ActivityLog.create({
      type: user.role === 'visitor' ? 'visitor' : 'admin',
      performedBy: user._id,
      action: `Logged in`,
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

// ── Logout ────────────────────────────────────────────────────────────────────
const logoutUser = async (req, res, next) => {
  try {
    await ActivityLog.create({
      type: req.user.role === 'visitor' ? 'visitor' : 'admin',
      performedBy: req.user._id,
      action: `Logged out`,
      targetUser: req.user._id
    })

    res.status(200).json({ message: 'Logged out successfully' })
  } catch (error) {
    next(error)
  }
}

// ── Get Current User ──────────────────────────────────────────────────────────
const getCurrentUser = async (req, res, next) => {
  try {
    res
      .status(200)
      .json({ message: 'User fetched successfully', user: req.user })
  } catch (error) {
    next(createError(500, 'Failed to fetch user. Please try again'))
  }
}

// ── Get All Users ─────────────────────────────────────────────────────────────
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

    if (!['head_admin', 'admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    const query = {}

    // Always exclude the requesting user from the list
    query._id = { $ne: req.user._id }

    if (showDeleted !== 'true') {
      query.$or = [
        { isSoftDeleted: false },
        { isSoftDeleted: { $exists: false } }
      ]
    }

    if (status) query.status = status

    // Both admin and head_admin can view all roles in the list.
    // Edit/delete restrictions are enforced separately in updateUser/softDeleteUser/hardDeleteUser.
    // When filtering by 'admin', include head_admin accounts too so the admin management
    // page shows the full picture.
    if (role) {
      query.role = role === 'admin' ? { $in: ['admin', 'head_admin'] } : role
    }

    if (search) {
      const regex = { $regex: search, $options: 'i' }
      const searchConditions = [
        { firstname: regex },
        { middlename: regex },
        { lastname: regex },
        { email: regex },
        { phoneNo: regex }
      ]

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }]
        delete query.$or
      } else {
        query.$or = searchConditions
      }
    }

    const limit = perPage ? parseInt(perPage) : 20
    const skip = (parseInt(page) - 1) * limit

    const sortOptions = {
      oldest: { createdAt: 1 },
      latest: { createdAt: -1 },
      'a-z': { firstname: 1 },
      'z-a': { firstname: -1 }
    }
    const sortQuery = sortOptions[sort] || sortOptions.latest

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

// ── Update User ───────────────────────────────────────────────────────────────
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

    if (!['head_admin', 'admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    const existingUser = await User.findById(id)
    if (!existingUser) return next(createError(404, 'User not found'))

    // ── Permission rules ──────────────────────────────────────────────────────
    // head_admin : can update any account (own + all roles)
    // admin      : can ONLY update visitor accounts; cannot edit own profile,
    //              other admins, or head_admin accounts
    const isEditingSelf = req.user._id.toString() === id.toString()

    if (req.user.role === 'admin') {
      // Admins may only touch visitor and subcon accounts
      if (!['visitor', 'subcon'].includes(existingUser.role)) {
        return next(
          createError(403, 'Admins can only update visitor and subcon accounts')
        )
      }
    }

    // Only head_admin can change roles
    if (role !== undefined && role !== existingUser.role) {
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

    // Status changes:
    // - head_admin can change anyone's status
    // - admin can change visitor and subcon status (already guaranteed by the role check above)
    if (status !== undefined && status !== existingUser.status) {
      if (
        req.user.role !== 'head_admin' &&
        !['visitor', 'subcon'].includes(existingUser.role)
      ) {
        return next(
          createError(
            403,
            'Only head admin can change status for admin accounts'
          )
        )
      }
    }

    // FIX #3 — validate role/status values against allowed enums when they are being changed
    if (role !== undefined && role !== existingUser.role) validateRole(role)
    if (status !== undefined && status !== existingUser.status)
      validateStatus(status)

    // FIX #15 — XSS check on update fields
    if (
      xssCheck(
        [
          { name: 'firstname', value: firstname },
          { name: 'middlename', value: middlename },
          { name: 'lastname', value: lastname },
          { name: 'email', value: email },
          { name: 'phoneNo', value: phoneNo }
        ],
        next
      )
    )
      return

    // Handle password update
    if (password !== undefined) {
      if (!confirmPassword)
        return next(createError(400, 'Password confirmation is required'))
      if (password !== confirmPassword)
        return next(createError(400, 'Passwords do not match'))
      if (password.length < 8)
        return next(
          createError(400, 'Password must be at least 8 characters long')
        )

      // head_admin can update any account's password.
      // admin can update passwords for visitor and subcon accounts only.
      const targetIsAllowedForAdmin = ['visitor', 'subcon'].includes(
        existingUser.role
      )
      if (req.user.role !== 'head_admin' && !targetIsAllowedForAdmin) {
        return next(
          createError(
            403,
            'Only head admin can update passwords for admin accounts'
          )
        )
      }

      existingUser.password = await bcrypt.hash(password, 12)
    }

    const isStatusChanged =
      status !== undefined && status !== existingUser.status

    // Handle image upload
    let imageUrl = existingUser.imageUrl
    let imagePublicId = existingUser.imagePublicId

    if (req.file) {
      try {
        // Delete old image from Cloudinary
        if (imagePublicId) {
          await cloudinary.uploader.destroy(imagePublicId)
        }

        const folderPath =
          existingUser.role === 'head_admin' || existingUser.role === 'admin'
            ? 'Ebun/admin'
            : 'Ebun/visitor'

        // FIX #16 — use shared image helper
        const uploaded = await processAndUploadImage(req.file, folderPath)
        imageUrl = uploaded.url
        imagePublicId = uploaded.publicId
      } catch (err) {
        console.error('Cloudinary error:', err)
        return next(
          err.status ? err : createError(500, 'Failed to upload image')
        )
      }
    }

    // Build contextual activity log message
    const changedDetails = []
    if (firstname !== undefined && firstname !== existingUser.firstname)
      changedDetails.push(
        `firstname: "${existingUser.firstname}" → "${firstname.trim()}"`
      )
    if (lastname !== undefined && lastname !== existingUser.lastname)
      changedDetails.push(
        `lastname: "${existingUser.lastname}" → "${lastname.trim()}"`
      )
    if (email !== undefined && normaliseEmail(email) !== existingUser.email)
      changedDetails.push(
        `email: "${existingUser.email}" → "${normaliseEmail(email)}"`
      )
    if (phoneNo !== undefined && phoneNo !== existingUser.phoneNo)
      changedDetails.push(`phone: "${existingUser.phoneNo}" → "${phoneNo}"`)
    if (status !== undefined && status !== existingUser.status)
      changedDetails.push(`status: "${existingUser.status}" → "${status}"`)
    if (role !== undefined && role !== existingUser.role)
      changedDetails.push(`role: "${existingUser.role}" → "${role}"`)
    if (subcon !== undefined && subcon !== existingUser.subcon)
      changedDetails.push(
        `subcon: "${existingUser.subcon || 'none'}" → "${subcon}"`
      )
    if (req.file) changedDetails.push('profile picture updated')
    if (password !== undefined) changedDetails.push('password changed')

    const target = `${existingUser.firstname} ${existingUser.lastname} (${existingUser.role})`
    const isUpdatingOwnProfile = req.user._id.toString() === id.toString()

    let actionMessage
    if (changedDetails.length > 0) {
      actionMessage = isUpdatingOwnProfile
        ? `Updated own profile — ${changedDetails.join('; ')}`
        : `Updated ${target}'s profile — ${changedDetails.join('; ')}`
    } else {
      actionMessage = isUpdatingOwnProfile
        ? `Submitted a profile update with no changes`
        : `Submitted an update for ${target} with no changes`
    }

    // FIX #5 — use undefined checks instead of falsy checks so optional fields can be cleared
    const updatedFieldsData = {
      firstname:
        firstname !== undefined ? firstname.trim() : existingUser.firstname,
      middlename:
        middlename !== undefined ? middlename.trim() : existingUser.middlename,
      lastname:
        lastname !== undefined ? lastname.trim() : existingUser.lastname,
      email: email !== undefined ? normaliseEmail(email) : existingUser.email,
      phoneNo: phoneNo !== undefined ? phoneNo : existingUser.phoneNo,
      role: role !== undefined ? role : existingUser.role,
      status: status !== undefined ? status : existingUser.status,
      subcon: subcon !== undefined ? subcon : existingUser.subcon,
      imageUrl,
      imagePublicId
    }

    Object.assign(existingUser, updatedFieldsData)
    await existingUser.save()

    // Send status-change email (non-blocking)
    if (isStatusChanged) {
      sendStatusEmail({
        user: { firstname: existingUser.firstname, email: existingUser.email },
        status: existingUser.status
      })
        .then(() =>
          console.log(
            `Status email sent to ${existingUser.email}: ${existingUser.status}`
          )
        )
        .catch(err => console.error('Failed to send status email:', err))
    }

    await ActivityLog.create({
      type: 'admin',
      performedBy: req.user._id,
      action: actionMessage,
      targetUser: existingUser._id
    })

    // Always strip password from the response object before sending back to the client
    const userResponse = existingUser.toObject()
    delete userResponse.password

    res.status(200).json({
      message: 'User updated successfully',
      user: userResponse,
      statusChanged: isStatusChanged,
      newStatus: existingUser.status
    })
  } catch (error) {
    next(error)
  }
}

// ── Hard Delete User ──────────────────────────────────────────────────────────
const hardDeleteUser = async (req, res, next) => {
  try {
    const { id } = req.params

    // FIX #6 — restrict hard delete to head_admin only
    if (req.user.role !== 'head_admin') {
      return next(createError(403, 'Access denied'))
    }

    // FIX #7 — prevent self-deletion
    if (req.user._id.toString() === id.toString()) {
      return next(createError(400, 'You cannot delete your own account'))
    }

    const userToDelete = await User.findById(id)
    if (!userToDelete) return next(createError(404, 'User not found'))

    // FIX #12/#18 — prevent deleting the last head_admin
    if (userToDelete.role === 'head_admin') {
      const headAdminCount = await User.countDocuments({ role: 'head_admin' })
      if (headAdminCount <= 1) {
        return next(createError(400, 'Cannot delete the last head admin'))
      }
    }

    await User.findByIdAndDelete(id)

    if (userToDelete.imagePublicId) {
      await cloudinary.uploader.destroy(userToDelete.imagePublicId)
    }

    // FIX #2 — add missing activity log for hard delete
    await ActivityLog.create({
      type: 'admin',
      performedBy: req.user._id,
      action: `Permanently deleted ${userToDelete.firstname} ${userToDelete.lastname}'s account (${userToDelete.role}, ${userToDelete.email})`,
      targetUser: userToDelete._id
    })

    return res
      .status(200)
      .json({ message: 'User permanently deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    next(createError(500, 'Failed to delete user'))
  }
}

// ── Soft Delete User ──────────────────────────────────────────────────────────
const softDeleteUser = async (req, res, next) => {
  try {
    const { id } = req.params

    if (!['head_admin', 'admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    // FIX #7 — prevent self-deletion
    if (req.user._id.toString() === id.toString()) {
      return next(createError(400, 'You cannot delete your own account'))
    }

    const user = await User.findById(id)
    if (!user) return next(createError(404, 'User not found'))

    // head_admin : can soft-delete any account (except self / last head_admin)
    // admin      : can only soft-delete visitor and subcon accounts
    if (
      req.user.role === 'admin' &&
      !['visitor', 'subcon'].includes(user.role)
    ) {
      return next(
        createError(403, 'Admins can only delete visitor and subcon accounts')
      )
    }

    if (user.isSoftDeleted) {
      return next(createError(400, 'User is already deleted'))
    }

    user.isSoftDeleted = true
    await user.save()

    await ActivityLog.create({
      type: 'admin',
      performedBy: req.user._id,
      action: `Soft-deleted ${user.firstname} ${user.lastname}'s account (${user.role}, ${user.email})`,
      targetUser: user._id
    })

    res
      .status(200)
      .json({ success: true, message: 'User deleted successfully' })
  } catch (error) {
    // FIX #1 — was `next()` with no argument, swallowing the error silently
    next(error)
  }
}

// ── Restore Soft-Deleted User ─────────────────────────────────────────────────
const restoreUser = async (req, res, next) => {
  try {
    const { id } = req.params

    if (req.user.role !== 'head_admin') {
      return next(createError(403, 'Access denied'))
    }

    const user = await User.findById(id)
    if (!user) return next(createError(404, 'User not found'))

    if (!user.isSoftDeleted) {
      return next(createError(400, 'User is not deleted'))
    }

    user.isSoftDeleted = false
    await user.save()

    await ActivityLog.create({
      type: 'admin',
      performedBy: req.user._id,
      action: `Restored ${user.firstname} ${user.lastname}'s account (${user.role}, ${user.email})`,
      targetUser: user._id
    })

    res
      .status(200)
      .json({ success: true, message: 'User restored successfully' })
  } catch (error) {
    next(error)
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
  softDeleteUser,
  restoreUser
}
