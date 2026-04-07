import { useState, useEffect } from 'react'
import { api } from '../../lib/store'
import { Package, Clock, Truck, CheckCircle2, Loader2 } from 'lucide-react'

export default function StoreDashboard() {
  const [stats, setStats] = useState({ total: 0, pending: 0, inRoute: 0, deliveredToday: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/orders', { params: { limit: 100 } }).then(r => {
      const orders = r.data?.orders || []
      const total = r.data?.total ?? orders.length
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const pending = orders.filter(o => o.status === 'PENDING' && !o.logisticId).length
      const inRoute = orders.filter(o => ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED'].includes(o.status)).length
      const deliveredToday = orders.filter(o => {
        if (o.status !== 'DELIVERED') return false
        const d = o.deliveredAt ? new Date(o.deliveredAt) : null
        return d && d >= today
      }).length

      setStats({ total, pending, inRoute, deliveredToday })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const cards = [
    { label: 'Total pedidos', value: stats.total, icon: Package, color: 'text-teal-400', bg: 'bg-teal-500/10' },
    { label: 'Pendientes de asignar', value: stats.pending, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'En ruta', value: stats.inRoute, icon: Truck, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Entregados hoy', value: stats.deliveredToday, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-500">Resumen de tus pedidos</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 size={24} className="animate-spin mr-2" /> Cargando...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(card => (
            <div key={card.label} className="card-p">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <card.icon size={20} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 truncate">{card.label}</div>
                  <div className="text-2xl font-bold text-white">{card.value}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
