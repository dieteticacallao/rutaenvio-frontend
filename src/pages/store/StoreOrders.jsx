import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, STATUS_MAP } from '../../lib/store'
import { Package, Search, X, MapPin, Loader2, Truck, Eye } from 'lucide-react'
import toast from 'react-hot-toast'

export default function StoreOrders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ status: '', page: 1 })
  const [searchQuery, setSearchQuery] = useState('')

  const loadOrders = useCallback(() => {
    setLoading(true)
    const params = { page: filter.page, limit: 30 }
    if (filter.status && filter.status !== 'EN_RUTA') {
      params.status = filter.status
    } else if (filter.status === 'EN_RUTA') {
      params.status = 'ASSIGNED,PICKED_UP,IN_TRANSIT,ARRIVED'
    }
    api.get('/orders', { params }).then(r => {
      const d = r.data
      const list = Array.isArray(d) ? d : Array.isArray(d?.orders) ? d.orders : []
      setOrders(list)
      setTotal(d?.total ?? list.length)
      setLoading(false)
    }).catch(() => { setOrders([]); setLoading(false) })
  }, [filter])

  useEffect(() => { loadOrders() }, [loadOrders])

  const handleAssignPlaceholder = (order) => {
    toast('Asignar a logistica - proximamente', { icon: 'ℹ️' })
  }

  const safeOrders = Array.isArray(orders) ? orders : []
  const filteredOrders = safeOrders.filter(order => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (order.orderNumber || '').toLowerCase().includes(q) ||
        (order.customerName || '').toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Package size={20} className="text-teal-400" /> Pedidos
          </h1>
          <p className="text-sm text-gray-500">{total} total</p>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex gap-1.5 flex-wrap">
        {[
          { value: '', label: 'Todos' },
          { value: 'PENDING', label: 'Pendientes' },
          { value: 'EN_RUTA', label: 'En ruta' },
          { value: 'DELIVERED', label: 'Entregados' },
          { value: 'CANCELLED', label: 'Cancelados' },
        ].map(s => (
          <button key={s.value} onClick={() => setFilter(f => ({ ...f, status: s.value, page: 1 }))}
            className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 ${
              filter.status === s.value ? 'bg-teal-500 text-white' : 'bg-navy-800 text-gray-400 hover:text-white'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex-1 min-w-[200px] max-w-md">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por numero de pedido o cliente..."
            className="input pl-9 w-full"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-800 text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left p-3 pl-4">Pedido</th>
              <th className="text-left p-3">Cliente</th>
              <th className="text-left p-3">Direccion</th>
              <th className="text-left p-3">Fecha</th>
              <th className="text-left p-3">Estado</th>
              <th className="text-left p-3">Logistica</th>
              <th className="text-right p-3 pr-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-8 text-center text-gray-500"><Loader2 size={24} className="animate-spin inline-block mr-2" />Cargando pedidos...</td></tr>
            ) : filteredOrders.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-gray-500">{orders.length === 0 ? 'No hay pedidos. Importá desde Tiendanube, MercadoLibre o Excel.' : 'No se encontraron pedidos con esos filtros.'}</td></tr>
            ) : filteredOrders.map(order => (
              <tr key={order.id} className="table-row">
                <td className="p-3 pl-4">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-white">{order.orderNumber}</span>
                    {order.source === 'TIENDANUBE' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/20">TN</span>}
                    {order.source === 'MERCADOLIBRE' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-yellow-400/40" style={{backgroundColor: '#FFE600', color: '#000'}}>ML</span>}
                    {order.source === 'EXCEL' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">XLS</span>}
                    {order.source === 'MANUAL' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/20">MAN</span>}
                  </div>
                </td>
                <td className="p-3">
                  <div className="text-gray-200">{order.customerName}</div>
                  {order.customerPhone && !/X{4,}/i.test(order.customerPhone) && <div className="text-xs text-gray-500">{order.customerPhone}</div>}
                </td>
                <td className="p-3">
                  <div className="text-gray-300 max-w-[200px] truncate">{order.address}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    {order.lat ? <><MapPin size={10} className="text-emerald-400" /> Geocodificado</> : <><MapPin size={10} className="text-amber-400" /> Sin ubicacion</>}
                  </div>
                </td>
                <td className="p-3 text-gray-400 text-xs whitespace-nowrap">{order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) : '—'}</td>
                <td className="p-3">
                  <span className={STATUS_MAP[order.status]?.color || 'badge'}>
                    {STATUS_MAP[order.status]?.label || order.status}
                  </span>
                </td>
                <td className="p-3 text-gray-400 text-xs">
                  {order.logisticId ? 'Asignada' : <span className="text-amber-400">Sin asignar</span>}
                </td>
                <td className="p-3 pr-4 text-right flex items-center justify-end gap-1">
                  <button onClick={() => navigate(`/tienda/pedidos/${order.id}`)} className="text-gray-500 hover:text-teal-400 transition-colors" title="Ver detalle">
                    <Eye size={16} />
                  </button>
                  {!order.logisticId && (
                    <button
                      onClick={() => handleAssignPlaceholder(order)}
                      className="text-[11px] px-2 py-1 rounded-md bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 transition-colors flex items-center gap-1"
                      title="Asignar a logistica"
                    >
                      <Truck size={12} /> Asignar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 30 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setFilter(f => ({ ...f, page: f.page - 1 }))} disabled={filter.page <= 1} className="btn-ghost text-xs">Anterior</button>
          <span className="text-sm text-gray-500 self-center">Página {filter.page}</span>
          <button onClick={() => setFilter(f => ({ ...f, page: f.page + 1 }))} disabled={orders.length < 30} className="btn-ghost text-xs">Siguiente</button>
        </div>
      )}
    </div>
  )
}
