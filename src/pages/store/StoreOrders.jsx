import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, STATUS_MAP } from '../../lib/store'
import { Package, Plus, Download, Search, X, MapPin, Loader2, Truck, Eye, FileSpreadsheet, ChevronDown, Cloud, ShoppingBag, ShoppingCart, Trash2, Printer } from 'lucide-react'
import toast from 'react-hot-toast'
import OrderModal from '../../components/shared/OrderModal'
import ExcelImportModal from '../../components/shared/ExcelImportModal'
import MLImportModal from '../../components/shared/MLImportModal'
import TNImportModal from '../../components/shared/TNImportModal'

export default function StoreOrders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ status: '', source: '', page: 1 })
  const [searchQuery, setSearchQuery] = useState('')
  const [allAcrossPages, setAllAcrossPages] = useState(false)
  const [loadingAllIds, setLoadingAllIds] = useState(false)

  const [showCreate, setShowCreate] = useState(false)
  const [showExcelModal, setShowExcelModal] = useState(false)
  const [showTNModal, setShowTNModal] = useState(false)
  const [showMLModal, setShowMLModal] = useState(false)
  const [tnConnected, setTnConnected] = useState(false)
  const [mlConnected, setMlConnected] = useState(false)
  const [importDropdown, setImportDropdown] = useState(false)
  const importDropdownRef = useRef(null)

  const [selected, setSelected] = useState(new Set())
  const [showAssignModal, setShowAssignModal] = useState(false)

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
    api.get('/tiendanube/status')
      .then(r => setTnConnected(!!(r.data?.data?.connected ?? r.data?.connected)))
      .catch(() => setTnConnected(false))
    api.get('/mercadolibre/status')
      .then(r => setMlConnected(!!(r.data?.data?.connected ?? r.data?.connected)))
      .catch(() => setMlConnected(false))
  }, [])

  const loadOrders = useCallback(() => {
    setLoading(true)
    const params = { page: filter.page, limit: 30 }
    if (filter.status && filter.status !== 'EN_RUTA') {
      params.status = filter.status
    } else if (filter.status === 'EN_RUTA') {
      params.status = 'ASSIGNED,PICKED_UP,IN_TRANSIT,ARRIVED'
    }
    if (filter.source) params.source = filter.source
    api.get('/orders', { params }).then(r => {
      const d = r.data
      const list = Array.isArray(d) ? d : Array.isArray(d?.orders) ? d.orders : []
      setOrders(list)
      setTotal(d?.total ?? list.length)
      // Preserve selection across pagination when cross-page mode is active; reset otherwise
      setAllAcrossPages(prevAcross => {
        if (!prevAcross) setSelected(new Set())
        return prevAcross
      })
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

  const deleteOrder = async (orderId) => {
    if (!window.confirm('¿Eliminar este pedido? Esta acción no se puede deshacer.')) return
    try {
      await api.delete(`/orders/${orderId}`)
      toast.success('Pedido eliminado')
      setOrders(prev => prev.filter(o => o.id !== orderId))
      setTotal(prev => prev - 1)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar')
    }
  }

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
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

  // Todos los pedidos son seleccionables (para poder imprimir etiquetas de pedidos
  // ya asignados a logistica). El backend de assign-logistics maneja solos los
  // que todavia no estan asignados.
  const selectableOrders = filteredOrders
  const allSelected = selectableOrders.length > 0 && selectableOrders.every(o => selected.has(o.id))
  const toggleAll = () => {
    if (allSelected || allAcrossPages) {
      setSelected(new Set())
      setAllAcrossPages(false)
    } else {
      setSelected(new Set(selectableOrders.map(o => o.id)))
      setAllAcrossPages(false)
    }
  }

  const selectAllAcrossPages = async () => {
    setLoadingAllIds(true)
    try {
      const params = {}
      if (filter.status && filter.status !== 'EN_RUTA') params.status = filter.status
      else if (filter.status === 'EN_RUTA') params.status = 'ASSIGNED,PICKED_UP,IN_TRANSIT,ARRIVED'
      if (filter.source) params.source = filter.source
      params.unassignedOnly = 'true'
      const { data } = await api.get('/orders/ids', { params })
      const ids = data?.ids || []
      setSelected(new Set(ids))
      setAllAcrossPages(true)
    } catch {
      toast.error('Error al seleccionar todos los pedidos')
    }
    setLoadingAllIds(false)
  }

  const clearSelection = () => {
    setSelected(new Set())
    setAllAcrossPages(false)
  }

  // Ids no-ML entre los seleccionados visibles. En cross-page no podemos saber
  // cuales son ML sin traerlos, pero el backend filtra los ML automaticamente.
  const nonMLSelectedVisible = safeOrders.filter(o => selected.has(o.id) && o.source !== 'MERCADOLIBRE')
  const allVisibleSelectedAreML = !allAcrossPages && selected.size > 0 &&
    safeOrders.filter(o => selected.has(o.id)).every(o => o.source === 'MERCADOLIBRE')

  const handlePrintLabels = () => {
    if (selected.size === 0) return
    if (allVisibleSelectedAreML) {
      toast('Los pedidos de MercadoLibre no requieren etiqueta', { icon: 'ℹ️' })
      return
    }
    // En modo cross-page no tenemos todos los pedidos cargados, pasamos todos
    // los IDs seleccionados y el backend filtra los ML. Si no es cross-page,
    // filtramos en el front para ser explicitos.
    const ids = allAcrossPages
      ? Array.from(selected)
      : safeOrders.filter(o => selected.has(o.id) && o.source !== 'MERCADOLIBRE').map(o => o.id)
    if (ids.length === 0) {
      toast('Los pedidos de MercadoLibre no requieren etiqueta', { icon: 'ℹ️' })
      return
    }
    const token = localStorage.getItem('token')
    const base = api.defaults.baseURL
    const url = `${base}/orders/labels?ids=${ids.join(',')}&token=${encodeURIComponent(token || '')}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // Count of orders selectable across all pages (approximated: backend /orders returns "total" with current status filter).
  // We already pass unassignedOnly to /ids, so we'll use the ids response count when cross-page is active.
  // For the banner trigger, we assume total matching + unassigned can exceed page size.
  const canOfferSelectAllAcross = allSelected && !allAcrossPages && total > filteredOrders.length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Package size={20} className="text-teal-400" /> Pedidos
          </h1>
          <p className="text-sm text-gray-500">{total} total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowExcelModal(true)} className="btn-secondary">
            <FileSpreadsheet size={16} /> Importar Excel
          </button>
          <div className="relative" ref={importDropdownRef}>
            <button onClick={() => setImportDropdown(v => !v)} className="btn-secondary">
              <Download size={16} /> Importar <ChevronDown size={14} />
            </button>
            {importDropdown && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-navy-900 border border-navy-700 rounded-xl shadow-xl z-50 overflow-hidden">
                <button
                  onClick={() => {
                    setImportDropdown(false)
                    if (tnConnected) setShowTNModal(true)
                    else navigate('/tienda/config')
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white hover:bg-navy-800 transition-colors text-left"
                >
                  <Cloud size={16} className="text-purple-400" />
                  <span>{tnConnected ? 'Tiendanube' : 'Conectar Tiendanube'}</span>
                  {tnConnected && <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">Conectada</span>}
                </button>
                <button
                  onClick={() => {
                    setImportDropdown(false)
                    if (mlConnected) setShowMLModal(true)
                    else navigate('/tienda/config')
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white hover:bg-navy-800 transition-colors text-left"
                >
                  <ShoppingBag size={16} className="text-yellow-400" />
                  <span>{mlConnected ? 'MercadoLibre' : 'Conectar MercadoLibre'}</span>
                  {mlConnected && <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">Conectada</span>}
                </button>
                <button disabled className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 cursor-not-allowed text-left">
                  <ShoppingCart size={16} />
                  <span>Shopify</span>
                  <span className="ml-auto text-[9px] text-gray-600">Proximamente</span>
                </button>
              </div>
            )}
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} /> Nuevo pedido
          </button>
        </div>
      </div>

      {/* Assign bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {[
            { value: '', label: 'Todos' },
            { value: 'PENDING', label: 'Pendientes' },
            { value: 'EN_RUTA', label: 'En ruta' },
            { value: 'DELIVERED', label: 'Entregados' },
            { value: 'CANCELLED', label: 'Cancelados' },
          ].map(s => (
            <button key={s.value} onClick={() => { setSelected(new Set()); setAllAcrossPages(false); setFilter(f => ({ ...f, status: s.value, page: 1 })) }}
              className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 ${
                filter.status === s.value ? 'bg-teal-500 text-white' : 'bg-navy-800 text-gray-400 hover:text-white'
              }`}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selected.size > 0 && (
            <button
              onClick={handlePrintLabels}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors font-medium"
              title={allVisibleSelectedAreML
                ? 'Los pedidos de MercadoLibre no requieren etiqueta'
                : allAcrossPages
                  ? 'Imprimir etiquetas (se excluiran los de ML)'
                  : `Imprimir ${nonMLSelectedVisible.length} etiqueta${nonMLSelectedVisible.length !== 1 ? 's' : ''}${nonMLSelectedVisible.length < selected.size ? ' (se omiten los de ML)' : ''}`}
            >
              <Printer size={14} /> Imprimir etiquetas
            </button>
          )}
          <button
            onClick={() => setShowAssignModal(true)}
            disabled={selected.size === 0}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-teal-500 text-white hover:bg-teal-600 transition-colors disabled:bg-teal-500/10 disabled:text-teal-400/60 disabled:cursor-not-allowed"
          >
            <Truck size={14} /> Asignar {selected.size > 0 ? `${selected.size} pedido${selected.size !== 1 ? 's' : ''}` : 'a logistica'}
          </button>
        </div>
      </div>

      {/* Platform filter chips */}
      <div className="flex gap-1.5 flex-wrap items-center">
        <span className="text-[11px] text-gray-500 uppercase tracking-wider mr-1">Plataforma:</span>
        {[
          { value: '', label: 'Todos', cls: filter.source === '' ? 'bg-teal-500 text-white' : 'bg-navy-800 text-gray-400 hover:text-white' },
          { value: 'TIENDANUBE', label: 'Tiendanube', cls: filter.source === 'TIENDANUBE' ? 'bg-purple-500 text-white border border-purple-400' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20' },
          { value: 'MERCADOLIBRE', label: 'MercadoLibre', cls: filter.source === 'MERCADOLIBRE' ? 'text-black border border-yellow-300' : 'border border-yellow-400/40 text-yellow-300 hover:text-black hover:bg-yellow-400/40', style: filter.source === 'MERCADOLIBRE' ? { backgroundColor: '#FFE600' } : {} },
          { value: 'EXCEL', label: 'Excel', cls: filter.source === 'EXCEL' ? 'bg-emerald-500 text-white border border-emerald-400' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' },
          { value: 'MANUAL', label: 'Manual', cls: filter.source === 'MANUAL' ? 'bg-gray-500 text-white border border-gray-400' : 'bg-gray-500/10 text-gray-300 border border-gray-500/20 hover:bg-gray-500/20' },
        ].map(s => (
          <button key={s.value || 'all'}
            onClick={() => { setSelected(new Set()); setAllAcrossPages(false); setFilter(f => ({ ...f, source: s.value, page: 1 })) }}
            style={s.style}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all duration-200 ${s.cls}`}>
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

      {/* Cross-page selection banner */}
      {(canOfferSelectAllAcross || allAcrossPages) && (
        <div className={`rounded-lg border px-4 py-2.5 text-sm flex items-center justify-between flex-wrap gap-2 ${
          allAcrossPages ? 'bg-teal-500/10 border-teal-500/30 text-teal-300' : 'bg-navy-800/60 border-navy-700 text-gray-300'
        }`}>
          {allAcrossPages ? (
            <>
              <span>
                Seleccionados <strong className="text-white">{selected.size}</strong> pedidos en total (todas las paginas).
              </span>
              <button onClick={clearSelection} className="text-xs font-semibold text-teal-300 hover:text-teal-200 underline">
                Limpiar seleccion
              </button>
            </>
          ) : (
            <>
              <span>
                Seleccionados <strong className="text-white">{selected.size}</strong> pedidos de esta pagina.
                {' '}¿Seleccionar los <strong className="text-white">{total}</strong> pedidos totales?
              </span>
              <button
                onClick={selectAllAcrossPages}
                disabled={loadingAllIds}
                className="text-xs font-semibold text-teal-400 hover:text-teal-300 underline disabled:opacity-50 disabled:cursor-wait inline-flex items-center gap-1"
              >
                {loadingAllIds && <Loader2 size={12} className="animate-spin" />}
                Seleccionar los {total} pedidos
              </button>
            </>
          )}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-800 text-xs text-gray-500 uppercase tracking-wider">
              <th className="p-3 pl-4 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={selectableOrders.length === 0}
                  className="rounded border-navy-700 bg-navy-900 text-teal-500"
                />
              </th>
              <th className="text-left p-3">Pedido</th>
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
              <tr><td colSpan={8} className="p-8 text-center text-gray-500"><Loader2 size={24} className="animate-spin inline-block mr-2" />Cargando pedidos...</td></tr>
            ) : filteredOrders.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-gray-500">{orders.length === 0 ? 'No hay pedidos. Importá desde Tiendanube, MercadoLibre o Excel.' : 'No se encontraron pedidos con esos filtros.'}</td></tr>
            ) : filteredOrders.map(order => {
              return (
                <tr key={order.id} className="table-row">
                  <td className="p-3 pl-4">
                    <input
                      type="checkbox"
                      checked={selected.has(order.id)}
                      onChange={() => toggleSelect(order.id)}
                      className="rounded border-navy-700 bg-navy-900 text-teal-500"
                    />
                  </td>
                  <td className="p-3">
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
                  <td className="p-3 text-xs">
                    {order.logistic?.name ? (
                      <span className="inline-flex items-center gap-1 text-gray-300">
                        <Truck size={12} className="text-teal-400" /> {order.logistic.name}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Sin asignar</span>
                    )}
                  </td>
                  <td className="p-3 pr-4 text-right flex items-center justify-end gap-1">
                    <button onClick={() => navigate(`/tienda/pedidos/${order.id}`)} className="text-gray-500 hover:text-teal-400 transition-colors" title="Ver detalle">
                      <Eye size={16} />
                    </button>
                    {!order.logisticId && (
                      <button onClick={() => deleteOrder(order.id)} className="text-gray-500 hover:text-red-400 transition-colors" title="Eliminar pedido">
                        <Trash2 size={16} />
                      </button>
                    )}
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

      {/* Modals */}
      {showCreate && <OrderModal onClose={() => setShowCreate(false)} onSaved={handleOrderSaved} />}
      {showExcelModal && <ExcelImportModal onClose={() => setShowExcelModal(false)} onImported={loadOrders} />}
      {showTNModal && <TNImportModal onClose={() => setShowTNModal(false)} onImported={loadOrders} />}
      {showMLModal && <MLImportModal onClose={() => setShowMLModal(false)} onImported={loadOrders} />}
      {showAssignModal && (
        <AssignLogisticsModal
          orderIds={Array.from(selected)}
          previewOrders={safeOrders.filter(o => selected.has(o.id))}
          onClose={() => setShowAssignModal(false)}
          onAssigned={() => {
            setSelected(new Set())
            setAllAcrossPages(false)
            setShowAssignModal(false)
            loadOrders()
          }}
        />
      )}
    </div>
  )
}

function AssignLogisticsModal({ orderIds, previewOrders, onClose, onAssigned }) {
  const [logistics, setLogistics] = useState([])
  const [loadingLogistics, setLoadingLogistics] = useState(true)
  const [logisticId, setLogisticId] = useState('')
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    api.get('/companies/my-logistics').then(r => {
      const list = r.data?.data || []
      setLogistics(list)
      if (list.length === 1) setLogisticId(list[0].id)
      setLoadingLogistics(false)
    }).catch(() => { setLogistics([]); setLoadingLogistics(false) })
  }, [])

  const handleConfirm = async () => {
    if (!logisticId) {
      toast.error('Seleccioná una logística')
      return
    }
    setAssigning(true)
    try {
      const { data } = await api.post('/orders/assign-logistics', { orderIds, logisticId })
      const count = data?.data?.assigned ?? orderIds.length
      const logisticName = data?.data?.logistic?.name || logistics.find(l => l.id === logisticId)?.name || 'logística'
      toast.success(`${count} pedido${count !== 1 ? 's' : ''} asignado${count !== 1 ? 's' : ''} a ${logisticName}`)
      onAssigned()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al asignar')
    }
    setAssigning(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="card-p w-full max-w-lg space-y-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Truck size={18} className="text-teal-400" /> Asignar pedidos a logística
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Logística *</label>
          {loadingLogistics ? (
            <div className="text-sm text-gray-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Cargando logísticas...</div>
          ) : logistics.length === 0 ? (
            <div className="text-sm text-amber-400">No tenés logísticas vinculadas. Configurá una en Config.</div>
          ) : (
            <select
              value={logisticId}
              onChange={e => setLogisticId(e.target.value)}
              className="input w-full"
            >
              <option value="">Seleccioná una logística</option>
              {logistics.map(l => (
                <option key={l.id} value={l.id}>{l.name}{l.isExternal ? ' (externa)' : ''}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto border border-navy-800 rounded-lg">
          <div className="px-3 py-2 text-xs text-gray-500 uppercase tracking-wider bg-navy-900 sticky top-0 border-b border-navy-800 flex items-center justify-between">
            <span>{orderIds.length} pedido{orderIds.length !== 1 ? 's' : ''} a asignar</span>
            {previewOrders.length < orderIds.length && (
              <span className="text-[10px] normal-case tracking-normal text-gray-600">
                mostrando {previewOrders.length} de {orderIds.length} — el resto viene de otras paginas
              </span>
            )}
          </div>
          <div className="divide-y divide-navy-800/50">
            {previewOrders.map(o => (
              <div key={o.id} className="px-3 py-2 text-sm">
                <div className="text-gray-200 font-medium">{o.customerName}</div>
                <div className="text-xs text-gray-500 truncate">{o.address}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-navy-800">
          <button onClick={onClose} className="btn-secondary" disabled={assigning}>Cancelar</button>
          <button
            onClick={handleConfirm}
            disabled={assigning || !logisticId || logistics.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm bg-teal-500 text-white hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {assigning ? (
              <><Loader2 size={14} className="animate-spin" /> Asignando...</>
            ) : (
              <>Confirmar asignación</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
