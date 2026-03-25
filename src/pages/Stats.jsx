import { useState, useEffect } from 'react'
import { api } from '../lib/store'
import { Package, Truck, CheckCircle2, TrendingUp, Star, DollarSign, Loader2, X } from 'lucide-react'

function toLocalDate(d) {
  return (d || new Date()).toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
}

export const ZONE_COLORS = {
  'CABA': 'bg-blue-500/20 text-blue-400 border-blue-500/20',
  'GBA 1': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20',
  'GBA 2': 'bg-orange-500/20 text-orange-400 border-orange-500/20',
  'GBA 3': 'bg-red-500/20 text-red-400 border-red-500/20',
  'Lejana': 'bg-gray-500/20 text-gray-400 border-gray-500/20',
  'Sin zona': 'bg-gray-500/20 text-gray-500 border-gray-500/20',
}

export const ZONE_BAR_COLORS = {
  'CABA': 'bg-blue-500',
  'GBA 1': 'bg-emerald-500',
  'GBA 2': 'bg-orange-500',
  'GBA 3': 'bg-red-500',
  'Lejana': 'bg-gray-500',
  'Sin zona': 'bg-gray-700',
}

export function DateFilter({ dateFrom, dateTo, setDateFrom, setDateTo }) {
  const today = toLocalDate(new Date())
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

export default function Stats() {
  const [dashStats, setDashStats] = useState(null)
  const [driverStats, setDriverStats] = useState([])
  const [billingStats, setBillingStats] = useState(null)
  const [weeklyData, setWeeklyData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = toLocalDate(new Date())
    const monthStart = toLocalDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))

    // Last 7 days dates
    const days = []
    for (let i = 6; i >= 0; i--) {
      days.push(toLocalDate(new Date(Date.now() - i * 86400000)))
    }

    Promise.all([
      api.get('/dashboard/stats').catch(() => ({ data: null })),
      api.get('/zones/driver-stats', { params: { dateFrom: today, dateTo: today } }).catch(() => ({ data: { data: [] } })),
      api.get('/zones/billing', { params: { dateFrom: monthStart, dateTo: today } }).catch(() => ({ data: { data: null } })),
      // Fetch delivered per day for last 7 days
      Promise.all(days.map(d =>
        api.get('/zones/driver-stats', { params: { dateFrom: d, dateTo: d } })
          .then(r => ({ date: d, delivered: (r.data?.data || []).reduce((sum, dr) => sum + dr.delivered, 0) }))
          .catch(() => ({ date: d, delivered: 0 }))
      ))
    ]).then(([dashRes, driverRes, billingRes, weeklyRes]) => {
      setDashStats(dashRes.data)
      setDriverStats(driverRes.data?.data || [])
      setBillingStats(billingRes.data?.data || null)
      setWeeklyData(weeklyRes)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-white">Estadisticas</h1>
          <p className="text-sm text-gray-500">Resumen general</p>
        </div>
        <div className="flex items-center justify-center h-48 text-gray-500"><Loader2 size={24} className="animate-spin mr-2" /> Cargando...</div>
      </div>
    )
  }

  const todayDelivered = dashStats?.today?.delivered || 0
  const todayTotal = dashStats?.today?.total || 0
  const deliveryPct = todayTotal > 0 ? Math.round((todayDelivered / todayTotal) * 100) : 0
  const inTransit = dashStats?.inTransit || 0
  const monthBilling = billingStats?.total || 0

  // Best driver today
  const bestDriver = driverStats.length > 0
    ? driverStats.reduce((best, d) => d.deliveryRate > (best?.deliveryRate || 0) ? d : best, null)
    : null

  // Weekly chart
  const maxWeekly = Math.max(...weeklyData.map(d => d.delivered), 1)

  // Zone distribution
  const zones = billingStats?.zones?.filter(z => z.count > 0) || []
  const totalZoneCount = zones.reduce((sum, z) => sum + z.count, 0) || 1

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Estadisticas</h1>
        <p className="text-sm text-gray-500">Resumen general del negocio</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <div className="card-p">
          <div className="flex items-center gap-2 mb-2">
            <Package size={14} className="text-blue-400" />
            <span className="text-[10px] text-gray-500 uppercase">Pedidos hoy</span>
          </div>
          <p className="text-2xl font-bold text-white">{todayTotal}</p>
        </div>

        <div className="card-p">
          <div className="flex items-center gap-2 mb-2">
            <Truck size={14} className="text-sky-400" />
            <span className="text-[10px] text-gray-500 uppercase">En ruta</span>
          </div>
          <p className="text-2xl font-bold text-white">{inTransit}</p>
        </div>

        <div className="card-p">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span className="text-[10px] text-gray-500 uppercase">Entregados hoy</span>
          </div>
          <p className="text-2xl font-bold text-white">{todayDelivered}</p>
        </div>

        <div className="card-p">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-brand-400" />
            <span className="text-[10px] text-gray-500 uppercase">% Entrega hoy</span>
          </div>
          <p className="text-2xl font-bold text-white">{deliveryPct}%</p>
        </div>

        <div className="card-p">
          <div className="flex items-center gap-2 mb-2">
            <Star size={14} className="text-yellow-400" />
            <span className="text-[10px] text-gray-500 uppercase">Cadete destacado</span>
          </div>
          <p className="text-lg font-bold text-white truncate">{bestDriver?.name || '—'}</p>
          {bestDriver && <p className="text-xs text-gray-500">{bestDriver.delivered} entregas - {bestDriver.deliveryRate}%</p>}
        </div>

        <div className="card-p">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={14} className="text-emerald-400" />
            <span className="text-[10px] text-gray-500 uppercase">Facturacion mes</span>
          </div>
          <p className="text-2xl font-bold text-white">${monthBilling.toLocaleString('es-AR')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly deliveries chart */}
        <div className="card-p">
          <h3 className="text-sm font-semibold text-white mb-4">Entregas ultimos 7 dias</h3>
          <div className="flex items-end gap-2 h-32">
            {weeklyData.map(d => {
              const pct = (d.delivered / maxWeekly) * 100
              const dayLabel = new Date(d.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short' })
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-gray-500">{d.delivered}</span>
                  <div className="w-full bg-navy-800 rounded-t-md overflow-hidden" style={{ height: '80px' }}>
                    <div
                      className="bg-brand-500 rounded-t-md w-full transition-all"
                      style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-600">{dayLabel}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Zone distribution */}
        <div className="card-p">
          <h3 className="text-sm font-semibold text-white mb-4">Distribucion por zona (mes)</h3>
          {zones.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Sin datos de zonas</p>
          ) : (
            <div className="space-y-2.5">
              {zones.map(z => (
                <div key={z.name} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-14 text-right flex-shrink-0">{z.name}</span>
                  <div className="flex-1 h-5 bg-navy-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${ZONE_BAR_COLORS[z.name] || 'bg-gray-600'} transition-all`}
                      style={{ width: `${(z.count / totalZoneCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-20 flex-shrink-0">{z.count} ({Math.round((z.count / totalZoneCount) * 100)}%)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
