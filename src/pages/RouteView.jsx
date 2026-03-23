import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { MapPin, Navigation, Package, CheckCircle2, Loader2 } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || '/api'

const STATUS_LABELS = {
  PENDING: 'Pendiente',
  ASSIGNED: 'Asignado',
  PICKED_UP: 'Retirado',
  IN_TRANSIT: 'En camino',
  ARRIVED: 'Llegó',
  DELIVERED: 'Entregado',
  FAILED: 'Fallido',
  CANCELLED: 'Cancelado'
}

export default function RouteView() {
  const { token } = useParams()
  const [route, setRoute] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const mapRef = useRef(null)
  const mapInstance = useRef(null)

  useEffect(() => {
    if (!token) return
    fetch(`${API}/routes/view/${token}`)
      .then(r => { if (!r.ok) throw new Error('not found'); return r.json() })
      .then(data => { setRoute(data); setLoading(false) })
      .catch(() => { setError('Ruta no encontrada'); setLoading(false) })
  }, [token])

  // Initialize map
  useEffect(() => {
    if (!route || !mapRef.current || mapInstance.current) return
    const L = window.L
    if (!L) return

    mapInstance.current = L.map(mapRef.current, {
      center: [-34.6037, -58.3816],
      zoom: 12,
      zoomControl: true
    })

    L.tileLayer('https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '\u00a9 OpenStreetMap contributors, \u00a9 CARTO'
    }).addTo(mapInstance.current)

    const bounds = []

    // Origin marker
    if (route.startLat && route.startLng) {
      L.marker([route.startLat, route.startLng], {
        icon: L.divIcon({
          className: '',
          html: '<div style="width:32px;height:32px;background:#ef4444;border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;box-shadow:0 0 10px #ef444480">O</div>'
        })
      }).addTo(mapInstance.current)
      bounds.push([route.startLat, route.startLng])
    }

    // Order markers
    route.orders.forEach(order => {
      if (!order.lat || !order.lng) return
      const isDelivered = order.status === 'DELIVERED'
      const color = isDelivered ? '#10b981' : '#3b82f6'
      L.marker([order.lat, order.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="width:28px;height:28px;background:${color};border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;box-shadow:0 0 8px ${color}60">${order.routePosition}</div>`
        })
      }).bindPopup(`<b>Parada ${order.routePosition}</b><br>${order.customerName}<br>${order.address}`)
        .addTo(mapInstance.current)
      bounds.push([order.lat, order.lng])
    })

    // Route line
    const lineCoords = route.orders.filter(o => o.lat && o.lng).map(o => [o.lat, o.lng])
    if (lineCoords.length > 1) {
      L.polyline(lineCoords, { color: '#6366f1', weight: 3, opacity: 0.7, dashArray: '8 6' }).addTo(mapInstance.current)
    }

    if (bounds.length > 0) mapInstance.current.fitBounds(bounds, { padding: [40, 40] })

    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null } }
  }, [route])

  const openGoogleMaps = (lat, lng, address) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    window.open(url, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-center">
          <Package size={48} className="mx-auto text-gray-600 mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Ruta no encontrada</h1>
          <p className="text-gray-500">El link no es valido o la ruta ya no existe.</p>
        </div>
      </div>
    )
  }

  const deliveredCount = route.orders.filter(o => o.status === 'DELIVERED').length

  return (
    <div className="min-h-screen bg-navy-950">
      {/* Header */}
      <div className="bg-navy-900 border-b border-navy-800 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-white">{route.name}</h1>
              <p className="text-xs text-gray-500">
                {route.driver?.name} — {deliveredCount}/{route.orders.length} entregados
              </p>
            </div>
            {route.business?.logo && (
              <img src={route.business.logo} alt="" className="h-8 rounded" />
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Map */}
        <div className="rounded-xl overflow-hidden border border-navy-800" style={{ height: '300px' }}>
          <div ref={mapRef} className="w-full h-full" />
        </div>

        {/* Orders list */}
        <div className="space-y-2">
          {route.orders.map(order => {
            const isDelivered = order.status === 'DELIVERED'
            return (
              <div key={order.id} className={`rounded-xl p-3 border ${isDelivered ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-navy-900 border-navy-800'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isDelivered ? 'bg-emerald-500/20 text-emerald-400' : 'bg-brand-500/20 text-brand-400'
                  }`}>
                    {isDelivered ? <CheckCircle2 size={16} /> : order.routePosition}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-gray-500 font-mono">{order.orderNumber}</div>
                    <div className="text-sm font-semibold text-white">{order.customerName}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <MapPin size={10} /> {order.address}
                    </div>
                    {order.addressDetail && (
                      <div className="text-xs text-gray-500 mt-0.5">{order.addressDetail}</div>
                    )}
                    {order.notes && (
                      <div className="text-xs text-amber-400/70 mt-1">Nota: {order.notes}</div>
                    )}
                    <div className="text-[10px] text-gray-600 mt-1">{STATUS_LABELS[order.status] || order.status}</div>
                  </div>
                  {order.lat && order.lng && !isDelivered && (
                    <button
                      onClick={() => openGoogleMaps(order.lat, order.lng, order.address)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-colors text-xs font-medium flex-shrink-0"
                    >
                      <Navigation size={12} /> Navegar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
