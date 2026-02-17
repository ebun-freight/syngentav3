import { FaHandshake, FaUsersCog } from 'react-icons/fa'
import { MdHandshake } from 'react-icons/md'
import {
  TbCalendarClock,
  TbChartPie,
  TbLicense,
  TbMapPin,
  TbTruck,
  TbUserCog,
  TbUsers,
  TbUserShield,
  TbTimelineEventText,
  TbHeartHandshake,
  TbSettings
} from 'react-icons/tb'

export const SIDEBAR_ITEMS = [
  {
    type: 'header',
    name: 'Operations',
    role: ['head_admin', 'admin', 'visitor', 'subcon']
  },
  {
    icon: <TbChartPie />,
    name: 'Dashboard',
    path: '/secure/dashboard',
    role: ['head_admin', 'admin', 'visitor']
  },
  {
    icon: <TbCalendarClock />,
    name: 'Calendar',
    path: '/secure/calendar',
    role: ['head_admin', 'admin', 'visitor', 'subcon']
  },
  {
    icon: <TbTimelineEventText />,
    name: 'Deployment Logs',
    path: '/secure/deployment-logs',
    role: ['head_admin', 'admin', 'visitor', 'subcon']
  },
  {
    icon: <TbMapPin />,
    name: 'Deployments',
    path: '/secure/deployments',
    role: ['head_admin', 'admin', 'visitor', 'subcon']
  },
  {
    type: 'header',
    name: 'Fleet Management',
    role: ['head_admin', 'admin']
  },
  {
    icon: <TbUserCog />,
    name: 'Driver Management',
    path: '/secure/driver-management',
    role: ['head_admin', 'admin']
  },
  {
    icon: <TbTruck />,
    name: 'Truck Management',
    path: '/secure/truck-management',
    role: ['head_admin', 'admin']
  },
  {
    type: 'header',
    name: 'Administration',
    role: ['head_admin', 'admin']
  },
  {
    icon: <TbUsers />,
    name: 'Visitor Management',
    path: '/secure/visitor-management',
    role: ['head_admin', 'admin']
  },
  {
    icon: <TbHeartHandshake />,
    name: 'Subcon Management',
    path: '/secure/subcon-management',
    role: ['head_admin']
  },
  {
    icon: <TbUserShield />,
    name: 'Admin Management',
    path: '/secure/admin-management',
    role: ['head_admin']
  },
  {
    icon: <TbLicense />,
    name: 'Activity Logs',
    path: '/secure/activity-logs',
    role: ['head_admin']
  },
  {
    icon: <TbSettings />,
    name: 'System Settings',
    path: '/secure/system-settings',
    role: ['head_admin']
  }
]

export const getNavItemsByRole = userRole => {
  return SIDEBAR_ITEMS.filter(item => {
    if (item.type === 'header') {
      return item.role.includes(userRole)
    }
    return item.role.includes(userRole)
  })
}
