import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/store'
import { LayoutDashboard, Package, Route, Users, Settings, LogOut, Truck } from 'lucide-react'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/orders', icon: Package, label: 'Pedidos' },
  { to: '/routes', icon: Route, label: 'Rutas' },
  { to: '/drivers', icon: Users, label: 'Cadetes' },
  { to: '/settings', icon: Settings, label: 'Config' },
]

export default function Layout({ children }) {
  const { business, logout } = useAuth()
  const navigate = useNavigate()

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
          {links.map(link => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                isActive 
                  ? 'bg-brand-500/10 text-brand-400 font-medium' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-navy-800/50'
              }`}>
              <link.icon size={18} />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-navy-800">
          <div className="px-3 py-2 text-xs text-gray-500 truncate">{business?.name}</div>
          <button onClick={() => { logout(); navigate('/login') }}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-red-400 hover:bg-red-500/5 w-full transition-colors">
            <LogOut size={16} /> Cerrar sesión
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
