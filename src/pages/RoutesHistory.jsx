import { useState, useEffect } from 'react'
import { api, STATUS_MAP } from '../lib/store'
import { Clock, Package, QrCode, Copy, MessageCircle, ArrowLeft, ChevronRight, Search, Filter, XCircle, X, Printer } from 'lucide-react'
import toast from 'react-hot-toast'

const ROUTE_STATUS = {
  PENDING: { label: 'Pendiente', className: 'bg-gray-500/10 text-gray-400 border border-gray-500/20' },
  CONFIRMED: { label: 'En camino', className: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  IN_PROGRESS: { label: 'En camino', className: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  COMPLETED: { label: 'Finalizada', className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  CANCELLED: { label: 'Cancelada', className: 'bg-red-500/10 text-red-400 border border-red-500/20' }
}

export default function RoutesHistory() {
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')
  const [qrModal, setQrModal] = useState(null) // { qrCode, name }

  useEffect(() => {
    fetchRoutes()
  }, [filterStatus])

  const fetchRoutes = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterStatus) params.status = filterStatus
      const { data } = await api.get('/routes', { params })
      setRoutes(data)
    } catch {
      toast.error('Error al cargar historial')
    }
    setLoading(false)
  }

  const openDetail = async (routeId) => {
    setLoadingDetail(true)
    try {
      const { data } = await api.get(`/routes/${routeId}`)
      setSelectedRoute(data)
    } catch {
      toast.error('Error al cargar detalle')
    }
    setLoadingDetail(false)
  }

  const cancelRoute = async (routeId) => {
    if (!window.confirm('Estas seguro de que queres cancelar esta ruta? Los pedidos no entregados vuelven a estado pendiente.')) return
    try {
      await api.put(`/routes/${routeId}/cancel`)
      toast.success('Ruta cancelada')
      fetchRoutes()
      if (selectedRoute?.id === routeId) {
        setSelectedRoute(null)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cancelar la ruta')
    }
  }

  const removeOrder = async (routeId, orderId, customerName) => {
    if (!window.confirm(`Sacar el pedido de ${customerName} de esta ruta?`)) return
    try {
      await api.put(`/routes/${routeId}/remove-order/${orderId}`)
      toast.success('Pedido removido de la ruta')
      openDetail(routeId)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al sacar el pedido')
    }
  }

  const hasUndelivered = (orders) => {
    if (!orders) return false
    return orders.some(o => o.status !== 'DELIVERED')
  }

  const getRouteLink = (route) => {
    if (!route.linkToken) return null
    return `${window.location.origin}/ruta/${route.linkToken}`
  }

  const getStatusBadge = (status) => {
    const s = ROUTE_STATUS[status] || { label: status, className: 'bg-navy-800 text-gray-400' }
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.className}`}>{s.label}</span>
  }

  const getDeliveredCount = (orders) => {
    if (!orders) return 0
    return orders.filter(o => o.status === 'DELIVERED').length
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  }

  const getDuration = (startStr, endStr) => {
    if (!startStr) return '—'
    const start = new Date(startStr)
    const end = endStr ? new Date(endStr) : new Date()
    const mins = Math.round((end - start) / 60000)
    if (mins < 60) return `${mins} min`
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h}h ${m}m`
  }

  const getFinishTime = (route) => {
    if (route.status === 'COMPLETED' && route.completedAt) return formatTime(route.completedAt)
    if (route.status === 'COMPLETED' && route.finishedAt) return formatTime(route.finishedAt)
    // For completed routes, use last delivery time
    if (route.status === 'COMPLETED' && route.orders) {
      const delivered = route.orders.filter(o => o.status === 'DELIVERED' && o.deliveredAt)
      if (delivered.length > 0) {
        const last = delivered.reduce((a, b) => new Date(a.deliveredAt) > new Date(b.deliveredAt) ? a : b)
        return formatTime(last.deliveredAt)
      }
    }
    // In progress: show ETA if available
    if (['CONFIRMED', 'IN_PROGRESS'].includes(route.status)) {
      if (route.estimatedEnd) return `ETA ${formatTime(route.estimatedEnd)}`
      return 'En curso'
    }
    return '—'
  }

  const getRouteDuration = (route) => {
    if (!route.startedAt) return '—'
    if (route.status === 'COMPLETED') {
      const endAt = route.completedAt || route.finishedAt
      if (endAt) return getDuration(route.startedAt, endAt)
      // Use last delivery
      if (route.orders) {
        const delivered = route.orders.filter(o => o.status === 'DELIVERED' && o.deliveredAt)
        if (delivered.length > 0) {
          const last = delivered.reduce((a, b) => new Date(a.deliveredAt) > new Date(b.deliveredAt) ? a : b)
          return getDuration(route.startedAt, last.deliveredAt)
        }
      }
    }
    return getDuration(route.startedAt, null)
  }

  const filteredRoutes = routes.filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.name?.toLowerCase().includes(q) ||
      r.driver?.name?.toLowerCase().includes(q)
    )
  }).sort((a, b) => new Date(b.date) - new Date(a.date))

  // Detail view
  if (selectedRoute) {
    const link = getRouteLink(selectedRoute)
    const deliveredCount = getDeliveredCount(selectedRoute.orders)
    const totalOrders = selectedRoute.orders?.length || 0

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedRoute(null)} className="btn-secondary text-sm">
            <ArrowLeft size={16} /> Volver
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">{selectedRoute.name}</h1>
            <p className="text-sm text-gray-500">
              {selectedRoute.driver?.name} — {deliveredCount}/{totalOrders} entregados — {new Date(selectedRoute.date).toLocaleDateString('es-AR')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(`${api.defaults.baseURL}/routes/${selectedRoute.id}/labels`, '_blank')}
              className="btn-secondary text-xs"
            >
              <Printer size={14} /> Imprimir etiquetas
            </button>
            {hasUndelivered(selectedRoute.orders) && selectedRoute.status !== 'CANCELLED' && (
              <button
                onClick={() => cancelRoute(selectedRoute.id)}
                className="btn-secondary text-xs text-red-400 border-red-500/30 hover:bg-red-500/10"
              >
                <XCircle size={14} /> Cancelar ruta
              </button>
            )}
            {getStatusBadge(selectedRoute.status)}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
          {/* Orders list */}
          <div className="card-p">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Package size={16} className="text-amber-400" /> Pedidos ({totalOrders})
            </h3>
            <div className="space-y-1">
              {selectedRoute.orders?.map(order => {
                const st = STATUS_MAP[order.status] || { label: order.status, color: 'badge-pending' }
                return (
                  <div key={order.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-navy-800/50">
                    <div className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {order.routePosition}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{order.customerName}</div>
                      <div className="text-xs text-gray-500 truncate">{order.address}</div>
                      {order.orderNumber && (
                        <div className="text-[10px] text-gray-600 font-mono">{order.orderNumber}</div>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                    {order.status !== 'DELIVERED' && selectedRoute.status !== 'CANCELLED' && (
                      <button
                        onClick={() => removeOrder(selectedRoute.id, order.id, order.customerName)}
                        className="text-gray-600 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-500/10 flex-shrink-0"
                        title="Sacar de la ruta"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* QR + Link sidebar */}
          <div className="space-y-4">
            {selectedRoute.qrCode && (
              <div className="card-p text-center">
                <h3 className="font-semibold text-white mb-3 flex items-center justify-center gap-2">
                  <QrCode size={16} className="text-brand-400" /> QR de la ruta
                </h3>
                <img src={selectedRoute.qrCode} alt="QR" className="w-48 h-48 mx-auto rounded-lg bg-white p-2" />
                <p className="text-xs text-gray-500 mt-2">
                  El cadete escanea este QR desde la app
                </p>
              </div>
            )}

            {link && (
              <div className="card-p space-y-3">
                <h3 className="font-semibold text-white text-sm">Link de la ruta</h3>
                <div className="flex items-center gap-1.5 bg-navy-900 border border-navy-700 rounded-lg px-3 py-2">
                  <input
                    type="text"
                    readOnly
                    value={link}
                    className="flex-1 bg-transparent text-xs text-brand-300 outline-none truncate"
                    onClick={e => e.target.select()}
                  />
                  <button
                    onClick={() => { navigator.clipboard.writeText(link); toast.success('Link copiado') }}
                    className="text-gray-400 hover:text-brand-400 transition-colors flex-shrink-0"
                    title="Copiar link"
                  >
                    <Copy size={14} />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { navigator.clipboard.writeText(link); toast.success('Link copiado') }}
                    className="btn-secondary text-xs flex-1 justify-center"
                  >
                    <Copy size={14} /> Copiar link
                  </button>
                  {selectedRoute.driver?.phone && (
                    <a
                      href={`https://wa.me/${selectedRoute.driver.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola! Aca tenes tu ruta: ${link}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary text-xs flex-1 justify-center inline-flex items-center gap-1.5"
                    >
                      <MessageCircle size={14} /> WhatsApp
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // List view
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Historial de rutas</h1>
          <p className="text-sm text-gray-500">{routes.length} rutas encontradas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por nombre o cadete..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input w-full pl-9"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="input"
        >
          <option value="">Todos los estados</option>
          <option value="CONFIRMED">En progreso</option>
          <option value="COMPLETED">Completadas</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-500">Cargando historial...</div>
      ) : filteredRoutes.length === 0 ? (
        <div className="card-p text-center py-12">
          <Clock size={40} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">No hay rutas para mostrar</p>
          <p className="text-sm text-gray-600 mt-1">Las rutas confirmadas apareceran aca</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-navy-800 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Cadete</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Inicio</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Fin</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Duracion</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Pedidos</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/50">
              {filteredRoutes.map(route => {
                const link = getRouteLink(route)
                const delivered = getDeliveredCount(route.orders)
                const total = route.orders?.length || route.totalOrders || 0

                return (
                  <tr key={route.id} className="hover:bg-navy-800/30 transition-colors cursor-pointer" onClick={() => openDetail(route.id)}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-white">{new Date(route.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}</div>
                      <div className="text-[10px] text-gray-600">{new Date(route.date).toLocaleDateString('es-AR', { weekday: 'short' })}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {route.driver?.name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(route.status)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
                      {formatTime(route.startedAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
                      {getFinishTime(route)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
                      {getRouteDuration(route)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-white font-medium">{delivered}/{total}</span>
                        {total > 0 && (
                          <div className="w-16 h-1.5 bg-navy-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${delivered === total ? 'bg-emerald-400' : 'bg-brand-400'}`}
                              style={{ width: `${(delivered / total) * 100}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                        {route.qrCode && (
                          <button
                            onClick={() => setQrModal({ qrCode: route.qrCode, name: route.name })}
                            className="text-gray-500 hover:text-brand-400 transition-colors p-1.5 rounded-lg hover:bg-navy-800"
                            title="Ver QR"
                          >
                            <QrCode size={16} />
                          </button>
                        )}
                        {link && (
                          <button
                            onClick={() => { navigator.clipboard.writeText(link); toast.success('Link copiado') }}
                            className="text-gray-500 hover:text-brand-400 transition-colors p-1.5 rounded-lg hover:bg-navy-800"
                            title="Copiar link"
                          >
                            <Copy size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => window.open(`${api.defaults.baseURL}/routes/${route.id}/labels`, '_blank')}
                          className="text-gray-500 hover:text-brand-400 transition-colors p-1.5 rounded-lg hover:bg-navy-800"
                          title="Imprimir etiquetas"
                        >
                          <Printer size={16} />
                        </button>
                        {hasUndelivered(route.orders) && route.status !== 'CANCELLED' && (
                          <button
                            onClick={() => cancelRoute(route.id)}
                            className="text-gray-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
                            title="Cancelar ruta"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                        <ChevronRight size={16} className="text-gray-600 ml-1" />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* QR Modal */}
      {qrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setQrModal(null)}>
          <div className="bg-navy-900 rounded-xl p-6 max-w-sm w-full mx-4 text-center" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-white mb-4">{qrModal.name}</h3>
            <img src={qrModal.qrCode} alt="QR" className="w-56 h-56 mx-auto rounded-lg bg-white p-3" />
            <p className="text-xs text-gray-500 mt-3">El cadete escanea este QR desde la app</p>
            <button onClick={() => setQrModal(null)} className="btn-secondary mt-4 mx-auto">Cerrar</button>
          </div>
        </div>
      )}

      {loadingDetail && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="text-gray-400 text-sm">Cargando detalle...</div>
        </div>
      )}
    </div>
  )
}
