import { Routes, Route } from 'react-router'
import ActivityLogsPage from './pages/admin/ActivityLogsPage'
import CalendarPage from './pages/admin/CalendarPage'
import DriverListPage from './pages/admin/DriverManagement'
import TruckListPage from './pages/admin/TruckManagement'
import { ToastContainer, Slide } from 'react-toastify'
import { UserProvider } from './contexts/UserContext'
import Deployments from './pages/admin/Deployments'
import Dashboard from './pages/admin/Dashboard'
import UserLayout from './layout/UserLayout'
import ViewerListPage from './pages/admin/VisitorManagement'
import AdminManagement from './pages/admin/AdminManagement'
import LoginPage from './pages/public/LoginPage'
import SignupPage from './pages/public/SignupPage'
import TimelineLogs from './pages/admin/TimelineLogs'
import MyProfile from './pages/admin/MyProfile'
import SubconManagement from './pages/admin/SubconManagement'
import { UIProvider } from './contexts/UIContext'
import NotFoundPage from './pages/public/NotFoundPage'
import SystemSettingsPage from './pages/admin/SystemSettingsPage'
import { SettingsProvider } from './contexts/SettingsContext'
import { useState, useEffect } from 'react'
import AIChatWidget from './components/AIChatWidget'

function App () {
  console.log(import.meta.env.MODE)

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return (
    <>
      <ToastContainer
        position='bottom-right'
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        transition={Slide}
        toastStyle={{
          background:
            'linear-gradient(135deg, #020617 0%, #001e36 60%, #0f172a 100%)',
          backgroundImage: `
            radial-gradient(circle, rgba(255,255,255,0.15) 1.5px, transparent 1.5px),
            linear-gradient(135deg, #020617 0%, #001e36 60%, #0f172a 100%)
          `,
          backgroundSize: '24px 24px, cover',
          color: '#f1f5f9',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: isMobile ? '0px' : '12px',
          fontSize: isMobile ? '11px' : '13px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          padding: isMobile ? '4px 12px' : '12px 16px'
        }}
        progressStyle={{
          background: 'rgba(255,255,255,0.25)'
        }}
        iconTheme={{
          primary: '#f1f5f9',
          secondary: '#001e36'
        }}
        style={{
          '--toastify-icon-size': isMobile ? '6px' : '20px'
        }}
      />

      <Routes>
        <Route path='/' element={<LoginPage />} />
        <Route path='/signup' element={<SignupPage />} />

        {/* admin page */}
        <Route
          element={
            <UIProvider>
              <SettingsProvider>
                <UserProvider>
                  <UserLayout />
                </UserProvider>
              </SettingsProvider>
            </UIProvider>
          }
        >
          <Route path='/secure/my-profile' element={<MyProfile />} />

          <Route path='/secure/dashboard' element={<Dashboard />} />
          <Route path='/secure/calendar' element={<CalendarPage />} />
          <Route path='/secure/deployment-logs' element={<TimelineLogs />} />
          <Route path='/secure/deployments' element={<Deployments />} />

          <Route
            path='/secure/driver-management'
            element={<DriverListPage />}
          />
          <Route path='/secure/truck-management' element={<TruckListPage />} />
          <Route
            path='/secure/visitor-management'
            element={<ViewerListPage />}
          />
          <Route
            path='/secure/admin-management'
            element={<AdminManagement />}
          />

          <Route
            path='/secure/subcon-management'
            element={<SubconManagement />}
          />
          <Route path='/secure/activity-logs' element={<ActivityLogsPage />} />

          <Route
            path='/secure/system-settings'
            element={<SystemSettingsPage />}
          />
        </Route>

        {/* 404 page */}
        <Route path='*' element={<NotFoundPage />} />
      </Routes>
    </>
  )
}

export default App
