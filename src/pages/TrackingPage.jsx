import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Package, Clock, Truck, CheckCircle2, Loader2, MapPin, User, Hash, AlertCircle, X, Route, CalendarClock } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || '/api'

const STEPS = [
  { key: 'preparing', label: 'Preparando', icon: Clock },
  { key: 'assigned', label: 'Asignado', icon: Package },
  { key: 'in_route', label: 'En ruta', icon: Route },
  { key: 'on_the_way', label: 'En camino', icon: Truck },
  { key: 'delivered', label: 'Entregado', icon: CheckCircle2 },
]

const STATUS_TO_STEP = {
  preparing: 0,
  assigned: 1,
  in_route: 2,
  on_the_way: 3,
  delivered: 4,
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

export default function TrackingPage() {
  const { trackingCode } = useParams()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [animating, setAnimating] = useState(false)
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [ratingSubmitted, setRatingSubmitted] = useState(false)
  const [submittingRating, setSubmittingRating] = useState(false)
  const [photoModal, setPhotoModal] = useState(false)
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const destMarker = useRef(null)
  const driverMarkerRef = useRef(null)
  const intervalRef = useRef(null)
  const prevStatusRef = useRef(null)

  const fetchOrder = useCallback(async () => {
    try {
      const r = await fetch(`${API}/tracking/${trackingCode}`)
      if (!r.ok) throw new Error('not found')
      const json = await r.json()
      const data = json.data || json
      setOrder(prev => {
        const prevTrackingStatus = prev?.trackingStatus
        const newTrackingStatus = data.trackingStatus
        if (prev && prevTrackingStatus !== newTrackingStatus) {
          prevStatusRef.current = prevTrackingStatus
          setAnimating(true)
          setTimeout(() => setAnimating(false), 600)
        }
        return data
      })
      setRatingSubmitted(!!data.customerRating)
    } catch {
      setError('Envio no encontrado')
    } finally {
      setLoading(false)
    }
  }, [trackingCode])

  useEffect(() => {
    if (trackingCode) fetchOrder()
  }, [trackingCode, fetchOrder])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!trackingCode || error) return
    intervalRef.current = setInterval(() => {
      fetchOrder()
    }, 30000)
    return () => clearInterval(intervalRef.current)
  }, [trackingCode, error, fetchOrder])

  // Initialize map
  useEffect(() => {
    if (!order || !mapRef.current || mapInstance.current) return
    const L = window.L
    if (!L) return
    if (!order.lat || !order.lng) return

    mapInstance.current = L.map(mapRef.current, {
      center: [order.lat, order.lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false
    })

    L.tileLayer('https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(mapInstance.current)

    destMarker.current = L.marker([order.lat, order.lng], {
      icon: L.divIcon({
        className: '',
        html: '<div style="width:36px;height:36px;background:#3b82f6;border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(59,130,246,0.4)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      })
    }).addTo(mapInstance.current)

    return () => {
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null }
    }
  }, [order?.id])

  // Update driver marker
  useEffect(() => {
    if (!mapInstance.current || !order) return
    const L = window.L
    if (!L) return

    const events = order.events || []
    const lastLocEvent = [...events].reverse().find(e => e.lat && e.lng)

    if (!lastLocEvent) {
      if (!order.driverLat || !order.driverLng) return
      updateDriverMarker(L, order.driverLat, order.driverLng)
      return
    }

    updateDriverMarker(L, lastLocEvent.lat, lastLocEvent.lng)
  }, [order?.events, order?.driverLat, order?.driverLng])

  function updateDriverMarker(L, lat, lng) {
    if (!mapInstance.current) return
    const ts = order?.trackingStatus
    const isMoving = ts === 'in_route' || ts === 'on_the_way'
    if (!isMoving) return

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng([lat, lng])
    } else {
      driverMarkerRef.current = L.marker([lat, lng], {
        icon: L.divIcon({
          className: '',
          html: '<div style="width:40px;height:40px;background:#0ea5e9;border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 16px rgba(14,165,233,0.5)">\uD83D\uDE9A</div>',
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        }),
        zIndexOffset: 1000
      }).addTo(mapInstance.current)
    }

    if (destMarker.current && driverMarkerRef.current) {
      const bounds = L.latLngBounds([
        driverMarkerRef.current.getLatLng(),
        destMarker.current.getLatLng()
      ])
      mapInstance.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
    }
  }

  const submitRating = async () => {
    if (!rating) return
    setSubmittingRating(true)
    try {
      await fetch(`${API}/tracking/${trackingCode}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, feedback })
      })
      setRatingSubmitted(true)
    } catch (e) {
      console.error(e)
    }
    setSubmittingRating(false)
  }

  // Build step times from order timestamps
  function getStepTimes() {
    if (!order) return {}
    const times = {}
    if (order.createdAt) times.preparing = formatTime(order.createdAt)
    if (order.assignedAt) times.assigned = formatTime(order.assignedAt)
    if (order.routeProgress?.startedAt) times.in_route = formatTime(order.routeProgress.startedAt)
    if (order.inTransitAt) times.on_the_way = formatTime(order.inTransitAt)
    if (order.deliveredAt) times.delivered = formatTime(order.deliveredAt)
    return times
  }

  // Calculate ETA as 4-hour range, capped at 23:00
  function getEtaRange() {
    if (!order) return null
    const ts = order.trackingStatus
    if (ts === 'delivered' || ts === 'rescheduled') return null
    if (ts === 'preparing') return null

    const routeStartedAt = order.routeProgress?.startedAt
    if (!routeStartedAt) return { pending: true }

    let center = null

    if (order.estimatedArrival) {
      center = new Date(order.estimatedArrival)
    } else if (order.routeProgress?.position) {
      const startTime = new Date(routeStartedAt)
      const estimatedMinutes = order.routeProgress.position * 15
      center = new Date(startTime.getTime() + estimatedMinutes * 60 * 1000)
    }

    if (!center) return { pending: true }

    const from = new Date(center.getTime() - 2 * 60 * 60 * 1000)
    const to = new Date(center.getTime() + 2 * 60 * 60 * 1000)

    // Cap at 23:00 of the same day
    const limit = new Date(from)
    limit.setHours(23, 0, 0, 0)

    if (from.getTime() >= limit.getTime()) {
      return { nextDay: true }
    }

    if (to.getTime() > limit.getTime()) {
      to.setHours(23, 0, 0, 0)
    }

    const fmt = (d) => d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    return { from: fmt(from), to: fmt(to) }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-brand-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Cargando seguimiento...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4">
        <div className="text-center">
          <Package size={48} className="mx-auto text-gray-600 mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Envio no encontrado</h1>
          <p className="text-gray-500">El codigo de seguimiento no existe o ya expiro.</p>
        </div>
      </div>
    )
  }

  const trackingStatus = order.trackingStatus || 'preparing'
  const currentStep = STATUS_TO_STEP[trackingStatus] ?? 0
  const isDelivered = trackingStatus === 'delivered'
  const isRescheduled = trackingStatus === 'rescheduled'
  const isMoving = trackingStatus === 'in_route' || trackingStatus === 'on_the_way'
  const isCancelled = order.status === 'CANCELLED' || order.status === 'FAILED'
  const stepTimes = getStepTimes()
  const etaRange = getEtaRange()

  const events = order.events || []
  const lastLocEvent = [...events].reverse().find(e => e.lat && e.lng)
  const hasDriverLocation = isMoving && (lastLocEvent || (order.driverLat && order.driverLng))

  return (
    <div className="min-h-screen bg-navy-950 pb-8">
      {/* Header */}
      <div className="bg-navy-900 border-b border-navy-800 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500/20 flex items-center justify-center flex-shrink-0">
            <Package size={18} className="text-brand-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">
              {order.business?.name || 'RutaEnvio'}
            </h1>
            <p className="text-xs text-gray-500">Seguimiento de envio</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto">

        {/* Status Hero */}
        <div className={`text-center px-6 py-8 transition-all duration-500 ${animating ? 'scale-105 opacity-90' : 'scale-100 opacity-100'}`}>
          {trackingStatus === 'preparing' && (
            <>
              <div className="w-20 h-20 rounded-full bg-yellow-500/15 flex items-center justify-center mx-auto mb-4">
                <Clock size={40} className="text-yellow-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Tu pedido esta siendo preparado</h2>
              <p className="text-sm text-gray-400">Te avisaremos cuando sea asignado a un repartidor</p>
            </>
          )}

          {trackingStatus === 'assigned' && (
            <>
              <div className="w-20 h-20 rounded-full bg-blue-500/15 flex items-center justify-center mx-auto mb-4">
                <Package size={40} className="text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Tu pedido fue asignado a un repartidor</h2>
              <p className="text-sm text-gray-400">Pendiente de inicio de ruta</p>
            </>
          )}

          {trackingStatus === 'in_route' && (
            <>
              <div className="w-20 h-20 rounded-full bg-sky-500/15 flex items-center justify-center mx-auto mb-4 animate-truck-bounce">
                <Route size={40} className="text-sky-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Tu repartidor ya esta en ruta</h2>
              <p className="text-sm text-gray-400">
                {order.routeProgress
                  ? `Tiene ${order.routeProgress.position - order.routeProgress.delivered - 1} entregas antes de la tuya`
                  : 'Tiene otras entregas antes de la tuya'
                }
              </p>
            </>
          )}

          {trackingStatus === 'on_the_way' && (
            <>
              <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4 animate-truck-bounce">
                <Truck size={40} className="text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Tu pedido esta en camino!</h2>
              <p className="text-sm text-gray-400">
                {order.driver?.name ? `${order.driver.name} se dirige a tu domicilio` : 'El repartidor se dirige a tu domicilio'}
              </p>
            </>
          )}

          {isDelivered && (
            <>
              <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={40} className="text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Tu pedido fue entregado</h2>
              {order.deliveredAt && (
                <p className="text-sm text-gray-400">
                  {new Date(order.deliveredAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })} a las {formatTime(order.deliveredAt)}
                </p>
              )}
              {order.receiverName && (
                <p className="text-sm text-gray-500 mt-1">Recibido por {order.receiverName}</p>
              )}
              {order.deliveryPhoto && (
                <button
                  onClick={() => setPhotoModal(true)}
                  className="mt-4 inline-block rounded-xl overflow-hidden border-2 border-navy-800 hover:border-brand-500 transition-colors"
                >
                  <img src={order.deliveryPhoto} alt="Foto de entrega" className="w-48 h-36 object-cover" />
                </button>
              )}
            </>
          )}

          {isRescheduled && (
            <>
              <div className="w-20 h-20 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto mb-4">
                <CalendarClock size={40} className="text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Pedido reprogramado</h2>
              <p className="text-sm text-gray-400">Vamos a realizar otro intento de entrega el dia de manana</p>
            </>
          )}

          {isCancelled && (
            <>
              <div className="w-20 h-20 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={40} className="text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                {order.status === 'CANCELLED' ? 'Pedido cancelado' : 'No se pudo entregar'}
              </h2>
              <p className="text-sm text-gray-400">Contacta al vendedor para mas informacion.</p>
            </>
          )}
        </div>

        {/* ETA Range */}
        {etaRange && !isCancelled && !isRescheduled && (
          <div className="mx-4 mb-4 rounded-xl border border-navy-800 bg-navy-900 p-4 text-center">
            {etaRange.pending ? (
              <>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Tiempo estimado de llegada</p>
                <p className="text-sm text-gray-400">Pendiente de inicio de ruta</p>
              </>
            ) : etaRange.nextDay ? (
              <>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Tiempo estimado de llegada</p>
                <p className="text-sm text-amber-400">Tu pedido sera reprogramado para el dia siguiente</p>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Tiempo estimado de llegada</p>
                <p className="text-lg font-bold text-white">
                  Entre las {etaRange.from} y las {etaRange.to} hs
                </p>
              </>
            )}
          </div>
        )}

        {/* Timeline */}
        {!isCancelled && !isRescheduled && (
          <div className="px-5 pb-6">
            <div className="flex items-start justify-between relative">
              {/* Background line */}
              <div className="absolute top-4 left-[10%] right-[10%] h-0.5 bg-navy-800" />
              {/* Active line */}
              <div
                className="absolute top-4 left-[10%] h-0.5 bg-brand-400 transition-all duration-700 ease-out"
                style={{ width: `${currentStep >= 0 ? (currentStep / (STEPS.length - 1)) * 80 : 0}%` }}
              />

              {STEPS.map((step, i) => {
                const done = i <= currentStep && currentStep >= 0
                const active = i === currentStep
                const StepIcon = step.icon
                const time = stepTimes[step.key]
                return (
                  <div key={step.key} className="flex flex-col items-center relative z-10" style={{ flex: '1 1 0' }}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                      done
                        ? active
                          ? 'bg-brand-500 ring-4 ring-brand-500/20'
                          : 'bg-brand-500'
                        : 'bg-navy-800'
                    }`}>
                      <StepIcon size={14} className={done ? 'text-white' : 'text-gray-600'} />
                    </div>
                    <span className={`text-[10px] mt-1.5 text-center leading-tight ${
                      done ? (active ? 'text-brand-400 font-semibold' : 'text-gray-300') : 'text-gray-600'
                    }`}>
                      {step.label}
                    </span>
                    {done && time && (
                      <span className="text-[9px] text-gray-500 mt-0.5">{time}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Map */}
        {isMoving && order.lat && order.lng && (
          <div className="mx-4 mb-4 rounded-xl overflow-hidden border border-navy-800" style={{ height: '200px' }}>
            <div ref={mapRef} className="w-full h-full" />
          </div>
        )}

        {/* Order Info */}
        <div className="mx-4 mb-4 bg-navy-900 rounded-xl border border-navy-800 p-4 space-y-3.5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Datos del envio</h3>

          <div className="flex items-start gap-3">
            <MapPin size={15} className="text-gray-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">Direccion de entrega</p>
              <p className="text-sm text-white">
                {order.address}
                {order.addressDetail ? ` (${order.addressDetail})` : ''}
              </p>
              {order.city && (
                <p className="text-xs text-gray-500">{order.city}{order.province ? `, ${order.province}` : ''}</p>
              )}
            </div>
          </div>

          {order.orderNumber && (
            <div className="flex items-center gap-3">
              <Hash size={15} className="text-gray-500 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider">Numero de pedido</p>
                <p className="text-sm text-white font-mono">#{order.orderNumber}</p>
              </div>
            </div>
          )}

          {order.customerName && (
            <div className="flex items-center gap-3">
              <User size={15} className="text-gray-500 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider">Destinatario</p>
                <p className="text-sm text-white">{order.customerName}</p>
              </div>
            </div>
          )}

          {order.driver?.name && (
            <div className="border-t border-navy-800 pt-3.5 flex items-center gap-3">
              <Truck size={15} className="text-gray-500 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider">Repartidor</p>
                <p className="text-sm text-white">{order.driver.name}</p>
              </div>
            </div>
          )}
        </div>

        {/* Rating (after delivery) */}
        {isDelivered && !ratingSubmitted && (
          <div className="mx-4 mb-4 bg-navy-900 rounded-xl border border-navy-800 p-5 text-center">
            <p className="text-sm font-semibold text-white mb-3">Como fue tu experiencia?</p>
            <div className="flex justify-center gap-2 mb-3">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  className={`w-10 h-10 rounded-full text-lg transition-all ${
                    n <= rating
                      ? 'bg-yellow-500/20 text-yellow-400 scale-110'
                      : 'bg-navy-800 text-gray-600'
                  }`}
                >
                  {n <= rating ? '\u2605' : '\u2606'}
                </button>
              ))}
            </div>
            {rating > 0 && (
              <>
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="Comentario opcional..."
                  rows={2}
                  className="w-full bg-navy-950 border border-navy-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 mb-3 resize-none"
                />
                <button
                  onClick={submitRating}
                  disabled={submittingRating}
                  className="w-full py-2.5 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 transition-colors disabled:opacity-50"
                >
                  {submittingRating ? 'Enviando...' : 'Enviar calificacion'}
                </button>
              </>
            )}
          </div>
        )}

        {isDelivered && ratingSubmitted && (
          <div className="mx-4 mb-4 text-center text-sm text-gray-500 py-3">
            Gracias por tu calificacion
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-700 mt-6 pb-4">
          Seguimiento por <span className="text-brand-400 font-semibold">RutaEnvio</span>
        </div>
      </div>

      {/* Photo Modal */}
      {photoModal && order.deliveryPhoto && (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4" onClick={() => setPhotoModal(false)}>
          <div className="relative max-w-sm w-full">
            <button
              onClick={() => setPhotoModal(false)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white"
            >
              <X size={24} />
            </button>
            <img src={order.deliveryPhoto} alt="Foto de entrega" className="w-full rounded-xl" />
          </div>
        </div>
      )}

      <style>{`
        .leaflet-container { background: #111829 !important; }
        .leaflet-control-attribution { display: none !important; }
        @keyframes truck-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .animate-truck-bounce {
          animation: truck-bounce 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
