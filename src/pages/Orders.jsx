import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, STATUS_MAP, useAuth } from '../lib/store'
import { Package, Plus, Download, Search, X, MapPin, RefreshCw, Trash2, Pencil, Eye, Loader2, FileSpreadsheet, Upload, AlertCircle, CheckCircle2, Check, Link2, ChevronDown, Cloud, ShoppingBag, ShoppingCart } from 'lucide-react'
import toast from 'react-hot-toast'

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

function OrderModal({ order, onClose, onSaved }) {
  const isEdit = !!order
  const [form, setForm] = useState({
    customerName: order?.customerName || '', customerPhone: order?.customerPhone || '',
    address: order?.address || '', addressDetail: order?.addressDetail || '',
    city: order?.city || '', province: order?.province || 'Buenos Aires', zipCode: order?.zipcode || '', notes: order?.notes || ''
  })
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const autoDetectProvince = (cp) => {
    if (!cp) return
    const n = parseInt(cp, 10)
    if (isNaN(n)) return
    const first = cp.charAt(0)
    let province = null
    if (first === '1' && n < 1300) province = 'CABA'
    else if (first === '1') province = 'Buenos Aires'
    else if (first === '2') province = 'Santa Fe'
    else if (first === '3') province = 'Entre Rios'
    else if (first === '4') province = 'Tucuman'
    else if (first === '5') province = 'Cordoba'
    else if (first === '6') province = 'La Pampa'
    else if (first === '7') province = 'Neuquen'
    else if (first === '8') province = 'Chubut'
    else if (first === '9') province = 'Tierra del Fuego'
    if (province) setForm(f => ({ ...f, province }))
  }

  const handleZipChange = (e) => {
    const val = e.target.value
    setForm(f => ({ ...f, zipCode: val }))
    autoDetectProvince(val)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.zipCode.trim()) {
      toast.error('El codigo postal es obligatorio')
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        const { data } = await api.put(`/orders/${order.id}`, form)
        toast.success('Pedido actualizado')
        onSaved(data, true)
      } else {
        const { data } = await api.post('/orders', form)
        toast.success('Pedido creado')
        onSaved(data, false)
      }
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || (isEdit ? 'Error al actualizar' : 'Error al crear'))
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <form onClick={e => e.stopPropagation()} onSubmit={handleSubmit} className="card-p w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{isEdit ? 'Editar pedido' : 'Nuevo pedido'}</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Nombre cliente *</label><input className="input" value={form.customerName} onChange={set('customerName')} required /></div>
          <div><label className="label">Telefono</label><input className="input" value={form.customerPhone} onChange={set('customerPhone')} /></div>
        </div>
        <div><label className="label">Direccion *</label><input className="input" placeholder="Av. Corrientes 1234" value={form.address} onChange={set('address')} required /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Depto/piso</label><input className="input" placeholder="3ro B" value={form.addressDetail} onChange={set('addressDetail')} /></div>
          <div><label className="label">Ciudad</label><input className="input" value={form.city} onChange={set('city')} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Provincia</label>
            <select className="input" value={form.province} onChange={set('province')}>
              {['Buenos Aires','CABA','Catamarca','Chaco','Chubut','Cordoba','Corrientes','Entre Rios','Formosa','Jujuy','La Pampa','La Rioja','Mendoza','Misiones','Neuquen','Rio Negro','Salta','San Juan','San Luis','Santa Cruz','Santa Fe','Santiago del Estero','Tierra del Fuego','Tucuman'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div><label className="label">Codigo Postal *</label><input className="input" placeholder="1407" value={form.zipCode} onChange={handleZipChange} required /></div>
        </div>
        <div><label className="label">Notas</label><input className="input" placeholder="Tocar timbre 2B" value={form.notes} onChange={set('notes')} /></div>

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear pedido')}</button>
        </div>
      </form>
    </div>
  )
}

function ExcelImportModal({ onClose, onImported }) {
  const [file, setFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)

  const downloadTemplate = async () => {
    try {
      const response = await api.get('/orders/template', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'plantilla_pedidos.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Error al descargar la plantilla')
    }
  }

  const handleImport = async () => {
    if (!file) {
      toast.error('Selecciona un archivo Excel primero')
      return
    }
    setImporting(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post('/orders/import-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResult(data)
      onImported()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al importar')
    }
    setImporting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="card-p w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Importar pedidos desde Excel</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>

        {!result ? (
          <>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400 mb-2">1. Descarga la plantilla y completa los datos de tus pedidos.</p>
                <button onClick={downloadTemplate} className="btn-secondary text-sm">
                  <Download size={16} /> Descargar plantilla Excel
                </button>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-2">2. Subi el archivo completado.</p>
                <label className="flex items-center gap-3 p-3 border border-dashed border-navy-700 rounded-lg cursor-pointer hover:border-brand-500 transition-colors">
                  <Upload size={20} className="text-gray-500" />
                  <span className="text-sm text-gray-400">
                    {file ? file.name : 'Seleccionar archivo .xlsx'}
                  </span>
                  <input type="file" accept=".xlsx" className="hidden" onChange={e => setFile(e.target.files[0] || null)} />
                </label>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="btn-secondary">Cancelar</button>
              <button onClick={handleImport} disabled={importing || !file} className="btn-primary">
                {importing ? (
                  <><Loader2 size={16} className="animate-spin" /> Importando pedidos...</>
                ) : (
                  <><FileSpreadsheet size={16} /> Importar</>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 size={20} />
                <span className="text-sm font-medium">
                  Se importaron {result.imported} pedidos. {result.errors?.length || 0} errores.
                </span>
              </div>

              {result.errors?.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1 bg-navy-900 rounded-lg p-3">
                  {result.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-red-400">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      <span>Fila {err.row}: {err.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button onClick={onClose} className="btn-primary">Cerrar</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function toLocalDate(date) {
  const d = date || new Date()
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
}

function MLImportModal({ onClose, onImported }) {
  const [mlOrders, setMlOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(new Set())
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState(null)

  // Unique key per order - mlShipmentId is most reliable, fallback to packId, id, or index
  // Use mlShipmentId as primary key - it's unique per shipment in ML
  // Fallback chain ensures uniqueness even with duplicate pack IDs
  const getOrderKey = (order, idx) => {
    if (order.mlShipmentId) return String(order.mlShipmentId)
    if (order.shipmentId) return String(order.shipmentId)
    // packId and id can be duplicated across items in same pack, so suffix with idx
    return `${order.packId || order.id || 'order'}-${idx}`
  }

  useEffect(() => {
    api.get('/mercadolibre/orders')
      .then(r => {
        const d = r.data
        const list = Array.isArray(d) ? d
          : Array.isArray(d?.data) ? d.data
          : Array.isArray(d?.orders) ? d.orders
          : []
        setMlOrders(list)
        setLoading(false)
      })
      .catch(err => {
        setMlOrders([])
        setError(err.response?.data?.error || err.response?.data?.message || 'Error al obtener pedidos de MercadoLibre')
        setLoading(false)
      })
  }, [])

  const toggleSelect = (key) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const importableOrders = mlOrders.filter(o => !o.alreadyImported)

  const toggleAll = () => {
    if (selected.size === importableOrders.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(importableOrders.map((o, i) => getOrderKey(o, i))))
    }
  }

  const handleImport = async () => {
    if (selected.size === 0) {
      toast.error('Selecciona al menos un pedido')
      return
    }
    setImporting(true)
    try {
      const selectedKeys = Array.from(selected)
      // Map keys back to order IDs for the backend
      const selectedOrders = mlOrders.filter((o, i) => selectedKeys.includes(getOrderKey(o, i)))
      const orderIds = selectedOrders.map(o => o.mlShipmentId || o.shipmentId || o.packId || o.id)
      const { data } = await api.post('/mercadolibre/orders/import', {
        orderIds
      })
      const imported = data?.imported ?? orderIds.length
      toast.success(`Se importaron ${imported} pedidos de MercadoLibre`)
      onImported()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al importar')
    }
    setImporting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="card-p w-full max-w-4xl space-y-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Importar pedidos
              <span className="inline-flex items-center gap-1 text-sm font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FFE600', color: '#000' }}>
                <ShoppingBag size={14} /> ML
              </span>
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-gray-500">Pedidos Flex pendientes de envio</p>
              <button
                onClick={() => {
                  setLoading(true)
                  setError(null)
                  setSelected(new Set())
                  api.post('/mercadolibre/orders/refresh')
                    .then(r => {
                      const d = r.data
                      const list = Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : Array.isArray(d?.orders) ? d.orders : []
                      setMlOrders(list)
                      setLoading(false)
                    })
                    .catch(err => {
                      setMlOrders([])
                      setError(err.response?.data?.error || 'Error al refrescar pedidos')
                      setLoading(false)
                    })
                }}
                disabled={loading}
                className="text-gray-500 hover:text-white transition-colors p-0.5"
                title="Refrescar desde MercadoLibre"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <Loader2 size={24} className="animate-spin mr-2" /> Cargando pedidos Flex...
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-red-400 py-8 justify-center">
            <AlertCircle size={20} />
            <span className="text-sm">{error}</span>
          </div>
        ) : mlOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No hay pedidos Flex pendientes de envio.</p>
            <button onClick={onClose} className="btn-secondary mt-4">Cerrar</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{importableOrders.length} pedidos nuevos{mlOrders.length > importableOrders.length ? ` (${mlOrders.length - importableOrders.length} ya importados)` : ''}</span>
              <span className="text-gray-500">{selected.size} seleccionados</span>
            </div>

            <div className="overflow-y-auto flex-1 min-h-0 border border-navy-800 rounded-lg">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-navy-900 z-10">
                  <tr className="border-b border-navy-800 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="p-2 pl-3 text-left w-8">
                      <input
                        type="checkbox"
                        checked={selected.size === importableOrders.length && importableOrders.length > 0}
                        onChange={toggleAll}
                        className="rounded border-navy-700 bg-navy-900 text-brand-500"
                      />
                    </th>
                    <th className="p-2 text-left">Cliente</th>
                    <th className="p-2 text-left">Usuario ML</th>
                    <th className="p-2 text-left">Direccion</th>
                    <th className="p-2 text-left">Ciudad</th>
                    <th className="p-2 pr-3 text-left">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-800/50">
                  {mlOrders.map((order, idx) => {
                    const imported = order.alreadyImported
                    const key = getOrderKey(order, idx)
                    const dateRaw = order.dateCreated || order.createdAt || order.date_created
                    const dateStr = dateRaw ? new Date(dateRaw).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) : '\u2014'
                    return (
                      <tr
                        key={key}
                        onClick={() => !imported && toggleSelect(key)}
                        className={`transition-colors ${imported ? 'opacity-40' : 'cursor-pointer'} ${
                          !imported && selected.has(key) ? 'bg-brand-500/5' : !imported ? 'hover:bg-navy-800/30' : ''
                        }`}
                      >
                        <td className="p-2 pl-3" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={!imported && selected.has(key)}
                            onChange={() => !imported && toggleSelect(key)}
                            disabled={imported}
                            className="rounded border-navy-700 bg-navy-900 text-brand-500 disabled:opacity-30"
                          />
                        </td>
                        <td className="p-2 text-gray-300 truncate max-w-[160px]">
                          <span className="inline-flex items-center gap-1">
                            {order.customerName || '\u2014'}
                            {imported && <Check size={12} className="text-emerald-500 shrink-0" />}
                          </span>
                        </td>
                        <td className="p-2 text-gray-400 truncate max-w-[120px] text-xs">{order.buyerNickname || order.buyer?.nickname || '\u2014'}</td>
                        <td className="p-2 text-gray-400 truncate max-w-[200px]">{order.address || order.shipping?.receiver_address?.street_name || '\u2014'}</td>
                        <td className="p-2 text-gray-400 truncate max-w-[100px]">{order.city || order.shipping?.receiver_address?.city?.name || '\u2014'}</td>
                        <td className="p-2 pr-3 text-gray-400 text-xs whitespace-nowrap">{dateStr}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-navy-800">
              <button onClick={onClose} className="btn-secondary">Cancelar</button>
              <button onClick={handleImport} disabled={importing || selected.size === 0} className="btn-primary">
                {importing ? (
                  <><Loader2 size={16} className="animate-spin" /> Importando...</>
                ) : (
                  <>Importar {selected.size} pedido{selected.size !== 1 ? 's' : ''} seleccionado{selected.size !== 1 ? 's' : ''}</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function TNImportModal({ onClose, onImported }) {
  const today = toLocalDate(new Date())
  const [tnOrders, setTnOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(new Set())
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState(null)
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)

  const fetchTNOrders = useCallback((from, to) => {
    setLoading(true)
    setError(null)
    setSelected(new Set())
    const params = { filter_shipping: 'rutaenvio' }
    if (from) params.date_from = from
    if (to) params.date_to = to
    api.get('/tiendanube/orders', { params })
      .then(r => {
        const d = r.data
        const all = Array.isArray(d) ? d
          : Array.isArray(d?.data) ? d.data
          : Array.isArray(d?.orders) ? d.orders
          : []
        const list = all.filter(order => {
          const s = (order.shippingMethod || order.shipping || order.shipping_option || '').toLowerCase()
          return s.includes('rutaenvio')
        })
        setTnOrders(list)
        setLoading(false)
      })
      .catch(err => {
        setTnOrders([])
        setError(err.response?.data?.error || 'Error al obtener pedidos de Tiendanube')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    fetchTNOrders(dateFrom, dateTo)
  }, [dateFrom, dateTo, fetchTNOrders])

  const setQuickDate = (from, to) => {
    setDateFrom(from)
    setDateTo(to)
  }

  const yesterday = toLocalDate(new Date(Date.now() - 86400000))
  const threeDaysAgo = toLocalDate(new Date(Date.now() - 3 * 86400000))
  const sevenDaysAgo = toLocalDate(new Date(Date.now() - 7 * 86400000))

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const importableOrders = tnOrders.filter(o => !o.alreadyImported)

  const toggleAll = () => {
    if (selected.size === importableOrders.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(importableOrders.map(o => o.id)))
    }
  }

  const handleImport = async () => {
    if (selected.size === 0) {
      toast.error('Selecciona al menos un pedido')
      return
    }
    setImporting(true)
    try {
      const selectedIds = Array.from(selected)
      const selectedOrders = tnOrders.filter(o => selected.has(o.id))
      const { data } = await api.post('/tiendanube/import', {
        orderIds: selectedIds,
        orders: selectedOrders
      })
      const imported = data?.imported ?? selectedIds.length
      toast.success(`Se importaron ${imported} pedidos`)
      onImported()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al importar')
    }
    setImporting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="card-p w-full max-w-4xl space-y-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Importar pedidos
              <span className="inline-flex items-center gap-1 text-sm font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/20">
                <Cloud size={14} /> TN
              </span>
            </h2>
            <p className="text-sm text-gray-500 mt-1">Pedidos con envio RutaEnvio pendientes</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: 'Hoy', from: today, to: today },
            { label: 'Ayer', from: yesterday, to: yesterday },
            { label: '3 dias', from: threeDaysAgo, to: today },
            { label: '7 dias', from: sevenDaysAgo, to: today },
          ].map(btn => (
            <button
              key={btn.label}
              onClick={() => setQuickDate(btn.from, btn.to)}
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
            <input
              type="date"
              value={dateFrom}
              onChange={e => { if (e.target.value) setDateFrom(e.target.value) }}
              className="input text-xs py-1.5 px-2 cursor-pointer [color-scheme:dark]"
            />
            <label className="text-xs text-gray-500">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => { if (e.target.value) setDateTo(e.target.value) }}
              className="input text-xs py-1.5 px-2 cursor-pointer [color-scheme:dark]"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <Loader2 size={24} className="animate-spin mr-2" /> Cargando pedidos de Tiendanube...
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-red-400 py-8 justify-center">
            <AlertCircle size={20} />
            <span className="text-sm">{error}</span>
          </div>
        ) : tnOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No hay pedidos de Tiendanube pendientes.</p>
            <button onClick={onClose} className="btn-secondary mt-4">Cerrar</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{importableOrders.length} pedidos nuevos con envio RutaEnvio{tnOrders.length > importableOrders.length ? ` (${tnOrders.length - importableOrders.length} ya importados)` : ''}</span>
              <span className="text-gray-500">{selected.size} seleccionados</span>
            </div>

            <div className="overflow-y-auto flex-1 min-h-0 border border-navy-800 rounded-lg">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-navy-900 z-10">
                  <tr className="border-b border-navy-800 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="p-2 pl-3 text-left w-8">
                      <input
                        type="checkbox"
                        checked={selected.size === importableOrders.length && importableOrders.length > 0}
                        onChange={toggleAll}
                        className="rounded border-navy-700 bg-navy-900 text-brand-500"
                      />
                    </th>
                    <th className="p-2 text-left">Pedido</th>
                    <th className="p-2 text-left">Cliente</th>
                    <th className="p-2 text-left">Direccion</th>
                    <th className="p-2 text-left">Ciudad</th>
                    <th className="p-2 text-left">Envio</th>
                    <th className="p-2 pr-3 text-left">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-800/50">
                  {tnOrders.map(order => {
                    const imported = order.alreadyImported
                    return (
                      <tr
                        key={order.id}
                        onClick={() => !imported && toggleSelect(order.id)}
                        className={`transition-colors ${imported ? 'opacity-40' : 'cursor-pointer'} ${
                          !imported && selected.has(order.id) ? 'bg-brand-500/5' : !imported ? 'hover:bg-navy-800/30' : ''
                        }`}
                      >
                        <td className="p-2 pl-3" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={!imported && selected.has(order.id)}
                            onChange={() => !imported && toggleSelect(order.id)}
                            disabled={imported}
                            className="rounded border-navy-700 bg-navy-900 text-brand-500 disabled:opacity-30"
                          />
                        </td>
                        <td className="p-2 font-mono text-xs">
                          <span className="inline-flex items-center gap-1">
                            <span className={imported ? 'text-gray-500' : 'text-white'}>#{order.number || order.orderNumber || order.id}</span>
                            {imported && <Check size={12} className="text-emerald-500" />}
                          </span>
                        </td>
                        <td className="p-2 text-gray-300 truncate max-w-[140px]">{order.customerName || order.customer?.name || order.contact_name || 'Sin nombre'}</td>
                        <td className="p-2 text-gray-400 truncate max-w-[180px]">{order.address || order.shipping_address?.address || order.shipping_address?.street || '\u2014'}</td>
                        <td className="p-2 text-gray-400 truncate max-w-[100px]">{order.city || order.shipping_address?.city || '\u2014'}</td>
                        <td className="p-2 text-gray-400 truncate max-w-[120px] text-xs">{order.shippingMethod || order.shipping_option || order.shipping || '\u2014'}</td>
                        <td className="p-2 pr-3 text-gray-400 text-xs whitespace-nowrap">{order.createdAt || order.created_at ? new Date(order.createdAt || order.created_at).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) : '\u2014'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-navy-800">
              <button onClick={onClose} className="btn-secondary">Cancelar</button>
              <button onClick={handleImport} disabled={importing || selected.size === 0} className="btn-primary">
                {importing ? (
                  <><Loader2 size={16} className="animate-spin" /> Importando...</>
                ) : (
                  <>Importar {selected.size} pedido{selected.size !== 1 ? 's' : ''} seleccionado{selected.size !== 1 ? 's' : ''}</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
