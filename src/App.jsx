import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './lib/store'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import RouteDistribution from './pages/RouteDistribution'
import Drivers from './pages/Drivers'
import Settings from './pages/Settings'
import OrderDetail from './pages/OrderDetail'
import TrackingPage from './pages/TrackingPage'
import RouteView from './pages/RouteView'
import RoutesHistory from './pages/RoutesHistory'

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
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/routes" element={<RouteDistribution />} />
        <Route path="/routes/history" element={<RoutesHistory />} />
        <Route path="/drivers" element={<Drivers />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  )
}
