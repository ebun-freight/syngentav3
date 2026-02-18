const Truck = require('../models/truckModel')
const Driver = require('../models/driverModel')
const Deployment = require('../models/deploymentModel')
const User = require('../models/userModel')

const getDashboardAnalytics = async (req, res) => {
  try {
    const now = new Date()
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const last12Weeks = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000)

    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentYearStart = new Date(now.getFullYear(), 0, 1)

    // Base deployment filter (no subcon field anymore)
    const baseFilter = { isSoftDeleted: { $ne: true } }
    const truckAndDriverFilter = { isSoftDeleted: { $ne: true } }

    // For subcon users: filter trucks/drivers by subcon, deployments by truck lookup
    if (req.user.role === 'subcon' && req.user.subcon) {
      truckAndDriverFilter.subcon = req.user.subcon
    }

    // Helper: get truck IDs belonging to this subcon (for deployment filters)
    let subconTruckIds = null
    if (req.user.role === 'subcon' && req.user.subcon) {
      const subconTrucks = await Truck.find({ subcon: req.user.subcon })
        .select('_id')
        .lean()
      subconTruckIds = subconTrucks.map(t => t._id)
    }

    // Deployment filter for subcon users — filter by truckId in subcon's truck list
    const deploymentFilter = subconTruckIds
      ? { ...baseFilter, truckId: { $in: subconTruckIds } }
      : { ...baseFilter }

    const promises = {
      // Basic counts
      totalTrucks: Truck.countDocuments(truckAndDriverFilter),
      totalDrivers: Driver.countDocuments(truckAndDriverFilter),
      activeDeployments: Deployment.countDocuments({
        ...deploymentFilter,
        status: { $in: ['ongoing', 'in-progress'] }
      }),
      availableTrucks: Truck.countDocuments({
        ...truckAndDriverFilter,
        status: 'available'
      }),
      availableDrivers: Driver.countDocuments({
        ...truckAndDriverFilter,
        status: 'available'
      }),

      trucksInMaintenance: Truck.countDocuments({
        ...truckAndDriverFilter,
        status: 'unavailable'
      }),
      inactiveDrivers: Driver.countDocuments({
        ...truckAndDriverFilter,
        status: 'unavailable'
      }),
      completedDeployments: Deployment.countDocuments({
        ...deploymentFilter,
        status: 'completed'
      }),
      cancelledDeployments: Deployment.countDocuments({
        ...deploymentFilter,
        status: 'canceled'
      }),

      recentDeployments: Deployment.countDocuments({
        ...deploymentFilter,
        createdAt: { $gte: last7Days }
      }),
      deploymentsLast30Days: Deployment.countDocuments({
        ...deploymentFilter,
        createdAt: { $gte: last30Days }
      }),
      monthlyDeployments: Deployment.countDocuments({
        ...deploymentFilter,
        createdAt: { $gte: currentMonthStart }
      }),
      yearlyDeployments: Deployment.countDocuments({
        ...deploymentFilter,
        createdAt: { $gte: currentYearStart }
      }),

      // Truck analytics
      truckStatusAnalytics: Truck.aggregate([
        { $match: truckAndDriverFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      truckTypeAnalytics: Truck.aggregate([
        { $match: truckAndDriverFilter },
        { $group: { _id: '$truckType', count: { $sum: 1 } } }
      ]),

      // Driver analytics
      driverStatusAnalytics: Driver.aggregate([
        { $match: truckAndDriverFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      topDriversByTrips: Driver.aggregate([
        { $match: truckAndDriverFilter },
        { $sort: { tripCount: -1 } },
        { $limit: 20 },
        {
          $project: {
            name: { $concat: ['$firstname', ' ', '$lastname'] },
            tripCount: 1,
            status: 1,
            imageUrl: 1,
            phoneNo: 1,
            subcon: 1,
            licenseNo: 1
          }
        }
      ]),

      // Deployment status analytics
      deploymentStatusAnalytics: Deployment.aggregate([
        {
          $match: {
            ...deploymentFilter,
            status: {
              $in: [
                'completed',
                'ongoing',
                'in-progress',
                'pending',
                'canceled',
                'preparing'
              ]
            }
          }
        },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // Weekly trends (last 12 weeks)
      weeklyDeploymentAnalytics: Deployment.aggregate([
        { $match: { ...deploymentFilter, createdAt: { $gte: last12Weeks } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              week: { $ceil: { $divide: [{ $dayOfMonth: '$createdAt' }, 7] } }
            },
            count: { $sum: 1 },
            totalSacks: { $sum: '$totalSacksCount' },
            totalWeight: { $sum: '$loadWeightKg' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1 } }
      ]),

      weeklyDeploymentStatusAnalytics: Deployment.aggregate([
        { $match: { ...deploymentFilter, createdAt: { $gte: last12Weeks } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              week: { $ceil: { $divide: [{ $dayOfMonth: '$createdAt' }, 7] } },
              status: '$status'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1 } }
      ]),

      weeklySacksAnalytics: Deployment.aggregate([
        {
          $match: {
            ...deploymentFilter,
            status: { $ne: 'canceled' },
            createdAt: { $gte: last12Weeks }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              week: { $ceil: { $divide: [{ $dayOfMonth: '$createdAt' }, 7] } }
            },
            totalSacks: { $sum: '$totalSacksCount' },
            deploymentCount: { $sum: 1 },
            avgSacksPerDeployment: { $avg: '$totalSacksCount' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1 } }
      ]),

      weeklyWeightAnalytics: Deployment.aggregate([
        {
          $match: {
            ...deploymentFilter,
            status: { $ne: 'canceled' },
            createdAt: { $gte: last12Weeks }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              week: { $ceil: { $divide: [{ $dayOfMonth: '$createdAt' }, 7] } }
            },
            totalWeight: { $sum: '$loadWeightKg' },
            deploymentCount: { $sum: 1 },
            avgWeightPerDeployment: { $avg: '$loadWeightKg' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1 } }
      ]),

      topPickupSites: Deployment.aggregate([
        {
          $match: {
            ...deploymentFilter,
            pickupSite: { $exists: true, $ne: '' }
          }
        },
        {
          $group: {
            _id: '$pickupSite',
            count: { $sum: 1 },
            totalSacks: { $sum: '$totalSacksCount' },
            totalWeight: { $sum: '$loadWeightKg' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),

      deploymentEfficiency: Deployment.aggregate([
        { $match: { ...deploymentFilter, status: { $ne: 'canceled' } } },
        {
          $group: {
            _id: null,
            avgSacks: { $avg: '$totalSacksCount' },
            avgWeight: { $avg: '$loadWeightKg' },
            maxSacks: { $max: '$totalSacksCount' },
            maxWeight: { $max: '$loadWeightKg' }
          }
        }
      ]),

      completedCargoMetrics: Deployment.aggregate([
        { $match: { ...deploymentFilter, status: 'completed' } },
        {
          $group: {
            _id: null,
            totalCompletedSacks: { $sum: '$totalSacksCount' },
            totalCompletedWeight: { $sum: '$loadWeightKg' },
            avgCompletedSacks: { $avg: '$totalSacksCount' },
            avgCompletedWeight: { $avg: '$loadWeightKg' },
            maxCompletedSacks: { $max: '$totalSacksCount' },
            maxCompletedWeight: { $max: '$loadWeightKg' }
          }
        }
      ]),

      pendingDeployments: Deployment.countDocuments({
        ...deploymentFilter,
        status: 'pending'
      }),
      preparingDeployments: Deployment.countDocuments({
        ...deploymentFilter,
        status: 'preparing'
      }),
      inProgressDeployments: Deployment.countDocuments({
        ...deploymentFilter,
        status: 'in-progress'
      }),
      ongoingDeployments: Deployment.countDocuments({
        ...deploymentFilter,
        status: 'ongoing'
      }),

      activeTrucks: Truck.countDocuments({
        ...truckAndDriverFilter,
        status: { $in: ['available', 'deployed'] }
      }),
      deployedTrucks: Truck.countDocuments({
        ...truckAndDriverFilter,
        status: 'deployed'
      }),
      deployedDrivers: Driver.countDocuments({
        ...truckAndDriverFilter,
        status: 'deployed'
      }),

      recentActivity: Deployment.countDocuments({
        ...deploymentFilter,
        createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      }),

      // User analytics
      totalUsers: User.countDocuments({ isSoftDeleted: { $ne: true } }),
      activeUsers: User.countDocuments({
        isSoftDeleted: { $ne: true },
        status: 'active'
      }),
      pendingUsers: User.countDocuments({
        isSoftDeleted: { $ne: true },
        status: 'pending'
      }),

      userRoleAnalytics: User.aggregate([
        { $match: { isSoftDeleted: { $ne: true } } },
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),

      userStatusAnalytics: User.aggregate([
        { $match: { isSoftDeleted: { $ne: true } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      subconAnalytics: User.aggregate([
        {
          $match: {
            isSoftDeleted: { $ne: true },
            subcon: { $exists: true, $ne: '' }
          }
        },
        { $group: { _id: '$subcon', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),

      recentRegistrations: User.countDocuments({
        isSoftDeleted: { $ne: true },
        createdAt: { $gte: last30Days }
      }),

      userLoginAnalytics: User.aggregate([
        { $match: { isSoftDeleted: { $ne: true } } },
        {
          $group: {
            _id: null,
            totalLogins: { $sum: '$loginCount' },
            avgLoginCount: { $avg: '$loginCount' },
            maxLoginCount: { $max: '$loginCount' }
          }
        }
      ]),

      // Subcon performance — now derived from truck's subcon via $lookup
      subconPerformance: Deployment.aggregate([
        { $match: deploymentFilter },
        {
          $lookup: {
            from: 'trucks',
            localField: 'truckId',
            foreignField: '_id',
            as: 'truck'
          }
        },
        { $unwind: '$truck' },
        {
          $lookup: {
            from: 'trucks',
            localField: 'replacement.replacementTruckId',
            foreignField: '_id',
            as: 'replacementTruck'
          }
        },
        {
          $addFields: {
            activeSubcon: {
              $cond: [
                { $gt: [{ $size: '$replacementTruck' }, 0] },
                { $arrayElemAt: ['$replacementTruck.subcon', 0] },
                '$truck.subcon'
              ]
            }
          }
        },
        {
          $group: {
            _id: { subcon: '$activeSubcon', status: '$status' },
            count: { $sum: 1 },
            totalSacks: { $sum: '$totalSacksCount' },
            totalWeight: { $sum: '$loadWeightKg' }
          }
        },
        { $sort: { '_id.subcon': 1 } }
      ]),

      subconDriverPerformance: Driver.aggregate([
        { $match: truckAndDriverFilter },
        { $sort: { tripCount: -1 } },
        {
          $project: {
            name: { $concat: ['$firstname', ' ', '$lastname'] },
            tripCount: 1,
            status: 1,
            phoneNo: 1,
            licenseNo: 1,
            subcon: 1
          }
        }
      ]),

      subconTruckPerformance: Truck.aggregate([
        { $match: truckAndDriverFilter },
        { $sort: { tripCount: -1 } },
        {
          $project: {
            plateNo: 1,
            truckType: 1,
            tripCount: 1,
            status: 1,
            maxLoad: 1,
            subcon: 1
          }
        }
      ]),

      subconDriverStatusAnalytics: Driver.aggregate([
        { $match: truckAndDriverFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      subconTruckStatusAnalytics: Truck.aggregate([
        { $match: truckAndDriverFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      subconTruckTypeAnalytics: Truck.aggregate([
        { $match: truckAndDriverFilter },
        { $group: { _id: '$truckType', count: { $sum: 1 } } }
      ]),

      // Territory / Hybrid / Flagging analytics
      territoryAnalytics: Deployment.aggregate([
        { $match: deploymentFilter },
        { $group: { _id: '$territory', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      hybridAnalytics: Deployment.aggregate([
        { $match: deploymentFilter },
        { $group: { _id: '$hybrid', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      flaggingAnalytics: Deployment.aggregate([
        { $match: deploymentFilter },
        { $group: { _id: '$flagging', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      territoryPerformance: Deployment.aggregate([
        { $match: deploymentFilter },
        {
          $group: {
            _id: '$territory',
            count: { $sum: 1 },
            totalSacks: { $sum: '$totalSacksCount' },
            totalWeight: { $sum: '$loadWeightKg' },
            avgSacks: { $avg: '$totalSacksCount' },
            avgWeight: { $avg: '$loadWeightKg' },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            completedSacks: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'completed'] },
                  '$totalSacksCount',
                  0
                ]
              }
            },
            completedWeight: {
              $sum: {
                $cond: [{ $eq: ['$status', 'completed'] }, '$loadWeightKg', 0]
              }
            }
          }
        },
        {
          $project: {
            _id: 1,
            count: 1,
            totalSacks: 1,
            totalWeight: 1,
            avgSacks: 1,
            avgWeight: 1,
            completed: 1,
            completedSacks: 1,
            completedWeight: 1,
            completionRate: {
              $cond: [
                { $eq: ['$count', 0] },
                0,
                { $multiply: [{ $divide: ['$completed', '$count'] }, 100] }
              ]
            }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 15 }
      ]),

      hybridPerformance: Deployment.aggregate([
        { $match: { ...deploymentFilter, status: { $ne: 'canceled' } } },
        {
          $group: {
            _id: '$hybrid',
            count: { $sum: 1 },
            totalSacks: { $sum: '$totalSacksCount' },
            totalWeight: { $sum: '$loadWeightKg' },
            avgSacks: { $avg: '$totalSacksCount' },
            avgWeight: { $avg: '$loadWeightKg' }
          }
        },
        { $sort: { count: -1 } }
      ]),

      flaggingPerformance: Deployment.aggregate([
        { $match: { ...deploymentFilter, status: { $ne: 'canceled' } } },
        {
          $group: {
            _id: '$flagging',
            count: { $sum: 1 },
            totalSacks: { $sum: '$totalSacksCount' },
            totalWeight: { $sum: '$loadWeightKg' },
            avgSacks: { $avg: '$totalSacksCount' },
            avgWeight: { $avg: '$loadWeightKg' }
          }
        },
        { $sort: { count: -1 } }
      ]),

      territoryStatusAnalytics: Deployment.aggregate([
        { $match: deploymentFilter },
        {
          $group: {
            _id: { territory: '$territory', status: '$status' },
            count: { $sum: 1 },
            totalSacks: { $sum: '$totalSacksCount' },
            totalWeight: { $sum: '$loadWeightKg' }
          }
        },
        { $sort: { '_id.territory': 1 } }
      ]),

      hybridStatusAnalytics: Deployment.aggregate([
        { $match: deploymentFilter },
        {
          $group: {
            _id: { hybrid: '$hybrid', status: '$status' },
            count: { $sum: 1 },
            totalSacks: { $sum: '$totalSacksCount' },
            totalWeight: { $sum: '$loadWeightKg' }
          }
        },
        { $sort: { '_id.hybrid': 1 } }
      ]),

      flaggingStatusAnalytics: Deployment.aggregate([
        { $match: deploymentFilter },
        {
          $group: {
            _id: { flagging: '$flagging', status: '$status' },
            count: { $sum: 1 },
            totalSacks: { $sum: '$totalSacksCount' },
            totalWeight: { $sum: '$loadWeightKg' }
          }
        },
        { $sort: { '_id.flagging': 1 } }
      ]),

      monthlyTerritoryAnalytics: Deployment.aggregate([
        {
          $match: {
            ...deploymentFilter,
            status: { $ne: 'canceled' },
            createdAt: {
              $gte: new Date(now.getFullYear() - 1, now.getMonth(), 1)
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              territory: '$territory'
            },
            count: { $sum: 1 },
            totalSacks: { $sum: '$totalSacksCount' },
            totalWeight: { $sum: '$loadWeightKg' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.territory': 1 } }
      ]),

      weeklyTerritoryAnalytics: Deployment.aggregate([
        {
          $match: {
            ...deploymentFilter,
            status: { $ne: 'canceled' },
            createdAt: { $gte: last12Weeks }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              week: { $ceil: { $divide: [{ $dayOfMonth: '$createdAt' }, 7] } },
              territory: '$territory'
            },
            count: { $sum: 1 },
            totalSacks: { $sum: '$totalSacksCount' },
            totalWeight: { $sum: '$loadWeightKg' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1 } }
      ])
    }

    // Execute all promises
    const results = await Promise.all(Object.values(promises))
    const data = Object.keys(promises).reduce((acc, key, index) => {
      acc[key] = results[index]
      return acc
    }, {})

    // Process subcon performance data
    const processedSubconPerformance = {}
    data.subconPerformance.forEach(item => {
      const subcon = item._id.subcon
      const status = item._id.status
      if (!subcon) return

      if (!processedSubconPerformance[subcon]) {
        processedSubconPerformance[subcon] = {
          name: subcon,
          totalDeployments: 0,
          totalSacks: 0,
          totalWeight: 0,
          statusBreakdown: {
            preparing: 0,
            pending: 0,
            'in-progress': 0,
            ongoing: 0,
            completed: 0,
            canceled: 0
          }
        }
      }

      processedSubconPerformance[subcon].totalDeployments += item.count
      processedSubconPerformance[subcon].totalSacks += item.totalSacks || 0
      processedSubconPerformance[subcon].totalWeight += item.totalWeight || 0

      if (
        status &&
        processedSubconPerformance[subcon].statusBreakdown[status] !== undefined
      ) {
        processedSubconPerformance[subcon].statusBreakdown[status] = item.count
      }
    })

    // Process territory performance data
    const processedTerritoryPerformance = {}
    data.territoryStatusAnalytics.forEach(item => {
      const territory = item._id.territory
      const status = item._id.status

      if (!processedTerritoryPerformance[territory]) {
        processedTerritoryPerformance[territory] = {
          name: territory,
          totalDeployments: 0,
          totalSacks: 0,
          totalWeight: 0,
          statusBreakdown: {
            preparing: 0,
            pending: 0,
            'in-progress': 0,
            ongoing: 0,
            completed: 0,
            canceled: 0
          }
        }
      }

      processedTerritoryPerformance[territory].totalDeployments += item.count
      processedTerritoryPerformance[territory].totalSacks +=
        item.totalSacks || 0
      processedTerritoryPerformance[territory].totalWeight +=
        item.totalWeight || 0

      if (
        status &&
        processedTerritoryPerformance[territory].statusBreakdown[status] !==
          undefined
      ) {
        processedTerritoryPerformance[territory].statusBreakdown[status] =
          item.count
      }
    })

    // Process hybrid performance data
    const processedHybridPerformance = {}
    data.hybridStatusAnalytics.forEach(item => {
      const hybrid = item._id.hybrid
      const status = item._id.status

      if (!processedHybridPerformance[hybrid]) {
        processedHybridPerformance[hybrid] = {
          name: hybrid,
          totalDeployments: 0,
          totalSacks: 0,
          totalWeight: 0,
          statusBreakdown: {
            preparing: 0,
            pending: 0,
            'in-progress': 0,
            ongoing: 0,
            completed: 0,
            canceled: 0
          }
        }
      }

      processedHybridPerformance[hybrid].totalDeployments += item.count
      processedHybridPerformance[hybrid].totalSacks += item.totalSacks || 0
      processedHybridPerformance[hybrid].totalWeight += item.totalWeight || 0

      if (
        status &&
        processedHybridPerformance[hybrid].statusBreakdown[status] !== undefined
      ) {
        processedHybridPerformance[hybrid].statusBreakdown[status] = item.count
      }
    })

    // Process flagging performance data
    const processedFlaggingPerformance = {}
    data.flaggingStatusAnalytics.forEach(item => {
      const flagging = item._id.flagging
      const status = item._id.status

      if (!processedFlaggingPerformance[flagging]) {
        processedFlaggingPerformance[flagging] = {
          name: flagging,
          totalDeployments: 0,
          totalSacks: 0,
          totalWeight: 0,
          statusBreakdown: {
            preparing: 0,
            pending: 0,
            'in-progress': 0,
            ongoing: 0,
            completed: 0,
            canceled: 0
          }
        }
      }

      processedFlaggingPerformance[flagging].totalDeployments += item.count
      processedFlaggingPerformance[flagging].totalSacks += item.totalSacks || 0
      processedFlaggingPerformance[flagging].totalWeight +=
        item.totalWeight || 0

      if (
        status &&
        processedFlaggingPerformance[flagging].statusBreakdown[status] !==
          undefined
      ) {
        processedFlaggingPerformance[flagging].statusBreakdown[status] =
          item.count
      }
    })

    const formattedSubconPerformance = Object.values(processedSubconPerformance)
      .map(subcon => ({
        ...subcon,
        completedDeployments: subcon.statusBreakdown.completed || 0,
        completionRate:
          subcon.totalDeployments > 0
            ? (
                ((subcon.statusBreakdown.completed || 0) /
                  subcon.totalDeployments) *
                100
              ).toFixed(1)
            : '0'
      }))
      .sort((a, b) => b.totalDeployments - a.totalDeployments)
      .slice(0, 10)

    const formattedTerritoryPerformance = Object.values(
      processedTerritoryPerformance
    )
      .map(territory => ({
        ...territory,
        completedDeployments: territory.statusBreakdown.completed || 0,
        completionRate:
          territory.totalDeployments > 0
            ? (
                ((territory.statusBreakdown.completed || 0) /
                  territory.totalDeployments) *
                100
              ).toFixed(1)
            : '0'
      }))
      .sort((a, b) => b.totalDeployments - a.totalDeployments)
      .slice(0, 10)

    const formattedHybridPerformance = Object.values(processedHybridPerformance)
      .map(hybrid => ({
        ...hybrid,
        completedDeployments: hybrid.statusBreakdown.completed || 0,
        completionRate:
          hybrid.totalDeployments > 0
            ? (
                ((hybrid.statusBreakdown.completed || 0) /
                  hybrid.totalDeployments) *
                100
              ).toFixed(1)
            : '0'
      }))
      .sort((a, b) => b.totalDeployments - a.totalDeployments)
      .slice(0, 10)

    const formattedFlaggingPerformance = Object.values(
      processedFlaggingPerformance
    )
      .map(flagging => ({
        ...flagging,
        completedDeployments: flagging.statusBreakdown.completed || 0,
        completionRate:
          flagging.totalDeployments > 0
            ? (
                ((flagging.statusBreakdown.completed || 0) /
                  flagging.totalDeployments) *
                100
              ).toFixed(1)
            : '0'
      }))
      .sort((a, b) => b.totalDeployments - a.totalDeployments)
      .slice(0, 10)

    // Additional metrics
    const totalDeployments = await Deployment.countDocuments(deploymentFilter)
    const completionRate =
      totalDeployments > 0
        ? ((data.completedDeployments / totalDeployments) * 100).toFixed(1)
        : 0
    const cancellationRate =
      totalDeployments > 0
        ? ((data.cancelledDeployments / totalDeployments) * 100).toFixed(1)
        : 0
    const finalizedDeployments =
      data.completedDeployments + data.cancelledDeployments
    const successRate =
      finalizedDeployments > 0
        ? ((data.completedDeployments / finalizedDeployments) * 100).toFixed(1)
        : 0

    const totalSacksResult = await Deployment.aggregate([
      { $match: { ...deploymentFilter, status: { $ne: 'canceled' } } },
      {
        $group: {
          _id: null,
          totalSacks: { $sum: '$totalSacksCount' },
          totalWeight: { $sum: '$loadWeightKg' }
        }
      }
    ])

    const totalSacks = totalSacksResult[0]?.totalSacks || 0
    const totalWeight = totalSacksResult[0]?.totalWeight || 0

    const efficiencyData = data.deploymentEfficiency[0] || {}
    const avgSacks = efficiencyData.avgSacks || 0
    const avgWeight = efficiencyData.avgWeight || 0
    const maxSacks = efficiencyData.maxSacks || 0
    const maxWeight = efficiencyData.maxWeight || 0

    const completedCargoData = data.completedCargoMetrics[0] || {}
    const totalCompletedSacks = completedCargoData.totalCompletedSacks || 0
    const totalCompletedWeight = completedCargoData.totalCompletedWeight || 0
    const avgCompletedSacks = completedCargoData.avgCompletedSacks || 0
    const avgCompletedWeight = completedCargoData.avgCompletedWeight || 0
    const maxCompletedSacks = completedCargoData.maxCompletedSacks || 0
    const maxCompletedWeight = completedCargoData.maxCompletedWeight || 0

    const utilizationRate =
      data.totalTrucks > 0
        ? ((data.deployedTrucks / data.totalTrucks) * 100).toFixed(1)
        : 0
    const driverUtilizationRate =
      data.totalDrivers > 0
        ? ((data.deployedDrivers / data.totalDrivers) * 100).toFixed(1)
        : 0

    const userLoginData = data.userLoginAnalytics[0] || {}
    const totalLogins = userLoginData.totalLogins || 0
    const avgLoginCount = userLoginData.avgLoginCount || 0
    const maxLoginCount = userLoginData.maxLoginCount || 0

    const formatArrayData = (array, fallback = []) =>
      Array.isArray(array) && array.length > 0 ? array : fallback

    const weeklyTrendsData = formatArrayData(
      data.weeklyDeploymentStatusAnalytics
    )
    const weeklySacksData = formatArrayData(data.weeklySacksAnalytics)
    const weeklyWeightData = formatArrayData(data.weeklyWeightAnalytics)

    const deploymentStatusData = formatArrayData(data.deploymentStatusAnalytics)
    const deploymentStatusMap = {
      completed: 'Completed',
      ongoing: 'Ongoing',
      'in-progress': 'In Progress',
      pending: 'Pending',
      canceled: 'Cancelled',
      preparing: 'Preparing'
    }

    const userRoleData = formatArrayData(data.userRoleAnalytics)
    const userRoleMap = {
      head_admin: 'Head Admin',
      admin: 'Admin',
      visitor: 'Visitor',
      subcon: 'Subcontractor'
    }

    const userStatusData = formatArrayData(data.userStatusAnalytics)
    const userStatusMap = {
      active: 'Active',
      inactive: 'Inactive',
      pending: 'Pending',
      rejected: 'Rejected',
      revoked: 'Revoked'
    }

    const subconData = formatArrayData(data.subconAnalytics)

    const totalOngoingDeployments =
      data.activeDeployments +
      data.preparingDeployments +
      data.pendingDeployments +
      data.inProgressDeployments +
      data.ongoingDeployments

    const formatWeekLabel = (year, month, week) => {
      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec'
      ]
      const startDay = (week - 1) * 7 + 1
      const endDay = Math.min(startDay + 6, new Date(year, month, 0).getDate())
      return `${monthNames[month - 1]} ${startDay}-${endDay}`
    }

    const processWeeklyDeploymentData = weeklyData => {
      if (!weeklyData || weeklyData.length === 0) return []

      const weeklyMap = {}
      weeklyData.forEach(item => {
        const { year, month, week, status } = item._id
        const count = item.count || 0
        const weekKey = `${year}-${month}-${week}`

        if (!weeklyMap[weekKey]) {
          weeklyMap[weekKey] = { year, month, week, completed: 0, canceled: 0 }
        }

        if (status === 'completed') weeklyMap[weekKey].completed = count
        else if (status === 'canceled') weeklyMap[weekKey].canceled = count
      })

      return Object.values(weeklyMap)
        .filter(week => week.completed > 0 || week.canceled > 0)
        .sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year
          if (a.month !== b.month) return a.month - b.month
          return a.week - b.week
        })
        .map(week => ({
          ...week,
          label: formatWeekLabel(week.year, week.month, week.week)
        }))
    }

    const processWeeklySacksData = weeklyData => {
      if (!weeklyData || weeklyData.length === 0) return []
      return weeklyData
        .filter(item => item.totalSacks > 0 || item.deploymentCount > 0)
        .sort((a, b) => {
          if (a._id.year !== b._id.year) return a._id.year - b._id.year
          if (a._id.month !== b._id.month) return a._id.month - b._id.month
          return a._id.week - b._id.week
        })
        .map(item => ({
          ...item,
          label: formatWeekLabel(item._id.year, item._id.month, item._id.week)
        }))
    }

    const processWeeklyWeightData = weeklyData => {
      if (!weeklyData || weeklyData.length === 0) return []
      return weeklyData
        .filter(item => item.totalWeight > 0 || item.deploymentCount > 0)
        .sort((a, b) => {
          if (a._id.year !== b._id.year) return a._id.year - b._id.year
          if (a._id.month !== b._id.month) return a._id.month - b._id.month
          return a._id.week - b._id.week
        })
        .map(item => ({
          ...item,
          label: formatWeekLabel(item._id.year, item._id.month, item._id.week)
        }))
    }

    const processedWeeklyDeployments =
      processWeeklyDeploymentData(weeklyTrendsData)
    const processedWeeklySacks = processWeeklySacksData(weeklySacksData)
    const processedWeeklyWeight = processWeeklyWeightData(weeklyWeightData)

    const formattedPickupSites = formatArrayData(data.topPickupSites).map(
      site => ({
        name: site._id,
        count: site.count,
        totalSacks: site.totalSacks,
        totalWeight: site.totalWeight
      })
    )

    const formattedTerritoryMetrics = formatArrayData(data.territoryPerformance)
      .map(item => ({
        _id: item._id || 'Unknown',
        count: item.count || 0,
        completed: item.completed || 0,
        completionRate: parseFloat((item.completionRate || 0).toFixed(1)),
        totalSacks: item.totalSacks || 0,
        totalWeight: item.totalWeight || 0,
        completedSacks: item.completedSacks || 0,
        completedWeight: item.completedWeight || 0,
        avgSacks: parseFloat((item.avgSacks || 0).toFixed(1)),
        avgWeight: parseFloat((item.avgWeight || 0).toFixed(1))
      }))
      .filter(item => item._id !== 'Unknown' && item._id !== null)

    const analyticsData = {
      overview: {
        totalTrucks: data.totalTrucks || 0,
        totalDrivers: data.totalDrivers || 0,
        totalUsers: data.totalUsers || 0,
        activeDeployments: totalOngoingDeployments || 0,
        availableTrucks: data.availableTrucks || 0,
        availableDrivers: data.availableDrivers || 0,
        deployedTrucks: data.deployedTrucks || 0,
        deployedDrivers: data.deployedDrivers || 0,
        trucksInMaintenance: data.trucksInMaintenance || 0,
        inactiveDrivers: data.inactiveDrivers || 0,
        completedDeployments: data.completedDeployments || 0,
        cancelledDeployments: data.cancelledDeployments || 0,
        pendingDeployments: data.pendingDeployments || 0,
        preparingDeployments: data.preparingDeployments || 0,
        recentDeployments: data.recentDeployments || 0,
        monthlyDeployments: data.monthlyDeployments || 0,
        yearlyDeployments: data.yearlyDeployments || 0,
        deploymentsLast30Days: data.deploymentsLast30Days || 0,
        recentActivity: data.recentActivity || 0,
        totalSacks: totalSacks || 0,
        totalWeight: totalWeight || 0,
        avgSacksPerDeployment: parseFloat(avgSacks.toFixed(1)),
        avgWeightPerDeployment: parseFloat(avgWeight.toFixed(1)),
        maxSacks: maxSacks || 0,
        maxWeight: maxWeight || 0,
        totalCompletedSacks: totalCompletedSacks || 0,
        totalCompletedWeight: totalCompletedWeight || 0,
        avgCompletedSacks: parseFloat(avgCompletedSacks.toFixed(1)),
        avgCompletedWeight: parseFloat(avgCompletedWeight.toFixed(1)),
        maxCompletedSacks: maxCompletedSacks || 0,
        maxCompletedWeight: maxCompletedWeight || 0,
        utilizationRate: parseFloat(utilizationRate),
        driverUtilizationRate: parseFloat(driverUtilizationRate),
        completionRate: parseFloat(completionRate),
        cancellationRate: parseFloat(cancellationRate),
        successRate: parseFloat(successRate),
        activeUsers: data.activeUsers || 0,
        pendingUsers: data.pendingUsers || 0,
        recentRegistrations: data.recentRegistrations || 0,
        totalLogins: totalLogins || 0,
        avgLoginCount: parseFloat(avgLoginCount.toFixed(1)),
        maxLoginCount: maxLoginCount || 0,
        totalTerritories: formatArrayData(data.territoryAnalytics).length || 0,
        totalHybrids: formatArrayData(data.hybridAnalytics).length || 0,
        totalFlaggings: formatArrayData(data.flaggingAnalytics).length || 0
      },

      charts: {
        weeklyDeployments: {
          labels: processedWeeklyDeployments.map(item => item.label),
          completedData: processedWeeklyDeployments.map(
            item => item.completed || 0
          ),
          canceledData: processedWeeklyDeployments.map(
            item => item.canceled || 0
          )
        },
        weeklySacks: {
          labels: processedWeeklySacks.map(item => item.label),
          data: processedWeeklySacks.map(item => item.totalSacks || 0),
          deploymentCounts: processedWeeklySacks.map(
            item => item.deploymentCount || 0
          ),
          avgSacks: processedWeeklySacks.map(item =>
            parseFloat((item.avgSacksPerDeployment || 0).toFixed(1))
          )
        },
        weeklyWeight: {
          labels: processedWeeklyWeight.map(item => item.label),
          data: processedWeeklyWeight.map(item => item.totalWeight || 0),
          deploymentCounts: processedWeeklyWeight.map(
            item => item.deploymentCount || 0
          ),
          avgWeight: processedWeeklyWeight.map(item =>
            parseFloat((item.avgWeightPerDeployment || 0).toFixed(1))
          )
        },
        deploymentStatus: {
          labels: deploymentStatusData.map(
            item => deploymentStatusMap[item._id] || item._id || 'Unknown'
          ),
          data: deploymentStatusData.map(item => item.count || 0)
        },
        pickupSites: {
          data: formattedPickupSites,
          labels: formattedPickupSites.map(item => item.name),
          counts: formattedPickupSites.map(item => item.count),
          sacks: formattedPickupSites.map(item => item.totalSacks),
          weights: formattedPickupSites.map(item => item.totalWeight)
        },
        truckTypes: {
          labels: formatArrayData(data.truckTypeAnalytics).map(
            item => item._id || 'Unknown'
          ),
          data: formatArrayData(data.truckTypeAnalytics).map(
            item => item.count || 0
          )
        },
        truckStatus: {
          labels: formatArrayData(data.truckStatusAnalytics).map(
            item => item._id || 'Unknown'
          ),
          data: formatArrayData(data.truckStatusAnalytics).map(
            item => item.count || 0
          )
        },
        driverStatus: {
          labels: formatArrayData(data.driverStatusAnalytics).map(
            item => item._id || 'Unknown'
          ),
          data: formatArrayData(data.driverStatusAnalytics).map(
            item => item.count || 0
          )
        },
        userRoles: {
          labels: userRoleData.map(
            item => userRoleMap[item._id] || item._id || 'Unknown'
          ),
          data: userRoleData.map(item => item.count || 0)
        },
        userStatus: {
          labels: userStatusData.map(
            item => userStatusMap[item._id] || item._id || 'Unknown'
          ),
          data: userStatusData.map(item => item.count || 0)
        },
        subconDistribution: {
          labels: subconData.map(item => item._id || 'Unknown'),
          data: subconData.map(item => item.count || 0)
        },
        subconPerformance: {
          data: formattedSubconPerformance,
          labels: formattedSubconPerformance.map(item => item.name),
          totalDeployments: formattedSubconPerformance.map(
            item => item.totalDeployments
          ),
          completedDeployments: formattedSubconPerformance.map(
            item => item.completedDeployments
          ),
          completionRates: formattedSubconPerformance.map(item =>
            parseFloat(item.completionRate)
          ),
          statusBreakdown: formattedSubconPerformance.map(
            item => item.statusBreakdown
          )
        },
        territoryDistribution: {
          labels: formatArrayData(data.territoryAnalytics).map(
            item => item._id || 'Unknown'
          ),
          data: formatArrayData(data.territoryAnalytics).map(
            item => item.count || 0
          )
        },
        hybridDistribution: {
          labels: formatArrayData(data.hybridAnalytics).map(
            item => item._id || 'Unknown'
          ),
          data: formatArrayData(data.hybridAnalytics).map(
            item => item.count || 0
          )
        },
        flaggingDistribution: {
          labels: formatArrayData(data.flaggingAnalytics).map(
            item => item._id || 'Unknown'
          ),
          data: formatArrayData(data.flaggingAnalytics).map(
            item => item.count || 0
          )
        },
        territoryPerformance: {
          data: formattedTerritoryPerformance,
          labels: formattedTerritoryPerformance.map(item => item.name),
          totalDeployments: formattedTerritoryPerformance.map(
            item => item.totalDeployments
          ),
          completedDeployments: formattedTerritoryPerformance.map(
            item => item.completedDeployments
          ),
          completionRates: formattedTerritoryPerformance.map(item =>
            parseFloat(item.completionRate)
          ),
          statusBreakdown: formattedTerritoryPerformance.map(
            item => item.statusBreakdown
          )
        },
        hybridPerformance: {
          data: formattedHybridPerformance,
          labels: formattedHybridPerformance.map(item => item.name),
          totalDeployments: formattedHybridPerformance.map(
            item => item.totalDeployments
          ),
          completedDeployments: formattedHybridPerformance.map(
            item => item.completedDeployments
          ),
          completionRates: formattedHybridPerformance.map(item =>
            parseFloat(item.completionRate)
          ),
          statusBreakdown: formattedHybridPerformance.map(
            item => item.statusBreakdown
          )
        },
        flaggingPerformance: {
          data: formattedFlaggingPerformance,
          labels: formattedFlaggingPerformance.map(item => item.name),
          totalDeployments: formattedFlaggingPerformance.map(
            item => item.totalDeployments
          ),
          completedDeployments: formattedFlaggingPerformance.map(
            item => item.completedDeployments
          ),
          completionRates: formattedFlaggingPerformance.map(item =>
            parseFloat(item.completionRate)
          ),
          statusBreakdown: formattedFlaggingPerformance.map(
            item => item.statusBreakdown
          )
        }
      },

      topDrivers: formatArrayData(data.topDriversByTrips),
      territoryMetrics: formattedTerritoryMetrics,

      hybridMetrics: formatArrayData(data.hybridPerformance).map(item => ({
        _id: item._id || 'Unknown',
        count: item.count || 0,
        totalSacks: item.totalSacks || 0,
        totalWeight: item.totalWeight || 0,
        avgSacks: parseFloat((item.avgSacks || 0).toFixed(1)),
        avgWeight: parseFloat((item.avgWeight || 0).toFixed(1))
      })),

      flaggingMetrics: formatArrayData(data.flaggingPerformance).map(item => ({
        _id: item._id || 'Unknown',
        count: item.count || 0,
        totalSacks: item.totalSacks || 0,
        totalWeight: item.totalWeight || 0,
        avgSacks: parseFloat((item.avgSacks || 0).toFixed(1)),
        avgWeight: parseFloat((item.avgWeight || 0).toFixed(1))
      })),

      performanceMetrics: {
        totalDeployments,
        completedDeployments: data.completedDeployments,
        ongoingDeployments: totalOngoingDeployments,
        cancelledDeployments: data.cancelledDeployments || 0,
        pendingDeployments: data.pendingDeployments || 0,
        preparingDeployments: data.preparingDeployments || 0,
        inProgressDeployments: data.inProgressDeployments || 0,
        activeDeployments: data.activeDeployments || 0,
        totalTrucks: data.totalTrucks,
        activeTrucks: data.activeTrucks,
        availableTrucks: data.availableTrucks,
        deployedTrucks: data.deployedTrucks,
        totalDrivers: data.totalDrivers,
        availableDrivers: data.availableDrivers,
        deployedDrivers: data.deployedDrivers,
        totalSacks: totalSacks || 0,
        totalWeight: totalWeight || 0,
        avgSacksPerDeployment: parseFloat(avgSacks.toFixed(1)),
        avgWeightPerDeployment: parseFloat(avgWeight.toFixed(1)),
        maxSacks: maxSacks || 0,
        maxWeight: maxWeight || 0,
        totalCompletedSacks: totalCompletedSacks || 0,
        totalCompletedWeight: totalCompletedWeight || 0,
        avgCompletedSacks: parseFloat(avgCompletedSacks.toFixed(1)),
        avgCompletedWeight: parseFloat(avgCompletedWeight.toFixed(1)),
        maxCompletedSacks: maxCompletedSacks || 0,
        maxCompletedWeight: maxCompletedWeight || 0,
        completionRate: parseFloat(completionRate),
        cancellationRate: parseFloat(cancellationRate),
        successRate: parseFloat(successRate),
        utilizationRate: parseFloat(utilizationRate),
        driverUtilizationRate: parseFloat(driverUtilizationRate),
        recentActivity: data.recentActivity || 0,
        monthlyDeployments: data.monthlyDeployments || 0,
        yearlyDeployments: data.yearlyDeployments || 0,
        totalUsers: data.totalUsers || 0,
        activeUsers: data.activeUsers || 0,
        pendingUsers: data.pendingUsers || 0,
        recentRegistrations: data.recentRegistrations || 0,
        totalLogins: totalLogins || 0,
        avgLoginCount: parseFloat(avgLoginCount.toFixed(1)),
        maxLoginCount: maxLoginCount || 0,
        territoryCount: formatArrayData(data.territoryAnalytics).length || 0,
        hybridCount: formatArrayData(data.hybridAnalytics).length || 0,
        flaggingCount: formatArrayData(data.flaggingAnalytics).length || 0
      }
    }

    if (req.user.role === 'subcon' && req.user.subcon) {
      analyticsData.subconAnalytics = {
        drivers: {
          performance: formatArrayData(data.subconDriverPerformance),
          status: formatArrayData(data.subconDriverStatusAnalytics),
          total: data.totalDrivers || 0,
          available: data.availableDrivers || 0,
          deployed: data.deployedDrivers || 0
        },
        trucks: {
          performance: formatArrayData(data.subconTruckPerformance),
          status: formatArrayData(data.subconTruckStatusAnalytics),
          types: formatArrayData(data.subconTruckTypeAnalytics),
          total: data.totalTrucks || 0,
          available: data.availableTrucks || 0,
          deployed: data.deployedTrucks || 0
        },
        territories: {
          distribution: formatArrayData(data.territoryAnalytics),
          performance: formatArrayData(data.territoryPerformance)
        },
        hybrids: {
          distribution: formatArrayData(data.hybridAnalytics),
          performance: formatArrayData(data.hybridPerformance)
        },
        flaggings: {
          distribution: formatArrayData(data.flaggingAnalytics),
          performance: formatArrayData(data.flaggingPerformance)
        }
      }
    }

    res.json({
      success: true,
      data: analyticsData,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Analytics error:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics data',
      error: error.message
    })
  }
}

module.exports = { getDashboardAnalytics }
