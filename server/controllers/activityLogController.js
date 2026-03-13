const createError = require('http-errors')
const ActivityLog = require('../models/activityLogsModel')

const getAllActivityLogs = async (req, res, next) => {
  try {
    const { type, sort, perPage, page = 1, date } = req.query

    const query = {}

    if (!['head_admin', 'admin'].includes(req.user.role)) {
      return next(createError(403, 'Access denied'))
    }

    // filters
    if (type) query.type = type

    // Date filter for specific day
    if (date) {
      const targetDate = new Date(date)

      if (isNaN(targetDate.getTime())) {
        return next(createError(400, 'Invalid date format. Use YYYY-MM-DD'))
      }

      query.$expr = {
        $and: [
          { $eq: [{ $year: '$createdAt' }, targetDate.getFullYear()] },
          { $eq: [{ $month: '$createdAt' }, targetDate.getMonth() + 1] },
          { $eq: [{ $dayOfMonth: '$createdAt' }, targetDate.getDate()] }
        ]
      }
    }

    // sorting
    const sortOptions = {
      oldest: { createdAt: 1 },
      latest: { createdAt: -1 }
    }
    const sortQuery = sortOptions[sort] || sortOptions.latest

    // FIX: parseInt(undefined) === NaN. When perPage is not provided,
    // limit becomes NaN — MongoDB ignores it and returns ALL documents,
    // skip becomes NaN — MongoDB ignores it and starts from the beginning,
    // and totalPages becomes NaN.
    // Added hasPagination guard matching the pattern used in getAllTrucks.
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

      const [total, activityLogs] = await Promise.all([
        ActivityLog.countDocuments(query),
        ActivityLog.find(query)
          .skip(skip)
          .limit(limit)
          .sort(sortQuery)
          .populate({ path: 'performedBy', select: '-password' })
          .populate('targetDeployment')
          .populate('targetDriver')
          .populate('targetTruck')
          .populate('targetUser')
      ])

      return res.status(200).json({
        total,
        page: Number(page),
        totalPages: Math.ceil(total / limit),
        activityLogs
      })
    } else {
      // No pagination — return all matching logs
      const activityLogs = await ActivityLog.find(query)
        .sort(sortQuery)
        .populate({ path: 'performedBy', select: '-password' })
        .populate('targetDeployment')
        .populate('targetDriver')
        .populate('targetTruck')
        .populate('targetUser')

      return res.status(200).json({
        total: activityLogs.length,
        page: 1,
        totalPages: 1,
        activityLogs
      })
    }
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getAllActivityLogs
}
