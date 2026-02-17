const SystemSettings = require('../models/systemSettingsModel')
const createError = require('http-errors')
const ActivityLog = require('../models/activityLogsModel')

// get all settings
const getAllSettings = async (req, res, next) => {
  try {
    const { category } = req.query

    if (!['head_admin', 'admin', 'visitor', 'subcon'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    const query = {}

    // filter by category if provided
    if (category) query.category = category

    const settings = await SystemSettings.find(query).sort({
      category: 1,
      field: 1
    })

    return res.status(200).json({
      settings
    })
  } catch (error) {
    next(error)
  }
}

// add option value to a field
const addOptionValue = async (req, res, next) => {
  try {
    const { category, field, value } = req.body

    if (!['head_admin', 'admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    // validate required fields
    if (!category || !field || !value) {
      return next(createError(400, 'Category, field, and value are required'))
    }

    // trim the value
    const trimmedValue = value.trim()

    if (!trimmedValue) {
      return next(createError(400, 'Value cannot be empty'))
    }

    // find the setting or create if it doesn't exist
    let setting = await SystemSettings.findOne({ category, field })

    if (!setting) {
      // Create new setting if it doesn't exist
      setting = await SystemSettings.create({
        category,
        field,
        values: [trimmedValue]
      })

      // create activity log
      await ActivityLog.create({
        type: 'system_settings',
        performedBy: req.user._id,
        action: `Created new setting field and added option "${trimmedValue}" to ${category} - ${field}`
      })

      return res.status(201).json({
        message: 'Setting field created and option added successfully',
        setting
      })
    }

    // check if value already exists (case-insensitive)
    const valueExistsInsensitive = setting.values.some(
      existingValue =>
        existingValue.toLowerCase() === trimmedValue.toLowerCase()
    )

    if (valueExistsInsensitive) {
      return res.status(400).json({
        message: 'This option already exists'
      })
    }

    // add the value
    setting.values.push(trimmedValue)
    await setting.save()

    // create activity log
    await ActivityLog.create({
      type: 'system_settings',
      performedBy: req.user._id,
      action: `Added option "${trimmedValue}" to ${category} - ${field}`
    })

    return res.status(200).json({
      message: 'Option added successfully',
      setting
    })
  } catch (error) {
    next(error)
  }
}

// remove option value from a field
const removeOptionValue = async (req, res, next) => {
  try {
    const { category, field, value } = req.body

    if (!['head_admin', 'admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    // validate required fields
    if (!category || !field || !value) {
      return next(createError(400, 'Category, field, and value are required'))
    }

    // find the setting
    const setting = await SystemSettings.findOne({ category, field })

    if (!setting) {
      return next(createError(404, 'Setting field not found'))
    }

    // check if value exists
    if (!setting.values.includes(value)) {
      return res.status(400).json({
        message: 'Option does not exist'
      })
    }

    // remove the value
    setting.values = setting.values.filter(v => v !== value)
    await setting.save()

    // create activity log
    await ActivityLog.create({
      type: 'system_settings',
      performedBy: req.user._id,
      action: `Removed option "${value}" from ${category} - ${field}`
    })

    return res.status(200).json({
      message: 'Option deleted successfully',
      setting
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getAllSettings,
  addOptionValue,
  removeOptionValue
}
