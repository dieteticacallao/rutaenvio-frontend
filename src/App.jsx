import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './lib/store'
import LogisticsLayout from './components/LogisticsLayout'
import StoreLayout from './components/StoreLayout'
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
import StoreDashboard from './pages/store/StoreDashboard'
import StoreOrders from './pages/store/StoreOrders'
import StoreRoutes from './pages/store/StoreRoutes'
import StoreRouteDetail from './pages/store/StoreRouteDetail'
import StoreSettings from './pages/store/StoreSettings'
import StoreReceipts from './pages/store/StoreReceipts'
import StoreReceiptDetail from './pages/store/StoreReceiptDetail'
import StoreAccountStatement from './pages/store/StoreAccountStatement'
import LogisticsAccountStatement from './pages/logistics/LogisticsAccountStatement'
import OrderDetail from './pages/shared/OrderDetail'
import TrackingPage from './pages/shared/TrackingPage'
import RouteView from './pages/shared/RouteView'

export default function App() {
  const { isAuthenticated, user, loadUser, token } = useAuth()
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

  const isStore = user?.role === 'STORE_ADMIN'
  const isStorePath = location.pathname.startsWith('/tienda')

  // STORE_ADMIN trying to reach logistics routes → redirect to store dashboard
  if (isStore && !isStorePath) {
    return <Navigate to="/tienda/dashboard" replace />
  }

  // LOGISTICS_ADMIN trying to reach /tienda/* → redirect to logistics dashboard
  if (!isStore && isStorePath) {
    return <Navigate to="/" replace />
  }

  if (isStore) {
    return (
      <StoreLayout>
        <Routes>
          <Route path="/tienda/dashboard" element={<StoreDashboard />} />
          <Route path="/tienda/pedidos" element={<StoreOrders />} />
          <Route path="/tienda/pedidos/:id" element={<OrderDetail />} />
          <Route path="/tienda/rutas" element={<StoreRoutes />} />
          <Route path="/tienda/rutas/:id" element={<StoreRouteDetail />} />
          <Route path="/tienda/config" element={<StoreSettings />} />
          <Route path="/tienda/administracion/remitos" element={<StoreReceipts />} />
          <Route path="/tienda/administracion/remitos/:id" element={<StoreReceiptDetail />} />
          <Route path="/tienda/administracion/cuenta-corriente" element={<StoreAccountStatement />} />
          <Route path="*" element={<Navigate to="/tienda/dashboard" replace />} />
        </Routes>
      </StoreLayout>
    )
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
        <Route path="/administracion/cuenta-corriente" element={<LogisticsAccountStatement />} />
        <Route path="/drivers" element={<Drivers />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </LogisticsLayout>
  )
}
