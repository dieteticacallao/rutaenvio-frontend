import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './lib/store'
import LogisticsLayout from './components/LogisticsLayout'
import Login from './pages/shared/Login'
import Dashboard from './pages/logistics/Dashboard'
import Orders from './pages/logistics/Orders'
import RouteDistribution from './pages/logistics/RouteDistribution'
import Drivers from './pages/logistics/Drivers'
import Settings from './pages/logistics/Settings'
import Routes_ from './pages/logistics/Routes'
import StatsGeneral from './pages/logistics/stats/General'
import StatsDrivers from './pages/logistics/stats/Drivers'
import StatsBilling from './pages/logistics/stats/Billing'
import OrderDetail from './pages/shared/OrderDetail'
import TrackingPage from './pages/shared/TrackingPage'
import RouteView from './pages/shared/RouteView'

export default function App() {
  const { isAuthenticated, loadUser, token } = useAuth()
  const location = useLocation()

  useEffect(() => { if (token) loadUser() }, [])

  // Public pages - no auth needed
  if (location.pathname.startsWith('/track/')) {
    return <Routes>
      <Route path="/track/:trackingCode" element={<TrackingPage />} />
    </Routes>
  }

  if (location.pathname.startsWith('/ruta/')) {
    return <Routes>
      <Route path="/ruta/:token" element={<RouteView />} />
    </Routes>
  }

  if (!isAuthenticated) {
    return <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  }

  return (
    <LogisticsLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/routes" element={<RouteDistribution />} />
        <Route path="/routes/history" element={<Routes_ />} />
        <Route path="/stats" element={<StatsGeneral />} />
        <Route path="/stats/drivers" element={<StatsDrivers />} />
        <Route path="/stats/billing" element={<StatsBilling />} />
        <Route path="/drivers" element={<Drivers />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </LogisticsLayout>
  )
}
