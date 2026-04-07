import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth, getRoleLabel } from '../lib/store'
import { LayoutDashboard, Package, Route, Settings, LogOut, Store } from 'lucide-react'

const links = [
  { to: '/tienda/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tienda/pedidos', icon: Package, label: 'Pedidos' },
  { to: '/tienda/rutas', icon: Route, label: 'Rutas' },
  { to: '/tienda/config', icon: Settings, label: 'Config' },
]

export default function StoreLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const linkClass = (isActive) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
    isActive
      ? 'bg-teal-500/10 text-teal-400 font-medium'
      : 'text-gray-400 hover:text-gray-200 hover:bg-navy-800/50'
  }`

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-[220px] flex-shrink-0 bg-navy-900 border-r border-navy-800 flex flex-col">
        <div className="p-5 border-b border-navy-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
              <Store size={16} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-sm text-white tracking-tight">RutaEnvio</div>
              <div className="text-[10px] text-teal-400 uppercase tracking-widest">Tienda</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {links.map(link => (
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
