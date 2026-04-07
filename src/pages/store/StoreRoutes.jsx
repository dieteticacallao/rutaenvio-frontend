import { useState, useEffect } from 'react'
import { api } from '../../lib/store'
import { Route as RouteIcon, Loader2, Eye } from 'lucide-react'

export default function StoreRoutes() {
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/store/routes').then(r => {
      setRoutes(r.data?.data || [])
      setLoading(false)
    }).catch(() => { setRoutes([]); setLoading(false) })
  }, [])

  const badgeClass = (estado) => {
    if (estado === 'Finalizada') return 'bg-emerald-500/10 text-emerald-400'
    if (estado === 'En camino') return 'bg-blue-500/10 text-blue-400'
    if (estado === 'Cancelada') return 'bg-red-500/10 text-red-400'
    return 'bg-gray-500/10 text-gray-400'
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <RouteIcon size={20} className="text-teal-400" /> Rutas
        </h1>
        <p className="text-sm text-gray-500">{routes.length} ruta{routes.length !== 1 ? 's' : ''} con tus pedidos</p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-800 text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left p-3 pl-4">Fecha</th>
              <th className="text-left p-3">Cadete</th>
              <th className="text-left p-3">Logistica</th>
              <th className="text-left p-3">Estado</th>
              <th className="text-left p-3">Tus pedidos</th>
              <th className="text-right p-3 pr-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500"><Loader2 size={24} className="animate-spin inline-block mr-2" />Cargando rutas...</td></tr>
            ) : routes.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">Tu logística aún no creó rutas con tus pedidos</td></tr>
            ) : routes.map(r => (
              <tr key={r.id} className="table-row">
                <td className="p-3 pl-4 text-gray-300 whitespace-nowrap">
                  {r.date ? new Date(r.date).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) : '—'}
                </td>
                <td className="p-3 text-gray-300">{r.driverName || '—'}</td>
                <td className="p-3 text-gray-300">{r.logisticName || '—'}</td>
                <td className="p-3">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${badgeClass(r.estado)}`}>
                    {r.estado}
                  </span>
                </td>
                <td className="p-3 text-gray-300 text-xs">
                  {r.myDelivered}/{r.myOrders} entregados
                  <div className="text-[10px] text-gray-500">de {r.totalOrders} total</div>
                </td>
                <td className="p-3 pr-4 text-right">
                  <button className="text-gray-500 hover:text-teal-400 transition-colors" title="Ver detalle">
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
