import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, STATUS_MAP, useAuth } from '../../lib/store'
import { Plus, Download, Search, X, MapPin, RefreshCw, Trash2, Pencil, Eye, Loader2, FileSpreadsheet, Link2, ChevronDown, Cloud, ShoppingBag, ShoppingCart } from 'lucide-react'
import toast from 'react-hot-toast'
import OrderModal from '../../components/shared/OrderModal'
import ExcelImportModal from '../../components/shared/ExcelImportModal'
import MLImportModal from '../../components/shared/MLImportModal'
import TNImportModal from '../../components/shared/TNImportModal'

export default function Orders() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isLogistics = user?.role === 'LOGISTICS_ADMIN'
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ status: '', sources: [], zoneIds: [], storeId: '', page: 1 })
  const [zones, setZones] = useState([])
  const [myStores, setMyStores] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
  const [showExcelModal, setShowExcelModal] = useState(false)
  const [showTNModal, setShowTNModal] = useState(false)
  const [showMLModal, setShowMLModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [tnConnected, setTnConnected] = useState(false)
  const [mlConnected, setMlConnected] = useState(false)
  const [importDropdown, setImportDropdown] = useState(false)
  const [syncingML, setSyncingML] = useState(false)
  const importDropdownRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (importDropdownRef.current && !importDropdownRef.current.contains(e.target)) {
        setImportDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    api.get('/dashboard/settings').then(r => {
      setTnConnected(!!r.data?.tnStoreId)
    }).catch(() => {})
    const mlBaseUrl = import.meta.env.VITE_API_URL || '/api'
    const mlToken = localStorage.getItem('token')
    fetch(mlBaseUrl + '/mercadolibre/status', {
      headers: { 'Authorization': 'Bearer ' + mlToken, 'Content-Type': 'application/json' }
    })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(res => setMlConnected(!!res?.data?.connected || !!res?.connected))
      .catch(() => {})
    api.get('/zones').then(r => {
      setZones(r.data?.data || [])
    }).catch(() => {})
    if (isLogistics) {
      api.get('/companies/my-stores').then(r => {
        setMyStores(r.data?.data || [])
      }).catch(() => {})
    }
  }, [isLogistics])

  const loadOrders = useCallback(() => {
    setLoading(true)
    const params = { page: filter.page, limit: 30 }
    if (filter.status && filter.status !== 'EN_RUTA') {
      params.status = filter.status
    } else if (filter.status === 'EN_RUTA') {
      params.status = 'ASSIGNED,PICKED_UP,IN_TRANSIT,ARRIVED'
    }
    if (filter.sources.length > 0) {
      params.source = filter.sources.join(',')
    }
    if (filter.zoneIds.length > 0) {
      params.zoneId = filter.zoneIds.join(',')
    }
    if (filter.storeId) {
      params.storeId = filter.storeId
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

  const handleOrderSaved = (savedOrder, isEdit) => {
    if (isEdit) {
      setOrders(prev => prev.map(o => o.id === savedOrder.id ? { ...o, ...savedOrder } : o))
    } else {
      loadOrders()
    }
  }

  const deleteOrder = async (orderId) => {
    if (!window.confirm('Estas seguro de que queres eliminar este pedido?')) return
    try {
      await api.delete(`/orders/${orderId}`)
      toast.success('Pedido eliminado')
      setOrders(prev => prev.filter(o => o.id !== orderId))
      setTotal(prev => prev - 1)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar')
    }
  }

  const handleTNImport = () => {
    if (!tnConnected) {
      toast.error('Primero conecta Tiendanube en Configuracion')
      return
    }
    setShowTNModal(true)
  }

  const handleMLImport = () => {
    if (!mlConnected) {
      toast.error('Primero conecta MercadoLibre en Configuracion')
      return
    }
    setShowMLModal(true)
  }

  const handleMLSync = async () => {
    setSyncingML(true)
    try {
      const { data } = await api.post('/mercadolibre/sync-all')
      if (data.success) {
        const { updated, errors } = data.data
        toast.success(`Sincronizado: ${updated} pedido${updated !== 1 ? 's' : ''} actualizado${updated !== 1 ? 's' : ''}${errors > 0 ? ` (${errors} error${errors !== 1 ? 'es' : ''})` : ''}`)
        loadOrders()
      } else {
        toast.error(data.error || 'Error al sincronizar')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al sincronizar con MercadoLibre')
    } finally {
      setSyncingML(false)
    }
  }

  // Client-side filtering
  const safeOrders = Array.isArray(orders) ? orders : []
  const filteredOrders = safeOrders.filter(order => {
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchesSearch = (order.orderNumber || '').toLowerCase().includes(q) ||
        (order.customerName || '').toLowerCase().includes(q)
      if (!matchesSearch) return false
    }
    // Date from filter
    if (dateFrom) {
      const orderDate = order.createdAt ? new Date(order.createdAt) : null
      if (!orderDate || orderDate < new Date(dateFrom + 'T00:00:00')) return false
    }
    // Date to filter
    if (dateTo) {
      const orderDate = order.createdAt ? new Date(order.createdAt) : null
      if (!orderDate || orderDate > new Date(dateTo + 'T23:59:59')) return false
    }
    return true
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Pedidos</h1>
          <p className="text-sm text-gray-500">{total} total</p>
        </div>
        <div className="flex gap-2">
          {!isLogistics && (
            <button onClick={() => setShowExcelModal(true)} className="btn-secondary">
              <FileSpreadsheet size={16} /> Importar Excel
            </button>
          )}
          {!isLogistics && (
          <div className="relative" ref={importDropdownRef}>
            <button onClick={() => setImportDropdown(v => !v)} className="btn-secondary">
              <Download size={16} /> Importar <ChevronDown size={14} />
            </button>
            {importDropdown && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-navy-900 border border-navy-700 rounded-xl shadow-xl z-50 overflow-hidden">
                <button
                  onClick={() => { setImportDropdown(false); handleTNImport() }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white hover:bg-navy-800 transition-colors text-left"
                >
                  <Cloud size={16} className="text-purple-400" />
                  <span>Tiendanube</span>
                  {tnConnected && <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">Conectada</span>}
                </button>
                {mlConnected ? (
                  <button
                    onClick={() => { setImportDropdown(false); handleMLImport() }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white hover:bg-navy-800 transition-colors text-left"
                  >
                    <ShoppingBag size={16} className="text-yellow-400" />
                    <span>MercadoLibre</span>
                    <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">Conectada</span>
                  </button>
                ) : (
                  <button disabled className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 cursor-not-allowed text-left">
                    <ShoppingBag size={16} />
                    <span>MercadoLibre</span>
                    <span className="ml-auto text-[9px] text-gray-600">Proximamente</span>
                  </button>
                )}
                <button disabled className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 cursor-not-allowed text-left">
                  <ShoppingCart size={16} />
                  <span>Shopify</span>
                  <span className="ml-auto text-[9px] text-gray-600">Proximamente</span>
                </button>
              </div>
            )}
          </div>
          )}
          {!isLogistics && mlConnected && (
            <button onClick={handleMLSync} disabled={syncingML} className="btn-secondary">
              {syncingML ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Sincronizar ML
            </button>
          )}
          {!isLogistics && (
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <Plus size={16} /> Nuevo pedido
            </button>
          )}
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
              filter.status === s.value ? 'bg-brand-500 text-white' : 'bg-navy-800 text-gray-400 hover:text-white'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Source + Zone multi-select filters */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {!isLogistics && (() => {
          const allSources = ['TIENDANUBE', 'MERCADOLIBRE', 'EXCEL', 'MANUAL']
          const allSelected = allSources.every(s => filter.sources.includes(s))
          const noneSelected = filter.sources.length === 0
          return (
            <button
              onClick={() => setFilter(f => ({ ...f, sources: allSelected || noneSelected ? [] : allSources, page: 1 }))}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition-all duration-200 border ${
                noneSelected ? 'bg-brand-500 text-white border-brand-500' : allSelected ? 'bg-brand-500 text-white border-brand-500' : 'bg-transparent text-gray-400 border-gray-600'
              }`}
            >
              Todos
            </button>
          )
        })()}
        {!isLogistics && [
          { value: 'TIENDANUBE', label: 'TN', bg: '#6E3FA3', text: 'white' },
          { value: 'MERCADOLIBRE', label: 'ML', bg: '#FFE600', text: 'black' },
          { value: 'EXCEL', label: 'XLS', bg: '#217346', text: 'white' },
          { value: 'MANUAL', label: 'MAN', bg: '#6B7280', text: 'white' },
        ].map(s => {
          const isActive = filter.sources.includes(s.value)
          return (
            <button
              key={s.value}
              onClick={() => setFilter(f => {
                const next = f.sources.includes(s.value)
                  ? f.sources.filter(v => v !== s.value)
                  : [...f.sources, s.value]
                return { ...f, sources: next, page: 1 }
              })}
              className="text-[11px] font-bold px-2.5 py-1 rounded-full transition-all duration-200 border"
              style={isActive
                ? { backgroundColor: s.bg, color: s.text, borderColor: s.bg }
                : { backgroundColor: 'transparent', color: s.bg === '#FFE600' ? '#CA8A04' : s.bg, borderColor: s.bg === '#FFE600' ? '#CA8A04' : s.bg + '60' }
              }
            >
              {s.label}
            </button>
          )
        })}

        {zones.length > 0 && (
          <>
            <div className="w-px h-5 bg-navy-700 mx-1" />

            {(() => {
              const allZoneIds = [...zones.map(z => z.id), 'none']
              const allSelected = allZoneIds.every(id => filter.zoneIds.includes(id))
              const noneSelected = filter.zoneIds.length === 0
              return (
                <button
                  onClick={() => setFilter(f => ({ ...f, zoneIds: allSelected || noneSelected ? [] : allZoneIds, page: 1 }))}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition-all duration-200 border ${
                    noneSelected ? 'bg-brand-500 text-white border-brand-500' : allSelected ? 'bg-brand-500 text-white border-brand-500' : 'bg-transparent text-gray-400 border-gray-600'
                  }`}
                >
                  Todas
                </button>
              )
            })()}

            {zones.map(z => {
              const colorMap = {
                'CABA': '#3B82F6',
                'GBA 1': '#22C55E',
                'GBA 2': '#F97316',
                'GBA 3': '#EF4444',
                'Lejana': '#6B7280',
              }
              const color = colorMap[z.name] || '#6B7280'
              const isActive = filter.zoneIds.includes(z.id)
              return (
                <button
                  key={z.id}
                  onClick={() => setFilter(f => {
                    const next = f.zoneIds.includes(z.id)
                      ? f.zoneIds.filter(v => v !== z.id)
                      : [...f.zoneIds, z.id]
                    return { ...f, zoneIds: next, page: 1 }
                  })}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full transition-all duration-200 border"
                  style={isActive
                    ? { backgroundColor: color, color: '#fff', borderColor: color }
                    : { backgroundColor: 'transparent', color: color, borderColor: color + '60' }
                  }
                >
                  {z.name}
                </button>
              )
            })}

            <button
              onClick={() => setFilter(f => {
                const next = f.zoneIds.includes('none')
                  ? f.zoneIds.filter(v => v !== 'none')
                  : [...f.zoneIds, 'none']
                return { ...f, zoneIds: next, page: 1 }
              })}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition-all duration-200 border ${
                filter.zoneIds.includes('none')
                  ? 'bg-gray-500 text-white border-gray-500'
                  : 'bg-transparent text-gray-500 border-gray-500/40'
              }`}
            >
              Sin zona
            </button>
          </>
        )}
      </div>

      {/* Search and date filters */}
      <div className="space-y-3">
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-[200px]">
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
          {isLogistics && (
            <div className="flex items-center gap-1.5">
              <select
                value={filter.storeId}
                onChange={e => setFilter(f => ({ ...f, storeId: e.target.value, page: 1 }))}
                className="input text-xs py-2 px-2.5"
              >
                <option value="">Todos los clientes</option>
                {myStores.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-gray-500">Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="input text-xs py-2 px-2.5 [color-scheme:dark]"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-gray-500">Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="input text-xs py-2 px-2.5 [color-scheme:dark]"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {[
            { label: 'Hoy', fn: () => { const d = toLocalDate(); setDateFrom(d); setDateTo(d) } },
            { label: 'Ayer', fn: () => { const d = toLocalDate(new Date(Date.now() - 86400000)); setDateFrom(d); setDateTo(d) } },
            { label: 'Esta semana', fn: () => { const now = new Date(); const day = now.getDay(); const diff = day === 0 ? 6 : day - 1; const mon = new Date(now); mon.setDate(now.getDate() - diff); setDateFrom(toLocalDate(mon)); setDateTo(toLocalDate(now)) } },
            { label: 'Este mes', fn: () => { const now = new Date(); const first = new Date(now.getFullYear(), now.getMonth(), 1); setDateFrom(toLocalDate(first)); setDateTo(toLocalDate(now)) } },
          ].map(btn => (
            <button key={btn.label} onClick={btn.fn}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-navy-800 text-gray-400 hover:text-white hover:bg-navy-700 transition-colors">
              {btn.label}
            </button>
          ))}
          {(searchQuery || dateFrom || dateTo || filter.status || filter.sources.length > 0 || filter.zoneIds.length > 0 || filter.storeId) && (
            <button
              onClick={() => { setSearchQuery(''); setDateFrom(''); setDateTo(''); setFilter(f => ({ ...f, status: '', sources: [], zoneIds: [], storeId: '', page: 1 })) }}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-1"
            >
              <X size={12} /> Limpiar filtros
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
              {isLogistics && <th className="text-left p-3">Tienda</th>}
              <th className="text-left p-3">Cliente</th>
              <th className="text-left p-3">Usuario ML</th>
              <th className="text-left p-3">Direccion</th>
              <th className="text-left p-3">Fecha</th>
              <th className="text-left p-3">Estado</th>
              <th className="text-left p-3">Cadete</th>
              <th className="text-right p-3 pr-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={isLogistics ? 9 : 8} className="p-8 text-center text-gray-500"><Loader2 size={24} className="animate-spin inline-block mr-2" />Cargando pedidos...</td></tr>
            ) : filteredOrders.length === 0 ? (
              <tr><td colSpan={isLogistics ? 9 : 8} className="p-8 text-center text-gray-500">{orders.length === 0 ? (isLogistics ? 'Tus clientes aún no asignaron pedidos a tu logística' : 'No hay pedidos. Importa de Tiendanube o crea uno manual.') : 'No se encontraron pedidos con esos filtros.'}</td></tr>
            ) : filteredOrders.map(order => {
              const mlMatch = order.source === 'MERCADOLIBRE' && order.customerName?.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
              const displayName = mlMatch ? mlMatch[1] : order.customerName
              const mlNickname = mlMatch ? mlMatch[2] : null
              return (
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
                {isLogistics && (
                  <td className="p-3 text-gray-300 text-xs">{order.store?.name || '—'}</td>
                )}
                <td className="p-3">
                  <div className="text-gray-200">{displayName}</div>
                  {order.customerPhone && !/X{4,}/i.test(order.customerPhone) && <div className="text-xs text-gray-500">{order.customerPhone}</div>}
                </td>
                <td className="p-3 text-xs text-gray-400">
                  {mlNickname || '—'}
                </td>
                <td className="p-3">
                  <div className="text-gray-300 max-w-[200px] truncate">{order.address}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    {order.lat ? <><MapPin size={10} className="text-emerald-400" /> Geocodificado</> : <><MapPin size={10} className="text-amber-400" /> Sin ubicacion</>}
                  </div>
                </td>
                <td className="p-3 text-gray-400 text-xs whitespace-nowrap">{order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) : '\u2014'}</td>
                <td className="p-3">
                  <span className={STATUS_MAP[order.status]?.color || 'badge'}>
                    {STATUS_MAP[order.status]?.label || order.status}
                  </span>
                </td>
                <td className="p-3 text-gray-400">{order.driver?.name || '—'}</td>
                <td className="p-3 pr-4 text-right flex items-center justify-end gap-1">
                  <button onClick={() => navigate(`/orders/${order.id}`)} className="text-gray-500 hover:text-emerald-400 transition-colors" title="Ver detalle">
                    <Eye size={16} />
                  </button>
                  {order.trackingCode && (
                    <button
                      onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/track/${order.trackingCode}`); toast.success('Link copiado') }}
                      className="text-gray-500 hover:text-brand-400 transition-colors"
                      title="Copiar link de tracking"
                    >
                      <Link2 size={16} />
                    </button>
                  )}
                  <button onClick={() => setEditingOrder(order)} className="text-gray-500 hover:text-brand-400 transition-colors" title="Editar pedido">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => deleteOrder(order.id)} className="text-gray-500 hover:text-red-400 transition-colors" title="Eliminar pedido">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
              )
            })}
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

      {/* Create Order Modal */}
      {showCreate && <OrderModal onClose={() => setShowCreate(false)} onSaved={handleOrderSaved} />}
      {editingOrder && <OrderModal order={editingOrder} onClose={() => setEditingOrder(null)} onSaved={handleOrderSaved} />}
      {showExcelModal && <ExcelImportModal onClose={() => setShowExcelModal(false)} onImported={loadOrders} />}
      {showTNModal && <TNImportModal onClose={() => setShowTNModal(false)} onImported={loadOrders} />}
      {showMLModal && <MLImportModal onClose={() => setShowMLModal(false)} onImported={loadOrders} />}
    </div>
  )
}

function toLocalDate(date) {
  const d = date || new Date()
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
}
