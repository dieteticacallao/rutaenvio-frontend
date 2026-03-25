import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/store'
import { BarChart3, Users, Receipt, Loader2, ArrowUpDown, X } from 'lucide-react'

function toLocalDate(d) {
  return d.toISOString().slice(0, 10)
}

const ZONE_COLORS = {
  'CABA': 'bg-blue-500/20 text-blue-400 border-blue-500/20',
  'GBA 1': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20',
  'GBA 2': 'bg-orange-500/20 text-orange-400 border-orange-500/20',
  'GBA 3': 'bg-red-500/20 text-red-400 border-red-500/20',
  'Lejana': 'bg-gray-500/20 text-gray-400 border-gray-500/20',
  'Sin zona': 'bg-gray-500/20 text-gray-500 border-gray-500/20',
}

const ZONE_BAR_COLORS = {
  'CABA': 'bg-blue-500',
  'GBA 1': 'bg-emerald-500',
  'GBA 2': 'bg-orange-500',
  'GBA 3': 'bg-red-500',
  'Lejana': 'bg-gray-500',
  'Sin zona': 'bg-gray-700',
}

export default function Stats() {
  const [tab, setTab] = useState('cadetes')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Estadisticas</h1>
        <p className="text-sm text-gray-500">Rendimiento de cadetes y facturacion por zona</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab('cadetes')}
          className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-colors ${
            tab === 'cadetes' ? 'bg-brand-500 text-white' : 'bg-navy-800 text-gray-400 hover:text-white'
          }`}
        >
          <Users size={16} /> Cadetes
        </button>
        <button
          onClick={() => setTab('facturacion')}
          className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-colors ${
            tab === 'facturacion' ? 'bg-brand-500 text-white' : 'bg-navy-800 text-gray-400 hover:text-white'
          }`}
        >
          <Receipt size={16} /> Facturacion
        </button>
      </div>

      {tab === 'cadetes' && <CadetesTab />}
      {tab === 'facturacion' && <FacturacionTab />}
    </div>
  )
}

function DateFilter({ dateFrom, dateTo, setDateFrom, setDateTo }) {
  const today = toLocalDate(new Date())
  const yesterday = toLocalDate(new Date(Date.now() - 86400000))
  const weekStart = (() => {
    const now = new Date()
    const day = now.getDay()
    const diff = day === 0 ? 6 : day - 1
    const mon = new Date(now)
    mon.setDate(now.getDate() - diff)
    return toLocalDate(mon)
  })()
  const monthStart = toLocalDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {[
        { label: 'Hoy', from: today, to: today },
        { label: 'Esta semana', from: weekStart, to: today },
        { label: 'Este mes', from: monthStart, to: today },
      ].map(btn => (
        <button
          key={btn.label}
          onClick={() => { setDateFrom(btn.from); setDateTo(btn.to) }}
          className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
            dateFrom === btn.from && dateTo === btn.to
              ? 'bg-brand-500 text-white'
              : 'bg-navy-800 text-gray-400 hover:text-white hover:bg-navy-700'
          }`}
        >
          {btn.label}
        </button>
      ))}
      <div className="flex items-center gap-1.5 ml-auto">
        <label className="text-xs text-gray-500">Desde</label>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input text-xs py-1.5 px-2 [color-scheme:dark]" />
        <label className="text-xs text-gray-500">Hasta</label>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input text-xs py-1.5 px-2 [color-scheme:dark]" />
      </div>
      {(dateFrom || dateTo) && (
        <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-xs px-2 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center gap-1">
          <X size={12} /> Limpiar
        </button>
      )}
    </div>
  )
}

function CadetesTab() {
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
    <div className="space-y-4">
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

function FacturacionTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (dateFrom) params.dateFrom = dateFrom
    if (dateTo) params.dateTo = dateTo
    api.get('/zones/billing', { params }).then(r => {
      setData(r.data?.data || null)
      setLoading(false)
    }).catch(() => { setData(null); setLoading(false) })
  }, [dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  const zones = data?.zones || []
  const total = data?.total || 0
  const maxCount = Math.max(...zones.map(z => z.count), 1)

  return (
    <div className="space-y-4">
      <DateFilter dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo} />

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-500"><Loader2 size={24} className="animate-spin mr-2" /> Cargando...</div>
      ) : !data || zones.length === 0 ? (
        <div className="card-p text-center py-12 text-gray-500">No hay datos de facturacion. Configura las zonas en Config primero.</div>
      ) : (
        <>
          {/* Zone cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {zones.map(z => (
              <div key={z.name} className="card-p space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${ZONE_COLORS[z.name] || ZONE_COLORS['Sin zona']}`}>{z.name}</span>
                  <span className="text-xs text-gray-500">{z.count} envios</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase">Precio/envio</p>
                    <p className="text-sm text-gray-300">${z.price.toLocaleString('es-AR')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-600 uppercase">Subtotal</p>
                    <p className="text-lg font-bold text-white">${z.subtotal.toLocaleString('es-AR')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div className="card-p">
            <h3 className="text-sm font-semibold text-white mb-4">Distribucion por zona</h3>
            <div className="space-y-2.5">
              {zones.filter(z => z.count > 0).map(z => (
                <div key={z.name} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-16 text-right flex-shrink-0">{z.name}</span>
                  <div className="flex-1 h-5 bg-navy-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${ZONE_BAR_COLORS[z.name] || 'bg-gray-600'} transition-all`}
                      style={{ width: `${(z.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-12 flex-shrink-0">{z.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="card-p text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total facturado</p>
            <p className="text-3xl font-bold text-white">${total.toLocaleString('es-AR')}</p>
          </div>
        </>
      )}
    </div>
  )
}
