import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth, getRoleLabel } from '../lib/store'
import { LayoutDashboard, Package, Route, Settings, LogOut, Store, BarChart3, FileText, ChevronDown } from 'lucide-react'

const topLinks = [
  { to: '/tienda/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tienda/pedidos', icon: Package, label: 'Pedidos' },
]

const bottomLinks = [
  { to: '/tienda/rutas', icon: Route, label: 'Rutas' },
  { to: '/tienda/config', icon: Settings, label: 'Config' },
]

export default function StoreLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isAdminSection = location.pathname.startsWith('/tienda/administracion')
  const [adminOpen, setAdminOpen] = useState(isAdminSection)

  const linkClass = (isActive) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
    isActive
      ? 'bg-teal-500/10 text-teal-400 font-medium'
      : 'text-gray-400 hover:text-gray-200 hover:bg-navy-800/50'
  }`

  const subLinkClass = (isActive) => `flex items-center gap-3 pl-10 pr-3 py-2 rounded-lg text-sm transition-all duration-150 ${
    isActive
      ? 'bg-teal-500/10 text-teal-400 font-medium'
      : 'text-gray-500 hover:text-gray-200 hover:bg-navy-800/50'
  }`

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-[220px] flex-shrink-0 bg-navy-900 border-r border-navy-800 flex flex-col">
        <div className="p-5 border-b border-navy-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center flex-shrink-0">
              <Store size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm text-white tracking-tight">RutaEnvio</div>
              <div
                className="text-[10px] text-teal-400 uppercase tracking-widest truncate"
                title={user?.companyName || 'Tienda'}
              >
                {user?.companyName
                  ? (user.companyName.length > 20 ? user.companyName.slice(0, 20) + '…' : user.companyName)
                  : 'Tienda'}
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {topLinks.map(link => (
            <NavLink key={link.to} to={link.to}
              className={({ isActive }) => linkClass(isActive)}>
              <link.icon size={18} />
              {link.label}
            </NavLink>
          ))}

          {/* Administracion con submenu */}
          <button
            onClick={() => setAdminOpen(o => !o)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 w-full ${
              isAdminSection
                ? 'bg-teal-500/10 text-teal-400 font-medium'
                : 'text-gray-400 hover:text-gray-200 hover:bg-navy-800/50'
            }`}
          >
            <BarChart3 size={18} />
            <span className="flex-1 text-left">Administración</span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${adminOpen ? 'rotate-180' : ''}`} />
          </button>

          {adminOpen && (
            <div className="space-y-0.5">
              <NavLink to="/tienda/administracion/remitos" className={({ isActive }) => subLinkClass(isActive)}>
                <FileText size={14} />
                Remitos
              </NavLink>
              {/* TODO: futuros subitems - Pagos, Cuenta corriente */}
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

      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-[1400px]">
          {children}
        </div>
      </main>
    </div>
  )
}
