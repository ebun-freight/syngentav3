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
  TbNumber,
  TbCalendar,
  TbCalendarWeek
} from 'react-icons/tb'
import { error_illustration } from '../../consts/images'
import { useUserContext } from '../../contexts/UserContext'
import clsx from 'clsx'

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
  ChartDataLabels
)

// ─── Shared class tokens ─────────────────────────────────────────────────────
const CLS = {
  card: 'bg-white p-4 sm:p-6 rounded-xl shadow-card3 sm:border sm:border-gray-100',
  cardOverflow:
    'bg-white rounded-xl shadow-card3 sm:border sm:border-gray-100 overflow-hidden',
  cardHeader: 'mb-4 sm:mb-6',
  cardTitle: 'text-xs sm:text-base md:text-lg font-semibold text-gray-900',
  cardSubtitle: 'text-xxs sm:text-sm text-gray-500 mt-0.5',
  thCell:
    'px-4 sm:px-6 py-1 sm:py-3 text-left text-xxs sm:text-sm  font-medium text-gray-500 uppercase tracking-wider',
  tdCell: 'px-4 sm:px-6 py-4 whitespace-nowrap text-xxs sm:text-sm',
  chartSm: 'h-56 sm:h-64',
  chartMd: 'h-64 sm:h-72',
  chartLine: 'h-60 sm:h-80',
  chartLg: 'h-80 sm:h-96',
  tabSection: 'space-y-2 sm:space-y-6'
}

const Dashboard = () => {
  const { userData } = useUserContext()
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [trendPeriod, setTrendPeriod] = useState('weekly')

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

  const truckStatusColors = {
    available: colors.green,
    deployed: colors.blue,
    unavailable: colors.red
  }

  const driverStatusColors = {
    available: colors.green,
    deployed: colors.blue,
    unavailable: colors.red
  }

  const deploymentStatusColors = {
    completed: colors.blue,
    ongoing: colors.green,
    preparing: colors.orange,
    canceled: colors.red
  }

  const userRoleColors = {
    head_admin: colors.red,
    admin: colors.blue,
    visitor: colors.purple,
    subcon: colors.orange
  }

  const hybridColors = {
    hybrid_a: '#3b82f6',
    hybrid_b: '#10b981',
    hybrid_c: '#f59e0b',
    hybrid_d: '#8b5cf6',
    hybrid_e: '#ef4444'
  }

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
      datalabels: {
        display: true,
        color: '#ffffff',
        font: { weight: 'bold', size: 11 },
        formatter: value => (value > 0 ? value.toLocaleString() : ''),
        anchor: 'center',
        align: 'center',
        clip: false
      }
    }
  })

  const verticalBarOptions = {
    ...createBaseOptions(),
    plugins: {
      ...createBaseOptions().plugins,
      legend: {
        ...createBaseOptions().plugins.legend,
        labels: {
          ...createBaseOptions().plugins.legend.labels,
          sort: (a, b) => a.text.localeCompare(b.text)
        }
      },
      datalabels: {
        ...createBaseOptions().plugins.datalabels,
        anchor: 'center',
        align: 'center',
        offset: 0
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: { color: '#6b7280', callback: value => value.toLocaleString() }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#6b7280' }
      }
    }
  }

  const horizontalBarOptions = {
    ...createBaseOptions(),
    indexAxis: 'y',
    plugins: {
      ...createBaseOptions().plugins,
      datalabels: {
        ...createBaseOptions().plugins.datalabels,
        anchor: 'center',
        align: 'center',
        offset: 0
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: { color: '#6b7280', callback: value => value.toLocaleString() }
      },
      y: {
        grid: { display: false },
        ticks: { color: '#6b7280', font: { size: 11 }, maxRotation: 0 }
      }
    }
  }

  const pieDoughnutOptions = {
    ...createBaseOptions(true),
    plugins: {
      ...createBaseOptions(true).plugins,
      legend: {
        ...createBaseOptions(true).plugins.legend,
        labels: {
          ...createBaseOptions(true).plugins.legend.labels,
          sort: (a, b) => a.text.localeCompare(b.text),
          generateLabels: function (chart) {
            const data = chart.data
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, i) => ({
                text: label,
                fillStyle: data.datasets[0].backgroundColor[i],
                strokeStyle: data.datasets[0].borderColor[i],
                lineWidth: 0,
                hidden: !chart.getDataVisibility(i),
                index: i
              }))
            }
            return []
          }
        }
      },
      tooltip: {
        ...createBaseOptions(true).plugins.tooltip,
        callbacks: {
          label: function (context) {
            const label = context.label || ''
            const value = context.raw || 0
            const total = context.dataset.data.reduce((a, b) => a + b, 0)
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0
            return `${label}: ${value.toLocaleString()} (${percentage}%)`
          }
        }
      },
      datalabels: {
        ...createBaseOptions(true).plugins.datalabels,
        display: true,
        color: '#ffffff',
        font: { weight: 'bold', size: 11 },
        formatter: value => (value > 0 ? value.toLocaleString() : ''),
        anchor: 'center',
        align: 'center'
      }
    }
  }

  const doughnutOptions = { ...pieDoughnutOptions, cutout: '50%' }

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
          font: { size: 12, family: "'Inter', sans-serif" },
          color: '#4b5563'
        }
      },
      datalabels: {
        ...createBaseOptions().plugins.datalabels,
        display: true,
        color: '#ffffff',
        font: { weight: 'bold', size: 11 },
        formatter: value => (value > 0 ? value.toLocaleString() : ''),
        anchor: 'center',
        align: 'center',
        offset: 0
      }
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false, drawBorder: false },
        ticks: {
          color: '#6b7280',
          font: { size: 11, family: "'Inter', sans-serif" },
          maxRotation: 45,
          padding: 8
        },
        border: { display: false }
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
          font: { size: 11, family: "'Inter', sans-serif" },
          padding: 8,
          callback: value => value.toLocaleString()
        },
        border: { display: false },
        title: {
          display: true,
          text: 'Number of Deployments',
          color: '#6b7280',
          font: { size: 12, weight: '600', family: "'Inter', sans-serif" },
          padding: { top: 0, bottom: 10 }
        }
      }
    },
    interaction: { intersect: false, mode: 'index' },
    elements: { bar: { borderRadius: 3 } }
  }

  const getLineChartData = () => {
    const chartKey =
      trendPeriod === 'daily' ? 'dailyDeployments' : 'weeklyDeployments'
    const chartData = analytics?.charts?.[chartKey]
    if (!chartData) return { labels: [], datasets: [] }

    return {
      labels: chartData.labels,
      datasets: [
        {
          label: 'Completed',
          data: chartData.completedData.map(val => Math.round(val)),
          borderColor: colors.green,
          backgroundColor: `${colors.green}20`,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: colors.green,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    }
  }

  const lineChartOptions = {
    ...createBaseOptions(true),
    plugins: {
      ...createBaseOptions(true).plugins,
      datalabels: { display: false },
      legend: { display: false },
      tooltip: {
        ...createBaseOptions(true).plugins.tooltip,
        callbacks: {
          label: function (context) {
            return `${context.dataset.label || ''}: ${Math.round(
              context.raw || 0
            ).toLocaleString()}`
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
          stepSize: 1
        }
      },
      x: {
        grid: { display: false },
        ticks: {
          color: '#6b7280',
          maxTicksLimit: trendPeriod === 'daily' ? 15 : 12
        }
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

    const isSubconDistribution =
      label === 'Users' &&
      chartData.labels.some(
        l =>
          l.toLowerCase().includes('subcontractor') ||
          l.toLowerCase().includes('subcon')
      )

    if (isSubconDistribution) {
      const items = chartData.labels
        .map((lbl, index) => ({
          label: lbl,
          data: chartData.data[index],
          color: backgroundColors[index]
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
      return {
        labels: items.map(item => item.label),
        datasets: [
          {
            label,
            data: items.map(item => item.data),
            backgroundColor: items.map(item => item.color),
            borderColor: items.map(item => item.color),
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
          label,
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
    if (!analytics?.topDrivers?.length) return { labels: [], datasets: [] }
    const sorted = [...analytics.topDrivers]
      .sort((a, b) => (b.tripCount || 0) - (a.tripCount || 0))
      .slice(0, 15)
    return {
      labels: sorted.map(
        d => d.name?.replace(/\b\w/g, c => c.toUpperCase()) || 'Unknown Driver'
      ),
      datasets: [
        {
          label: 'Completed Trips',
          data: sorted.map(d => d.tripCount || 0),
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
    const bgColors = analytics.charts.deploymentStatus.labels.map(label => {
      const l = label.toLowerCase()
      if (l.includes('complete')) return deploymentStatusColors.completed
      if (l.includes('ongoing')) return deploymentStatusColors.ongoing
      if (l.includes('preparing')) return deploymentStatusColors.preparing
      if (l.includes('cancel')) return deploymentStatusColors.canceled
      return colors.gray
    })
    return {
      labels: analytics.charts.deploymentStatus.labels,
      datasets: [
        {
          label: 'Deployments',
          data: analytics.charts.deploymentStatus.data,
          backgroundColor: bgColors,
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
    const bgColors = analytics.charts.truckStatus.labels.map(label => {
      const l = label.toLowerCase()
      // FIX: guard is already correct here — kept as-is
      if (l.includes('available') && !l.includes('unavailable'))
        return truckStatusColors.available
      if (l.includes('deployed')) return truckStatusColors.deployed
      if (l.includes('unavailable')) return truckStatusColors.unavailable
      return colors.gray
    })
    return {
      labels: analytics.charts.truckStatus.labels,
      datasets: [
        {
          data: analytics.charts.truckStatus.data,
          backgroundColor: bgColors,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 8
        }
      ]
    }
  }

  const getDriverStatusData = () => {
    if (!analytics?.charts?.driverStatus) return { labels: [], datasets: [] }
    const bgColors = analytics.charts.driverStatus.labels.map(label => {
      const l = label.toLowerCase()
      // FIX: added && !l.includes('unavailable') guard.
      // Without it 'Unavailable'.toLowerCase() = 'unavailable' which contains 'available',
      // so the first branch would incorrectly assign the green (available) color.
      if (l.includes('available') && !l.includes('unavailable'))
        return driverStatusColors.available
      if (l.includes('deployed')) return driverStatusColors.deployed
      if (l.includes('unavailable')) return driverStatusColors.unavailable
      return colors.gray
    })
    return {
      labels: analytics.charts.driverStatus.labels,
      datasets: [
        {
          data: analytics.charts.driverStatus.data,
          backgroundColor: bgColors,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 8
        }
      ]
    }
  }

  const getUserRoleData = () => {
    if (!analytics?.charts?.userRoles) return { labels: [], datasets: [] }
    const bgColors = analytics.charts.userRoles.labels.map(label => {
      const l = label.toLowerCase()
      if (l.includes('head admin')) return userRoleColors.head_admin
      if (l.includes('admin')) return userRoleColors.admin
      if (l.includes('visitor')) return userRoleColors.visitor
      if (l.includes('subcontractor')) return userRoleColors.subcon
      return colors.gray
    })
    return {
      labels: analytics.charts.userRoles.labels,
      datasets: [
        {
          data: analytics.charts.userRoles.data,
          backgroundColor: bgColors,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 8
        }
      ]
    }
  }

  const getUserStatusData = () => {
    if (!analytics?.charts?.userStatus) return { labels: [], datasets: [] }
    const bgColors = analytics.charts.userStatus.labels.map(label => {
      const l = label.toLowerCase()
      if (l.includes('active') && !l.includes('inactive')) return colors.green
      if (l.includes('inactive')) return colors.red
      if (l.includes('pending')) return colors.orange
      if (l.includes('revoked') || l.includes('rejected')) return colors.gray
      return colors.blue
    })
    return {
      labels: analytics.charts.userStatus.labels,
      datasets: [
        {
          data: analytics.charts.userStatus.data,
          backgroundColor: bgColors,
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
      data: subcons.map((_, index) => {
        const breakdown = analytics.charts.subconPerformance.statusBreakdown
        return breakdown?.[index]?.[status] || 0
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
    return { labels: subcons.map(s => s.name), datasets }
  }

  const getSubconDriverPerformanceData = () => {
    if (!analytics?.subconAnalytics?.drivers?.performance)
      return { labels: [], datasets: [] }
    const drivers = [...analytics.subconAnalytics.drivers.performance]
      .sort((a, b) => (b.tripCount || 0) - (a.tripCount || 0))
      .slice(0, 15)
    return {
      labels: drivers.map(
        d => d.name?.replace(/\b\w/g, c => c.toUpperCase()) || 'Unknown Driver'
      ),
      datasets: [
        {
          label: 'Completed Trips',
          data: drivers.map(d => d.tripCount || 0),
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
    const trucks = [...analytics.subconAnalytics.trucks.performance]
      .sort((a, b) => (b.tripCount || 0) - (a.tripCount || 0))
      .slice(0, 15)
    return {
      labels: trucks.map(t => t.plateNo || 'Unknown Truck'),
      datasets: [
        {
          label: 'Completed Trips',
          data: trucks.map(t => t.tripCount || 0),
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
    const bgColors = analytics.subconAnalytics.drivers.status.map(item => {
      const l = (item._id || '').toLowerCase()
      // FIX: consistent guard against 'unavailable' matching 'available'
      if (l === 'available') return driverStatusColors.available
      if (l === 'deployed') return driverStatusColors.deployed
      if (l === 'unavailable') return driverStatusColors.unavailable
      return colors.gray
    })
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
          backgroundColor: bgColors,
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
    const bgColors = analytics.subconAnalytics.trucks.status.map(item => {
      const l = (item._id || '').toLowerCase()
      // FIX: use strict equality to avoid 'unavailable' matching 'available'
      if (l === 'available') return truckStatusColors.available
      if (l === 'deployed') return truckStatusColors.deployed
      if (l === 'unavailable') return truckStatusColors.unavailable
      return colors.gray
    })
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
          backgroundColor: bgColors,
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
          ? item._id.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())
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
    const { labels, data } = analytics.charts.territoryDistribution
    const palette = [
      '#3b82f6',
      '#10b981',
      '#f59e0b',
      '#8b5cf6',
      '#ef4444',
      '#06b6d4',
      '#f43f5e'
    ]
    const items = labels
      .map((label, i) => ({
        label,
        data: data[i],
        color: palette[i % 7] || colors.gray
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
    return {
      labels: items.map(i => i.label),
      datasets: [
        {
          label: 'Deployments',
          data: items.map(i => i.data),
          backgroundColor: items.map(i => i.color),
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
    const hybridKeys = Object.keys(hybridColors)
    const bgColors = analytics.charts.hybridDistribution.labels.map(
      (_, i) => hybridColors[hybridKeys[i % hybridKeys.length]] || colors.gray
    )
    return {
      labels: analytics.charts.hybridDistribution.labels,
      datasets: [
        {
          label: 'Deployments',
          data: analytics.charts.hybridDistribution.data,
          backgroundColor: bgColors,
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
    const bgColors = analytics.charts.flaggingDistribution.labels.map(label => {
      const l = label.toLowerCase()
      if (l.includes('green')) return flaggingColors.green
      if (l.includes('red')) return flaggingColors.red
      if (l.includes('orange')) return flaggingColors.orange
      if (l.includes('yellow')) return flaggingColors.yellow
      return colors.gray
    })
    return {
      labels: analytics.charts.flaggingDistribution.labels,
      datasets: [
        {
          label: 'Deployments',
          data: analytics.charts.flaggingDistribution.data,
          backgroundColor: bgColors,
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
    const territoryData = territories
      .map((territory, index) => ({
        territory,
        breakdown: analytics.charts.territoryPerformance.statusBreakdown[index]
      }))
      .sort((a, b) => a.territory.name.localeCompare(b.territory.name))
    const sortedBreakdowns = territoryData.map(item => item.breakdown)

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
      data: sortedBreakdowns.map(b => b?.[status] || 0),
      backgroundColor: statusColors[status],
      borderColor: '#ffffff',
      borderWidth: 1,
      borderRadius: { topLeft: 3, topRight: 3, bottomLeft: 0, bottomRight: 0 },
      borderSkipped: false,
      hoverBackgroundColor: `${statusColors[status]}CC`,
      categoryPercentage: 0.8,
      barPercentage: 0.9
    }))
    return {
      labels: territoryData.map(item => item.territory.name),
      datasets
    }
  }

  // ─── Color map for MetricCard ─────────────────────────────────────────────
  const colorMap = {
    'blue-600': { text: 'text-blue-600', bg: 'bg-blue-100/50' },
    'green-600': { text: 'text-green-600', bg: 'bg-green-100/50' },
    'amber-600': { text: 'text-amber-600', bg: 'bg-amber-100/50' },
    'purple-600': { text: 'text-purple-600', bg: 'bg-purple-100/50' },
    'indigo-600': { text: 'text-indigo-600', bg: 'bg-indigo-100/50' },
    'cyan-600': { text: 'text-cyan-600', bg: 'bg-cyan-100/50' },
    'emerald-600': { text: 'text-emerald-600', bg: 'bg-emerald-100/50' },
    'violet-600': { text: 'text-violet-600', bg: 'bg-violet-100/50' },
    'red-600': { text: 'text-red-600', bg: 'bg-red-100/50' }
  }

  // ─── MetricCard (desktop) ─────────────────────────────────────────────────
  const MetricCard = ({
    icon: Icon,
    title,
    value,
    subtitle,
    color,
    trend = null
  }) => {
    const c = colorMap[color] || { text: 'text-gray-600', bg: 'bg-gray-100' }
    return (
      <div className='bg-white p-3 sm:p-4 rounded-xl shadow-card3 border border-gray-100 hover:shadow-md transition-all duration-200'>
        <div className='flex items-start justify-between gap-2'>
          <div className='space-y-1.5 min-w-0'>
            <div className='flex items-center gap-2'>
              <div className={`p-1.5 sm:p-2 rounded-lg ${c.bg} shrink-0`}>
                <Icon className={`text-base sm:text-lg ${c.text}`} />
              </div>
              <span className='text-xs sm:text-sm font-medium text-gray-600 leading-tight'>
                {title}
              </span>
            </div>
            <div className='text-xl sm:text-2xl font-bold text-gray-800 tabular-nums'>
              {value}
            </div>
            {subtitle && (
              <div className='text-xs text-gray-500'>{subtitle}</div>
            )}
          </div>
          {trend && (
            <div
              className={`flex items-center gap-1 shrink-0 ${
                trend > 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {trend > 0 ? <TbTrendingUp /> : <TbTrendingDown />}
              <span className='text-xs font-medium'>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── MetricCard (mobile) ──────────────────────────────────────────────────
  const MetricCardMobile = ({ icon: Icon, title, value, subtitle, color }) => {
    const c = colorMap[color] || { text: 'text-gray-600', bg: 'bg-gray-100' }
    return (
      <div className='bg-white p-2.5 rounded-sm shadow-card3 sm:border sm:border-gray-100'>
        <div className='flex items-start gap-2'>
          <div className={`p-1.5 rounded-lg ${c.bg} shrink-0`}>
            <Icon className={`text-sm ${c.text}`} />
          </div>
          <div className='min-w-0 flex-1'>
            <span className='block text-xs font-medium text-gray-600 truncate'>
              {title}
            </span>
            <span className='block text-sm font-bold text-gray-900 tabular-nums'>
              {value}
            </span>
            {subtitle && (
              <p className='text-xxs text-gray-500 truncate mt-0.5'>
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─── Reusable CardHeader ──────────────────────────────────────────────────
  const CardHeader = ({ title, subtitle }) => (
    <div className={CLS.cardHeader}>
      <h2 className={CLS.cardTitle}>{title}</h2>
      {subtitle && <p className={CLS.cardSubtitle}>{subtitle}</p>}
    </div>
  )

  // ─── ScrollableChart ──────────────────────────────────────────────────────
  const ScrollableChart = ({
    heightClass,
    minWidth = '500px',
    className = '',
    children
  }) => (
    <div className={`overflow-x-auto -mx-4 sm:mx-0 ${className}`}>
      <div style={{ minWidth }} className='px-4 sm:px-0'>
        <div className={heightClass}>{children}</div>
      </div>
    </div>
  )

  // ─── Shared Table Styles ──────────────────────────────────────────────────
  const statusBadge = status => {
    const map = {
      available: 'bg-green-100 text-green-800',
      deployed: 'bg-blue-100 text-blue-800'
    }
    return map[status] || 'bg-red-100 text-red-800'
  }

  const completionBadge = rate => {
    const n = parseFloat(rate)
    if (n >= 80) return 'bg-green-100 text-green-800'
    if (n >= 60) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  // ─── Loading / Error states ───────────────────────────────────────────────
  if (loading || userData.isLoading) {
    return (
      <div className='flex-1 flex items-center justify-center'>
        <div className='flex flex-col items-center gap-4 text-center'>
          <span className='loading loading-spinner loading-lg text-primaryColor'></span>
          <p className='text-gray-600 font-medium'>Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex-1 flex justify-center items-center'>
        <div className='flex flex-col justify-center items-center gap-4 px-4 text-center'>
          <img src={error_illustration} alt='error' className='w-56' />
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
      <div className='absolute inset-0 space-y-2 sm:space-y-6 px-0.5'>
        {/* ── Page Header ────────────────────────────────────────────────── */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-3'>
          <div>
            <h1 className='font-semibold text-lg sm:text-xl md:text-2xl text-gray-900'>
              Analytics Dashboard
            </h1>
            <p className='text-xs text-gray-400 mt-0.5'>
              Real-time operational insights and performance metrics
            </p>
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className='flex border-b border-gray-100 overflow-x-auto scrollbar-hide'>
          {[
            { key: 'overview', label: 'Overview', show: true },
            {
              key: 'deploymentDetails',
              label: 'Deployment Details',
              show: isAdmin || isVisitor
            },
            { key: 'users', label: 'Users', show: isAdmin },
            { key: 'subcons', label: 'Subcontractors', show: isAdmin },
            { key: 'resources', label: 'My Resources', show: isSubcon }
          ]
            .filter(t => t.show)
            .map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-3 sm:px-4 py-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                  activeTab === t.key
                    ? 'text-primaryColor border-b-2 border-primaryColor'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
        </div>

        {/* ════════════════════════════════════════════════════════════════
            OVERVIEW TAB
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <>
            {/* Core metrics — desktop */}
            <div
              className={clsx('grid grid-cols-2 gap-2 sm:gap-4 max-xs:hidden', {
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
                color='blue-600'
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
                color='green-600'
              />
              <MetricCard
                icon={TbRefresh}
                // FIX: renamed title to "Active Deployments" to accurately reflect that
                // the value includes preparing and ongoing states.
                title='Active Deployments'
                value={
                  analytics.performanceMetrics.ongoingDeployments?.toLocaleString() ||
                  '0'
                }
                // FIX: subtitle now shows ongoing count using activeOngoingDeployments.
                subtitle={`${
                  analytics.performanceMetrics.activeOngoingDeployments || 0
                } currently ongoing`}
                color='amber-600'
              />
              <MetricCard
                icon={TbActivity}
                title='Recent Activity'
                value={
                  analytics.performanceMetrics.recentActivity?.toLocaleString() ||
                  '0'
                }
                subtitle='Last 24 hours'
                color='purple-600'
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
                    color='indigo-600'
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
                    color='cyan-600'
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
                    color='emerald-600'
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
                    color='violet-600'
                  />
                </>
              )}
            </div>

            {/* Admin extra metrics — desktop */}
            {isAdmin && (
              <div className='grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-2 sm:gap-4 max-xs:hidden'>
                <MetricCard
                  icon={HiOutlineTruck}
                  title='Truck Utilization'
                  value={`${
                    analytics.performanceMetrics.utilizationRate || 0
                  }%`}
                  subtitle={`${
                    analytics.performanceMetrics.deployedTrucks || 0
                  }/${analytics.performanceMetrics.totalTrucks || 0} deployed`}
                  color='indigo-600'
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
                  color='cyan-600'
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
                  color='emerald-600'
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
                  color='violet-600'
                />
                <MetricCard
                  icon={HiOutlineTrendingUp}
                  title='Completion Rate'
                  value={`${analytics.performanceMetrics.completionRate || 0}%`}
                  subtitle='Of all deployments'
                  color='green-600'
                />
                <MetricCard
                  icon={HiOutlineChartBar}
                  title='Cancellation Rate'
                  value={`${
                    analytics.performanceMetrics.cancellationRate || 0
                  }%`}
                  subtitle='Of all deployments'
                  color='red-600'
                />
              </div>
            )}

            {/* Core metrics — mobile */}
            <div className='grid grid-cols-2 gap-2 xs:hidden'>
              <MetricCardMobile
                icon={TbRocket}
                title='Total'
                value={
                  analytics.performanceMetrics.totalDeployments?.toLocaleString() ||
                  '0'
                }
                subtitle={`${
                  analytics.performanceMetrics.monthlyDeployments || 0
                } this month`}
                color='blue-600'
              />
              <MetricCardMobile
                icon={TbChecklist}
                title='Completed'
                value={
                  analytics.performanceMetrics.completedDeployments?.toLocaleString() ||
                  '0'
                }
                subtitle={`${
                  analytics.performanceMetrics.successRate || 0
                }% rate`}
                color='green-600'
              />
              <MetricCardMobile
                icon={TbRefresh}
                title='Active'
                value={
                  analytics.performanceMetrics.ongoingDeployments?.toLocaleString() ||
                  '0'
                }
                subtitle={`${
                  analytics.performanceMetrics.activeOngoingDeployments || 0
                } ongoing`}
                color='amber-600'
              />
              <MetricCardMobile
                icon={TbActivity}
                title='Recent'
                value={
                  analytics.performanceMetrics.recentActivity?.toLocaleString() ||
                  '0'
                }
                subtitle='Last 24h'
                color='purple-600'
              />

              {isSubcon && analytics?.subconAnalytics && (
                <>
                  <MetricCardMobile
                    icon={HiOutlineTruck}
                    title='Trucks'
                    value={
                      analytics.subconAnalytics.trucks?.available?.toLocaleString() ||
                      '0'
                    }
                    subtitle={`${
                      analytics.subconAnalytics.trucks?.total || 0
                    } total`}
                    color='indigo-600'
                  />
                  <MetricCardMobile
                    icon={HiOutlineUser}
                    title='Drivers'
                    value={
                      analytics.subconAnalytics.drivers?.available?.toLocaleString() ||
                      '0'
                    }
                    subtitle={`${
                      analytics.subconAnalytics.drivers?.total || 0
                    } total`}
                    color='cyan-600'
                  />
                </>
              )}

              {isVisitor && (
                <>
                  <MetricCardMobile
                    icon={HiOutlineCube}
                    title='Sacks'
                    value={
                      analytics.performanceMetrics.totalCompletedSacks?.toLocaleString() ||
                      '0'
                    }
                    subtitle={`Avg ${
                      analytics.performanceMetrics.avgCompletedSacks?.toFixed(
                        1
                      ) || '0'
                    }`}
                    color='emerald-600'
                  />
                  <MetricCardMobile
                    icon={HiOutlineScale}
                    title='Weight'
                    value={`${
                      analytics.performanceMetrics.totalCompletedWeight?.toLocaleString() ||
                      '0'
                    }kg`}
                    subtitle={`Avg ${
                      analytics.performanceMetrics.avgCompletedWeight?.toLocaleString() ||
                      '0'
                    }kg`}
                    color='violet-600'
                  />
                </>
              )}
            </div>

            {/* Admin extra metrics — mobile */}
            {isAdmin && (
              <div className='grid grid-cols-2 gap-2 xs:hidden'>
                <MetricCardMobile
                  icon={HiOutlineTruck}
                  title='Truck Util.'
                  value={`${
                    analytics.performanceMetrics.utilizationRate || 0
                  }%`}
                  subtitle={`${
                    analytics.performanceMetrics.deployedTrucks || 0
                  }/${analytics.performanceMetrics.totalTrucks || 0}`}
                  color='indigo-600'
                />
                <MetricCardMobile
                  icon={HiOutlineUser}
                  title='Driver Util.'
                  value={`${
                    analytics.performanceMetrics.driverUtilizationRate || 0
                  }%`}
                  subtitle={`${
                    analytics.performanceMetrics.deployedDrivers || 0
                  }/${analytics.performanceMetrics.totalDrivers || 0}`}
                  color='cyan-600'
                />
                <MetricCardMobile
                  icon={HiOutlineCube}
                  title='Sacks'
                  value={
                    analytics.performanceMetrics.totalCompletedSacks?.toLocaleString() ||
                    '0'
                  }
                  subtitle={`Avg ${
                    analytics.performanceMetrics.avgCompletedSacks?.toFixed(
                      1
                    ) || '0'
                  }`}
                  color='emerald-600'
                />
                <MetricCardMobile
                  icon={HiOutlineScale}
                  title='Weight'
                  value={`${
                    analytics.performanceMetrics.totalCompletedWeight?.toLocaleString() ||
                    '0'
                  }kg`}
                  subtitle={`Avg ${
                    analytics.performanceMetrics.avgCompletedWeight?.toLocaleString() ||
                    '0'
                  }kg`}
                  color='violet-600'
                />
                <MetricCardMobile
                  icon={HiOutlineTrendingUp}
                  title='Completion'
                  value={`${analytics.performanceMetrics.completionRate || 0}%`}
                  subtitle='of all'
                  color='green-600'
                />
                <MetricCardMobile
                  icon={HiOutlineChartBar}
                  title='Cancellation'
                  value={`${
                    analytics.performanceMetrics.cancellationRate || 0
                  }%`}
                  subtitle='of all'
                  color='red-600'
                />
              </div>
            )}

            {/* Trend + Status */}
            <div className='grid grid-cols-1 xl:grid-cols-3 gap-2 sm:gap-6'>
              {/* Deployment Trends */}
              <div className={`xl:col-span-2 ${CLS.card}`}>
                <div
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${CLS.cardHeader}`}
                >
                  <div>
                    <h2 className={CLS.cardTitle}>
                      Completed Deployment Trends
                    </h2>
                    <p className={CLS.cardSubtitle}>
                      {trendPeriod === 'daily'
                        ? 'Last 30 days'
                        : 'Last 12 weeks'}
                    </p>
                  </div>
                  <div className='flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5 self-start sm:self-auto'>
                    <button
                      onClick={() => setTrendPeriod('daily')}
                      className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        trendPeriod === 'daily'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <TbCalendar className='text-sm' />
                      Daily
                    </button>
                    <button
                      onClick={() => setTrendPeriod('weekly')}
                      className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        trendPeriod === 'weekly'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <TbCalendarWeek className='text-sm' />
                      Weekly
                    </button>
                  </div>
                </div>
                <ScrollableChart heightClass={CLS.chartLine} minWidth='500px'>
                  <Line data={getLineChartData()} options={lineChartOptions} />
                </ScrollableChart>
              </div>

              {/* Deployment Status */}
              <div className={CLS.card}>
                <CardHeader
                  title='Deployment Status'
                  subtitle='Current status distribution'
                />
                <div className={CLS.chartLine}>
                  <Bar
                    data={getDeploymentStatusData()}
                    options={verticalBarOptions}
                  />
                </div>
              </div>
            </div>

            {/* Admin fleet charts */}
            {isAdmin && (
              <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-6'>
                <div className={CLS.card}>
                  <CardHeader
                    title='Fleet Composition'
                    subtitle='Truck types distribution'
                  />
                  <div className={CLS.chartSm}>
                    <Bar
                      data={getBarChartData(
                        analytics.charts.truckTypes,
                        'Trucks'
                      )}
                      options={verticalBarOptions}
                    />
                  </div>
                </div>

                <div className={CLS.card}>
                  <CardHeader
                    title='Truck Status'
                    subtitle='Operational status'
                  />
                  <div className={CLS.chartSm}>
                    <Doughnut
                      data={getTruckStatusData()}
                      options={pieDoughnutOptions}
                    />
                  </div>
                </div>

                <div className={CLS.card}>
                  <CardHeader
                    title='Driver Status'
                    subtitle='Availability distribution'
                  />
                  <div className={CLS.chartSm}>
                    <Doughnut
                      data={getDriverStatusData()}
                      options={doughnutOptions}
                    />
                  </div>
                </div>

                {/* Top Drivers */}
                <div className={`col-span-full ${CLS.card}`}>
                  <CardHeader
                    title='Top Drivers Performance'
                    subtitle='Ranked by completed trips'
                  />
                  <div className={CLS.chartLg}>
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

        {/* ════════════════════════════════════════════════════════════════
            DEPLOYMENT DETAILS TAB
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'deploymentDetails' && (isAdmin || isVisitor) && (
          <div className={CLS.tabSection}>
            {/* Metrics — desktop */}
            <div className='grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 max-xs:hidden'>
              <MetricCard
                icon={HiOutlineLocationMarker}
                title='Territories'
                value={
                  analytics.performanceMetrics.territoryCount?.toLocaleString() ||
                  '0'
                }
                subtitle='Active territories'
                color='blue-600'
              />
              <MetricCard
                icon={HiOutlineBeaker}
                title='Hybrids'
                value={
                  analytics.performanceMetrics.hybridCount?.toLocaleString() ||
                  '0'
                }
                subtitle='Hybrid types'
                color='green-600'
              />
              <MetricCard
                icon={HiOutlineFlag}
                title='Flaggings'
                value={
                  analytics.performanceMetrics.flaggingCount?.toLocaleString() ||
                  '0'
                }
                subtitle='Flagging levels'
                color='purple-600'
              />
            </div>

            {/* Metrics — mobile */}
            <div className='grid grid-cols-2 gap-2 xs:hidden'>
              <MetricCardMobile
                icon={HiOutlineLocationMarker}
                title='Territories'
                value={
                  analytics.performanceMetrics.territoryCount?.toLocaleString() ||
                  '0'
                }
                subtitle='Active'
                color='blue-600'
              />
              <MetricCardMobile
                icon={HiOutlineBeaker}
                title='Hybrids'
                value={
                  analytics.performanceMetrics.hybridCount?.toLocaleString() ||
                  '0'
                }
                subtitle='Hybrid types'
                color='green-600'
              />
              <MetricCardMobile
                icon={HiOutlineFlag}
                title='Flaggings'
                value={
                  analytics.performanceMetrics.flaggingCount?.toLocaleString() ||
                  '0'
                }
                subtitle='Flagging levels'
                color='purple-600'
              />
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-6'>
              <div className={CLS.card}>
                <CardHeader
                  title='Territory Distribution'
                  subtitle='Deployments by territory'
                />
                <div className={CLS.chartSm}>
                  <Doughnut
                    data={getTerritoryDistributionPieData()}
                    options={doughnutOptions}
                  />
                </div>
              </div>
              <div className={CLS.card}>
                <CardHeader
                  title='Hybrid Distribution'
                  subtitle='Deployments by hybrid type'
                />
                <div className={CLS.chartSm}>
                  <Doughnut
                    data={getHybridDistributionPieData()}
                    options={doughnutOptions}
                  />
                </div>
              </div>
              <div className={CLS.card}>
                <CardHeader
                  title='Flagging Distribution'
                  subtitle='Deployments by flagging level'
                />
                <div className={CLS.chartSm}>
                  <Doughnut
                    data={getFlaggingDistributionPieData()}
                    options={doughnutOptions}
                  />
                </div>
              </div>
            </div>

            {/* Territory Performance stacked bar */}
            <div className={CLS.card}>
              <CardHeader
                title='Territory Performance'
                subtitle='Deployment status breakdown by territory (stacked view)'
              />
              <div className={`relative ${CLS.chartLg}`}>
                <Bar
                  data={getTerritoryPerformanceStackedData()}
                  options={stackedBarOptions}
                />
                {!analytics?.charts?.territoryPerformance?.data?.length && (
                  <div className='absolute inset-0 flex items-center justify-center bg-white/90'>
                    <div className='text-center'>
                      <HiOutlineChartBar className='text-3xl text-gray-400 mx-auto mb-2' />
                      <p className='text-sm font-medium text-gray-500'>
                        No territory data available
                      </p>
                      <p className='text-xs text-gray-400 mt-1'>
                        Deployments will appear here
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={CLS.cardOverflow}>
              <div className='p-4 sm:p-6 border-b border-gray-100'>
                <h2 className={CLS.cardTitle}>Territory Performance Details</h2>
                <p className={CLS.cardSubtitle}>
                  Performance metrics by territory
                </p>
              </div>
              <div className='overflow-x-auto'>
                <table className='min-w-full divide-y divide-gray-200'>
                  <thead className='bg-gray-50'>
                    <tr>
                      {[
                        'Territory',
                        'Total Deployments',
                        'Completed',
                        'Completion Rate',
                        'Total Sacks',
                        'Total Weight (kg)'
                      ].map(h => (
                        <th key={h} className={CLS.thCell}>
                          {h}
                        </th>
                      ))}
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
                          <td
                            className={`${CLS.tdCell} font-medium text-gray-900`}
                          >
                            {territory._id || 'Unknown'}
                          </td>
                          <td className={`${CLS.tdCell} text-gray-500`}>
                            {territory.count?.toLocaleString() || '0'}
                          </td>
                          <td className={`${CLS.tdCell} text-gray-500`}>
                            {territory.completed || '0'}
                          </td>
                          <td className={CLS.tdCell}>
                            <span
                              className={`px-2 py-1 rounded-full text-xxs sm:text-xs font-medium ${completionBadge(
                                territory.completionRate
                              )}`}
                            >
                              {territory.completionRate || '0'}%
                            </span>
                          </td>
                          <td className={`${CLS.tdCell} text-gray-500`}>
                            {territory.totalSacks?.toLocaleString() || '0'}
                          </td>
                          <td className={`${CLS.tdCell} text-gray-500`}>
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

        {/* ════════════════════════════════════════════════════════════════
            USERS TAB
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'users' && isAdmin && (
          <div className={CLS.tabSection}>
            {/* Top row metrics — desktop */}
            <div className='grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 max-xs:hidden'>
              <MetricCard
                icon={HiOutlineUsers}
                title='Total Users'
                value={
                  analytics.performanceMetrics.totalUsers?.toLocaleString() ||
                  '0'
                }
                subtitle='All system users'
                color='blue-600'
              />
              <MetricCard
                icon={HiOutlineUserGroup}
                title='Active Users'
                value={
                  analytics.performanceMetrics.activeUsers?.toLocaleString() ||
                  '0'
                }
                subtitle='Currently active'
                color='green-600'
              />
              <MetricCard
                icon={TbUserPlus}
                title='Pending Users'
                value={
                  analytics.performanceMetrics.pendingUsers?.toLocaleString() ||
                  '0'
                }
                subtitle='Awaiting approval'
                color='amber-600'
              />
              <MetricCard
                icon={HiOutlineDocumentAdd}
                title='Recent Registrations'
                value={
                  analytics.performanceMetrics.recentRegistrations?.toLocaleString() ||
                  '0'
                }
                subtitle='Last 30 days'
                color='purple-600'
              />
            </div>

            {/* Bottom row metrics — desktop */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4 max-xs:hidden'>
              <MetricCard
                icon={HiOutlineKey}
                title='Total Logins'
                value={
                  analytics.performanceMetrics.totalLogins?.toLocaleString() ||
                  '0'
                }
                subtitle='All time'
                color='indigo-600'
              />
              <MetricCard
                icon={HiOutlineTrendingUp}
                title='Avg Logins Per User'
                value={
                  analytics.performanceMetrics.avgLoginCount?.toFixed(1) || '0'
                }
                subtitle='Average login count'
                color='cyan-600'
              />
              <MetricCard
                icon={HiOutlineChartBar}
                title='Max Logins'
                value={
                  analytics.performanceMetrics.maxLoginCount?.toLocaleString() ||
                  '0'
                }
                subtitle='Highest individual count'
                color='emerald-600'
              />
            </div>

            {/* All metrics — mobile */}
            <div className='grid grid-cols-2 gap-2 xs:hidden'>
              <MetricCardMobile
                icon={HiOutlineUsers}
                title='Total Users'
                value={
                  analytics.performanceMetrics.totalUsers?.toLocaleString() ||
                  '0'
                }
                subtitle='All system users'
                color='blue-600'
              />
              <MetricCardMobile
                icon={HiOutlineUserGroup}
                title='Active Users'
                value={
                  analytics.performanceMetrics.activeUsers?.toLocaleString() ||
                  '0'
                }
                subtitle='Currently active'
                color='green-600'
              />
              <MetricCardMobile
                icon={TbUserPlus}
                title='Pending'
                value={
                  analytics.performanceMetrics.pendingUsers?.toLocaleString() ||
                  '0'
                }
                subtitle='Awaiting approval'
                color='amber-600'
              />
              <MetricCardMobile
                icon={HiOutlineDocumentAdd}
                title='Registrations'
                value={
                  analytics.performanceMetrics.recentRegistrations?.toLocaleString() ||
                  '0'
                }
                subtitle='Last 30 days'
                color='purple-600'
              />
              <MetricCardMobile
                icon={HiOutlineKey}
                title='Total Logins'
                value={
                  analytics.performanceMetrics.totalLogins?.toLocaleString() ||
                  '0'
                }
                subtitle='All time'
                color='indigo-600'
              />
              <MetricCardMobile
                icon={HiOutlineTrendingUp}
                title='Avg Logins'
                value={
                  analytics.performanceMetrics.avgLoginCount?.toFixed(1) || '0'
                }
                subtitle='Per user'
                color='cyan-600'
              />
              <MetricCardMobile
                icon={HiOutlineChartBar}
                title='Max Logins'
                value={
                  analytics.performanceMetrics.maxLoginCount?.toLocaleString() ||
                  '0'
                }
                subtitle='Highest count'
                color='emerald-600'
              />
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-6'>
              <div className={CLS.card}>
                <CardHeader
                  title='User Role Distribution'
                  subtitle='Breakdown by user roles'
                />
                <div className={CLS.chartMd}>
                  <Doughnut
                    data={getUserRoleData()}
                    options={doughnutOptions}
                  />
                </div>
              </div>
              <div className={CLS.card}>
                <CardHeader
                  title='User Status Distribution'
                  subtitle='Breakdown by account status'
                />
                <div className={CLS.chartMd}>
                  <Doughnut
                    data={getUserStatusData()}
                    options={pieDoughnutOptions}
                  />
                </div>
              </div>
            </div>

            {/* Subcontractor Distribution bar */}
            <div className={CLS.card}>
              <CardHeader
                title='Subcontractor Distribution'
                subtitle='Breakdown by subcontractor'
              />
              <div className={CLS.chartMd}>
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

        {/* ════════════════════════════════════════════════════════════════
            SUBCONTRACTORS TAB
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'subcons' && isAdmin && (
          <div className={CLS.tabSection}>
            {/* Subcon stacked bar */}
            <div className={CLS.card}>
              <CardHeader
                title='Subcontractor Deployment Status'
                subtitle='Deployment status breakdown by subcontractor (stacked view)'
              />
              <div className={CLS.chartLg}>
                <Bar
                  data={getSubconDeploymentStatusData()}
                  options={stackedBarOptions}
                />
              </div>
            </div>

            <div className={CLS.cardOverflow}>
              <div className='p-4 sm:p-6 border-b border-gray-100'>
                <h2 className={CLS.cardTitle}>Subcontractor Details</h2>
                <p className={CLS.cardSubtitle}>
                  Performance metrics by subcontractor
                </p>
              </div>
              <div className='overflow-x-auto'>
                <table className='min-w-full divide-y divide-gray-200'>
                  <thead className='bg-gray-50'>
                    <tr>
                      {[
                        'Subcontractor',
                        'Total Deployments',
                        'Completed',
                        'Completion Rate',
                        'Total Sacks',
                        'Total Weight (kg)'
                      ].map(h => (
                        <th key={h} className={CLS.thCell}>
                          {h}
                        </th>
                      ))}
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
                          <td
                            className={`${CLS.tdCell} font-medium text-gray-900`}
                          >
                            {subcon.name || 'Unknown'}
                          </td>
                          <td className={`${CLS.tdCell} text-gray-500`}>
                            {subcon.totalDeployments.toLocaleString()}
                          </td>
                          <td className={`${CLS.tdCell} text-gray-500`}>
                            {subcon.completedDeployments.toLocaleString()}
                          </td>
                          <td className={CLS.tdCell}>
                            <span
                              className={`px-2 py-1 rounded-full text-xxs sm:text-xs font-medium ${completionBadge(
                                subcon.completionRate
                              )}`}
                            >
                              {subcon.completionRate}%
                            </span>
                          </td>
                          <td className={`${CLS.tdCell} text-gray-500`}>
                            {subcon.totalSacks.toLocaleString()}
                          </td>
                          <td className={`${CLS.tdCell} text-gray-500`}>
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

        {/* ════════════════════════════════════════════════════════════════
            MY RESOURCES TAB (subcon)
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'resources' && isSubcon && analytics?.subconAnalytics && (
          <div className={CLS.tabSection}>
            {/* Metrics — desktop */}
            <div className='grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 max-xs:hidden'>
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
                color='indigo-600'
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
                color='cyan-600'
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
                color='blue-600'
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
                color='green-600'
              />
            </div>

            {/* Metrics — mobile */}
            <div className='grid grid-cols-2 gap-2 xs:hidden'>
              <MetricCardMobile
                icon={HiOutlineTruck}
                title='Total Trucks'
                value={
                  analytics.subconAnalytics.trucks?.total?.toLocaleString() ||
                  '0'
                }
                subtitle={`${
                  analytics.subconAnalytics.trucks?.available || 0
                } available`}
                color='indigo-600'
              />
              <MetricCardMobile
                icon={HiOutlineUser}
                title='Total Drivers'
                value={
                  analytics.subconAnalytics.drivers?.total?.toLocaleString() ||
                  '0'
                }
                subtitle={`${
                  analytics.subconAnalytics.drivers?.available || 0
                } available`}
                color='cyan-600'
              />
              <MetricCardMobile
                icon={TbLicense}
                title='Deployed Trucks'
                value={
                  analytics.subconAnalytics.trucks?.deployed?.toLocaleString() ||
                  '0'
                }
                subtitle={`${
                  analytics.performanceMetrics.deployedTrucks || 0
                } deployed`}
                color='blue-600'
              />
              <MetricCardMobile
                icon={TbUserPlus}
                title='Deployed Drivers'
                value={
                  analytics.subconAnalytics.drivers?.deployed?.toLocaleString() ||
                  '0'
                }
                subtitle={`${
                  analytics.performanceMetrics.deployedDrivers || 0
                } deployed`}
                color='green-600'
              />
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-6'>
              <div className={CLS.card}>
                <CardHeader
                  title='Driver Performance'
                  subtitle='Top drivers by completed trips'
                />
                <div className={CLS.chartLg}>
                  <Bar
                    data={getSubconDriverPerformanceData()}
                    options={horizontalBarOptions}
                  />
                </div>
              </div>
              <div className={CLS.card}>
                <CardHeader
                  title='Driver Status'
                  subtitle='Availability distribution'
                />
                <div className={CLS.chartLg}>
                  <Doughnut
                    data={getSubconDriverStatusData()}
                    options={doughnutOptions}
                  />
                </div>
              </div>
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-6'>
              <div className={CLS.card}>
                <CardHeader
                  title='Truck Performance'
                  subtitle='Top trucks by completed trips'
                />
                <div className={CLS.chartLg}>
                  <Bar
                    data={getSubconTruckPerformanceData()}
                    options={horizontalBarOptions}
                  />
                </div>
              </div>
              <div className={CLS.card}>
                <CardHeader
                  title='Truck Status'
                  subtitle='Operational status distribution'
                />
                <div className={CLS.chartLg}>
                  <Pie
                    data={getSubconTruckStatusData()}
                    options={pieDoughnutOptions}
                  />
                </div>
              </div>
            </div>

            <div className={CLS.card}>
              <CardHeader
                title='Fleet Composition'
                subtitle='Truck types in your fleet'
              />
              <div className={CLS.chartMd}>
                <Bar
                  data={getSubconTruckTypesData()}
                  options={verticalBarOptions}
                />
              </div>
            </div>

            {/* Drivers list */}
            <div className={CLS.cardOverflow}>
              <div className='p-4 sm:p-6 border-b border-gray-100'>
                <h2 className={CLS.cardTitle}>All Drivers</h2>
                <p className={CLS.cardSubtitle}>
                  Complete list of your drivers
                </p>
              </div>
              <div className='overflow-x-auto'>
                <table className='min-w-full divide-y divide-gray-200'>
                  <thead className='bg-gray-50'>
                    <tr>
                      {[
                        'Driver Name',
                        'Phone Number',
                        'License No.',
                        'Status',
                        'Completed Trips'
                      ].map(h => (
                        <th key={h} className={CLS.thCell}>
                          {h}
                        </th>
                      ))}
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
                          <td
                            className={`${CLS.tdCell} font-medium text-gray-900`}
                          >
                            {driver.name || 'Unknown'}
                          </td>
                          <td className={`${CLS.tdCell} text-gray-500`}>
                            {driver.phoneNo || 'N/A'}
                          </td>
                          <td className={`${CLS.tdCell} text-gray-500`}>
                            {driver.licenseNo || 'N/A'}
                          </td>
                          <td className={CLS.tdCell}>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge(
                                driver.status
                              )}`}
                            >
                              {driver.status
                                ? driver.status.charAt(0).toUpperCase() +
                                  driver.status.slice(1)
                                : 'Unknown'}
                            </span>
                          </td>
                          <td
                            className={`${CLS.tdCell} font-medium text-gray-900`}
                          >
                            {driver.tripCount?.toLocaleString() || '0'}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Trucks list */}
            <div className={CLS.cardOverflow}>
              <div className='p-4 sm:p-6 border-b border-gray-100'>
                <h2 className={CLS.cardTitle}>All Trucks</h2>
                <p className={CLS.cardSubtitle}>Complete list of your trucks</p>
              </div>
              <div className='overflow-x-auto'>
                <table className='min-w-full divide-y divide-gray-200'>
                  <thead className='bg-gray-50'>
                    <tr>
                      {[
                        'Plate No.',
                        'Truck Type',
                        'Max Load',
                        'Status',
                        'Completed Trips'
                      ].map(h => (
                        <th key={h} className={CLS.thCell}>
                          {h}
                        </th>
                      ))}
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
                          <td
                            className={`${CLS.tdCell} font-medium text-gray-900`}
                          >
                            {truck.plateNo || 'Unknown'}
                          </td>
                          <td className={`${CLS.tdCell} text-gray-500`}>
                            {truck.truckType
                              ? truck.truckType
                                  .replace('-', ' ')
                                  .replace(/\b\w/g, c => c.toUpperCase())
                              : 'N/A'}
                          </td>
                          <td className={`${CLS.tdCell} text-gray-500`}>
                            {truck.maxLoad
                              ? `${truck.maxLoad.toLocaleString()} kg`
                              : 'N/A'}
                          </td>
                          <td className={CLS.tdCell}>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge(
                                truck.status
                              )}`}
                            >
                              {truck.status
                                ? truck.status.charAt(0).toUpperCase() +
                                  truck.status.slice(1)
                                : 'Unknown'}
                            </span>
                          </td>
                          <td
                            className={`${CLS.tdCell} font-medium text-gray-900`}
                          >
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
