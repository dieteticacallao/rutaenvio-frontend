import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, STATUS_MAP } from '../../lib/store'
import { Clock, Package, QrCode, Copy, MessageCircle, ArrowLeft, ChevronRight, Search, Filter, XCircle, X, Printer, Trash2, CheckCircle2, Eye } from 'lucide-react'
import toast from 'react-hot-toast'

const ROUTE_STATUS_MAP = {
  PENDING: { label: 'Pendiente', className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  CONFIRMED: { label: 'En camino', className: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  IN_PROGRESS: { label: 'En camino', className: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  COMPLETED: { label: 'Finalizada', className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  CANCELLED: { label: 'Cancelada', className: 'bg-red-500/10 text-red-400 border border-red-500/20' }
}

export default function RoutesHistory() {
  const navigate = useNavigate()
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
    if (!window.confirm('¿Cancelar esta ruta? Los pedidos vuelven a Pendiente.')) return
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


  const finishRoute = async (route) => {
    const orders = route.orders || []
    const delivered = orders.filter(o => o.status === 'DELIVERED').length
    const total = orders.length
    const pending = total - delivered
    const driverName = route.driver?.name || route.driverName || 'cadete'
    const msg = pending > 0
      ? `Finalizar ruta de ${driverName}? Se entregaron ${delivered} de ${total} pedidos. Los ${pending} pedidos no entregados volveran a Pendientes para poder reprogramarlos.`
      : `Finalizar ruta de ${driverName}? Se entregaron todos los ${total} pedidos.`
    if (!window.confirm(msg)) return
    try {
      await api.post(`/routes/${route.id}/finish`)
      toast.success('Ruta finalizada')
      fetchRoutes()
      if (selectedRoute?.id === route.id) {
        openDetail(route.id)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al finalizar la ruta')
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

  const computeRouteStatus = (route) => {
    // If backend provides status, use it but validate
    if (route.status === 'CANCELLED') return 'CANCELLED'
    if (route.status === 'COMPLETED') return 'COMPLETED'

    // Calculate from data
    const orders = route.orders || []
    const total = orders.length || route.totalOrders || 0
    const delivered = orders.filter(o => o.status === 'DELIVERED').length

    if (total > 0 && delivered === total) return 'COMPLETED'
    if (route.startedAt) return 'IN_PROGRESS'
    if (route.status === 'CONFIRMED' || route.status === 'IN_PROGRESS') return 'IN_PROGRESS'
    return 'PENDING'
  }

  const getStatusBadge = (route) => {
    const key = typeof route === 'string' ? route : computeRouteStatus(route)
    const s = ROUTE_STATUS_MAP[key] || { label: key, className: 'bg-navy-800 text-gray-400 border border-navy-700' }
    return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.className}`}>{s.label}</span>
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
    const routeStatus = computeRouteStatus(route)
    if (routeStatus === 'COMPLETED') {
      if (route.completedAt) return formatTime(route.completedAt)
      if (route.finishedAt) return formatTime(route.finishedAt)
      if (route.orders) {
        const delivered = route.orders.filter(o => o.status === 'DELIVERED' && o.deliveredAt)
        if (delivered.length > 0) {
          const last = delivered.reduce((a, b) => new Date(a.deliveredAt) > new Date(b.deliveredAt) ? a : b)
          return formatTime(last.deliveredAt)
        }
      }
      return '—'
    }
    if (routeStatus === 'CANCELLED') return '—'
    if (routeStatus === 'IN_PROGRESS') {
      if (route.estimatedEndAt) return `ETA ${formatTime(route.estimatedEndAt)}`
      return 'En curso'
    }
    return '—'
  }

  const getRouteDuration = (route) => {
    if (!route.startedAt) return '—'
    const routeStatus = computeRouteStatus(route)
    if (routeStatus === 'COMPLETED' || routeStatus === 'CANCELLED') {
      // Duracion fija - no seguir contando
      if (route.durationMinutes) {
        if (route.durationMinutes < 60) return `${route.durationMinutes} min`
        const h = Math.floor(route.durationMinutes / 60)
        const m = route.durationMinutes % 60
        return `${h}h ${m}m`
      }
      const endAt = route.completedAt || route.finishedAt
      if (endAt) return getDuration(route.startedAt, endAt)
      if (route.orders) {
        const delivered = route.orders.filter(o => o.status === 'DELIVERED' && o.deliveredAt)
        if (delivered.length > 0) {
          const last = delivered.reduce((a, b) => new Date(a.deliveredAt) > new Date(b.deliveredAt) ? a : b)
          return getDuration(route.startedAt, last.deliveredAt)
        }
      }
      return '—'
    }
    // IN_PROGRESS: duracion dinamica
    return getDuration(route.startedAt, null)
  }

  const filteredRoutes = routes.filter(r => {
    // Hide routes with 0 orders
    const total = r.orders?.length || r.totalOrders || 0
    if (total === 0) return false
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
            {computeRouteStatus(selectedRoute) === 'IN_PROGRESS' && (
              <button
                onClick={() => finishRoute(selectedRoute)}
                className="btn-secondary text-xs text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
              >
                <CheckCircle2 size={14} /> Finalizar ruta
              </button>
            )}
            {hasUndelivered(selectedRoute.orders) && selectedRoute.status !== 'CANCELLED' && computeRouteStatus(selectedRoute) !== 'COMPLETED' && (
              <button
                onClick={() => cancelRoute(selectedRoute.id)}
                className="btn-secondary text-xs text-red-400 border-red-500/30 hover:bg-red-500/10"
              >
                <XCircle size={14} /> Cancelar ruta
              </button>
            )}
            {getStatusBadge(selectedRoute)}
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
                const trackingLink = order.trackingCode ? `https://rutaenvio-frontend.vercel.app/track/${order.trackingCode}` : null
                return (
                  <div key={order.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-navy-800/50 cursor-pointer group" onClick={() => navigate(`/orders/${order.id}`)}>
                    <div className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {order.routePosition}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{order.customerName}</div>
                      <div className="text-xs text-gray-500 truncate">{order.address}</div>
                      {order.orderNumber && (
                        <div className="text-[10px] text-gray-600 font-mono">#{order.orderNumber}</div>
                      )}
                      {order.isRescheduled && order.rescheduledReason && (
                        <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                          Motivo: {order.rescheduledReason}
                        </div>
                      )}
                    </div>
                    {order.isRescheduled ? (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-medium whitespace-nowrap"
                        title={order.rescheduledReason || 'Pedido reprogramado'}
                      >
                        Reprogramado
                      </span>
                    ) : (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                    )}
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      {trackingLink && (
                        <button
                          onClick={() => { navigator.clipboard.writeText(trackingLink); toast.success('Link de tracking copiado') }}
                          className="text-gray-600 hover:text-brand-400 transition-colors p-1.5 rounded-lg hover:bg-navy-800"
                          title="Copiar link de tracking"
                        >
                          <Copy size={14} />
                        </button>
                      )}
                      {trackingLink && order.customerPhone && (
                        <a
                          href={`https://wa.me/${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${order.customerName}! Tu pedido #${order.orderNumber || ''} esta en camino. Podes seguirlo aca: ${trackingLink}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-emerald-400 transition-colors p-1.5 rounded-lg hover:bg-emerald-500/10"
                          title="Enviar tracking por WhatsApp"
                        >
                          <MessageCircle size={14} />
                        </a>
                      )}
                      <button
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="text-gray-600 hover:text-brand-400 transition-colors p-1.5 rounded-lg hover:bg-navy-800"
                        title="Ver detalle del pedido"
                      >
                        <Eye size={14} />
                      </button>
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
                  </div>
                )
              })}
            </div>
          </div>

          {/* QR + Link sidebar */}
          <div className="space-y-4">
            {(() => {
              const token = selectedRoute.token || selectedRoute.linkToken
              if (!token) return null
              const routeUrl = `https://rutaenvio-frontend.vercel.app/ruta/${token}`
              const phone = (selectedRoute.driver?.phone || '').replace(/\D/g, '')
              const hasPhone = phone.length > 0
              const driverName = selectedRoute.driver?.name || 'cadete'
              const waHref = hasPhone
                ? `https://wa.me/${phone}?text=${encodeURIComponent(`Hola ${driverName}, tu ruta de hoy: ${routeUrl}`)}`
                : null
              return (
                <div className="card-p space-y-3">
                  <h3 className="font-semibold text-white text-sm">Compartir ruta</h3>
                  <div className="flex flex-col gap-2">
                    {hasPhone ? (
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary text-xs justify-center"
                      >
                        <MessageCircle size={14} /> Enviar por WhatsApp
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        title="El cadete no tiene teléfono registrado"
                        className="btn-primary text-xs justify-center opacity-50 cursor-not-allowed"
                      >
                        <MessageCircle size={14} /> Enviar por WhatsApp
                      </button>
                    )}
                    <a
                      href={routeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary text-xs justify-center"
                    >
                      <Eye size={14} /> Ver ruta
                    </a>
                  </div>
                </div>
              )
            })()}

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
          <h1 className="text-xl font-bold text-white">Rutas</h1>
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
                      {getStatusBadge(route)}
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
                          <>
                            <button
                              onClick={() => { navigator.clipboard.writeText(link); toast.success('Link copiado') }}
                              className="text-gray-500 hover:text-brand-400 transition-colors p-1.5 rounded-lg hover:bg-navy-800"
                              title="Copiar link"
                            >
                              <Copy size={16} />
                            </button>
                            {route.driver?.phone && (
                              <a
                                href={`https://wa.me/${route.driver.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola! Aca tenes tu ruta: ${link}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-500 hover:text-emerald-400 transition-colors p-1.5 rounded-lg hover:bg-navy-800"
                                title="Enviar por WhatsApp"
                              >
                                <MessageCircle size={16} />
                              </a>
                            )}
                          </>
                        )}
                        <button
                          onClick={() => window.open(`${api.defaults.baseURL}/routes/${route.id}/labels`, '_blank')}
                          className="text-gray-500 hover:text-brand-400 transition-colors p-1.5 rounded-lg hover:bg-navy-800"
                          title="Imprimir etiquetas"
                        >
                          <Printer size={16} />
                        </button>
                        {computeRouteStatus(route) === 'IN_PROGRESS' && (
                          <button
                            onClick={() => finishRoute(route)}
                            className="text-gray-500 hover:text-emerald-400 transition-colors p-1.5 rounded-lg hover:bg-emerald-500/10"
                            title="Finalizar ruta"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        {hasUndelivered(route.orders) && route.status !== 'CANCELLED' && computeRouteStatus(route) !== 'COMPLETED' && (
                          <button
                            onClick={() => cancelRoute(route.id)}
                            className="text-gray-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
                            title="Cancelar ruta"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => cancelRoute(route.id)}
                          className="text-gray-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
                          title="Cancelar ruta"
                        >
                          <Trash2 size={16} />
                        </button>
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
