import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { MapPin, Navigation, Phone, Package, CheckCircle2, Loader2, Camera, X, Truck, Clock } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || '/api'

const STATUS_CONFIG = {
  PENDING: { label: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  ASSIGNED: { label: 'Asignado', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  PICKED_UP: { label: 'Retirado', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  IN_TRANSIT: { label: 'En camino', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  ARRIVED: { label: 'Llegó', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  DELIVERED: { label: 'Entregado', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  FAILED: { label: 'Fallido', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
}

export default function RouteView() {
  const { token } = useParams()
  const [route, setRoute] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deliverModal, setDeliverModal] = useState(null)
  const [receiverName, setReceiverName] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [updatingOrder, setUpdatingOrder] = useState(null)
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef({})

  const fetchRoute = useCallback(async () => {
    try {
      const r = await fetch(`${API}/driver-web/${token}`)
      if (!r.ok) throw new Error('not found')
      const data = await r.json()
      if (data.success) {
        setRoute(data.data)
      } else {
        throw new Error('error')
      }
    } catch {
      setError('Ruta no encontrada')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) fetchRoute()
  }, [token, fetchRoute])

  // Initialize map
  useEffect(() => {
    if (!route || !mapRef.current || mapInstance.current) return
    const L = window.L
    if (!L) return

    mapInstance.current = L.map(mapRef.current, {
      center: [-34.6037, -58.3816],
      zoom: 12,
      zoomControl: true,
      attributionControl: false
    })

    L.tileLayer('https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(mapInstance.current)

    const bounds = []

    // Origin marker
    if (route.origin) {
      L.marker([route.origin.lat, route.origin.lng], {
        icon: L.divIcon({
          className: '',
          html: '<div style="width:32px;height:32px;background:#ef4444;border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;box-shadow:0 2px 8px rgba(239,68,68,0.5)">O</div>',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        })
      }).addTo(mapInstance.current)
      bounds.push([route.origin.lat, route.origin.lng])
    }

    // Order markers
    route.orders.forEach(order => {
      if (!order.lat && !order.lng) return
      addOrderMarker(L, order, bounds)
    })

    // Route line
    const lineCoords = route.orders.filter(o => o.lat && o.lng).map(o => [o.lat, o.lng])
    if (route.origin) lineCoords.unshift([route.origin.lat, route.origin.lng])
    if (lineCoords.length > 1) {
      L.polyline(lineCoords, { color: '#6366f1', weight: 3, opacity: 0.6, dashArray: '8 6' }).addTo(mapInstance.current)
    }

    if (bounds.length > 0) mapInstance.current.fitBounds(bounds, { padding: [30, 30] })

    return () => {
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null }
      markersRef.current = {}
    }
  }, [route?.id])

  function addOrderMarker(L, order, bounds) {
    if (!order.lat || !order.lng) return
    const color = order.status === 'DELIVERED' ? '#10b981' : order.status === 'IN_TRANSIT' ? '#3b82f6' : '#f59e0b'
    const marker = L.marker([order.lat, order.lng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="width:28px;height:28px;background:${color};border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;box-shadow:0 2px 6px ${color}60">${order.status === 'DELIVERED' ? '✓' : order.routePosition}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      })
    }).addTo(mapInstance.current)
    markersRef.current[order.id] = marker
    if (bounds) bounds.push([order.lat, order.lng])
  }

  function updateMarkerColor(orderId, status) {
    const L = window.L
    if (!L || !mapInstance.current) return
    const order = route.orders.find(o => o.id === orderId)
    if (!order || !order.lat || !order.lng) return
    const oldMarker = markersRef.current[orderId]
    if (oldMarker) mapInstance.current.removeLayer(oldMarker)
    const color = status === 'DELIVERED' ? '#10b981' : status === 'IN_TRANSIT' ? '#3b82f6' : '#f59e0b'
    const marker = L.marker([order.lat, order.lng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="width:28px;height:28px;background:${color};border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;box-shadow:0 2px 6px ${color}60">${status === 'DELIVERED' ? '✓' : order.routePosition}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      })
    }).addTo(mapInstance.current)
    markersRef.current[orderId] = marker
  }

  const markInTransit = async (orderId) => {
    setUpdatingOrder(orderId)
    try {
      const r = await fetch(`${API}/driver-web/${token}/order/${orderId}/transit`, { method: 'PUT' })
      const data = await r.json()
      if (data.success) {
        setRoute(prev => ({
          ...prev,
          orders: prev.orders.map(o => o.id === orderId ? { ...o, status: 'IN_TRANSIT' } : o)
        }))
        updateMarkerColor(orderId, 'IN_TRANSIT')
      }
    } catch (err) {
      console.error('Error marcando en camino:', err)
    } finally {
      setUpdatingOrder(null)
    }
  }

  const openDeliverModal = (order) => {
    setDeliverModal(order)
    setReceiverName('')
    setPhoto(null)
    setPhotoPreview(null)
  }

  const handlePhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const confirmDelivery = async () => {
    if (!deliverModal) return
    setSubmitting(true)
    try {
      const body = { receiverName: receiverName || null, deliveryPhoto: photoPreview || null }
      const r = await fetch(`${API}/driver-web/${token}/order/${deliverModal.id}/deliver`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await r.json()
      if (data.success) {
        setRoute(prev => ({
          ...prev,
          orders: prev.orders.map(o => o.id === deliverModal.id
            ? { ...o, status: 'DELIVERED', deliveredAt: new Date().toISOString(), receiverName }
            : o)
        }))
        updateMarkerColor(deliverModal.id, 'DELIVERED')
        setDeliverModal(null)
      }
    } catch (err) {
      console.error('Error confirmando entrega:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const navigateTo = (order) => {
    const parts = [order.address]
    if (order.city) parts.push(order.city)
    parts.push('Argentina')
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(parts.join(', '))}`
    window.open(url, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-brand-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Cargando ruta...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4">
        <div className="text-center">
          <Package size={48} className="mx-auto text-gray-600 mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Ruta no encontrada</h1>
          <p className="text-gray-500">El link no es valido o la ruta ya no existe.</p>
        </div>
      </div>
    )
  }

  const deliveredCount = route.orders.filter(o => o.status === 'DELIVERED').length
  const totalOrders = route.orders.length
  const routeDate = route.date ? new Date(route.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''

  return (
    <div className="min-h-screen bg-navy-950 pb-8">
      {/* Header */}
      <div className="bg-navy-900 border-b border-navy-800 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-base font-bold text-white truncate">
            Ruta {route.driverName || ''} - {routeDate}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${deliveredCount === totalOrders ? 'bg-emerald-400' : 'bg-brand-400'}`} />
              <span className="text-xs text-gray-400">
                {deliveredCount}/{totalOrders} entregados
              </span>
            </div>
            {route.totalDistance && (
              <span className="text-xs text-gray-600">
                - {(route.totalDistance / 1000).toFixed(1)} km
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Map */}
        <div className="border-b border-navy-800" style={{ height: '260px' }}>
          <div ref={mapRef} className="w-full h-full" />
        </div>

        {/* Orders list */}
        <div className="px-3 pt-3 space-y-2">
          {route.orders.map((order, idx) => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING
            const isPending = ['PENDING', 'ASSIGNED', 'PICKED_UP'].includes(order.status)
            const isTransit = order.status === 'IN_TRANSIT' || order.status === 'ARRIVED'
            const isDelivered = order.status === 'DELIVERED'
            const isUpdating = updatingOrder === order.id

            return (
              <div key={order.id} className={`rounded-xl border p-3 ${isDelivered ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-navy-900 border-navy-800'}`}>
                {/* Top row: position + order number + status badge */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500">#{order.routePosition}</span>
                    <span className="text-[10px] font-mono text-gray-600">{order.orderNumber}</span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>

                {/* Customer name */}
                <div className="text-sm font-semibold text-white mb-1">{order.customerName}</div>

                {/* Address */}
                <div className="text-xs text-gray-400 flex items-start gap-1 mb-0.5">
                  <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                  <span>
                    {order.address}
                    {order.city ? `, ${order.city}` : ''}
                    {order.addressDetail ? ` (${order.addressDetail})` : ''}
                  </span>
                </div>

                {/* Phone */}
                {order.customerPhone && (
                  <a href={`tel:${order.customerPhone}`} className="text-xs text-brand-400 flex items-center gap-1 mt-1 no-underline">
                    <Phone size={11} />
                    {order.customerPhone}
                  </a>
                )}

                {/* Notes */}
                {order.notes && (
                  <div className="text-xs text-amber-400/70 mt-1.5 bg-amber-500/5 rounded-lg px-2 py-1">
                    Nota: {order.notes}
                  </div>
                )}

                {/* Delivered info */}
                {isDelivered && (
                  <div className="mt-2 text-xs text-emerald-400/70 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    Entregado
                    {order.deliveredAt && (
                      <span className="text-gray-600 ml-1">
                        {new Date(order.deliveredAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {order.receiverName && (
                      <span className="text-gray-500 ml-1">a {order.receiverName}</span>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                {(isPending || isTransit) && (
                  <div className="flex gap-2 mt-2.5">
                    <button
                      onClick={() => navigateTo(order)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-navy-800 text-white hover:bg-navy-950 transition-colors text-xs font-medium border border-navy-800"
                    >
                      <Navigation size={13} /> Navegar
                    </button>

                    {isPending && (
                      <button
                        onClick={() => markInTransit(order.id)}
                        disabled={isUpdating}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-xs font-medium disabled:opacity-50"
                      >
                        {isUpdating ? <Loader2 size={13} className="animate-spin" /> : <Truck size={13} />}
                        En camino
                      </button>
                    )}

                    {isTransit && (
                      <button
                        onClick={() => openDeliverModal(order)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-xs font-medium"
                      >
                        <CheckCircle2 size={13} /> Entregar
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-700 mt-6 pb-4">
          Powered by <span className="text-brand-400 font-semibold">RutaEnvio</span>
        </div>
      </div>

      {/* Delivery Modal */}
      {deliverModal && (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-end sm:items-center justify-center" onClick={() => !submitting && setDeliverModal(null)}>
          <div
            className="bg-navy-900 w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-navy-800 p-5"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white">Confirmar entrega</h2>
              <button onClick={() => !submitting && setDeliverModal(null)} className="text-gray-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-gray-400 mb-4">
              Pedido #{deliverModal.routePosition} - {deliverModal.customerName}
            </p>

            {/* Receiver name */}
            <label className="block text-xs text-gray-400 mb-1">Nombre de quien recibe</label>
            <input
              type="text"
              value={receiverName}
              onChange={e => setReceiverName(e.target.value)}
              placeholder="Ej: Juan Perez"
              className="w-full bg-navy-950 border border-navy-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 mb-4"
            />

            {/* Photo capture */}
            <label className="block text-xs text-gray-400 mb-1">Foto de entrega (opcional)</label>
            {!photoPreview ? (
              <label className="flex items-center justify-center gap-2 w-full py-8 border-2 border-dashed border-navy-800 rounded-xl text-gray-500 hover:border-brand-500 hover:text-brand-400 transition-colors cursor-pointer mb-4">
                <Camera size={20} />
                <span className="text-sm">Sacar foto</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhoto}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative mb-4">
                <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-xl border border-navy-800" />
                <button
                  onClick={() => { setPhoto(null); setPhotoPreview(null) }}
                  className="absolute top-2 right-2 bg-black/60 rounded-full p-1"
                >
                  <X size={16} className="text-white" />
                </button>
              </div>
            )}

            {/* Confirm button */}
            <button
              onClick={confirmDelivery}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <><Loader2 size={16} className="animate-spin" /> Confirmando...</>
              ) : (
                <><CheckCircle2 size={16} /> Confirmar entrega</>
              )}
            </button>
          </div>
        </div>
      )}

      <style>{`
        .leaflet-container { background: #111829 !important; }
        .leaflet-tile-pane { filter: saturate(0.3) brightness(0.7); }
        .leaflet-control-attribution { display: none !important; }
      `}</style>
    </div>
  )
}
