import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth, getRoleLabel, api } from '../lib/store'
import { LayoutDashboard, Package, Route, Users, Settings, LogOut, Truck, Clock, ChevronDown, BarChart3, Receipt, DollarSign } from 'lucide-react'

const mainLinks = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/orders', icon: Package, label: 'Pedidos' },
]

const bottomLinks = [
  { to: '/drivers', icon: Users, label: 'Cadetes' },
  { to: '/settings', icon: Settings, label: 'Config' },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isRoutesSection = location.pathname.startsWith('/routes')
  const isAdminSection = location.pathname.startsWith('/stats') || location.pathname.startsWith('/administracion')
  const [routesOpen, setRoutesOpen] = useState(isRoutesSection)
  const [adminOpen, setAdminOpen] = useState(isAdminSection)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    const fetchPending = () => {
      api.get('/payments/pending-count')
        .then(r => { if (!cancelled) setPendingCount(r.data?.data?.count || 0) })
        .catch(() => {})
    }
    fetchPending()
    const interval = setInterval(fetchPending, 60000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [location.pathname])

  const linkClass = (isActive) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
    isActive
      ? 'bg-brand-500/10 text-brand-400 font-medium'
      : 'text-gray-400 hover:text-gray-200 hover:bg-navy-800/50'
  }`

  const subLinkClass = (isActive) => `flex items-center gap-3 pl-10 pr-3 py-2 rounded-lg text-sm transition-all duration-150 ${
    isActive
      ? 'bg-brand-500/10 text-brand-400 font-medium'
      : 'text-gray-500 hover:text-gray-200 hover:bg-navy-800/50'
  }`

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[220px] flex-shrink-0 bg-navy-900 border-r border-navy-800 flex flex-col">
        <div className="p-5 border-b border-navy-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <Truck size={16} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-sm text-white tracking-tight">RutaEnvio</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest">Dashboard</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {mainLinks.map(link => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'}
              className={({ isActive }) => linkClass(isActive)}>
              <link.icon size={18} />
              {link.label}
            </NavLink>
          ))}

          {/* Rutas with submenu */}
          <button
            onClick={() => setRoutesOpen(o => !o)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 w-full ${
              isRoutesSection
                ? 'bg-brand-500/10 text-brand-400 font-medium'
                : 'text-gray-400 hover:text-gray-200 hover:bg-navy-800/50'
            }`}
          >
            <Route size={18} />
            <span className="flex-1 text-left">Rutas</span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${routesOpen ? 'rotate-180' : ''}`} />
          </button>

          {routesOpen && (
            <div className="space-y-0.5">
              <NavLink to="/routes" end className={({ isActive }) => subLinkClass(isActive)}>
                <Route size={14} />
                Distribuir
              </NavLink>
              <NavLink to="/routes/history" className={({ isActive }) => subLinkClass(isActive)}>
                <Truck size={14} />
                Rutas
              </NavLink>
            </div>
          )}

          {/* Administracion with submenu */}
          <button
            onClick={() => setAdminOpen(o => !o)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 w-full ${
              isAdminSection
                ? 'bg-brand-500/10 text-brand-400 font-medium'
                : 'text-gray-400 hover:text-gray-200 hover:bg-navy-800/50'
            }`}
          >
            <BarChart3 size={18} />
            <span className="flex-1 text-left">Administracion</span>
            {pendingCount > 0 && !adminOpen && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
            <ChevronDown size={14} className={`transition-transform duration-200 ${adminOpen ? 'rotate-180' : ''}`} />
          </button>

          {adminOpen && (
            <div className="space-y-0.5">
              <NavLink to="/stats" end className={({ isActive }) => subLinkClass(isActive)}>
                <BarChart3 size={14} />
                General
              </NavLink>
              <NavLink to="/stats/drivers" className={({ isActive }) => subLinkClass(isActive)}>
                <Users size={14} />
                Cadetes
              </NavLink>
              <NavLink to="/stats/billing" className={({ isActive }) => subLinkClass(isActive)}>
                <Receipt size={14} />
                Facturacion
              </NavLink>
              <NavLink to="/administracion/cuenta-corriente" className={({ isActive }) => subLinkClass(isActive)}>
                <DollarSign size={14} />
                <span className="flex-1">Cuenta corriente</span>
                {pendingCount > 0 && (
                  <span
                    className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold"
                    title={`${pendingCount} ${pendingCount === 1 ? 'pago' : 'pagos'} esperando confirmación`}
                  >
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </NavLink>
            </div>
          )}

          {bottomLinks.map(link => (
            <NavLink key={link.to} to={link.to}
              className={({ isActive }) => linkClass(isActive)}>
              <link.icon size={18} />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-navy-800">
          <div className="px-3 py-2 text-xs text-gray-500 truncate">{user?.companyName}</div>
          <div className="px-3 py-1 text-[10px] text-gray-600 truncate">{getRoleLabel(user?.role)}</div>
          <button onClick={() => { logout(); navigate('/login') }}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-red-400 hover:bg-red-500/5 w-full transition-colors">
            <LogOut size={16} /> Cerrar sesion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-[1400px]">
          {children}
        </div>
      </main>
    </div>
  )
}
