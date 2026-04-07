import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/store'
import { Package, Truck, CheckCircle, Clock, TrendingUp, Users, Route, ArrowRight } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/dashboard/stats').then(r => { setStats(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-96 text-gray-500">Cargando...</div>

  const s = stats || { today: {}, month: {}, pending: 0, inTransit: 0, drivers: {}, avgRating: 0 }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-500">{new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <button onClick={() => navigate('/routes')} className="btn-primary">
          Distribuir rutas <ArrowRight size={16} />
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="Pendientes" value={s.pending} color="text-amber-400" bg="bg-amber-500/10" />
        <StatCard icon={Truck} label="En camino" value={s.inTransit} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard icon={CheckCircle} label="Entregados hoy" value={s.today?.delivered || 0} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard icon={Users} label="Cadetes online" value={`${s.drivers?.active || 0}/${s.drivers?.total || 0}`} color="text-brand-400" bg="bg-brand-500/10" />
      </div>

      {/* Monthly summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-p">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center">
              <TrendingUp size={20} className="text-brand-400" />
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Este mes</div>
              <div className="text-xl font-bold text-white">{s.month?.total || 0} envíos</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex-1 h-2 bg-navy-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{
                width: `${s.month?.total ? (s.month.delivered / s.month.total * 100) : 0}%`
              }} />
            </div>
            <span className="text-gray-400">{s.month?.delivered || 0} entregados</span>
          </div>
        </div>

        <div className="card-p">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Package size={20} className="text-amber-400" />
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Hoy</div>
              <div className="text-xl font-bold text-white">{s.today?.total || 0} pedidos</div>
            </div>
          </div>
          <p className="text-sm text-gray-500">{s.today?.delivered || 0} entregados, {(s.today?.total || 0) - (s.today?.delivered || 0)} restantes</p>
        </div>

        <div className="card-p">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle size={20} className="text-emerald-400" />
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Rating promedio</div>
              <div className="text-xl font-bold text-white">
                {s.avgRating ? `${s.avgRating.toFixed(1)} / 5.0` : 'Sin datos'}
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500">Calificación de clientes</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button onClick={() => navigate('/orders')}
          className="card-p text-left hover:border-brand-500/30 transition-colors group">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Package size={18} className="text-brand-400" /> Gestionar pedidos
            <ArrowRight size={14} className="ml-auto text-gray-600 group-hover:text-brand-400 transition-colors" />
          </h3>
          <p className="text-sm text-gray-500 mt-1">Importar de Tiendanube, crear manuales, ver estado</p>
        </button>
        <button onClick={() => navigate('/routes')}
          className="card-p text-left hover:border-brand-500/30 transition-colors group">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Route size={18} className="text-amber-400" /> Armar rutas del día
            <ArrowRight size={14} className="ml-auto text-gray-600 group-hover:text-brand-400 transition-colors" />
          </h3>
          <p className="text-sm text-gray-500 mt-1">Distribuir pedidos pendientes entre cadetes</p>
        </button>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="card-p">
      <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-2`}>
        <Icon size={18} className={color} />
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
