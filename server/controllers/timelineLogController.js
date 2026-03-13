const createError = require('http-errors')
const TimelineLog = require('../models/timelineLogsModel')
const { DateTime } = require('luxon')

const MANILA_TZ = 'Asia/Manila'

// Helper: get active subcon (replacement truck takes priority)
const getActiveSubcon = deployment => {
  if (deployment?.replacement?.replacementTruckId?.subcon) {
    return deployment.replacement.replacementTruckId.subcon
  }
  return deployment?.truckId?.subcon || ''
}

// timestamp is stored as an ISO String, so we compare against ISO strings
// (not JS Date objects — mixing types causes MongoDB to silently return wrong results)
const applyDateRange = (query, field, from, to) => {
  if (from) {
    const [year, month, day] = from.split('-').map(Number)
    const start = DateTime.fromObject(
      { year, month, day, hour: 0, minute: 0, second: 0, millisecond: 0 },
      { zone: MANILA_TZ }
    )
    if (!start.isValid) return query
    query = query.where(field).gte(start.toISO())
  }
  if (to) {
    const [year, month, day] = to.split('-').map(Number)
    const end = DateTime.fromObject(
      { year, month, day, hour: 23, minute: 59, second: 59, millisecond: 999 },
      { zone: MANILA_TZ }
    )
    if (!end.isValid) return query
    query = query.where(field).lte(end.toISO())
  }
  return query
}

// Helper: apply a simple string equality filter (skips if value is empty)
const applyStringFilter = (query, field, value) => {
  if (!value || value === '') return query
  return query.where(field).equals(value)
}

const getAllTimelineLogs = async (req, res, next) => {
  try {
    const {
      status,
      search,
      sort,
      perPage,
      page = 1,
      subcon,
      dateFrom,
      dateTo,
      hybrid,
      flagging,
      territory
    } = req.query

    const subconFilter =
      req.user.role === 'subcon' && req.user.subcon
        ? req.user.subcon.toLowerCase()
        : subcon && subcon !== ''
        ? subcon.toLowerCase()
        : null

    // hybrid, flagging, territory live on the targetDeployment, not on the
    // TimelineLog itself, so they are applied in-memory after population
    const hybridFilter = hybrid && hybrid !== '' ? hybrid : null
    const flaggingFilter = flagging && flagging !== '' ? flagging : null
    const territoryFilter = territory && territory !== '' ? territory : null

    // ── Build base query ──────────────────────────────────────────────────
    let baseQuery = TimelineLog.find()

    baseQuery = applyStringFilter(baseQuery, 'status', status)
    baseQuery = applyDateRange(baseQuery, 'timestamp', dateFrom, dateTo)

    const sortOptions = { oldest: { timestamp: 1 }, latest: { timestamp: -1 } }
    baseQuery = baseQuery.sort(sortOptions[sort] || sortOptions.latest)

    const limit = parseInt(perPage) || 40
    const skip = (parseInt(page) - 1) * limit
    baseQuery = baseQuery.skip(skip).limit(limit)

    baseQuery = baseQuery
      .populate({ path: 'performedBy', select: '-password' })
      .populate({
        path: 'targetDeployment',
        populate: [
          { path: 'truckId' },
          { path: 'driverId' },
          { path: 'replacement.replacementTruckId' },
          { path: 'replacement.replacementDriverId' }
        ]
      })

    let timelineLogs = await baseQuery

    // In-memory filters that depend on populated targetDeployment fields
    if (subconFilter) {
      timelineLogs = timelineLogs.filter(
        log =>
          getActiveSubcon(log.targetDeployment).toLowerCase() === subconFilter
      )
    }

    if (hybridFilter) {
      timelineLogs = timelineLogs.filter(
        log => (log.targetDeployment?.hybrid || '') === hybridFilter
      )
    }

    if (flaggingFilter) {
      timelineLogs = timelineLogs.filter(
        log => (log.targetDeployment?.flagging || '') === flaggingFilter
      )
    }

    if (territoryFilter) {
      timelineLogs = timelineLogs.filter(
        log => (log.targetDeployment?.territory || '') === territoryFilter
      )
    }

    if (search && search !== '') {
      const s = search.toLowerCase()
      timelineLogs = timelineLogs.filter(log => {
        const deployment = log.targetDeployment
        const hasReplacement =
          deployment?.replacement?.replacementTruckId ||
          deployment?.replacement?.replacementDriverId

        const truckPlate = (
          hasReplacement && deployment?.replacement?.replacementTruckId?.plateNo
            ? deployment.replacement.replacementTruckId.plateNo
            : deployment?.truckId?.plateNo || ''
        ).toLowerCase()

        const driverFirstname = (
          hasReplacement &&
          deployment?.replacement?.replacementDriverId?.firstname
            ? deployment.replacement.replacementDriverId.firstname
            : deployment?.driverId?.firstname || ''
        ).toLowerCase()

        const driverLastname = (
          hasReplacement &&
          deployment?.replacement?.replacementDriverId?.lastname
            ? deployment.replacement.replacementDriverId.lastname
            : deployment?.driverId?.lastname || ''
        ).toLowerCase()

        return (
          (log.action || '').toLowerCase().includes(s) ||
          (deployment?.deploymentCode || '').toLowerCase().includes(s) ||
          truckPlate.includes(s) ||
          driverFirstname.includes(s) ||
          driverLastname.includes(s) ||
          (log.performedBy?.firstname || '').toLowerCase().includes(s) ||
          (log.performedBy?.lastname || '').toLowerCase().includes(s) ||
          getActiveSubcon(deployment).toLowerCase().includes(s)
        )
      })
    }

    // Re-sort after in-memory filtering to guarantee timestamp order is preserved
    // (DB sort + pagination runs before in-memory filters, so order can drift)
    // Parse timestamps to ms for sorting — handles Date objects and ISO strings
    const toMs = ts => {
      if (!ts) return 0
      if (ts instanceof Date) return isNaN(ts.getTime()) ? 0 : ts.getTime()
      const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(ts)
        ? ts + '+08:00'
        : ts
      const ms = new Date(normalized).getTime()
      return isNaN(ms) ? 0 : ms
    }
    const sortDir = sort === 'oldest' ? 1 : -1
    timelineLogs = timelineLogs.sort(
      (a, b) => (toMs(a.timestamp) - toMs(b.timestamp)) * sortDir
    )

    // ── Count ─────────────────────────────────────────────────────────────
    const buildCountQuery = () => {
      let q = TimelineLog.find()
      q = applyStringFilter(q, 'status', status)
      q = applyDateRange(q, 'timestamp', dateFrom, dateTo)
      return q
    }

    let total

    const needsInMemoryCount =
      subconFilter ||
      hybridFilter ||
      flaggingFilter ||
      territoryFilter ||
      (search && search !== '')

    if (needsInMemoryCount) {
      const allForCount = await buildCountQuery().populate({
        path: 'targetDeployment',
        populate: [
          { path: 'truckId', select: 'subcon plateNo' },
          { path: 'replacement.replacementTruckId', select: 'subcon plateNo' }
        ]
      })

      let filtered = allForCount

      if (subconFilter) {
        filtered = filtered.filter(
          log =>
            getActiveSubcon(log.targetDeployment).toLowerCase() === subconFilter
        )
      }
      if (hybridFilter) {
        filtered = filtered.filter(
          log => (log.targetDeployment?.hybrid || '') === hybridFilter
        )
      }
      if (flaggingFilter) {
        filtered = filtered.filter(
          log => (log.targetDeployment?.flagging || '') === flaggingFilter
        )
      }
      if (territoryFilter) {
        filtered = filtered.filter(
          log => (log.targetDeployment?.territory || '') === territoryFilter
        )
      }
      if (search && search !== '') {
        const s = search.toLowerCase()
        filtered = filtered.filter(log => {
          const deployment = log.targetDeployment
          const truckPlate = (
            deployment?.replacement?.replacementTruckId?.plateNo ||
            deployment?.truckId?.plateNo ||
            ''
          ).toLowerCase()
          return (
            (log.action || '').toLowerCase().includes(s) ||
            (deployment?.deploymentCode || '').toLowerCase().includes(s) ||
            truckPlate.includes(s) ||
            getActiveSubcon(deployment).toLowerCase().includes(s)
          )
        })
      }

      total = filtered.length
    } else {
      total = await buildCountQuery().countDocuments()
    }

    return res.status(200).json({
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      timelineLogs
    })
  } catch (error) {
    next(error)
  }
}

module.exports = { getAllTimelineLogs }
