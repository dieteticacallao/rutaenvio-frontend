import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, STATUS_MAP } from '../../lib/store'
import {
  ArrowLeft, Printer, Loader2, FileText, Truck, MapPin, Eye,
  Package, DollarSign, Calendar, User
} from 'lucide-react'

const PLATFORM_INFO = {
  TIENDANUBE: {
    label: 'Tiendanube',
    badge: <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/20">TN</span>
  },
  MERCADOLIBRE: {
    label: 'Mercado Libre',
    badge: <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-yellow-400/40" style={{ backgroundColor: '#FFE600', color: '#000' }}>ML</span>
  },
  EXCEL: {
    label: 'Excel',
    badge: <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">XLS</span>
  },
  MANUAL: {
    label: 'Manuales',
    badge: <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/20">MAN</span>
  },
}

const PLATFORM_ORDER = ['TIENDANUBE', 'MERCADOLIBRE', 'EXCEL', 'MANUAL']

function formatShortDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' })
}

function formatLongDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}

function formatARS(amount) {
  const n = typeof amount === 'string' ? parseFloat(amount) : Number(amount || 0)
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function StoreReceiptDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [receipt, setReceipt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    api.get(`/store/receipts/${id}`)
      .then(r => {
        setReceipt(r.data?.data || null)
        setLoading(false)
      })
      .catch(err => {
        if (err.response?.status === 404) setNotFound(true)
        setLoading(false)
      })
  }, [id])

  const handlePrint = () => {
    if (!receipt) return
    window.open(`${api.defaults.baseURL}/receipts/${receipt.id}/print`, '_blank', 'noopener,noreferrer')
  }

  if (loading) {
    return (
      <div className="space-y-5 max-w-5xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/tienda/administracion/remitos')} className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <div className="h-5 bg-navy-800 rounded animate-pulse w-48" />
            <div className="h-3 bg-navy-800 rounded animate-pulse w-32 mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="card-p h-20 bg-navy-900 animate-pulse" />)}
        </div>
        <div className="card-p h-32 bg-navy-900 animate-pulse" />
        <div className="card-p h-64 bg-navy-900 animate-pulse" />
      </div>
    )
  }

  if (notFound || !receipt) {
    return (
      <div className="text-center py-20 text-gray-500 max-w-md mx-auto">
        <FileText size={36} className="mx-auto text-gray-700 mb-3" />
        <p>Remito no encontrado.</p>
        <button onClick={() => navigate('/tienda/administracion/remitos')} className="btn-secondary mt-4 inline-flex">
          <ArrowLeft size={16} /> Volver al historial
        </button>
      </div>
    )
  }

  const orders = Array.isArray(receipt.orders) ? receipt.orders : []

  // Agrupar pedidos por plataforma
  const groupedOrders = orders.reduce((acc, o) => {
    const key = o.source || 'MANUAL'
    if (!acc[key]) acc[key] = []
    acc[key].push(o)
    return acc
  }, {})

  // Orden estable: el orden definido en PLATFORM_ORDER, despues cualquier otra
  const orderedGroupKeys = [
    ...PLATFORM_ORDER.filter(k => groupedOrders[k]),
    ...Object.keys(groupedOrders).filter(k => !PLATFORM_ORDER.includes(k)),
  ]

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-3 flex-wrap">
        <button
          onClick={() => navigate('/tienda/administracion/remitos')}
          className="text-gray-400 hover:text-white transition-colors mt-1"
          title="Volver al historial"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText size={20} className="text-teal-400" />
            <span style={{ textDecoration: 'none' }} className="no-underline font-mono">
              Remito {receipt.receiptNumber}
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {formatLongDate(receipt.issuedAt)}
            {receipt.logisticsCompany?.name && <> · {receipt.logisticsCompany.name}</>}
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-white font-semibold text-sm transition-colors"
        >
          <Printer size={16} /> Imprimir remito
        </button>
      </div>

      {/* Resumen 3 columnas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard
          icon={<Package size={18} className="text-teal-300" />}
          label="Total paquetes"
          value={receipt.totalPackages}
        />
        <SummaryCard
          icon={<DollarSign size={18} className="text-teal-300" />}
          label="Importe total"
          value={`$ ${formatARS(receipt.totalAmount)}`}
        />
        <SummaryCard
          icon={<Truck size={18} className="text-teal-300" />}
          label="Logística destino"
          value={receipt.logisticsCompany?.name || receipt.logisticsNameSnapshot || '—'}
        />
      </div>

      {/* Datos del remito */}
      <div className="card-p space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <FileText size={14} /> Datos del remito
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <DataRow label="Razón social" value={receipt.storeLegalNameSnapshot || receipt.storeNameSnapshot} />
          <DataRow label="CUIT/DNI" value={receipt.storeTaxIdSnapshot || '—'} mono />
          <DataRow label="Dirección" value={receipt.storeAddressSnapshot || '—'} fullWidth />
          <DataRow label="Fecha de emisión" value={formatLongDate(receipt.issuedAt)} />
          <DataRow
            label="Generado por"
            value={receipt.createdBy?.name || receipt.createdBy?.email || '—'}
          />
        </div>
        {receipt.observations && (
          <div className="pt-3 border-t border-navy-800/50">
            <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Observaciones</div>
            <p className="text-sm text-gray-200 whitespace-pre-wrap">{receipt.observations}</p>
          </div>
        )}
      </div>

      {/* Pedidos incluidos */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-navy-800">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Package size={14} /> Pedidos incluidos
            <span className="ml-auto text-[11px] text-gray-500 normal-case tracking-normal">
              {orders.length} en total
            </span>
          </h2>
        </div>

        {orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No hay pedidos asociados a este remito.
          </div>
        ) : (
          orderedGroupKeys.map(platformKey => {
            const list = groupedOrders[platformKey]
            const info = PLATFORM_INFO[platformKey] || { label: platformKey, badge: null }
            return (
              <div key={platformKey}>
                <div className="px-5 py-2 bg-navy-900/60 border-y border-navy-800/60 text-xs text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  {info.badge}
                  <span className="font-semibold text-gray-300">{info.label}</span>
                  <span className="text-gray-500 normal-case tracking-normal">
                    · {list.length} pedido{list.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] text-gray-600 uppercase tracking-wider border-b border-navy-800/50">
                      <th className="text-left p-3 pl-5 w-[140px]">N° pedido</th>
                      <th className="text-left p-3">Cliente</th>
                      <th className="text-left p-3">Dirección</th>
                      <th className="text-left p-3 w-[120px]">Zona</th>
                      <th className="text-left p-3 w-[110px]">Estado</th>
                      <th className="text-right p-3 pr-5 w-[60px]">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map(o => (
                      <tr
                        key={o.id}
                        onClick={() => navigate(`/tienda/pedidos/${o.id}`)}
                        className="table-row cursor-pointer"
                      >
                        <td className="p-3 pl-5">
                          <span className="font-medium text-white">{o.orderNumber}</span>
                        </td>
                        <td className="p-3">
                          <div className="text-gray-200 inline-flex items-center gap-1.5">
                            <User size={12} className="text-gray-500" /> {o.customerName}
                          </div>
                          {o.customerPhone && !/X{4,}/i.test(o.customerPhone) && (
                            <div className="text-xs text-gray-500 mt-0.5">{o.customerPhone}</div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="text-gray-300 max-w-[260px] truncate inline-flex items-center gap-1.5">
                            <MapPin size={12} className="text-gray-500 flex-shrink-0" />
                            <span className="truncate">{o.address}</span>
                          </div>
                          {o.city && <div className="text-xs text-gray-500 mt-0.5">{o.city}</div>}
                        </td>
                        <td className="p-3 text-xs text-gray-300">
                          {o.zone?.name || <span className="text-gray-600">—</span>}
                        </td>
                        <td className="p-3">
                          <span className={STATUS_MAP[o.status]?.color || 'badge'}>
                            {STATUS_MAP[o.status]?.label || o.status}
                          </span>
                        </td>
                        <td className="p-3 pr-5 text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/tienda/pedidos/${o.id}`) }}
                            className="text-gray-500 hover:text-teal-400 transition-colors inline-flex"
                            title="Ver detalle del pedido"
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function SummaryCard({ icon, label, value }) {
  return (
    <div className="card-p flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-gray-500 uppercase tracking-wider">{label}</div>
        <div className="text-lg font-bold text-white truncate" title={String(value)}>{value}</div>
      </div>
    </div>
  )
}

function DataRow({ label, value, mono, fullWidth }) {
  return (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`text-gray-200 ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  )
}
