import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../lib/store'
import { Loader2, ArrowUpDown, X } from 'lucide-react'
import { DateFilter } from './General'

export default function StatsDrivers() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortKey, setSortKey] = useState('delivered')
  const [sortDir, setSortDir] = useState('desc')

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (dateFrom) params.dateFrom = dateFrom
    if (dateTo) params.dateTo = dateTo
    api.get('/zones/driver-stats', { params }).then(r => {
      setData(r.data?.data || [])
      setLoading(false)
    }).catch(() => { setData([]); setLoading(false) })
  }, [dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = [...data].sort((a, b) => {
    const mul = sortDir === 'asc' ? 1 : -1
    return (a[sortKey] - b[sortKey]) * mul
  })

  const rateColor = (pct) => {
    if (pct >= 90) return 'bg-emerald-500'
    if (pct >= 70) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const SortHeader = ({ label, field }) => (
    <th className="p-3 text-left cursor-pointer hover:text-gray-300 select-none" onClick={() => toggleSort(field)}>
      <span className="flex items-center gap-1">
        {label}
        {sortKey === field && <ArrowUpDown size={10} className="text-brand-400" />}
      </span>
    </th>
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Rendimiento de Cadetes</h1>
        <p className="text-sm text-gray-500">Metricas de entrega, tiempos y rutas por cadete</p>
      </div>

      <DateFilter dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo} />

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-500"><Loader2 size={24} className="animate-spin mr-2" /> Cargando...</div>
      ) : data.length === 0 ? (
        <div className="card-p text-center py-12 text-gray-500">No hay datos de cadetes para el periodo seleccionado</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-800 text-xs text-gray-500 uppercase tracking-wider">
                <th className="p-3 text-left">Cadete</th>
                <SortHeader label="Entregas" field="delivered" />
                <SortHeader label="% Entrega" field="deliveryRate" />
                <SortHeader label="Prom. min" field="avgMinutes" />
                <SortHeader label="Rutas" field="routes" />
                <SortHeader label="% Rutas" field="routeCompletionRate" />
                <SortHeader label="Rating" field="rating" />
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/50">
              {sorted.map(d => (
                <tr key={d.id} className="hover:bg-navy-800/30 transition-colors">
                  <td className="p-3 text-white font-medium">{d.name}</td>
                  <td className="p-3 text-gray-300">{d.delivered}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-navy-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${rateColor(d.deliveryRate)}`} style={{ width: `${d.deliveryRate}%` }} />
                      </div>
                      <span className="text-xs text-gray-400">{d.deliveryRate}%</span>
                    </div>
                  </td>
                  <td className="p-3 text-gray-300">{d.avgMinutes > 0 ? `${d.avgMinutes} min` : '—'}</td>
                  <td className="p-3 text-gray-300">{d.completedRoutes}/{d.routes}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-navy-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${rateColor(d.routeCompletionRate)}`} style={{ width: `${d.routeCompletionRate}%` }} />
                      </div>
                      <span className="text-xs text-gray-400">{d.routeCompletionRate}%</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(n => (
                        <span key={n} className={`text-xs ${n <= Math.round(d.rating) ? 'text-yellow-400' : 'text-gray-700'}`}>&#9733;</span>
                      ))}
                      <span className="text-xs text-gray-500 ml-1">{d.rating > 0 ? d.rating.toFixed(1) : '—'}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
