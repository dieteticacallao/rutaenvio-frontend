import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/store'
import { FileText, Printer, Loader2, Truck, Calendar, Package, DollarSign, Receipt as ReceiptIcon } from 'lucide-react'
import toast from 'react-hot-toast'

function toLocalDate(date) {
  const d = date || new Date()
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
}

function formatShortDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' })
}

function formatARS(amount) {
  const n = typeof amount === 'string' ? parseFloat(amount) : Number(amount || 0)
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const PAGE_SIZE = 20

export default function StoreReceipts() {
  const navigate = useNavigate()
  const [receipts, setReceipts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const [logistics, setLogistics] = useState([])
  const [logisticsLoading, setLogisticsLoading] = useState(true)

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [logisticsCompanyId, setLogisticsCompanyId] = useState('')

  const [monthStats, setMonthStats] = useState({ count: 0, packages: 0, amount: 0, loading: true })

  useEffect(() => {
    api.get('/companies/my-logistics')
      .then(r => { setLogistics(r.data?.data || []); setLogisticsLoading(false) })
      .catch(() => { setLogistics([]); setLogisticsLoading(false) })
  }, [])

  // Carga independiente del mes actual para los mini-cards (no se ve afectado por filtros)
  useEffect(() => {
    const now = new Date()
    const first = toLocalDate(new Date(now.getFullYear(), now.getMonth(), 1))
    const last = toLocalDate(now)
    api.get('/store/receipts', { params: { from: first, to: last, page: 1, limit: 100 } })
      .then(r => {
        const list = r.data?.data?.receipts || []
        const count = r.data?.data?.total ?? list.length
        const packages = list.reduce((s, x) => s + (x.totalPackages || 0), 0)
        const amount = list.reduce((s, x) => s + parseFloat(x.totalAmount || 0), 0)
        setMonthStats({ count, packages, amount, loading: false })
      })
      .catch(() => setMonthStats(s => ({ ...s, loading: false })))
  }, [])

  const buildParams = useCallback((p) => {
    const params = { page: p, limit: PAGE_SIZE }
    if (dateFrom) params.from = dateFrom
    if (dateTo) params.to = dateTo
    if (logisticsCompanyId) params.logisticsCompanyId = logisticsCompanyId
    return params
  }, [dateFrom, dateTo, logisticsCompanyId])

  const loadFirstPage = useCallback(() => {
    setLoading(true)
    setPage(1)
    api.get('/store/receipts', { params: buildParams(1) })
      .then(r => {
        setReceipts(r.data?.data?.receipts || [])
        setTotal(r.data?.data?.total || 0)
        setLoading(false)
      })
      .catch(() => { setReceipts([]); setTotal(0); setLoading(false) })
  }, [buildParams])

  useEffect(() => { loadFirstPage() }, [loadFirstPage])

  const loadMore = async () => {
    if (loadingMore) return
    setLoadingMore(true)
    try {
      const next = page + 1
      const { data } = await api.get('/store/receipts', { params: buildParams(next) })
      const more = data?.data?.receipts || []
      setReceipts(prev => [...prev, ...more])
      setPage(next)
    } catch {
      toast.error('Error al cargar más remitos')
    }
    setLoadingMore(false)
  }

  const handleQuickDate = (preset) => {
    const now = new Date()
    if (preset === 'today') {
      const d = toLocalDate(now); setDateFrom(d); setDateTo(d)
    } else if (preset === 'week') {
      const day = now.getDay()
      const diff = day === 0 ? 6 : day - 1
      const mon = new Date(now); mon.setDate(now.getDate() - diff)
      setDateFrom(toLocalDate(mon)); setDateTo(toLocalDate(now))
    } else if (preset === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      setDateFrom(toLocalDate(first)); setDateTo(toLocalDate(now))
    } else if (preset === 'clear') {
      setDateFrom(''); setDateTo('')
    }
  }

  const handlePrint = (receiptId) => {
    if (!receiptId) return
    window.open(`${api.defaults.baseURL}/receipts/${receiptId}/print`, '_blank', 'noopener,noreferrer')
  }

  const hasMore = useMemo(() => receipts.length < total, [receipts.length, total])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <ReceiptIcon size={20} className="text-teal-400" /> Remitos
        </h1>
        <p className="text-sm text-gray-500">Historial de remitos generados para tus logísticas</p>
      </div>

      {/* Mini-cards del mes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MonthCard
          icon={<FileText size={18} className="text-teal-300" />}
          label="Remitos este mes"
          value={monthStats.loading ? '—' : monthStats.count}
        />
        <MonthCard
          icon={<Package size={18} className="text-teal-300" />}
          label="Paquetes este mes"
          value={monthStats.loading ? '—' : monthStats.packages}
        />
        <MonthCard
          icon={<DollarSign size={18} className="text-teal-300" />}
          label="Facturado este mes"
          value={monthStats.loading ? '—' : `$ ${formatARS(monthStats.amount)}`}
        />
      </div>

      {/* Filtros */}
      <div className="card-p space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-[11px] text-gray-500 uppercase tracking-wider mb-1 block">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="input text-sm"
            />
          </div>
          <div>
            <label className="text-[11px] text-gray-500 uppercase tracking-wider mb-1 block">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="input text-sm"
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="text-[11px] text-gray-500 uppercase tracking-wider mb-1 block">Logística</label>
            <select
              value={logisticsCompanyId}
              onChange={e => setLogisticsCompanyId(e.target.value)}
              className="input text-sm w-full"
              disabled={logisticsLoading}
            >
              <option value="">Todas</option>
              {logistics.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {[
            { label: 'Hoy', preset: 'today' },
            { label: 'Esta semana', preset: 'week' },
            { label: 'Este mes', preset: 'month' },
          ].map(btn => (
            <button key={btn.preset} onClick={() => handleQuickDate(btn.preset)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-navy-800 text-gray-400 hover:text-white hover:bg-navy-700 transition-colors">
              {btn.label}
            </button>
          ))}
          {(dateFrom || dateTo || logisticsCompanyId) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setLogisticsCompanyId('') }}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-800 text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left p-3 pl-4">N° de remito</th>
              <th className="text-left p-3">Fecha</th>
              <th className="text-left p-3">Logística</th>
              <th className="text-right p-3">Paquetes</th>
              <th className="text-right p-3">Importe</th>
              <th className="text-left p-3">Observaciones</th>
              <th className="text-right p-3 pr-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <ReceiptsSkeleton />
            ) : receipts.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-gray-500">
                  <FileText size={36} className="mx-auto text-gray-700 mb-3" />
                  <p className="text-sm">Todavía no generaste remitos.</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Cuando asignes pedidos a una logística aparecerán acá.
                  </p>
                </td>
              </tr>
            ) : receipts.map(r => {
              const obs = r.observations || ''
              const obsTruncated = obs.length > 40 ? obs.slice(0, 40) + '...' : obs
              return (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/tienda/administracion/remitos/${r.id}`)}
                  className="table-row cursor-pointer"
                >
                  <td className="p-3 pl-4">
                    <span
                      className="font-mono text-white font-semibold text-xs no-underline"
                      style={{ textDecoration: 'none' }}
                    >
                      {r.receiptNumber}
                    </span>
                  </td>
                  <td className="p-3 text-gray-300 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar size={12} className="text-gray-500" />
                      {formatShortDate(r.issuedAt)}
                    </span>
                  </td>
                  <td className="p-3 text-gray-300">
                    {r.logisticsCompany?.name ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Truck size={12} className="text-teal-400" />
                        {r.logisticsCompany.name}
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right font-semibold text-white whitespace-nowrap">{r.totalPackages}</td>
                  <td className="p-3 text-right font-mono text-white whitespace-nowrap">$ {formatARS(r.totalAmount)}</td>
                  <td className="p-3 text-gray-400 text-xs">
                    {obs ? (
                      <span title={obs}>{obsTruncated}</span>
                    ) : (
                      <span className="text-gray-700">—</span>
                    )}
                  </td>
                  <td className="p-3 pr-4 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePrint(r.id) }}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/20 hover:bg-teal-500/20 hover:text-teal-200 transition-colors"
                      title="Imprimir remito"
                    >
                      <Printer size={12} /> Imprimir
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Cargar más */}
      {!loading && hasMore && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-navy-800 text-gray-300 hover:bg-navy-700 hover:text-white transition-colors text-sm disabled:opacity-50"
          >
            {loadingMore && <Loader2 size={14} className="animate-spin" />}
            Cargar más ({total - receipts.length} restantes)
          </button>
        </div>
      )}
    </div>
  )
}

function MonthCard({ icon, label, value }) {
  return (
    <div className="card-p flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-gray-500 uppercase tracking-wider">{label}</div>
        <div className="text-lg font-bold text-white truncate">{value}</div>
      </div>
    </div>
  )
}

function ReceiptsSkeleton() {
  return (
    <>
      {[1, 2, 3, 4].map(i => (
        <tr key={i} className="border-b border-navy-800/50">
          <td className="p-3 pl-4"><div className="h-3 bg-navy-800 rounded animate-pulse w-24" /></td>
          <td className="p-3"><div className="h-3 bg-navy-800 rounded animate-pulse w-20" /></td>
          <td className="p-3"><div className="h-3 bg-navy-800 rounded animate-pulse w-28" /></td>
          <td className="p-3"><div className="h-3 bg-navy-800 rounded animate-pulse w-8 ml-auto" /></td>
          <td className="p-3"><div className="h-3 bg-navy-800 rounded animate-pulse w-20 ml-auto" /></td>
          <td className="p-3"><div className="h-3 bg-navy-800 rounded animate-pulse w-32" /></td>
          <td className="p-3 pr-4"><div className="h-7 bg-navy-800 rounded animate-pulse w-20 ml-auto" /></td>
        </tr>
      ))}
    </>
  )
}
