import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, STATUS_MAP } from '../../lib/store'
import { ArrowLeft, MapPin, Phone, User, Package, Clock, Star, MessageSquare, Camera, Loader2, FileText, Copy, MessageCircle, Link2 } from 'lucide-react'
import toast from 'react-hot-toast'

const TIMELINE_STEPS = [
  { status: 'PENDING', label: 'Pendiente', field: 'createdAt' },
  { status: 'ASSIGNED', label: 'Asignado', field: 'assignedAt' },
  { status: 'IN_TRANSIT', label: 'En camino', field: 'inTransitAt' },
  { status: 'DELIVERED', label: 'Entregado', field: 'deliveredAt' },
]

const STATUS_ORDER = { PENDING: 0, ASSIGNED: 1, PICKED_UP: 1, IN_TRANSIT: 2, ARRIVED: 2, DELIVERED: 3, FAILED: -1, CANCELLED: -1, RETURNED: -1 }

function formatDate(d) {
  if (!d) return null
  return new Date(d).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get(`/orders/${id}`).then(r => {
      setOrder(r.data)
      setLoading(false)
    }).catch(() => {
      toast.error('No se pudo cargar el pedido')
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-brand-500" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p>Pedido no encontrado</p>
        <button onClick={() => navigate('/orders')} className="btn-secondary mt-4">
          <ArrowLeft size={16} /> Volver a pedidos
        </button>
      </div>
    )
  }

  const currentStep = STATUS_ORDER[order.status] ?? -1
  const isCancelled = order.status === 'CANCELLED' || order.status === 'FAILED' || order.status === 'RETURNED'

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/orders')} className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Pedido {order.orderNumber}</h1>
          <p className="text-sm text-gray-500">{order.source} - Creado {formatDate(order.createdAt)}</p>
        </div>
        <span className={STATUS_MAP[order.status]?.color || 'badge'}>
          {STATUS_MAP[order.status]?.label || order.status}
        </span>
      </div>

      {/* Timeline */}
      <div className="card-p">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Estado del pedido</h2>
        {isCancelled ? (
          <div className="flex items-center gap-3 text-red-400">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-sm font-bold">X</div>
            <div>
              <p className="font-medium">{STATUS_MAP[order.status]?.label || order.status}</p>
              <p className="text-xs text-gray-500">{formatDate(order.cancelledAt)}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-0">
            {TIMELINE_STEPS.map((step, i) => {
              const reached = currentStep >= i
              const timestamp = order[step.field]
              return (
                <div key={step.status} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      reached ? 'bg-brand-500 text-white' : 'bg-navy-800 text-gray-500'
                    }`}>
                      {i + 1}
                    </div>
                    <p className={`text-xs mt-1.5 font-medium ${reached ? 'text-white' : 'text-gray-500'}`}>{step.label}</p>
                    {timestamp && <p className="text-[10px] text-gray-500 mt-0.5">{formatDate(timestamp)}</p>}
                  </div>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mt-[-20px] ${currentStep > i ? 'bg-brand-500' : 'bg-navy-800'}`} />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Link de tracking */}
      {order.trackingCode && (
        <div className="card-p space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Link2 size={14} /> Link de seguimiento
          </h2>
          <div className="flex items-center gap-2 bg-navy-900 border border-navy-700 rounded-lg px-3 py-2">
            <input
              type="text"
              readOnly
              value={`${window.location.origin}/track/${order.trackingCode}`}
              className="flex-1 bg-transparent text-sm text-brand-300 outline-none truncate"
              onClick={e => e.target.select()}
            />
            <button
              onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/track/${order.trackingCode}`); toast.success('Link copiado') }}
              className="text-gray-400 hover:text-brand-400 transition-colors flex-shrink-0"
              title="Copiar link"
            >
              <Copy size={16} />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/track/${order.trackingCode}`); toast.success('Link copiado') }}
              className="btn-secondary text-xs"
            >
              <Copy size={14} /> Copiar link
            </button>
            {order.customerPhone && (
              <a
                href={`https://wa.me/${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola! Podes seguir tu envio en este link: ${window.location.origin}/track/${order.trackingCode}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-xs inline-flex items-center gap-1.5"
              >
                <MessageCircle size={14} /> Enviar por WhatsApp
              </a>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Cliente */}
        <div className="card-p space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Cliente</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gray-200">
              <User size={16} className="text-gray-500" />
              <span>{order.customerName}</span>
            </div>
            {order.customerPhone && (
              <div className="flex items-center gap-2 text-gray-200">
                <Phone size={16} className="text-gray-500" />
                <span>{order.customerPhone}</span>
              </div>
            )}
            {order.customerEmail && (
              <p className="text-sm text-gray-400">{order.customerEmail}</p>
            )}
          </div>
        </div>

        {/* Cadete */}
        <div className="card-p space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Cadete asignado</h2>
          {order.driver ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-200">
                <User size={16} className="text-gray-500" />
                <span>{order.driver.name}</span>
              </div>
              {order.driver.phone && (
                <div className="flex items-center gap-2 text-gray-200">
                  <Phone size={16} className="text-gray-500" />
                  <span>{order.driver.phone}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">Sin cadete asignado</p>
          )}
        </div>
      </div>

      {/* Direccion + Mapa */}
      <div className="card-p space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Direccion de entrega</h2>
        <div className="flex items-start gap-2 text-gray-200">
          <MapPin size={16} className="text-gray-500 mt-0.5 shrink-0" />
          <div>
            <p>{order.address}{order.addressDetail ? ` - ${order.addressDetail}` : ''}</p>
            <p className="text-sm text-gray-500">
              {[order.city, order.province, order.zipcode].filter(Boolean).join(', ')}
            </p>
          </div>
        </div>
        {order.lat && order.lng && (
          <div className="mt-3 rounded-lg overflow-hidden border border-navy-800" style={{ height: 200 }}>
            <iframe
              title="Ubicacion del pedido"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${order.lng - 0.005},${order.lat - 0.003},${order.lng + 0.005},${order.lat + 0.003}&layer=mapnik&marker=${order.lat},${order.lng}`}
            />
          </div>
        )}
      </div>

      {/* Detalles del pedido */}
      <div className="card-p space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Detalles del pedido</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {order.itemsSummary && (
            <div>
              <p className="text-gray-500">Productos</p>
              <p className="text-gray-200">{order.itemsSummary}</p>
            </div>
          )}
          {order.itemCount > 0 && (
            <div>
              <p className="text-gray-500">Cantidad</p>
              <p className="text-gray-200">{order.itemCount} items</p>
            </div>
          )}
          {order.totalAmount != null && (
            <div>
              <p className="text-gray-500">Monto</p>
              <p className="text-gray-200">${order.totalAmount} {order.currency}</p>
            </div>
          )}
          {order.weight != null && (
            <div>
              <p className="text-gray-500">Peso</p>
              <p className="text-gray-200">{order.weight} kg</p>
            </div>
          )}
        </div>
        {order.notes && (
          <div className="flex items-start gap-2 text-gray-300 mt-2">
            <FileText size={14} className="text-gray-500 mt-0.5 shrink-0" />
            <p className="text-sm">{order.notes}</p>
          </div>
        )}
      </div>

      {/* Prueba de entrega */}
      {(order.deliveryPhoto || order.receiverName || order.deliveryNotes || order.deliverySignature) && (
        <div className="card-p space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Prueba de entrega</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {order.receiverName && (
              <div className="flex items-center gap-2 text-gray-200">
                <User size={16} className="text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Recibido por</p>
                  <p>{order.receiverName}</p>
                </div>
              </div>
            )}
            {order.deliveryNotes && (
              <div className="flex items-start gap-2 text-gray-200">
                <MessageSquare size={16} className="text-gray-500 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Notas de entrega</p>
                  <p className="text-sm">{order.deliveryNotes}</p>
                </div>
              </div>
            )}
          </div>
          {order.deliveryPhoto && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1"><Camera size={12} /> Foto de entrega</p>
              <img src={order.deliveryPhoto} alt="Foto de entrega" className="rounded-lg max-h-64 border border-navy-800" />
            </div>
          )}
          {order.deliverySignature && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1.5">Firma</p>
              <img src={order.deliverySignature} alt="Firma" className="rounded-lg max-h-32 border border-navy-800 bg-white p-2" />
            </div>
          )}
        </div>
      )}

      {/* Rating del cliente */}
      {order.customerRating && (
        <div className="card-p space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Valoracion del cliente</h2>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map(s => (
              <Star key={s} size={20} className={s <= order.customerRating ? 'text-amber-400 fill-amber-400' : 'text-gray-600'} />
            ))}
            <span className="text-sm text-gray-400 ml-2">{order.customerRating}/5</span>
          </div>
          {order.customerFeedback && (
            <p className="text-sm text-gray-300 italic">"{order.customerFeedback}"</p>
          )}
        </div>
      )}

      {/* Historial de eventos */}
      {order.events && order.events.length > 0 && (
        <div className="card-p space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Historial</h2>
          <div className="space-y-3">
            {order.events.map(event => (
              <div key={event.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-sm text-gray-200">{event.description}</p>
                  <p className="text-xs text-gray-500">{formatDate(event.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
