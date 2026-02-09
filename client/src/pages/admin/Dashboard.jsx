import React, { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { API_ANALYTICS } from '../../utils/APIRoutes'
import axios from 'axios'
import {
  HiOutlineTruck,
  HiOutlineUser,
  HiOutlineCube,
  HiOutlineScale,
  HiOutlineChartBar,
  HiOutlineTrendingUp,
  HiOutlineUsers,
  HiOutlineUserGroup,
  HiOutlineKey,
  HiOutlineDocumentAdd,
  HiOutlineTag,
  HiOutlineHashtag,
  HiOutlineLocationMarker,
  HiOutlineBeaker,
  HiOutlineFlag
} from 'react-icons/hi'
import {
  TbRocket,
  TbChecklist,
  TbRefresh,
  TbX,
  TbTrendingUp,
  TbTrendingDown,
  TbActivity,
  TbUserPlus,
  TbLicense,
  TbNumber
} from 'react-icons/tb'
import { error_illustration } from '../../consts/images'
import { useUserContext } from '../../contexts/UserContext'
import clsx from 'clsx'

// Register Chart.js components INCLUDING datalabels plugin
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartDataLabels // Register the datalabels plugin
)

const Dashboard = () => {
  const { userData } = useUserContext()
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  // Enhanced color palette
  const colors = {
    green: '#10b981',
    blue: '#3b82f6',
    orange: '#f59e0b',
    red: '#ef4444',
    purple: '#8b5cf6',
    cyan: '#06b6d4',
    indigo: '#6366f1',
    emerald: '#059669',
    violet: '#7c3aed',
    rose: '#f43f5e',
    sky: '#0ea5e9',
    lime: '#84cc16',
    amber: '#f59e0b',
    teal: '#14b8a6',
    fuchsia: '#d946ef',
    gray: '#6b7280'
  }

  // Truck status colors
  const truckStatusColors = {
    available: colors.green,
    deployed: colors.blue,
    unavailable: colors.red
  }

  // Driver status colors
  const driverStatusColors = {
    available: colors.green,
    deployed: colors.blue,
    unavailable: colors.red
  }

  // Deployment status colors
  const deploymentStatusColors = {
    completed: colors.blue,
    ongoing: colors.green,
    'in-progress': colors.cyan,
    preparing: colors.orange,
    pending: colors.amber,
    canceled: colors.red
  }

  // User role colors
  const userRoleColors = {
    head_admin: colors.red,
    admin: colors.blue,
    visitor: colors.purple,
    subcon: colors.orange
  }

  // Hybrid colors
  const hybridColors = {
    hybrid_a: '#3b82f6',
    hybrid_b: '#10b981',
    hybrid_c: '#f59e0b',
    hybrid_d: '#8b5cf6',
    hybrid_e: '#ef4444'
  }

  // Flagging colors
  const flaggingColors = {
    red: '#ef4444',
    orange: '#f59e0b',
    green: '#10b981',
    yellow: '#f59e0b'
  }

  useEffect(() => {
    fetchAnalyticsData()
  }, [])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      const token = sessionStorage.getItem('userToken')
      const response = await axios.get(API_ANALYTICS, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        const analyticsData = response.data.data
        formatAnalyticsData(analyticsData)
        setAnalytics(analyticsData)
      } else {
        setError(response.data.message)
      }
    } catch (err) {
      setError('Failed to fetch analytics data')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatAnalyticsData = data => {
    if (!data) return

    const formatText = text => {
      if (!text) return 'Unknown'
      return text
        .replace(/_/g, ' ')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase())
        .trim()
    }

    // Format various data fields
    const formatFields = [
      { path: 'charts?.subconPerformance?.data', field: 'name' },
      { path: 'topDrivers', field: 'name' },
      { path: 'subconAnalytics?.drivers?.performance', field: 'name' },
      { path: 'charts?.truckTypes?.labels' },
      { path: 'charts?.userRoles?.labels' },
      { path: 'charts?.userStatus?.labels' },
      { path: 'charts?.driverStatus?.labels' },
      { path: 'charts?.truckStatus?.labels' },
      { path: 'charts?.deploymentStatus?.labels' },
      { path: 'charts?.subconDistribution?.labels' },
      { path: 'subconAnalytics?.drivers?.status', field: '_id' },
      { path: 'subconAnalytics?.trucks?.status', field: '_id' },
      { path: 'subconAnalytics?.trucks?.types', field: '_id' },
      { path: 'subconAnalytics?.trucks?.performance', field: 'plateNo' },
      { path: 'charts?.territoryDistribution?.labels' },
      { path: 'charts?.hybridDistribution?.labels' },
      { path: 'charts?.flaggingDistribution?.labels' },
      { path: 'charts?.territoryPerformance?.data', field: 'name' },
      { path: 'charts?.hybridPerformance?.data', field: 'name' },
      { path: 'charts?.flaggingPerformance?.data', field: 'name' },
      { path: 'territoryMetrics', field: '_id' },
      { path: 'hybridMetrics', field: '_id' },
      { path: 'flaggingMetrics', field: '_id' }
    ]

    formatFields.forEach(({ path, field }) => {
      const keys = path.split('?.')
      let current = data

      for (let i = 0; i < keys.length - 1; i++) {
        if (current && current[keys[i]] !== undefined) {
          current = current[keys[i]]
        } else {
          return
        }
      }

      const lastKey = keys[keys.length - 1]
      if (current && current[lastKey]) {
        if (field) {
          current[lastKey] = current[lastKey].map(item => ({
            ...item,
            [field]: formatText(item[field])
          }))
        } else {
          current[lastKey] = current[lastKey].map(formatText)
        }
      }
    })
  }

  // BASE CHART OPTIONS WITH DATALABELS FOR ALL CHARTS
  const createBaseOptions = (showLegend = false) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'bottom',
        labels: {
          font: { size: 11 },
          boxWidth: 12,
          padding: 15
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1f2937',
        bodyColor: '#4b5563',
        borderColor: colors.green,
        borderWidth: 1,
        cornerRadius: 6,
        padding: 12
      },
      // DATALABELS CONFIGURATION - This adds text inside ALL charts
      datalabels: {
        display: true,
        color: '#ffffff',
        font: {
          weight: 'bold',
          size: 16 // Increased from 11 to 12 for bigger text
        },
        formatter: function (value, context) {
          return value.toLocaleString()
        },
        anchor: 'center', // Center horizontally
        align: 'center', // Center vertically
        clip: false
      }
    }
  })

  // VERTICAL BAR CHART OPTIONS - TEXT CENTERED IN BAR
  const verticalBarOptions = {
    ...createBaseOptions(),
    plugins: {
      ...createBaseOptions().plugins,
      legend: {
        ...createBaseOptions().plugins.legend,
        labels: {
          ...createBaseOptions().plugins.legend.labels,
          sort: (a, b) => a.text.localeCompare(b.text) // Sort legend alphabetically
        }
      },
      datalabels: {
        ...createBaseOptions().plugins.datalabels,
        anchor: 'center',
        align: 'center',
        offset: 0,
        font: {
          weight: 'bold',
          size: 16
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: {
          color: '#6b7280',
          callback: value => value.toLocaleString()
        }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#6b7280' }
      }
    }
  }

  // HORIZONTAL BAR CHART OPTIONS - TEXT CENTERED IN BAR
  const horizontalBarOptions = {
    ...createBaseOptions(),
    indexAxis: 'y',
    plugins: {
      ...createBaseOptions().plugins,
      datalabels: {
        ...createBaseOptions().plugins.datalabels,
        anchor: 'center', // Center horizontally
        align: 'center', // Center vertically
        offset: 0, // No offset
        font: {
          weight: 'bold',
          size: 16 // Slightly bigger for horizontal bars
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: {
          color: '#6b7280',
          callback: value => value.toLocaleString()
        }
      },
      y: {
        grid: { display: false },
        ticks: {
          color: '#6b7280',
          font: { size: 11 },
          maxRotation: 0
        }
      }
    }
  }

  // PIE/DOUGHNUT CHART OPTIONS
  const pieDoughnutOptions = {
    ...createBaseOptions(true),
    plugins: {
      ...createBaseOptions(true).plugins,
      legend: {
        ...createBaseOptions(true).plugins.legend,
        labels: {
          ...createBaseOptions(true).plugins.legend.labels,
          sort: (a, b) => a.text.localeCompare(b.text), // Sort legend alphabetically
          generateLabels: function (chart) {
            const data = chart.data
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, i) => ({
                text: label,
                fillStyle: data.datasets[0].backgroundColor[i],
                strokeStyle: data.datasets[0].borderColor[i],
                lineWidth: 0,
                hidden: false,
                index: i
              }))
            }
            return []
          }
        }
      },
      // ADD THIS TOOLTIP CALLBACK FOR PERCENTAGES
      tooltip: {
        ...createBaseOptions(true).plugins.tooltip,
        callbacks: {
          ...createBaseOptions(true).plugins.tooltip.callbacks,
          label: function (context) {
            const label = context.label || ''
            const value = context.raw || 0

            // Calculate total of all data points in the dataset
            const dataset = context.dataset
            const total = dataset.data.reduce((a, b) => a + b, 0)
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0

            return `${label}: ${value.toLocaleString()} (${percentage}%)`
          }
        }
      },
      datalabels: {
        ...createBaseOptions(true).plugins.datalabels,
        display: true,
        color: '#ffffff',
        font: {
          weight: 'bold',
          size: 16
        },
        formatter: function (value) {
          return value.toLocaleString()
        },
        anchor: 'center',
        align: 'center'
      }
    }
  }

  // DOUGHNUT SPECIFIC OPTIONS
  const doughnutOptions = {
    ...pieDoughnutOptions,
    cutout: '50%'
  }

  // STACKED BAR CHART OPTIONS - TEXT CENTERED IN EACH SEGMENT
  const stackedBarOptions = {
    ...createBaseOptions(true),
    plugins: {
      ...createBaseOptions(true).plugins,
      legend: {
        ...createBaseOptions(true).plugins.legend,
        position: 'bottom',
        labels: {
          usePointStyle: false,
          padding: 15,
          boxWidth: 20,
          boxHeight: 12,
          font: {
            size: 12,
            family: "'Inter', sans-serif"
          },
          color: '#4b5563'
        }
      },
      datalabels: {
        ...createBaseOptions().plugins.datalabels,
        display: true,
        color: '#ffffff',
        font: {
          weight: 'bold',
          size: 16 // Slightly bigger
        },
        formatter: function (value) {
          return value > 0 ? value.toLocaleString() : ''
        },
        anchor: 'center', // Center horizontally
        align: 'center', // Center vertically
        offset: 0 // No offset
      }
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 11,
            family: "'Inter', sans-serif"
          },
          maxRotation: 45,
          padding: 8
        },
        border: {
          display: false
        }
      },
      y: {
        stacked: true,
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
          drawTicks: false
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 11,
            family: "'Inter', sans-serif"
          },
          padding: 8,
          callback: value => value.toLocaleString()
        },
        border: {
          display: false
        },
        title: {
          display: true,
          text: 'Number of Deployments',
          color: '#6b7280',
          font: {
            size: 12,
            weight: '600',
            family: "'Inter', sans-serif"
          },
          padding: { top: 0, bottom: 10 }
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    elements: {
      bar: {
        borderRadius: 3
      }
    }
  }

  // Replace the getLineChartData function with this:
  const getLineChartData = () => {
    if (!analytics?.charts?.weeklyDeployments)
      return { labels: [], datasets: [] }

    return {
      labels: analytics.charts.weeklyDeployments.labels,
      datasets: [
        {
          label: 'Completed',
          data: analytics.charts.weeklyDeployments.completedData.map(val =>
            Math.round(val)
          ),
          borderColor: colors.green,
          backgroundColor: `${colors.green}20`,
          borderWidth: 3,
          fill: false,
          tension: 0.4,
          pointBackgroundColor: colors.green,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Canceled',
          data: analytics.charts.weeklyDeployments.canceledData.map(val =>
            Math.round(val)
          ),
          borderColor: colors.red,
          backgroundColor: `${colors.red}20`,
          borderWidth: 3,
          fill: false,
          tension: 0.4,
          pointBackgroundColor: colors.red,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    }
  }

  // Replace the lineChartOptions object with this:
  const lineChartOptions = {
    ...createBaseOptions(true),
    plugins: {
      ...createBaseOptions(true).plugins,
      datalabels: {
        display: false // NO TEXT for line chart
      },
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 15,
          boxWidth: 12,
          font: { size: 12 }
        }
      },
      tooltip: {
        ...createBaseOptions(true).plugins.tooltip,
        callbacks: {
          label: function (context) {
            const label = context.dataset.label || ''
            const value = context.raw || 0
            return `${label}: ${Math.round(value).toLocaleString()}`
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: {
          color: '#6b7280',
          font: { size: 11 },
          callback: value => Math.round(value).toLocaleString(),
          stepSize: 1 // Ensure whole numbers only
        }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#6b7280' }
      }
    }
  }

  const getBarChartData = (chartData, label, customColors = null) => {
    if (!chartData?.labels || !chartData?.data)
      return { labels: [], datasets: [] }

    const backgroundColors =
      customColors ||
      chartData.labels.map((_, i) => {
        const colorKeys = Object.keys(colors)
        return colors[colorKeys[i % colorKeys.length]]
      })

    // For Subcontractor Distribution specifically, sort alphabetically
    const isSubconDistribution =
      label === 'Users' &&
      chartData.labels.some(
        label =>
          label.toLowerCase().includes('subcontractor') ||
          label.toLowerCase().includes('subcon')
      )

    if (isSubconDistribution) {
      // Create an array of objects with label, data, and color
      const items = chartData.labels.map((label, index) => ({
        label: label,
        data: chartData.data[index],
        color: backgroundColors[index]
      }))

      // Sort alphabetically by label
      items.sort((a, b) => a.label.localeCompare(b.label))

      // Extract sorted arrays
      const sortedLabels = items.map(item => item.label)
      const sortedData = items.map(item => item.data)
      const sortedColors = items.map(item => item.color)

      return {
        labels: sortedLabels,
        datasets: [
          {
            label: label,
            data: sortedData,
            backgroundColor: sortedColors,
            borderColor: sortedColors,
            borderWidth: 0,
            borderRadius: 4,
            borderSkipped: false
          }
        ]
      }
    }

    return {
      labels: chartData.labels,
      datasets: [
        {
          label: label,
          data: chartData.data,
          backgroundColor: backgroundColors,
          borderColor: backgroundColors,
          borderWidth: 0,
          borderRadius: 4,
          borderSkipped: false
        }
      ]
    }
  }

  const getAllDriversBarData = () => {
    if (!analytics?.topDrivers || analytics.topDrivers.length === 0)
      return { labels: [], datasets: [] }
    const sortedDrivers = [...analytics.topDrivers]
      .sort((a, b) => (b.tripCount || 0) - (a.tripCount || 0))
      .slice(0, 15)
    return {
      labels: sortedDrivers.map(driver =>
        driver.name
          ? driver.name.replace(/\b\w/g, char => char.toUpperCase())
          : 'Unknown Driver'
      ),
      datasets: [
        {
          label: 'Completed Trips',
          data: sortedDrivers.map(driver => driver.tripCount || 0),
          backgroundColor: colors.blue,
          borderColor: colors.blue,
          borderWidth: 0,
          borderRadius: 4
        }
      ]
    }
  }

  const getDeploymentStatusData = () => {
    if (!analytics?.charts?.deploymentStatus)
      return { labels: [], datasets: [] }
    const backgroundColors = analytics.charts.deploymentStatus.labels.map(
      label => {
        const lowerLabel = label.toLowerCase()
        if (lowerLabel.includes('complete'))
          return deploymentStatusColors.completed
        if (lowerLabel.includes('ongoing'))
          return deploymentStatusColors.ongoing
        if (lowerLabel.includes('progress'))
          return deploymentStatusColors['in-progress']
        if (lowerLabel.includes('preparing'))
          return deploymentStatusColors.preparing
        if (lowerLabel.includes('pending'))
          return deploymentStatusColors.pending
        if (lowerLabel.includes('cancel'))
          return deploymentStatusColors.canceled
        return colors.gray
      }
    )
    return {
      labels: analytics.charts.deploymentStatus.labels,
      datasets: [
        {
          label: 'Deployments',
          data: analytics.charts.deploymentStatus.data,
          backgroundColor: backgroundColors,
          borderColor: '#ffffff',
          borderWidth: 2,
          borderRadius: 4,
          borderSkipped: false
        }
      ]
    }
  }

  const getTruckStatusData = () => {
    if (!analytics?.charts?.truckStatus) return { labels: [], datasets: [] }
    const backgroundColors = analytics.charts.truckStatus.labels.map(label => {
      const lowerLabel = label.toLowerCase()
      if (
        lowerLabel.includes('available') &&
        !lowerLabel.includes('unavailable')
      )
        return truckStatusColors.available
      if (lowerLabel.includes('deployed')) return truckStatusColors.deployed
      if (lowerLabel.includes('unavailable'))
        return truckStatusColors.unavailable
      return colors.gray
    })
    return {
      labels: analytics.charts.truckStatus.labels,
      datasets: [
        {
          data: analytics.charts.truckStatus.data,
          backgroundColor: backgroundColors,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 8
        }
      ]
    }
  }

  const getDriverStatusData = () => {
    if (!analytics?.charts?.driverStatus) return { labels: [], datasets: [] }
    const backgroundColors = analytics.charts.driverStatus.labels.map(label => {
      const lowerLabel = label.toLowerCase()
      if (lowerLabel.includes('available')) return driverStatusColors.available
      if (lowerLabel.includes('deployed')) return driverStatusColors.deployed
      if (lowerLabel.includes('unavailable'))
        return driverStatusColors.unavailable
      return colors.gray
    })
    return {
      labels: analytics.charts.driverStatus.labels,
      datasets: [
        {
          data: analytics.charts.driverStatus.data,
          backgroundColor: backgroundColors,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 8
        }
      ]
    }
  }

  const getUserRoleData = () => {
    if (!analytics?.charts?.userRoles) return { labels: [], datasets: [] }
    const backgroundColors = analytics.charts.userRoles.labels.map(label => {
      const lowerLabel = label.toLowerCase()
      if (lowerLabel.includes('head admin')) return userRoleColors.head_admin
      if (lowerLabel.includes('admin')) return userRoleColors.admin
      if (lowerLabel.includes('visitor')) return userRoleColors.visitor
      if (lowerLabel.includes('subcontractor')) return userRoleColors.subcon
      return colors.gray
    })
    return {
      labels: analytics.charts.userRoles.labels,
      datasets: [
        {
          data: analytics.charts.userRoles.data,
          backgroundColor: backgroundColors,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 8
        }
      ]
    }
  }

  const getUserStatusData = () => {
    if (!analytics?.charts?.userStatus) return { labels: [], datasets: [] }
    const backgroundColors = analytics.charts.userStatus.labels.map(label => {
      const lowerLabel = label.toLowerCase()
      if (lowerLabel.includes('active') && !lowerLabel.includes('inactive'))
        return colors.green
      if (lowerLabel.includes('inactive')) return colors.red
      if (lowerLabel.includes('pending')) return colors.orange
      if (lowerLabel.includes('revoked') || lowerLabel.includes('rejected'))
        return colors.gray
      return colors.blue
    })
    return {
      labels: analytics.charts.userStatus.labels,
      datasets: [
        {
          data: analytics.charts.userStatus.data,
          backgroundColor: backgroundColors,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 8
        }
      ]
    }
  }

  const getSubconDeploymentStatusData = () => {
    if (!analytics?.charts?.subconPerformance?.data)
      return { labels: [], datasets: [] }
    const subcons = analytics.charts.subconPerformance.data.slice(0, 10)
    const statusOrder = ['preparing', 'ongoing', 'completed', 'canceled']
    const statusLabels = {
      preparing: 'Preparing',
      ongoing: 'Ongoing',
      completed: 'Completed',
      canceled: 'Canceled'
    }
    const statusColors = {
      preparing: colors.orange,
      ongoing: colors.green,
      completed: colors.blue,
      canceled: colors.red
    }
    const datasets = statusOrder.map(status => ({
      label: statusLabels[status],
      data: subcons.map((subcon, index) => {
        const breakdown = analytics.charts.subconPerformance.statusBreakdown
        return breakdown && breakdown[index] ? breakdown[index][status] || 0 : 0
      }),
      backgroundColor: statusColors[status],
      borderColor: '#ffffff',
      borderWidth: 1,
      borderRadius: { topLeft: 3, topRight: 3, bottomLeft: 0, bottomRight: 0 },
      borderSkipped: false,
      hoverBackgroundColor: `${statusColors[status]}CC`,
      categoryPercentage: 0.8,
      barPercentage: 0.9
    }))
    return { labels: subcons.map(subcon => subcon.name), datasets }
  }

  const getSubconDriverPerformanceData = () => {
    if (!analytics?.subconAnalytics?.drivers?.performance)
      return { labels: [], datasets: [] }
    const drivers = analytics.subconAnalytics.drivers.performance
      .sort((a, b) => (b.tripCount || 0) - (a.tripCount || 0))
      .slice(0, 15)
    return {
      labels: drivers.map(driver =>
        driver.name
          ? driver.name.replace(/\b\w/g, char => char.toUpperCase())
          : 'Unknown Driver'
      ),
      datasets: [
        {
          label: 'Completed Trips',
          data: drivers.map(driver => driver.tripCount || 0),
          backgroundColor: colors.blue,
          borderColor: colors.blue,
          borderWidth: 0,
          borderRadius: 4
        }
      ]
    }
  }

  const getSubconTruckPerformanceData = () => {
    if (!analytics?.subconAnalytics?.trucks?.performance)
      return { labels: [], datasets: [] }
    const trucks = analytics.subconAnalytics.trucks.performance
      .sort((a, b) => (b.tripCount || 0) - (a.tripCount || 0))
      .slice(0, 15)
    return {
      labels: trucks.map(truck => truck.plateNo || 'Unknown Truck'),
      datasets: [
        {
          label: 'Completed Trips',
          data: trucks.map(truck => truck.tripCount || 0),
          backgroundColor: colors.green,
          borderColor: colors.green,
          borderWidth: 0,
          borderRadius: 4
        }
      ]
    }
  }

  const getSubconDriverStatusData = () => {
    if (!analytics?.subconAnalytics?.drivers?.status)
      return { labels: [], datasets: [] }
    const backgroundColors = analytics.subconAnalytics.drivers.status.map(
      item => {
        const lowerLabel = (item._id || '').toLowerCase()
        if (lowerLabel.includes('available'))
          return driverStatusColors.available
        if (lowerLabel.includes('deployed')) return driverStatusColors.deployed
        if (lowerLabel.includes('unavailable'))
          return driverStatusColors.unavailable
        return colors.gray
      }
    )
    return {
      labels: analytics.subconAnalytics.drivers.status.map(item =>
        item._id
          ? item._id.charAt(0).toUpperCase() + item._id.slice(1)
          : 'Unknown'
      ),
      datasets: [
        {
          data: analytics.subconAnalytics.drivers.status.map(
            item => item.count || 0
          ),
          backgroundColor: backgroundColors,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 8
        }
      ]
    }
  }

  const getSubconTruckStatusData = () => {
    if (!analytics?.subconAnalytics?.trucks?.status)
      return { labels: [], datasets: [] }
    const backgroundColors = analytics.subconAnalytics.trucks.status.map(
      item => {
        const lowerLabel = (item._id || '').toLowerCase()
        if (lowerLabel.includes('available')) return truckStatusColors.available
        if (lowerLabel.includes('deployed')) return truckStatusColors.deployed
        if (lowerLabel.includes('unavailable'))
          return truckStatusColors.unavailable
        return colors.gray
      }
    )
    return {
      labels: analytics.subconAnalytics.trucks.status.map(item =>
        item._id
          ? item._id.charAt(0).toUpperCase() + item._id.slice(1)
          : 'Unknown'
      ),
      datasets: [
        {
          data: analytics.subconAnalytics.trucks.status.map(
            item => item.count || 0
          ),
          backgroundColor: backgroundColors,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 8
        }
      ]
    }
  }

  const getSubconTruckTypesData = () => {
    if (!analytics?.subconAnalytics?.trucks?.types)
      return { labels: [], datasets: [] }
    return {
      labels: analytics.subconAnalytics.trucks.types.map(item =>
        item._id
          ? item._id
              .replace('-', ' ')
              .replace(/\b\w/g, char => char.toUpperCase())
          : 'Unknown'
      ),
      datasets: [
        {
          label: 'Number of Trucks',
          data: analytics.subconAnalytics.trucks.types.map(
            item => item.count || 0
          ),
          backgroundColor: colors.purple,
          borderColor: colors.purple,
          borderWidth: 0,
          borderRadius: 4,
          borderSkipped: false
        }
      ]
    }
  }

  const getTerritoryDistributionPieData = () => {
    if (!analytics?.charts?.territoryDistribution)
      return { labels: [], datasets: [] }

    // Get labels and data
    const labels = analytics.charts.territoryDistribution.labels
    const data = analytics.charts.territoryDistribution.data
    const sevenTerritoryColors = [
      '#3b82f6',
      '#10b981',
      '#f59e0b',
      '#8b5cf6',
      '#ef4444',
      '#06b6d4',
      '#f43f5e'
    ]

    // Create an array of objects with label, data, and color
    const items = labels.map((label, index) => ({
      label: label,
      data: data[index],
      color: sevenTerritoryColors[index % 7] || colors.gray
    }))

    // Sort alphabetically by label
    items.sort((a, b) => a.label.localeCompare(b.label))

    // Extract sorted arrays
    const sortedLabels = items.map(item => item.label)
    const sortedData = items.map(item => item.data)
    const sortedColors = items.map(item => item.color)

    return {
      labels: sortedLabels,
      datasets: [
        {
          label: 'Deployments',
          data: sortedData,
          backgroundColor: sortedColors,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 15,
          hoverBorderWidth: 3
        }
      ]
    }
  }
  const getHybridDistributionPieData = () => {
    if (!analytics?.charts?.hybridDistribution)
      return { labels: [], datasets: [] }
    const backgroundColors = analytics.charts.hybridDistribution.labels.map(
      (label, index) => {
        const hybridKeys = Object.keys(hybridColors)
        return (
          hybridColors[hybridKeys[index % hybridKeys.length]] || colors.gray
        )
      }
    )
    return {
      labels: analytics.charts.hybridDistribution.labels,
      datasets: [
        {
          label: 'Deployments',
          data: analytics.charts.hybridDistribution.data,
          backgroundColor: backgroundColors,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 15,
          hoverBorderWidth: 3
        }
      ]
    }
  }

  const getFlaggingDistributionPieData = () => {
    if (!analytics?.charts?.flaggingDistribution)
      return { labels: [], datasets: [] }
    const backgroundColors = analytics.charts.flaggingDistribution.labels.map(
      label => {
        const lowerLabel = label.toLowerCase()
        if (lowerLabel.includes('green')) return flaggingColors.green
        if (lowerLabel.includes('red')) return flaggingColors.red
        if (lowerLabel.includes('orange')) return flaggingColors.orange
        if (lowerLabel.includes('yellow')) return flaggingColors.yellow
        return colors.gray
      }
    )
    return {
      labels: analytics.charts.flaggingDistribution.labels,
      datasets: [
        {
          label: 'Deployments',
          data: analytics.charts.flaggingDistribution.data,
          backgroundColor: backgroundColors,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 15,
          hoverBorderWidth: 3
        }
      ]
    }
  }

  const getTerritoryPerformanceStackedData = () => {
    if (!analytics?.charts?.territoryPerformance?.data)
      return { labels: [], datasets: [] }
    const territories = analytics.charts.territoryPerformance.data.slice(0, 10)
    const statusOrder = ['preparing', 'ongoing', 'completed', 'canceled']
    const statusLabels = {
      preparing: 'Preparing',
      ongoing: 'Ongoing',
      completed: 'Completed',
      canceled: 'Canceled'
    }
    const statusColors = {
      preparing: colors.orange,
      ongoing: colors.green,
      completed: colors.blue,
      canceled: colors.red
    }
    const datasets = statusOrder.map(status => ({
      label: statusLabels[status],
      data: territories.map((territory, index) => {
        const breakdown =
          analytics.charts.territoryPerformance.statusBreakdown[index]
        return breakdown ? breakdown[status] || 0 : 0
      }),
      backgroundColor: statusColors[status],
      borderColor: '#ffffff',
      borderWidth: 1,
      borderRadius: { topLeft: 3, topRight: 3, bottomLeft: 0, bottomRight: 0 },
      borderSkipped: false,
      hoverBackgroundColor: `${statusColors[status]}CC`,
      categoryPercentage: 0.8,
      barPercentage: 0.9
    }))
    return { labels: territories.map(territory => territory.name), datasets }
  }

  const MetricCard = ({
    icon: Icon,
    title,
    value,
    subtitle,
    color,
    trend = null
  }) => (
    <div className='bg-white p-4 rounded-lg shadow-card3 border border-gray-100 hover:shadow-md transition-all duration-200'>
      <div className='flex items-start justify-between'>
        <div className='space-y-2'>
          <div className='flex items-center gap-2'>
            <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
              <Icon className={`text-xl ${color}`} />
            </div>
            <span className='text-xs md:text-sm font-medium text-gray-600'>
              {title}
            </span>
          </div>
          <div className='text-xl md:text-2xl font-bold text-gray-900'>
            {value}
          </div>
          {subtitle && (
            <div className='text-xs md:text-sm text-gray-500'>{subtitle}</div>
          )}
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 ${
              trend > 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trend > 0 ? <TbTrendingUp /> : <TbTrendingDown />}
            <span className='text-xs md:text-sm font-medium'>
              {Math.abs(trend)}%
            </span>
          </div>
        )}
      </div>
    </div>
  )

  if (loading || userData.isLoading) {
    return (
      <div className='flex-1 flex items-center justify-center'>
        <div className='flex flex-col items-center justify-center gap-4 text-center'>
          <div className='relative'>
            <span className='loading loading-spinner loading-lg text-primaryColor'></span>
          </div>
          <p className='text-gray-600 font-medium'>Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex-1 flex justify-center items-center'>
        <div className='flex flex-col justify-center items-center gap-4 px-4 text-center'>
          <img src={error_illustration} alt='empty list' className='w-56' />
          <div className='space-y-2'>
            <h1 className='text-xl font-semibold text-gray-700'>
              Something went wrong
            </h1>
            <p className='text-gray-500 max-w-md leading-relaxed'>
              We encountered an unexpected error. Please try again later.
            </p>
            <button
              onClick={fetchAnalyticsData}
              className='btn btn-primary mt-4'
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  const userRole = userData.data?.role
  const isAdmin = ['head_admin', 'admin'].includes(userRole)
  const isSubcon = userRole === 'subcon'
  const isVisitor = userRole === 'visitor'

  return (
    <div className='flex-1 relative overflow-y-auto scrollbar-thin'>
      <div className='absolute inset-0 space-y-6'>
        {/* Header */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div>
            <h1 className='font-semibold text-xl md:text-2xl text-gray-900'>
              Analytics Dashboard
            </h1>
            <p className='text-gray-600 mt-2 font-medium text-sm md:text-base'>
              Real-time operational insights and performance metrics
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className='flex border-b border-gray-200'>
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-medium text-xs md:text-sm transition-colors ${
              activeTab === 'overview'
                ? 'text-primaryColor border-b-2 border-primaryColor'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          {(isAdmin || isVisitor) && (
            <button
              onClick={() => setActiveTab('deploymentDetails')}
              className={`px-4 py-2 font-medium text-xs md:text-sm transition-colors ${
                activeTab === 'deploymentDetails'
                  ? 'text-primaryColor border-b-2 border-primaryColor'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Deployment Details
            </button>
          )}
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2 font-medium text-xs md:text-sm transition-colors ${
                  activeTab === 'users'
                    ? 'text-primaryColor border-b-2 border-primaryColor'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Users
              </button>
              <button
                onClick={() => setActiveTab('subcons')}
                className={`px-4 py-2 font-medium text-xs md:text-sm transition-colors ${
                  activeTab === 'subcons'
                    ? 'text-primaryColor border-b-2 border-primaryColor'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Subcontractors
              </button>
            </>
          )}
          {isSubcon && (
            <button
              onClick={() => setActiveTab('resources')}
              className={`px-4 py-2 font-medium text-xs md:text-sm transition-colors ${
                activeTab === 'resources'
                  ? 'text-primaryColor border-b-2 border-primaryColor'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              My Resources
            </button>
          )}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Metrics */}
            <div
              className={clsx('grid grid-cols-1 md:grid-cols-2 gap-4', {
                'xl:grid-cols-6': isVisitor,
                'xl:grid-cols-4': !isVisitor
              })}
            >
              <MetricCard
                icon={TbRocket}
                title='Total Deployments'
                value={
                  analytics.performanceMetrics.totalDeployments?.toLocaleString() ||
                  '0'
                }
                subtitle={`${
                  analytics.performanceMetrics.monthlyDeployments || 0
                } this month`}
                color='text-blue-600'
              />
              <MetricCard
                icon={TbChecklist}
                title='Completed'
                value={
                  analytics.performanceMetrics.completedDeployments?.toLocaleString() ||
                  '0'
                }
                subtitle={`${
                  analytics.performanceMetrics.successRate || 0
                }% success rate`}
                color='text-green-600'
              />
              <MetricCard
                icon={TbRefresh}
                title='In Progress'
                value={
                  analytics.performanceMetrics.ongoingDeployments?.toLocaleString() ||
                  '0'
                }
                subtitle={`${
                  analytics.performanceMetrics.activeDeployments || 0
                } active`}
                color='text-amber-600'
              />
              <MetricCard
                icon={TbActivity}
                title='Recent Activity'
                value={
                  analytics.performanceMetrics.recentActivity?.toLocaleString() ||
                  '0'
                }
                subtitle='Last 24 hours'
                color='text-purple-600'
              />

              {isSubcon && analytics?.subconAnalytics && (
                <>
                  <MetricCard
                    icon={HiOutlineTruck}
                    title='Available Trucks'
                    value={
                      analytics.subconAnalytics.trucks?.available?.toLocaleString() ||
                      '0'
                    }
                    subtitle={`${
                      analytics.subconAnalytics.trucks?.total || 0
                    } total trucks`}
                    color='text-indigo-600'
                  />

                  <MetricCard
                    icon={HiOutlineUser}
                    title='Available Drivers'
                    value={
                      analytics.subconAnalytics.drivers?.available?.toLocaleString() ||
                      '0'
                    }
                    subtitle={`${
                      analytics.subconAnalytics.drivers?.total || 0
                    } total drivers`}
                    color='text-cyan-600'
                  />
                </>
              )}

              {isVisitor && (
                <>
                  <MetricCard
                    icon={HiOutlineCube}
                    title='Total Sacks'
                    value={
                      analytics.performanceMetrics.totalCompletedSacks?.toLocaleString() ||
                      '0'
                    }
                    subtitle={`Avg: ${
                      analytics.performanceMetrics.avgCompletedSacks?.toFixed(
                        2
                      ) || '0'
                    } per trip`}
                    color='text-emerald-600'
                  />

                  <MetricCard
                    icon={HiOutlineScale}
                    title='Total Weight'
                    value={`${
                      analytics.performanceMetrics.totalCompletedWeight?.toLocaleString() ||
                      '0'
                    } kg`}
                    subtitle={`Avg: ${
                      analytics.performanceMetrics.avgCompletedWeight?.toLocaleString() ||
                      '0'
                    } kg per trip`}
                    color='text-violet-600'
                  />
                </>
              )}
            </div>

            {/* Performance Metrics for Admins */}
            {isAdmin && (
              <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4'>
                <MetricCard
                  icon={HiOutlineTruck}
                  title='Truck Utilization'
                  value={`${
                    analytics.performanceMetrics.utilizationRate || 0
                  }%`}
                  subtitle={`${
                    analytics.performanceMetrics.deployedTrucks || 0
                  }/${analytics.performanceMetrics.totalTrucks || 0} deployed`}
                  color='text-indigo-600'
                />
                <MetricCard
                  icon={HiOutlineUser}
                  title='Driver Utilization'
                  value={`${
                    analytics.performanceMetrics.driverUtilizationRate || 0
                  }%`}
                  subtitle={`${
                    analytics.performanceMetrics.deployedDrivers || 0
                  }/${analytics.performanceMetrics.totalDrivers || 0} deployed`}
                  color='text-cyan-600'
                />

                <MetricCard
                  icon={HiOutlineCube}
                  title='Total Sacks'
                  value={
                    analytics.performanceMetrics.totalCompletedSacks?.toLocaleString() ||
                    '0'
                  }
                  subtitle={`Avg: ${
                    analytics.performanceMetrics.avgCompletedSacks?.toFixed(
                      1
                    ) || '0'
                  } per trip`}
                  color='text-emerald-600'
                />

                <MetricCard
                  icon={HiOutlineScale}
                  title='Total Weight'
                  value={`${
                    analytics.performanceMetrics.totalCompletedWeight?.toLocaleString() ||
                    '0'
                  } kg`}
                  subtitle={`Avg: ${
                    analytics.performanceMetrics.avgCompletedWeight?.toLocaleString() ||
                    '0'
                  } kg per trip`}
                  color='text-violet-600'
                />

                <MetricCard
                  icon={HiOutlineTrendingUp}
                  title='Completion Rate'
                  value={`${analytics.performanceMetrics.completionRate || 0}%`}
                  subtitle='Of all deployments'
                  color='text-green-600'
                />
                <MetricCard
                  icon={HiOutlineChartBar}
                  title='Cancellation Rate'
                  value={`${
                    analytics.performanceMetrics.cancellationRate || 0
                  }%`}
                  subtitle='Of all deployments'
                  color='text-red-600'
                />
              </div>
            )}

            {/* Main Charts Grid */}
            <div className='grid grid-cols-1 2xl:grid-cols-2 gap-6'>
              {/* Weekly Deployment Trends - LINE CHART (NO TEXT) */}
              <div className='bg-white p-6 rounded-xl shadow-card3 border border-gray-200'>
                <div className='flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4'>
                  <div>
                    <h2 className='text-lg md:text-xl font-semibold text-gray-900'>
                      Weekly Deployment Trends
                    </h2>
                    <p className='text-gray-500 text-xs md:text-sm'>
                      Completed vs canceled deployments
                    </p>
                  </div>
                  <div className='flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg'>
                    <TbTrendingUp className='text-green-600' />
                    <span className='text-xs md:text-sm font-medium text-gray-700'>
                      {analytics.performanceMetrics.successRate || 0}% success
                      rate
                    </span>
                  </div>
                </div>
                <div className='h-80'>
                  <Line data={getLineChartData()} options={lineChartOptions} />
                </div>
              </div>

              {/* Deployment Status Distribution - BAR CHART (WITH TEXT CENTERED) */}
              <div className='bg-white p-6 rounded-xl shadow-card3 border border-gray-200'>
                <div className='mb-6'>
                  <h2 className='text-lg md:text-xl font-semibold text-gray-900'>
                    Deployment Status
                  </h2>
                  <p className='text-gray-500 text-xs md:text-sm'>
                    Current status distribution
                  </p>
                </div>
                <div className='h-80'>
                  <Bar
                    data={getDeploymentStatusData()}
                    options={verticalBarOptions}
                  />
                </div>
              </div>
            </div>

            {/* Fleet & Drivers Analysis - Only for Admins */}
            {isAdmin && (
              <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6'>
                {/* Truck Types - BAR CHART (WITH TEXT CENTERED) */}
                <div className='bg-white p-6 rounded-xl shadow-card3 border border-gray-200'>
                  <div className='mb-6'>
                    <h2 className='text-lg md:text-xl font-semibold text-gray-900'>
                      Fleet Composition
                    </h2>
                    <p className='text-gray-500 text-xs md:text-sm'>
                      Truck types distribution
                    </p>
                  </div>
                  <div className='h-64'>
                    <Bar
                      data={getBarChartData(
                        analytics.charts.truckTypes,
                        'Trucks'
                      )}
                      options={verticalBarOptions}
                    />
                  </div>
                </div>

                {/* Truck Status - PIE CHART (WITH TEXT) */}
                <div className='bg-white p-6 rounded-xl shadow-card3 border border-gray-200'>
                  <div className='mb-6'>
                    <h2 className='text-lg md:text-xl font-semibold text-gray-900'>
                      Truck Status
                    </h2>
                    <p className='text-gray-500 text-xs md:text-sm'>
                      Operational status
                    </p>
                  </div>
                  <div className='h-64'>
                    <Doughnut
                      data={getTruckStatusData()}
                      options={pieDoughnutOptions}
                    />
                  </div>
                </div>

                {/* Driver Status - DOUGHNUT CHART (WITH TEXT) */}
                <div className='bg-white p-6 rounded-xl shadow-card3 border border-gray-200'>
                  <div className='mb-6'>
                    <h2 className='text-lg md:text-xl font-semibold text-gray-900'>
                      Driver Status
                    </h2>
                    <p className='text-gray-500 text-xs md:text-sm'>
                      Availability distribution
                    </p>
                  </div>
                  <div className='h-64'>
                    <Doughnut
                      data={getDriverStatusData()}
                      options={doughnutOptions}
                    />
                  </div>
                </div>

                <div className='col-span-full bg-white p-6 rounded-xl shadow-card3 border border-gray-200'>
                  <div className='mb-6'>
                    <h2 className='text-lg md:text-xl font-semibold text-gray-900'>
                      Top Drivers Performance
                    </h2>
                    <p className='text-gray-500 text-xs md:text-sm'>
                      Ranked by completed trips
                    </p>
                  </div>
                  <div className='h-96'>
                    <Bar
                      data={getAllDriversBarData()}
                      options={horizontalBarOptions}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Deployment Details Tab */}
        {((activeTab === 'deploymentDetails' && isAdmin) ||
          (activeTab === 'deploymentDetails' && isVisitor)) && (
          <div className='space-y-6'>
            {/* Territory, Hybrid, Flagging Metrics */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <MetricCard
                icon={HiOutlineLocationMarker}
                title='Territories'
                value={
                  analytics.performanceMetrics.territoryCount?.toLocaleString() ||
                  '0'
                }
                subtitle='Active territories'
                color='text-blue-600'
              />
              <MetricCard
                icon={HiOutlineBeaker}
                title='Hybrids'
                value={
                  analytics.performanceMetrics.hybridCount?.toLocaleString() ||
                  '0'
                }
                subtitle='Hybrid types'
                color='text-green-600'
              />
              <MetricCard
                icon={HiOutlineFlag}
                title='Flaggings'
                value={
                  analytics.performanceMetrics.flaggingCount?.toLocaleString() ||
                  '0'
                }
                subtitle='Flagging levels'
                color='text-purple-600'
              />
            </div>

            {/* Distribution Charts - DOUGHNUT CHARTS (WITH TEXT) */}
            <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
              {/* Territory Distribution */}
              <div className='bg-white p-6 rounded-xl shadow-card3 border border-gray-200'>
                <div className='mb-6'>
                  <h2 className='text-lg md:text-xl font-semibold text-gray-900'>
                    Territory Distribution
                  </h2>
                  <p className='text-gray-500 text-xs md:text-sm'>
                    Deployments by territory
                  </p>
                </div>
                <div className='h-64'>
                  <Doughnut
                    data={getTerritoryDistributionPieData()}
                    options={doughnutOptions}
                  />
                </div>
              </div>

              {/* Hybrid Distribution */}
              <div className='bg-white p-6 rounded-xl shadow-card3 border border-gray-200'>
                <div className='mb-6'>
                  <h2 className='text-lg md:text-xl font-semibold text-gray-900'>
                    Hybrid Distribution
                  </h2>
                  <p className='text-gray-500 text-xs md:text-sm'>
                    Deployments by hybrid type
                  </p>
                </div>
                <div className='h-64'>
                  <Doughnut
                    data={getHybridDistributionPieData()}
                    options={doughnutOptions}
                  />
                </div>
              </div>

              {/* Flagging Distribution */}
              <div className='bg-white p-6 rounded-xl shadow-card3 border border-gray-200'>
                <div className='mb-6'>
                  <h2 className='text-lg md:text-xl font-semibold text-gray-900'>
                    Flagging Distribution
                  </h2>
                  <p className='text-gray-500 text-xs md:text-sm'>
                    Deployments by flagging level
                  </p>
                </div>
                <div className='h-64'>
                  <Doughnut
                    data={getFlaggingDistributionPieData()}
                    options={doughnutOptions}
                  />
                </div>
              </div>
            </div>

            {/* Territory Performance Stacked Bar Chart - STACKED BAR (WITH TEXT CENTERED) */}
            <div className='bg-white p-6 rounded-xl shadow-card3 border border-gray-200'>
              <div>
                <h2 className='text-lg md:text-xl font-semibold text-gray-900'>
                  Territory Performance
                </h2>
                <p className='text-gray-500 text-xs md:text-sm'>
                  Deployment status breakdown by territory (stacked view)
                </p>
              </div>
              <div className='h-96 relative'>
                <Bar
                  data={getTerritoryPerformanceStackedData()}
                  options={stackedBarOptions}
                />
                {(!analytics?.charts?.territoryPerformance?.data ||
                  analytics.charts.territoryPerformance.data.length === 0) && (
                  <div className='absolute inset-0 flex items-center justify-center bg-white bg-opacity-90'>
                    <div className='text-center'>
                      <div className='text-gray-400 mb-2'>
                        <HiOutlineChartBar className='text-3xl md:text-4xl mx-auto' />
                      </div>
                      <p className='text-gray-500 font-medium'>
                        No territory data available
                      </p>
                      <p className='text-gray-400 text-xs md:text-sm mt-1'>
                        Deployments will appear here
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Territory Details Table */}
            <div className='bg-white rounded-xl shadow-card3 border border-gray-200 overflow-hidden'>
              <div className='p-6 border-b border-gray-200'>
                <h2 className='text-lg md:text-xl font-semibold text-gray-900'>
                  Territory Performance Details
                </h2>
                <p className='text-gray-500 text-xs md:text-sm'>
                  Performance metrics by territory
                </p>
              </div>
              <div className='overflow-x-auto'>
                <table className='min-w-full divide-y divide-gray-200'>
                  <thead className='bg-gray-50'>
                    <tr>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Territory
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Total Deployments
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Completed
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Completion Rate
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Total Sacks
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Total Weight (kg)
                      </th>
                    </tr>
                  </thead>
                  <tbody className='bg-white divide-y divide-gray-200'>
                    {analytics?.territoryMetrics
                      ?.slice(0, 10)
                      .map((territory, index) => (
                        <tr
                          key={index}
                          className={
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }
                        >
                          <td className='px-6 py-4 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900'>
                            {territory._id || 'Unknown'}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-500'>
                            {territory.count?.toLocaleString() || '0'}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-500'>
                            {territory.completed || '0'}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-xs md:text-sm'>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                territory.completionRate >= 80
                                  ? 'bg-green-100 text-green-800'
                                  : territory.completionRate >= 60
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {territory.completionRate || '0'}%
                            </span>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-500'>
                            {territory.totalSacks?.toLocaleString() || '0'}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-500'>
                            {territory.totalWeight?.toLocaleString() || '0'} kg
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && isAdmin && (
          <div className='space-y-6'>
            {/* User Metrics */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
              <MetricCard
                icon={HiOutlineUsers}
                title='Total Users'
                value={
                  analytics.performanceMetrics.totalUsers?.toLocaleString() ||
                  '0'
                }
                subtitle='All system users'
                color='text-blue-600'
              />
              <MetricCard
                icon={HiOutlineUserGroup}
                title='Active Users'
                value={
                  analytics.performanceMetrics.activeUsers?.toLocaleString() ||
                  '0'
                }
                subtitle='Currently active'
                color='text-green-600'
              />
              <MetricCard
                icon={TbUserPlus}
                title='Pending Users'
                value={
                  analytics.performanceMetrics.pendingUsers?.toLocaleString() ||
                  '0'
                }
                subtitle='Awaiting approval'
                color='text-amber-600'
              />
              <MetricCard
                icon={HiOutlineDocumentAdd}
                title='Recent Registrations'
                value={
                  analytics.performanceMetrics.recentRegistrations?.toLocaleString() ||
                  '0'
                }
                subtitle='Last 30 days'
                color='text-purple-600'
              />
            </div>

            {/* Login Analytics */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <MetricCard
                icon={HiOutlineKey}
                title='Total Logins'
                value={
                  analytics.performanceMetrics.totalLogins?.toLocaleString() ||
                  '0'
                }
                subtitle='All time'
                color='text-indigo-600'
              />
              <MetricCard
                icon={HiOutlineTrendingUp}
                title='Avg Logins Per User'
                value={
                  analytics.performanceMetrics.avgLoginCount?.toFixed(1) || '0'
                }
                subtitle='Average login count'
                color='text-cyan-600'
              />
              <MetricCard
                icon={HiOutlineChartBar}
                title='Max Logins'
                value={
                  analytics.performanceMetrics.maxLoginCount?.toLocaleString() ||
                  '0'
                }
                subtitle='Highest individual count'
                color='text-emerald-600'
              />
            </div>

            {/* User Charts */}
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
              {/* User Role Distribution - DOUGHNUT CHART (WITH TEXT) */}
              <div className='bg-white p-6 rounded-xl shadow-card3 border border-gray-200'>
                <div className='mb-6'>
                  <h2 className='text-lg md:text-xl font-semibold text-gray-900'>
                    User Role Distribution
                  </h2>
                  <p className='text-gray-500 text-sm'>
                    Breakdown by user roles
                  </p>
                </div>
                <div className='h-80'>
                  <Doughnut
                    data={getUserRoleData()}
                    options={doughnutOptions}
                  />
                </div>
              </div>

              {/* User Status Distribution - PIE CHART (WITH TEXT) */}
              <div className='bg-white p-6 rounded-xl shadow-card3 border border-gray-200'>
                <div className='mb-6'>
                  <h2 className='text-lg md:text-xl font-semibold text-gray-900'>
                    User Status Distribution
                  </h2>
                  <p className='text-gray-500 text-xs md:text-sm'>
                    Breakdown by account status
                  </p>
                </div>
                <div className='h-80'>
                  <Doughnut
                    data={getUserStatusData()}
                    options={pieDoughnutOptions}
                  />
                </div>
              </div>
            </div>

            {/* Subcon Distribution - BAR CHART (WITH TEXT CENTERED) */}
            <div className='bg-white p-6 rounded-xl shadow-card3 border border-gray-200'>
              <div className='mb-6'>
                <h2 className='text-lg md:text-xl font-semibold text-gray-900'>
                  Subcontractor Distribution
                </h2>
                <p className='text-gray-500 text-xs md:text-sm'>
                  Breakdown by subcontractor
                </p>
              </div>
              <div className='h-80'>
                <Bar
                  data={getBarChartData(
                    analytics.charts.subconDistribution,
                    'Users'
                  )}
                  options={verticalBarOptions}
                />
              </div>
            </div>
          </div>
        )}

        {/* Subcons Tab */}
        {activeTab === 'subcons' && isAdmin && (
          <div className='space-y-6'>
            {/* Subcon Deployment Status Stacked Bar Chart - STACKED BAR (WITH TEXT CENTERED) */}
            <div className='bg-white p-6 rounded-xl shadow-card3 border border-gray-200'>
              <div className='mb-6'>
                <h2 className='text-lg md:text-xl font-semibold text-gray-900'>
                  Subcontractor Deployment Status
                </h2>
                <p className='text-gray-500 text-xs md:text-sm'>
                  Deployment status breakdown by subcontractor (stacked view)
                </p>
              </div>
              <div className='h-96'>
                <Bar
                  data={getSubconDeploymentStatusData()}
                  options={stackedBarOptions}
                />
              </div>
            </div>

            {/* Subcon Details Table */}
            <div className='bg-white rounded-xl shadow-card3 border border-gray-200 overflow-hidden'>
              <div className='p-6 border-b border-gray-200'>
                <h2 className='text-lg md:text-xl font-semibold text-gray-900'>
                  Subcontractor Details
                </h2>
                <p className='text-gray-500 text-xs md:text-sm'>
                  Performance metrics by subcontractor
                </p>
              </div>
              <div className='overflow-x-auto'>
                <table className='min-w-full divide-y divide-gray-200'>
                  <thead className='bg-gray-50'>
                    <tr>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Subcontractor
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Total Deployments
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Completed
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Completion Rate
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Total Sacks
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Total Weight (kg)
                      </th>
                    </tr>
                  </thead>
                  <tbody className='bg-white divide-y divide-gray-200'>
                    {analytics?.charts?.subconPerformance?.data
                      ?.slice(0, 10)
                      .map((subcon, index) => (
                        <tr
                          key={index}
                          className={
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }
                        >
                          <td className='px-6 py-4 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900'>
                            {subcon.name || 'Unknown'}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-500'>
                            {subcon.totalDeployments.toLocaleString()}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-500'>
                            {subcon.completedDeployments.toLocaleString()}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-xs md:text-sm'>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                parseFloat(subcon.completionRate) >= 80
                                  ? 'bg-green-100 text-green-800'
                                  : parseFloat(subcon.completionRate) >= 60
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {subcon.completionRate}%
                            </span>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-500'>
                            {subcon.totalSacks.toLocaleString()}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-500'>
                            {subcon.totalWeight.toLocaleString()} kg
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* My Resources Tab - For Subcon users */}
        {activeTab === 'resources' && isSubcon && analytics?.subconAnalytics && (
          <div className='space-y-6'>
            {/* Resource Summary Metrics */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
              <MetricCard
                icon={HiOutlineTruck}
                title='Total Trucks'
                value={
                  analytics.subconAnalytics.trucks?.total?.toLocaleString() ||
                  '0'
                }
                subtitle={`${
                  analytics.subconAnalytics.trucks?.available || 0
                } available`}
                color='text-indigo-600'
              />
              <MetricCard
                icon={HiOutlineUser}
                title='Total Drivers'
                value={
                  analytics.subconAnalytics.drivers?.total?.toLocaleString() ||
                  '0'
                }
                subtitle={`${
                  analytics.subconAnalytics.drivers?.available || 0
                } available`}
                color='text-cyan-600'
              />
              <MetricCard
                icon={TbLicense}
                title='Deployed Trucks'
                value={
                  analytics.subconAnalytics.trucks?.deployed?.toLocaleString() ||
                  '0'
                }
                subtitle={`${
                  analytics.performanceMetrics.deployedTrucks || 0
                } currently deployed`}
                color='text-blue-600'
              />
              <MetricCard
                icon={TbUserPlus}
                title='Deployed Drivers'
                value={
                  analytics.subconAnalytics.drivers?.deployed?.toLocaleString() ||
                  '0'
                }
                subtitle={`${
                  analytics.performanceMetrics.deployedDrivers || 0
                } currently deployed`}
                color='text-green-600'
              />
            </div>

            {/* Driver Performance */}
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
              {/* Driver Performance Bar Chart - HORIZONTAL BAR (WITH TEXT CENTERED) */}
              <div className='bg-white p-6 rounded-xl shadow-card3 border border-gray-200'>
                <div className='mb-6'>
                  <h2 className='text-lg md:text-xl font-semibold text-gray-900'>
                    Driver Performance
                  </h2>
                  <p className='text-gray-500 text-xs md:text-sm'>
                    Top drivers by completed trips
                  </p>
                </div>
                <div className='h-96'>
                  <Bar
                    data={getSubconDriverPerformanceData()}
                    options={horizontalBarOptions}
                  />
                </div>
              </div>

              {/* Driver Status Distribution - DOUGHNUT CHART (WITH TEXT) */}
              <div className='bg-white p-6 rounded-xl shadow-card3 border border-gray-200'>
                <div className='mb-6'>
                  <h2 className='text-lg md:text-xl font-semibold text-gray-900'>
                    Driver Status
                  </h2>
                  <p className='text-gray-500 text-xs md:text-sm'>
                    Availability distribution
                  </p>
                </div>
                <div className='h-96'>
                  <Doughnut
                    data={getSubconDriverStatusData()}
                    options={doughnutOptions}
                  />
                </div>
              </div>
            </div>

            {/* Truck Performance */}
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
              {/* Truck Performance Bar Chart - HORIZONTAL BAR (WITH TEXT CENTERED) */}
              <div className='bg-white p-6 rounded-xl shadow-card3 border border-gray-200'>
                <div className='mb-6'>
                  <h2 className='text-lg md:text-xl font-semibold text-gray-900'>
                    Truck Performance
                  </h2>
                  <p className='text-gray-500 text-xs md:text-sm'>
                    Top trucks by completed trips
                  </p>
                </div>
                <div className='h-96'>
                  <Bar
                    data={getSubconTruckPerformanceData()}
                    options={horizontalBarOptions}
                  />
                </div>
              </div>

              {/* Truck Status Distribution - PIE CHART (WITH TEXT) */}
              <div className='bg-white p-6 rounded-xl shadow-card3 border border-gray-200'>
                <div className='mb-6'>
                  <h2 className='text-lg md:text-xl font-semibold text-gray-900'>
                    Truck Status
                  </h2>
                  <p className='text-gray-500 text-xs md:text-sm'>
                    Operational status distribution
                  </p>
                </div>
                <div className='h-96'>
                  <Pie
                    data={getSubconTruckStatusData()}
                    options={pieDoughnutOptions}
                  />
                </div>
              </div>
            </div>

            {/* Truck Types Distribution - BAR CHART (WITH TEXT CENTERED) */}
            <div className='bg-white p-6 rounded-xl shadow-card3 border border-gray-200'>
              <div className='mb-6'>
                <h2 className='text-lg md:text-xl font-semibold text-gray-900'>
                  Fleet Composition
                </h2>
                <p className='text-gray-500 text-xs md:text-sm'>
                  Truck types in your fleet
                </p>
              </div>
              <div className='h-80'>
                <Bar
                  data={getSubconTruckTypesData()}
                  options={verticalBarOptions}
                />
              </div>
            </div>

            {/* Drivers List */}
            <div className='bg-white rounded-xl shadow-card3 border border-gray-200 overflow-hidden'>
              <div className='p-6 border-b border-gray-200'>
                <h2 className='text-lg md:text-xl font-semibold text-gray-900'>
                  All Drivers
                </h2>
                <p className='text-gray-500 text-xs md:text-sm'>
                  Complete list of your drivers
                </p>
              </div>
              <div className='overflow-x-auto'>
                <table className='min-w-full divide-y divide-gray-200'>
                  <thead className='bg-gray-50'>
                    <tr>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Driver Name
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Phone Number
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        License No.
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Status
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Completed Trips
                      </th>
                    </tr>
                  </thead>
                  <tbody className='bg-white divide-y divide-gray-200'>
                    {analytics?.subconAnalytics?.drivers?.performance?.map(
                      (driver, index) => (
                        <tr
                          key={index}
                          className={
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }
                        >
                          <td className='px-6 py-4 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900'>
                            {driver.name || 'Unknown'}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-500'>
                            {driver.phoneNo || 'N/A'}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-500'>
                            {driver.licenseNo || 'N/A'}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-xs md:text-sm'>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                driver.status === 'available'
                                  ? 'bg-green-100 text-green-800'
                                  : driver.status === 'deployed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {driver.status
                                ? driver.status.charAt(0).toUpperCase() +
                                  driver.status.slice(1)
                                : 'Unknown'}
                            </span>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900'>
                            {driver.tripCount?.toLocaleString() || '0'}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Trucks List */}
            <div className='bg-white rounded-xl shadow-card3 border border-gray-200 overflow-hidden'>
              <div className='p-6 border-b border-gray-200'>
                <h2 className='text-xl font-semibold text-gray-900'>
                  All Trucks
                </h2>
                <p className='text-gray-500 text-xs md:text-sm'>
                  Complete list of your trucks
                </p>
              </div>
              <div className='overflow-x-auto'>
                <table className='min-w-full divide-y divide-gray-200'>
                  <thead className='bg-gray-50'>
                    <tr>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Plate No.
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Truck Type
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Max Load
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Status
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Completed Trips
                      </th>
                    </tr>
                  </thead>
                  <tbody className='bg-white divide-y divide-gray-200'>
                    {analytics?.subconAnalytics?.trucks?.performance?.map(
                      (truck, index) => (
                        <tr
                          key={index}
                          className={
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }
                        >
                          <td className='px-6 py-4 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900'>
                            {truck.plateNo || 'Unknown'}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-500'>
                            {truck.truckType
                              ? truck.truckType
                                  .replace('-', ' ')
                                  .replace(/\b\w/g, char => char.toUpperCase())
                              : 'N/A'}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-500'>
                            {truck.maxLoad
                              ? `${truck.maxLoad.toLocaleString()} kg`
                              : 'N/A'}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-xs md:text-sm'>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                truck.status === 'available'
                                  ? 'bg-green-100 text-green-800'
                                  : truck.status === 'deployed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {truck.status
                                ? truck.status.charAt(0).toUpperCase() +
                                  truck.status.slice(1)
                                : 'Unknown'}
                            </span>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900'>
                            {truck.tripCount?.toLocaleString() || '0'}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
