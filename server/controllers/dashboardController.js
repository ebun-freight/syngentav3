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

    // Start of current month and year
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentYearStart = new Date(now.getFullYear(), 0, 1)

    // Initialize base filters
    const baseFilter = {
      isSoftDeleted: { $ne: true }
    }

    const truckAndDriverFilter = { isSoftDeleted: { $ne: true } }

    // Add subcon filter for truck and driver if user is subcon
    if (req.user.role === 'subcon' && req.user.subcon) {
      truckAndDriverFilter.subcon = req.user.subcon
      baseFilter.subcon = req.user.subcon
    }

    // Create all promises
    const promises = {
      // Basic counts
      totalTrucks: Truck.countDocuments(truckAndDriverFilter),
      totalDrivers: Driver.countDocuments(truckAndDriverFilter),
      activeDeployments: Deployment.countDocuments({
        ...baseFilter,
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

      // Status counts
      trucksInMaintenance: Truck.countDocuments({
        ...truckAndDriverFilter,
        status: 'unavailable'
      }),
      inactiveDrivers: Driver.countDocuments({
        ...truckAndDriverFilter,
        status: 'unavailable'
      }),
      completedDeployments: Deployment.countDocuments({
        ...baseFilter,
        status: 'completed'
      }),
      cancelledDeployments: Deployment.countDocuments({
        ...baseFilter,
        status: 'canceled'
      }),

      // Recent deployments
      recentDeployments: Deployment.countDocuments({
        ...baseFilter,
        createdAt: { $gte: last7Days }
      }),
      deploymentsLast30Days: Deployment.countDocuments({
        ...baseFilter,
        createdAt: { $gte: last30Days }
      }),

      // Monthly deployments (current month)
      monthlyDeployments: Deployment.countDocuments({
        ...baseFilter,
        createdAt: { $gte: currentMonthStart }
      }),

      // Yearly deployments
      yearlyDeployments: Deployment.countDocuments({
        ...baseFilter,
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

      // Deployment analytics
      deploymentStatusAnalytics: Deployment.aggregate([
        {
          $match: {
            ...baseFilter,
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

      // WEEKLY trends (last 12 weeks) - UPDATED
      weeklyDeploymentAnalytics: Deployment.aggregate([
        {
          $match: {
            ...baseFilter,
            createdAt: {
              $gte: last12Weeks
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              week: { $ceil: { $divide: [{ $dayOfMonth: '$createdAt' }, 7] } }
            },
            count: { $sum: 1 },
            totalSacks: { $sum: '$sacksCount' },
            totalWeight: { $sum: '$loadWeightKg' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1 } }
      ]),

      // Weekly deployment status analytics
      weeklyDeploymentStatusAnalytics: Deployment.aggregate([
        {
          $match: {
            ...baseFilter,
            createdAt: {
              $gte: last12Weeks
            }
          }
        },
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

      // Weekly Sacks Analytics
      weeklySacksAnalytics: Deployment.aggregate([
        {
          $match: {
            ...baseFilter,
            status: { $ne: 'canceled' },
            createdAt: {
              $gte: last12Weeks
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              week: { $ceil: { $divide: [{ $dayOfMonth: '$createdAt' }, 7] } }
            },
            totalSacks: { $sum: '$sacksCount' },
            deploymentCount: { $sum: 1 },
            avgSacksPerDeployment: { $avg: '$sacksCount' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1 } }
      ]),

      // Weekly Weight Analytics
      weeklyWeightAnalytics: Deployment.aggregate([
        {
          $match: {
            ...baseFilter,
            status: { $ne: 'canceled' },
            createdAt: {
              $gte: last12Weeks
            }
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

      // Top Pickup Sites
      topPickupSites: Deployment.aggregate([
        {
          $match: {
            ...baseFilter,
            pickupSite: { $exists: true, $ne: '' }
          }
        },
        {
          $group: {
            _id: '$pickupSite',
            count: { $sum: 1 },
            totalSacks: { $sum: '$sacksCount' },
            totalWeight: { $sum: '$loadWeightKg' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),

      // Deployment efficiency (avg sacks & weight per deployment)
      deploymentEfficiency: Deployment.aggregate([
        {
          $match: {
            ...baseFilter,
            status: { $ne: 'canceled' }
          }
        },
        {
          $group: {
            _id: null,
            avgSacks: { $avg: '$sacksCount' },
            avgWeight: { $avg: '$loadWeightKg' },
            maxSacks: { $max: '$sacksCount' },
            maxWeight: { $max: '$loadWeightKg' }
          }
        }
      ]),

      // NEW: Completed deployments cargo metrics
      completedCargoMetrics: Deployment.aggregate([
        {
          $match: {
            ...baseFilter,
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            totalCompletedSacks: { $sum: '$sacksCount' },
            totalCompletedWeight: { $sum: '$loadWeightKg' },
            avgCompletedSacks: { $avg: '$sacksCount' },
            avgCompletedWeight: { $avg: '$loadWeightKg' },
            maxCompletedSacks: { $max: '$sacksCount' },
            maxCompletedWeight: { $max: '$loadWeightKg' }
          }
        }
      ]),

      // Additional deployment status counts
      pendingDeployments: Deployment.countDocuments({
        ...baseFilter,
        status: 'pending'
      }),
      preparingDeployments: Deployment.countDocuments({
        ...baseFilter,
        status: 'preparing'
      }),
      inProgressDeployments: Deployment.countDocuments({
        ...baseFilter,
        status: 'in-progress'
      }),
      ongoingDeployments: Deployment.countDocuments({
        ...baseFilter,
        status: 'ongoing'
      }),

      // Truck utilization (active vs total)
      activeTrucks: Truck.countDocuments({
        ...truckAndDriverFilter,
        status: { $in: ['available', 'deployed'] }
      }),

      // Deployed trucks and drivers
      deployedTrucks: Truck.countDocuments({
        ...truckAndDriverFilter,
        status: 'deployed'
      }),
      deployedDrivers: Driver.countDocuments({
        ...truckAndDriverFilter,
        status: 'deployed'
      }),

      // Recent activity (last 24 hours)
      recentActivity: Deployment.countDocuments({
        ...baseFilter,
        createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      }),

      // USER ANALYTICS
      totalUsers: User.countDocuments({ isSoftDeleted: { $ne: true } }),
      activeUsers: User.countDocuments({
        isSoftDeleted: { $ne: true },
        status: 'active'
      }),
      pendingUsers: User.countDocuments({
        isSoftDeleted: { $ne: true },
        status: 'pending'
      }),

      // User role distribution
      userRoleAnalytics: User.aggregate([
        { $match: { isSoftDeleted: { $ne: true } } },
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),

      // User status distribution
      userStatusAnalytics: User.aggregate([
        { $match: { isSoftDeleted: { $ne: true } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // Subcon analytics
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

      // Recent user registrations (last 30 days)
      recentRegistrations: User.countDocuments({
        isSoftDeleted: { $ne: true },
        createdAt: { $gte: last30Days }
      }),

      // User login analytics
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

      // Subcon performance analytics
      subconPerformance: Deployment.aggregate([
        {
          $match: {
            ...baseFilter,
            subcon: { $exists: true, $ne: '' }
          }
        },
        {
          $group: {
            _id: {
              subcon: '$subcon',
              status: '$status'
            },
            count: { $sum: 1 },
            totalSacks: { $sum: '$sacksCount' },
            totalWeight: { $sum: '$loadWeightKg' }
          }
        },
        { $sort: { '_id.subcon': 1 } }
      ]),

      // Subcon Driver Performance - Only for subcon users
      subconDriverPerformance: Driver.aggregate([
        {
          $match: truckAndDriverFilter
        },
        {
          $sort: { tripCount: -1 }
        },
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

      // Subcon Truck Performance - Only for subcon users
      subconTruckPerformance: Truck.aggregate([
        {
          $match: truckAndDriverFilter
        },
        {
          $sort: { tripCount: -1 }
        },
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

      // Subcon driver status distribution
      subconDriverStatusAnalytics: Driver.aggregate([
        { $match: truckAndDriverFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // Subcon truck status distribution
      subconTruckStatusAnalytics: Truck.aggregate([
        { $match: truckAndDriverFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // Subcon truck type distribution
      subconTruckTypeAnalytics: Truck.aggregate([
        { $match: truckAndDriverFilter },
        { $group: { _id: '$truckType', count: { $sum: 1 } } }
      ]),

      // Territory Analytics
      territoryAnalytics: Deployment.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$territory', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      // Hybrid Analytics
      hybridAnalytics: Deployment.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$hybrid', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      // Flagging Analytics
      flaggingAnalytics: Deployment.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$flagging', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      // Territory Performance Metrics with completion rate
      territoryPerformance: Deployment.aggregate([
        {
          $match: baseFilter
        },
        {
          $group: {
            _id: '$territory',
            count: { $sum: 1 },
            totalSacks: { $sum: '$sacksCount' },
            totalWeight: { $sum: '$loadWeightKg' },
            avgSacks: { $avg: '$sacksCount' },
            avgWeight: { $avg: '$loadWeightKg' },
            completed: {
              $sum: {
                $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
              }
            },
            completedSacks: {
              $sum: {
                $cond: [{ $eq: ['$status', 'completed'] }, '$sacksCount', 0]
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

      // Hybrid Performance Metrics
      hybridPerformance: Deployment.aggregate([
        {
          $match: {
            ...baseFilter,
            status: { $ne: 'canceled' }
          }
        },
        {
          $group: {
            _id: '$hybrid',
            count: { $sum: 1 },
            totalSacks: { $sum: '$sacksCount' },
            totalWeight: { $sum: '$loadWeightKg' },
            avgSacks: { $avg: '$sacksCount' },
            avgWeight: { $avg: '$loadWeightKg' }
          }
        },
        { $sort: { count: -1 } }
      ]),

      // Flagging Performance Metrics
      flaggingPerformance: Deployment.aggregate([
        {
          $match: {
            ...baseFilter,
            status: { $ne: 'canceled' }
          }
        },
        {
          $group: {
            _id: '$flagging',
            count: { $sum: 1 },
            totalSacks: { $sum: '$sacksCount' },
            totalWeight: { $sum: '$loadWeightKg' },
            avgSacks: { $avg: '$sacksCount' },
            avgWeight: { $avg: '$loadWeightKg' }
          }
        },
        { $sort: { count: -1 } }
      ]),

      // Territory Status Breakdown
      territoryStatusAnalytics: Deployment.aggregate([
        {
          $match: baseFilter
        },
        {
          $group: {
            _id: {
              territory: '$territory',
              status: '$status'
            },
            count: { $sum: 1 },
            totalSacks: { $sum: '$sacksCount' },
            totalWeight: { $sum: '$loadWeightKg' }
          }
        },
        { $sort: { '_id.territory': 1 } }
      ]),

      // Hybrid Status Breakdown
      hybridStatusAnalytics: Deployment.aggregate([
        {
          $match: baseFilter
        },
        {
          $group: {
            _id: {
              hybrid: '$hybrid',
              status: '$status'
            },
            count: { $sum: 1 },
            totalSacks: { $sum: '$sacksCount' },
            totalWeight: { $sum: '$loadWeightKg' }
          }
        },
        { $sort: { '_id.hybrid': 1 } }
      ]),

      // Flagging Status Breakdown
      flaggingStatusAnalytics: Deployment.aggregate([
        {
          $match: baseFilter
        },
        {
          $group: {
            _id: {
              flagging: '$flagging',
              status: '$status'
            },
            count: { $sum: 1 },
            totalSacks: { $sum: '$sacksCount' },
            totalWeight: { $sum: '$loadWeightKg' }
          }
        },
        { $sort: { '_id.flagging': 1 } }
      ]),

      // Monthly Territory Analytics
      monthlyTerritoryAnalytics: Deployment.aggregate([
        {
          $match: {
            ...baseFilter,
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
            totalSacks: { $sum: '$sacksCount' },
            totalWeight: { $sum: '$loadWeightKg' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.territory': 1 } }
      ]),

      // Weekly Territory Analytics - NEW
      weeklyTerritoryAnalytics: Deployment.aggregate([
        {
          $match: {
            ...baseFilter,
            status: { $ne: 'canceled' },
            createdAt: {
              $gte: last12Weeks
            }
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
            totalSacks: { $sum: '$sacksCount' },
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

    // Process subcon performance data into a more usable format
    const processedSubconPerformance = {}
    data.subconPerformance.forEach(item => {
      const subcon = item._id.subcon
      const status = item._id.status

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

      // Count by status
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

    // Convert to array and calculate completion rate
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

    // Format territory performance
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

    // Format hybrid performance
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

    // Format flagging performance
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

    // Calculate additional metrics
    const totalDeployments = await Deployment.countDocuments(baseFilter)
    const completionRate =
      totalDeployments > 0
        ? ((data.completedDeployments / totalDeployments) * 100).toFixed(1)
        : 0

    const cancellationRate =
      totalDeployments > 0
        ? ((data.cancelledDeployments / totalDeployments) * 100).toFixed(1)
        : 0

    // Calculate success rate (only count finalized deployments)
    const finalizedDeployments =
      data.completedDeployments + data.cancelledDeployments
    const successRate =
      finalizedDeployments > 0
        ? ((data.completedDeployments / finalizedDeployments) * 100).toFixed(1)
        : 0

    // Calculate total sacks and weight (excluding canceled)
    const totalSacksResult = await Deployment.aggregate([
      {
        $match: {
          ...baseFilter,
          status: { $ne: 'canceled' }
        }
      },
      {
        $group: {
          _id: null,
          totalSacks: { $sum: '$sacksCount' },
          totalWeight: { $sum: '$loadWeightKg' }
        }
      }
    ])

    const totalSacks = totalSacksResult[0]?.totalSacks || 0
    const totalWeight = totalSacksResult[0]?.totalWeight || 0

    // Calculate average sacks and weight per deployment (excluding canceled)
    const efficiencyData = data.deploymentEfficiency[0] || {}
    const avgSacks = efficiencyData.avgSacks || 0
    const avgWeight = efficiencyData.avgWeight || 0
    const maxSacks = efficiencyData.maxSacks || 0
    const maxWeight = efficiencyData.maxWeight || 0

    // Extract completed cargo metrics
    const completedCargoData = data.completedCargoMetrics[0] || {}
    const totalCompletedSacks = completedCargoData.totalCompletedSacks || 0
    const totalCompletedWeight = completedCargoData.totalCompletedWeight || 0
    const avgCompletedSacks = completedCargoData.avgCompletedSacks || 0
    const avgCompletedWeight = completedCargoData.avgCompletedWeight || 0
    const maxCompletedSacks = completedCargoData.maxCompletedSacks || 0
    const maxCompletedWeight = completedCargoData.maxCompletedWeight || 0

    // Calculate truck utilization rate
    const utilizationRate =
      data.totalTrucks > 0
        ? ((data.deployedTrucks / data.totalTrucks) * 100).toFixed(1)
        : 0

    // Calculate driver utilization rate
    const driverUtilizationRate =
      data.totalDrivers > 0
        ? ((data.deployedDrivers / data.totalDrivers) * 100).toFixed(1)
        : 0

    // User analytics data
    const userLoginData = data.userLoginAnalytics[0] || {}
    const totalLogins = userLoginData.totalLogins || 0
    const avgLoginCount = userLoginData.avgLoginCount || 0
    const maxLoginCount = userLoginData.maxLoginCount || 0

    // Safe data formatting with fallbacks
    const formatArrayData = (array, fallback = []) => {
      return Array.isArray(array) && array.length > 0 ? array : fallback
    }

    // Weekly trends - Process completed vs canceled data
    const weeklyTrendsData = formatArrayData(
      data.weeklyDeploymentStatusAnalytics
    )
    const weeklySacksData = formatArrayData(data.weeklySacksAnalytics)
    const weeklyWeightData = formatArrayData(data.weeklyWeightAnalytics)

    // Format deployment status with proper labels and ordering
    const deploymentStatusData = formatArrayData(data.deploymentStatusAnalytics)
    const deploymentStatusMap = {
      completed: 'Completed',
      ongoing: 'Ongoing',
      'in-progress': 'In Progress',
      pending: 'Pending',
      canceled: 'Cancelled',
      preparing: 'Preparing'
    }

    // Format user role data
    const userRoleData = formatArrayData(data.userRoleAnalytics)
    const userRoleMap = {
      head_admin: 'Head Admin',
      admin: 'Admin',
      visitor: 'Visitor',
      subcon: 'Subcontractor'
    }

    // Format user status data
    const userStatusData = formatArrayData(data.userStatusAnalytics)
    const userStatusMap = {
      active: 'Active',
      inactive: 'Inactive',
      pending: 'Pending',
      rejected: 'Rejected',
      revoked: 'Revoked'
    }

    // Format subcon data
    const subconData = formatArrayData(data.subconAnalytics)

    // Calculate total ongoing deployments
    const totalOngoingDeployments =
      data.activeDeployments +
      data.preparingDeployments +
      data.pendingDeployments +
      data.inProgressDeployments +
      data.ongoingDeployments

    // Helper function to format week label (e.g., "Feb 1-7")
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

    // Process weekly deployment data - Only show weeks that have deployment values
    const processWeeklyDeploymentData = weeklyData => {
      // If no data, return empty array
      if (!weeklyData || weeklyData.length === 0) {
        return []
      }

      // Group data by week
      const weeklyMap = {}

      weeklyData.forEach(item => {
        const year = item._id.year
        const month = item._id.month
        const week = item._id.week
        const status = item._id.status
        const count = item.count || 0

        const weekKey = `${year}-${month}-${week}`

        if (!weeklyMap[weekKey]) {
          weeklyMap[weekKey] = {
            year: year,
            month: month,
            week: week,
            completed: 0,
            canceled: 0
          }
        }

        if (status === 'completed') {
          weeklyMap[weekKey].completed = count
        } else if (status === 'canceled') {
          weeklyMap[weekKey].canceled = count
        }
      })

      // Convert to array and filter out weeks with no deployments
      const weeklyArray = Object.values(weeklyMap)
        .filter(week => week.completed > 0 || week.canceled > 0) // Only show weeks with data
        .sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year
          if (a.month !== b.month) return a.month - b.month
          return a.week - b.week
        })
        .map(week => ({
          ...week,
          label: formatWeekLabel(week.year, week.month, week.week)
        }))

      return weeklyArray
    }

    const processedWeeklyDeployments =
      processWeeklyDeploymentData(weeklyTrendsData)

    // Process weekly sacks data
    const processWeeklySacksData = weeklyData => {
      if (!weeklyData || weeklyData.length === 0) {
        return []
      }

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

    const processedWeeklySacks = processWeeklySacksData(weeklySacksData)

    // Process weekly weight data
    const processWeeklyWeightData = weeklyData => {
      if (!weeklyData || weeklyData.length === 0) {
        return []
      }

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

    const processedWeeklyWeight = processWeeklyWeightData(weeklyWeightData)

    // Format pickup sites with additional data
    const formattedPickupSites = formatArrayData(data.topPickupSites).map(
      site => ({
        name: site._id,
        count: site.count,
        totalSacks: site.totalSacks,
        totalWeight: site.totalWeight
      })
    )

    // Format territory metrics from the FIXED territoryPerformance aggregation
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

    // Format the analytics data for frontend
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

        // Total sacks and weight (excluding canceled)
        totalSacks: totalSacks || 0,
        totalWeight: totalWeight || 0,
        avgSacksPerDeployment: parseFloat(avgSacks.toFixed(1)),
        avgWeightPerDeployment: parseFloat(avgWeight.toFixed(1)),
        maxSacks: maxSacks || 0,
        maxWeight: maxWeight || 0,

        // NEW: Completed deployments sacks and weight
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
        // Line chart - Weekly deployments (completed vs canceled)
        weeklyDeployments: {
          labels: processedWeeklyDeployments.map(item => item.label),
          completedData: processedWeeklyDeployments.map(
            item => item.completed || 0
          ),
          canceledData: processedWeeklyDeployments.map(
            item => item.canceled || 0
          )
        },

        // Line chart - Weekly sacks (excluding canceled)
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

        // Line chart - Weekly weight (excluding canceled)
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

        // Bar chart - Deployment status
        deploymentStatus: {
          labels: deploymentStatusData.map(
            item => deploymentStatusMap[item._id] || item._id || 'Unknown'
          ),
          data: deploymentStatusData.map(item => item.count || 0)
        },

        // Bar chart - Pickup Sites
        pickupSites: {
          data: formattedPickupSites,
          labels: formattedPickupSites.map(item => item.name),
          counts: formattedPickupSites.map(item => item.count),
          sacks: formattedPickupSites.map(item => item.totalSacks),
          weights: formattedPickupSites.map(item => item.totalWeight)
        },

        // Bar chart - Truck types
        truckTypes: {
          labels: formatArrayData(data.truckTypeAnalytics).map(
            item => item._id || 'Unknown'
          ),
          data: formatArrayData(data.truckTypeAnalytics).map(
            item => item.count || 0
          )
        },

        // Pie chart - Truck status
        truckStatus: {
          labels: formatArrayData(data.truckStatusAnalytics).map(
            item => item._id || 'Unknown'
          ),
          data: formatArrayData(data.truckStatusAnalytics).map(
            item => item.count || 0
          )
        },

        // Pie chart - Driver status
        driverStatus: {
          labels: formatArrayData(data.driverStatusAnalytics).map(
            item => item._id || 'Unknown'
          ),
          data: formatArrayData(data.driverStatusAnalytics).map(
            item => item.count || 0
          )
        },

        // USER CHARTS
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

        // Subcon performance with status breakdown
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

        // Territory Distribution
        territoryDistribution: {
          labels: formatArrayData(data.territoryAnalytics).map(
            item => item._id || 'Unknown'
          ),
          data: formatArrayData(data.territoryAnalytics).map(
            item => item.count || 0
          )
        },

        // Hybrid Distribution
        hybridDistribution: {
          labels: formatArrayData(data.hybridAnalytics).map(
            item => item._id || 'Unknown'
          ),
          data: formatArrayData(data.hybridAnalytics).map(
            item => item.count || 0
          )
        },

        // Flagging Distribution
        flaggingDistribution: {
          labels: formatArrayData(data.flaggingAnalytics).map(
            item => item._id || 'Unknown'
          ),
          data: formatArrayData(data.flaggingAnalytics).map(
            item => item.count || 0
          )
        },

        // Territory Performance
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

        // Hybrid Performance
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

        // Flagging Performance
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

      // Top performers
      topDrivers: formatArrayData(data.topDriversByTrips),

      // Territory Performance Metrics with completion rate
      territoryMetrics: formattedTerritoryMetrics,

      // Hybrid Performance Metrics
      hybridMetrics: formatArrayData(data.hybridPerformance).map(item => ({
        _id: item._id || 'Unknown',
        count: item.count || 0,
        totalSacks: item.totalSacks || 0,
        totalWeight: item.totalWeight || 0,
        avgSacks: parseFloat((item.avgSacks || 0).toFixed(1)),
        avgWeight: parseFloat((item.avgWeight || 0).toFixed(1))
      })),

      // Flagging Performance Metrics
      flaggingMetrics: formatArrayData(data.flaggingPerformance).map(item => ({
        _id: item._id || 'Unknown',
        count: item.count || 0,
        totalSacks: item.totalSacks || 0,
        totalWeight: item.totalWeight || 0,
        avgSacks: parseFloat((item.avgSacks || 0).toFixed(1)),
        avgWeight: parseFloat((item.avgWeight || 0).toFixed(1))
      })),

      performanceMetrics: {
        // Deployment metrics
        totalDeployments,
        completedDeployments: data.completedDeployments,
        ongoingDeployments: totalOngoingDeployments,
        cancelledDeployments: data.cancelledDeployments || 0,
        pendingDeployments: data.pendingDeployments || 0,
        preparingDeployments: data.preparingDeployments || 0,
        inProgressDeployments: data.inProgressDeployments || 0,
        activeDeployments: data.activeDeployments || 0,

        // Truck metrics
        totalTrucks: data.totalTrucks,
        activeTrucks: data.activeTrucks,
        availableTrucks: data.availableTrucks,
        deployedTrucks: data.deployedTrucks,

        // Driver metrics
        totalDrivers: data.totalDrivers,
        availableDrivers: data.availableDrivers,
        deployedDrivers: data.deployedDrivers,

        // Cargo metrics (all non-canceled)
        totalSacks: totalSacks || 0,
        totalWeight: totalWeight || 0,
        avgSacksPerDeployment: parseFloat(avgSacks.toFixed(1)),
        avgWeightPerDeployment: parseFloat(avgWeight.toFixed(1)),
        maxSacks: maxSacks || 0,
        maxWeight: maxWeight || 0,

        // NEW: Completed cargo metrics
        totalCompletedSacks: totalCompletedSacks || 0,
        totalCompletedWeight: totalCompletedWeight || 0,
        avgCompletedSacks: parseFloat(avgCompletedSacks.toFixed(1)),
        avgCompletedWeight: parseFloat(avgCompletedWeight.toFixed(1)),
        maxCompletedSacks: maxCompletedSacks || 0,
        maxCompletedWeight: maxCompletedWeight || 0,

        // Performance rates
        completionRate: parseFloat(completionRate),
        cancellationRate: parseFloat(cancellationRate),
        successRate: parseFloat(successRate),
        utilizationRate: parseFloat(utilizationRate),
        driverUtilizationRate: parseFloat(driverUtilizationRate),

        // Activity metrics
        recentActivity: data.recentActivity || 0,
        monthlyDeployments: data.monthlyDeployments || 0,
        yearlyDeployments: data.yearlyDeployments || 0,

        // USER METRICS
        totalUsers: data.totalUsers || 0,
        activeUsers: data.activeUsers || 0,
        pendingUsers: data.pendingUsers || 0,
        recentRegistrations: data.recentRegistrations || 0,
        totalLogins: totalLogins || 0,
        avgLoginCount: parseFloat(avgLoginCount.toFixed(1)),
        maxLoginCount: maxLoginCount || 0,

        // Additional metrics
        territoryCount: formatArrayData(data.territoryAnalytics).length || 0,
        hybridCount: formatArrayData(data.hybridAnalytics).length || 0,
        flaggingCount: formatArrayData(data.flaggingAnalytics).length || 0
      }
    }

    // Add subcon-specific analytics if user is a subcontractor
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
          distribution: formatArrayData(data.territoryAnalytics).filter(
            item => item._id && item._id.includes(req.user.subcon)
          ),
          performance: formatArrayData(data.territoryPerformance).filter(
            item => item.name && item.name.includes(req.user.subcon)
          )
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

module.exports = {
  getDashboardAnalytics
}
