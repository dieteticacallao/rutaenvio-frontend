import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, STATUS_MAP } from '../../lib/store'
import { ArrowLeft, Loader2, MapPin, Package, Truck, User, Phone, Copy, MessageCircle, Eye, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

const ESTADO_CLASS = {
  'Finalizada': 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  'En camino': 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  'Cancelada': 'bg-red-500/10 text-red-400 border border-red-500/20',
  'Pendiente': 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
}

export default function StoreRouteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [route, setRoute] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    api.get(`/store/routes/${id}`)
      .then(r => {
        setRoute(r.data?.data || null)
        setLoading(false)
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Error al cargar la ruta')
        setLoading(false)
      })
  }, [id])

  const getDisplayStatus = (order) => {
    if (order.isRescheduled) return { label: 'Reprogramado', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' }
    const st = STATUS_MAP[order.status] || { label: order.status, color: 'badge-pending' }
    // Simplificar para la tienda: los estados intermedios se muestran como "En ruta"
    const routeActive = !!route?.startedAt && route?.estado !== 'Finalizada' && route?.estado !== 'Cancelada'
    if (routeActive && ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED'].includes(order.status)) {
      return { label: 'En ruta', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' }
    }
    if (order.status === 'DELIVERED') return { label: 'Entregado', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' }
    if (order.status === 'CANCELLED' || order.status === 'FAILED') return { label: st.label, cls: 'bg-red-500/10 text-red-400 border-red-500/20' }
    return { label: st.label, cls: 'bg-navy-800 text-gray-400 border-navy-700' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        <Loader2 size={24} className="animate-spin mr-2" /> Cargando ruta...
      </div>
    )
  }

  if (error || !route) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/tienda/rutas')} className="btn-secondary text-sm">
          <ArrowLeft size={16} /> Volver
        </button>
        <div className="card-p text-center py-12">
          <Package size={40} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">{error || 'Ruta no encontrada'}</p>
        </div>
      </div>
    )
  }

  const routeDate = route.date ? new Date(route.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' }) : '—'
  const estadoCls = ESTADO_CLASS[route.estado] || 'bg-gray-500/10 text-gray-400 border border-gray-500/20'

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate('/tienda/rutas')} className="btn-secondary text-sm">
          <ArrowLeft size={16} /> Volver
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">Ruta del {routeDate}</h1>
          <p className="text-sm text-gray-500">
            {route.myDelivered}/{route.myOrders} de tus pedidos entregados
          </p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${estadoCls}`}>
          {route.estado}
        </span>
      </div>

      {/* Meta info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-p space-y-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Logistica</h2>
          <div className="flex items-center gap-2 text-gray-200">
            <Truck size={16} className="text-teal-400" />
            <span>{route.company?.name || '—'}</span>
          </div>
          {route.company?.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Phone size={14} />
              <a href={`tel:${route.company.phone}`} className="hover:text-white">{route.company.phone}</a>
            </div>
          )}
        </div>
        <div className="card-p space-y-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cadete</h2>
          <div className="flex items-center gap-2 text-gray-200">
            <User size={16} className="text-brand-400" />
            <span>{route.driver?.name || '—'}</span>
          </div>
          {route.driver?.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Phone size={14} />
              <a href={`tel:${route.driver.phone}`} className="hover:text-white">{route.driver.phone}</a>
            </div>
          )}
        </div>
      </div>

      {/* Orders list */}
      <div className="card-p">
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Package size={16} className="text-teal-400" /> Tus pedidos en esta ruta ({route.myOrders})
        </h2>
        <div className="space-y-1.5">
          {route.orders?.map(order => {
            const display = getDisplayStatus(order)
            const trackingLink = order.trackingCode ? `${window.location.origin}/track/${order.trackingCode}` : null
            return (
              <div key={order.id} className="flex items-center gap-3 p-3 rounded-lg bg-navy-900/50 border border-navy-800 hover:border-teal-500/30 transition-colors">
                {order.routePosition != null && (
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    order.status === 'DELIVERED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-teal-500/20 text-teal-400'
                  }`}>
                    {order.status === 'DELIVERED' ? <CheckCircle2 size={14} /> : order.routePosition}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{order.customerName}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin size={10} /> <span className="truncate">{order.address}{order.city ? `, ${order.city}` : ''}</span>
                  </div>
                  {order.orderNumber && (
                    <div className="text-[10px] text-gray-600 font-mono mt-0.5">#{order.orderNumber}</div>
                  )}
                  {order.isRescheduled && order.rescheduledReason && (
                    <div className="text-[11px] text-gray-500 italic mt-0.5 truncate">
                      Motivo: {order.rescheduledReason}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${display.cls}`}>
                    {display.label}
                  </span>
                  {trackingLink && (
                    <button
                      onClick={() => { navigator.clipboard.writeText(trackingLink); toast.success('Link copiado') }}
                      className="text-gray-500 hover:text-teal-400 transition-colors p-1.5 rounded-lg hover:bg-navy-800"
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
                      className="text-gray-500 hover:text-emerald-400 transition-colors p-1.5 rounded-lg hover:bg-emerald-500/10"
                      title="Enviar tracking por WhatsApp"
                    >
                      <MessageCircle size={14} />
                    </a>
                  )}
                  <button
                    onClick={() => navigate(`/tienda/pedidos/${order.id}`)}
                    className="text-gray-500 hover:text-teal-400 transition-colors p-1.5 rounded-lg hover:bg-navy-800"
                    title="Ver detalle del pedido"
                  >
                    <Eye size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
