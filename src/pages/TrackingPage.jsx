import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Package, Clock, Truck, CheckCircle2, Loader2, MapPin, User, Hash, AlertCircle, X } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || '/api'

const STEPS = [
  { key: 'PENDING', label: 'Preparando', icon: Clock },
  { key: 'ASSIGNED', label: 'Asignado', icon: Truck },
  { key: 'IN_TRANSIT', label: 'En camino', icon: Truck },
  { key: 'DELIVERED', label: 'Entregado', icon: CheckCircle2 },
]

const STATUS_INDEX = { PENDING: 0, ASSIGNED: 1, PICKED_UP: 1, IN_TRANSIT: 2, ARRIVED: 2, DELIVERED: 3, FAILED: -1, CANCELLED: -1 }

export default function TrackingPage() {
  const { trackingCode } = useParams()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [prevStatus, setPrevStatus] = useState(null)
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

  const fetchOrder = useCallback(async () => {
    try {
      const r = await fetch(`${API}/tracking/${trackingCode}`)
      if (!r.ok) throw new Error('not found')
      const data = await r.json()
      setOrder(prev => {
        if (prev && prev.status !== data.status) {
          setPrevStatus(prev.status)
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

  // Initial fetch
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

  // Update driver marker when driverLat/driverLng change
  useEffect(() => {
    if (!mapInstance.current || !order?.driverLat || !order?.driverLng) return
    const L = window.L
    if (!L) return

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng([order.driverLat, order.driverLng])
    } else {
      driverMarkerRef.current = L.marker([order.driverLat, order.driverLng], {
        icon: L.divIcon({
          className: '',
          html: '<div style="width:40px;height:40px;background:#0ea5e9;border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 16px rgba(14,165,233,0.5)">🏍</div>',
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        }),
        zIndexOffset: 1000
      }).addTo(mapInstance.current)
    }

    // Fit bounds to show both markers
    if (destMarker.current && driverMarkerRef.current) {
      const bounds = L.latLngBounds([
        driverMarkerRef.current.getLatLng(),
        destMarker.current.getLatLng()
      ])
      mapInstance.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
    }
  }, [order?.driverLat, order?.driverLng])

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

  // Loading state
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

  // Error state
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

  const currentStep = STATUS_INDEX[order.status] ?? 0
  const isTransit = order.status === 'IN_TRANSIT' || order.status === 'ARRIVED'
  const isDelivered = order.status === 'DELIVERED'
  const isCancelled = order.status === 'CANCELLED' || order.status === 'FAILED'

  // ETA calculations
  const etaMinutes = order.estimatedMinutes || null
  const etaBanner = etaMinutes && etaMinutes <= 60
  const etaVeryClose = etaMinutes && etaMinutes <= 15

  // ETA time range
  const getEtaTimeRange = () => {
    if (!etaMinutes) return null
    const now = new Date()
    const minTime = new Date(now.getTime() + Math.max(0, (etaMinutes - 10)) * 60000)
    const maxTime = new Date(now.getTime() + (etaMinutes + 10) * 60000)
    const fmt = (d) => d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    return `${fmt(minTime)} y ${fmt(maxTime)}`
  }

  return (
    <div className="min-h-screen bg-navy-950 pb-8">
      {/* ETA Banner */}
      {isTransit && etaBanner && (
        <div className={`px-4 py-3 text-center text-sm font-semibold ${etaVeryClose ? 'bg-emerald-600/20 text-emerald-300 border-b border-emerald-500/30' : 'bg-blue-600/20 text-blue-300 border-b border-blue-500/30'}`}>
          {etaVeryClose
            ? 'Tu repartidor esta muy cerca!'
            : `Tu pedido llega en aproximadamente ${etaMinutes} minutos`
          }
        </div>
      )}

      {/* Header */}
      <div className="bg-navy-900 border-b border-navy-800 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500/20 flex items-center justify-center flex-shrink-0">
            <Package size={18} className="text-brand-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">RutaEnvio</h1>
            <p className="text-xs text-gray-500">Seguimiento de envio</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto">

        {/* Status Hero */}
        <div className={`text-center px-6 py-8 transition-all duration-500 ${animating ? 'scale-105 opacity-90' : 'scale-100 opacity-100'}`}>
          {/* PENDING */}
          {order.status === 'PENDING' && (
            <>
              <div className="w-20 h-20 rounded-full bg-yellow-500/15 flex items-center justify-center mx-auto mb-4">
                <Clock size={40} className="text-yellow-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Tu pedido esta siendo preparado</h2>
              <p className="text-sm text-gray-400">Te avisaremos cuando sea asignado a un repartidor</p>
            </>
          )}

          {/* ASSIGNED / PICKED_UP */}
          {(order.status === 'ASSIGNED' || order.status === 'PICKED_UP') && (
            <>
              <div className="w-20 h-20 rounded-full bg-blue-500/15 flex items-center justify-center mx-auto mb-4">
                <Truck size={40} className="text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Tu pedido fue asignado a un repartidor</h2>
              {order.driver?.name && (
                <p className="text-sm text-gray-400">Repartidor: {order.driver.name}</p>
              )}
            </>
          )}

          {/* IN_TRANSIT / ARRIVED */}
          {isTransit && (
            <>
              <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4 animate-truck-bounce">
                <Truck size={40} className="text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Tu pedido esta en camino!</h2>
              {etaMinutes && (
                <div className="mt-3">
                  <p className="text-3xl font-bold text-emerald-400">{etaMinutes} min</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Llega entre las {getEtaTimeRange()}
                  </p>
                </div>
              )}
              {!etaMinutes && order.driver?.name && (
                <p className="text-sm text-gray-400">{order.driver.name} esta en camino con tu pedido</p>
              )}
            </>
          )}

          {/* DELIVERED */}
          {isDelivered && (
            <>
              <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={40} className="text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Tu pedido fue entregado</h2>
              {order.deliveredAt && (
                <p className="text-sm text-gray-400">
                  {new Date(order.deliveredAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })} a las {new Date(order.deliveredAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
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

          {/* CANCELLED / FAILED */}
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

        {/* Timeline Progress Bar */}
        {!isCancelled && (
          <div className="px-5 pb-6">
            <div className="flex items-center justify-between relative">
              {/* Background line */}
              <div className="absolute top-4 left-4 right-4 h-0.5 bg-navy-800" />
              {/* Active line */}
              <div
                className="absolute top-4 left-4 h-0.5 bg-brand-400 transition-all duration-700 ease-out"
                style={{ width: `${currentStep >= 0 ? (currentStep / (STEPS.length - 1)) * (100 - (100 / (STEPS.length))) : 0}%` }}
              />

              {STEPS.map((step, i) => {
                const done = i <= currentStep && currentStep >= 0
                const active = i === currentStep
                const StepIcon = step.icon
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
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Map (IN_TRANSIT only) */}
        {isTransit && order.lat && order.lng && (
          <div className="mx-4 mb-4 rounded-xl overflow-hidden border border-navy-800" style={{ height: '200px' }}>
            <div ref={mapRef} className="w-full h-full" />
          </div>
        )}

        {/* Order Info */}
        <div className="mx-4 mb-4 bg-navy-900 rounded-xl border border-navy-800 p-4 space-y-3">
          {order.customerName && (
            <div className="flex items-center gap-3">
              <User size={15} className="text-gray-500 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider">Cliente</p>
                <p className="text-sm text-white">{order.customerName}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-3">
            <MapPin size={15} className="text-gray-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">Direccion</p>
              <p className="text-sm text-white">
                {order.address}
                {order.city ? `, ${order.city}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Hash size={15} className="text-gray-500 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">Numero de pedido</p>
              <p className="text-sm text-white font-mono">{order.orderNumber}</p>
            </div>
          </div>
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
