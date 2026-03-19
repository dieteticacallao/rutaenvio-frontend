import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { io } from 'socket.io-client'

const API = import.meta.env.VITE_API_URL || '/api'
const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin

const STATUS_STEPS = [
  { key: 'PENDING', label: 'Pedido recibido', icon: '📦' },
  { key: 'ASSIGNED', label: 'Cadete asignado', icon: '👤' },
  { key: 'PICKED_UP', label: 'En preparación', icon: '📋' },
  { key: 'IN_TRANSIT', label: 'En camino', icon: '🛵' },
  { key: 'DELIVERED', label: 'Entregado', icon: '✅' },
]

const STATUS_INDEX = { PENDING: 0, ASSIGNED: 1, PICKED_UP: 2, IN_TRANSIT: 3, ARRIVED: 3, DELIVERED: 4, FAILED: -1, CANCELLED: -1 }

export default function TrackingPage() {
  const { trackingCode } = useParams()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState(null)
  const [driverPos, setDriverPos] = useState(null)
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [ratingSubmitted, setRatingSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const driverMarker = useRef(null)
  const destMarker = useRef(null)

  // Fetch order data
  useEffect(() => {
    if (!trackingCode) return
    fetch(`${API}/tracking/${trackingCode}`)
      .then(r => { if (!r.ok) throw new Error('not found'); return r.json() })
      .then(data => {
        setOrder(data)
        setRatingSubmitted(!!data.customerRating)
        if (data.driver?.lastLat) {
          setDriverPos({ lat: data.driver.lastLat, lng: data.driver.lastLng })
        }
      })
      .catch(() => setError('Envío no encontrado'))
  }, [trackingCode])

  // Socket.IO for real-time updates
  useEffect(() => {
    if (!trackingCode || !order) return
    const socket = io(SOCKET_URL, { transports: ['websocket'] })

    socket.on('connect', () => {
      socket.emit('tracking:join', { trackingCode })
    })

    socket.on('driver:moved', (data) => {
      setDriverPos({ lat: data.lat, lng: data.lng })
    })

    socket.on('order:status', (data) => {
      setOrder(prev => prev ? { ...prev, status: data.status } : prev)
    })

    return () => socket.disconnect()
  }, [trackingCode, order?.id])

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current || !order) return
    if (typeof window === 'undefined' || !window.L) return

    const L = window.L
    const center = order.lat && order.lng ? [order.lat, order.lng] : [-34.6037, -58.3816]

    mapInstance.current = L.map(mapRef.current, {
      center,
      zoom: 14,
      zoomControl: false,
      attributionControl: false
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance.current)

    // Destination marker
    if (order.lat && order.lng) {
      destMarker.current = L.marker([order.lat, order.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="width:36px;height:36px;background:#10b981;border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 12px rgba(16,185,129,0.4)">📍</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        })
      }).addTo(mapInstance.current)
    }

    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null } }
  }, [order])

  // Update driver position on map
  useEffect(() => {
    if (!mapInstance.current || !driverPos || !window.L) return
    const L = window.L

    if (driverMarker.current) {
      driverMarker.current.setLatLng([driverPos.lat, driverPos.lng])
    } else {
      driverMarker.current = L.marker([driverPos.lat, driverPos.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="width:40px;height:40px;background:#0ea5e9;border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 16px rgba(14,165,233,0.5);animation:pulse 2s infinite">🛵</div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        })
      }).addTo(mapInstance.current)
    }

    // Fit both markers
    if (destMarker.current && driverMarker.current) {
      const bounds = L.latLngBounds([
        driverMarker.current.getLatLng(),
        destMarker.current.getLatLng()
      ])
      mapInstance.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 })
    }
  }, [driverPos])

  const submitRating = async () => {
    if (!rating) return
    setSubmitting(true)
    try {
      await fetch(`${API}/tracking/${trackingCode}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, feedback })
      })
      setRatingSubmitted(true)
    } catch (e) { console.error(e) }
    setSubmitting(false)
  }

  if (error) {
    return (
      <div style={styles.errorPage}>
        <div style={styles.errorIcon}>🔍</div>
        <h1 style={styles.errorTitle}>Envío no encontrado</h1>
        <p style={styles.errorText}>El código de seguimiento no existe o expiró.</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Cargando seguimiento...</p>
      </div>
    )
  }

  const currentStep = STATUS_INDEX[order.status] ?? 0
  const isActive = ['IN_TRANSIT', 'PICKED_UP', 'ASSIGNED'].includes(order.status)
  const isDelivered = order.status === 'DELIVERED'
  const isCancelled = ['CANCELLED', 'FAILED'].includes(order.status)

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.businessName}>{order.business?.name || 'RutaEnvio'}</div>
          <div style={styles.orderNumber}>Pedido {order.orderNumber}</div>
        </div>
      </div>

      {/* Map (only show when driver is active) */}
      {isActive && (
        <div style={styles.mapContainer}>
          <div ref={mapRef} style={styles.map} />
          {driverPos && order.driver?.name && (
            <div style={styles.driverBadge}>
              <span style={styles.driverDot} /> {order.driver.name} en camino
            </div>
          )}
        </div>
      )}

      {/* Delivered hero */}
      {isDelivered && (
        <div style={styles.deliveredHero}>
          <div style={styles.deliveredIcon}>✅</div>
          <h2 style={styles.deliveredTitle}>Entregado</h2>
          {order.receiverName && <p style={styles.deliveredSub}>Recibido por {order.receiverName}</p>}
          {order.deliveredAt && <p style={styles.deliveredTime}>{new Date(order.deliveredAt).toLocaleString('es-AR')}</p>}
        </div>
      )}

      {/* Cancelled */}
      {isCancelled && (
        <div style={styles.cancelledHero}>
          <div style={styles.cancelledIcon}>❌</div>
          <h2 style={styles.cancelledTitle}>{order.status === 'CANCELLED' ? 'Cancelado' : 'No se pudo entregar'}</h2>
          <p style={styles.cancelledSub}>Contactá al vendedor para más información.</p>
        </div>
      )}

      {/* Status stepper */}
      {!isCancelled && (
        <div style={styles.stepper}>
          {STATUS_STEPS.map((step, i) => {
            const done = i <= currentStep
            const active = i === currentStep
            return (
              <div key={step.key} style={styles.stepRow}>
                <div style={styles.stepLeft}>
                  <div style={{
                    ...styles.stepDot,
                    background: done ? '#0ea5e9' : '#1e293b',
                    boxShadow: active ? '0 0 0 4px rgba(14,165,233,0.2)' : 'none',
                    transform: active ? 'scale(1.2)' : 'scale(1)',
                  }}>
                    <span style={{ fontSize: 14 }}>{done ? step.icon : ''}</span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div style={{ ...styles.stepLine, background: i < currentStep ? '#0ea5e9' : '#1e293b' }} />
                  )}
                </div>
                <div style={styles.stepContent}>
                  <div style={{ ...styles.stepLabel, color: done ? '#e2e8f0' : '#475569', fontWeight: active ? 700 : 400 }}>
                    {step.label}
                  </div>
                  {active && isActive && (
                    <div style={styles.stepActive}>Ahora mismo</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ETA */}
      {isActive && order.estimatedMinutes && (
        <div style={styles.etaCard}>
          <div style={styles.etaIcon}>🕐</div>
          <div>
            <div style={styles.etaLabel}>Tiempo estimado</div>
            <div style={styles.etaValue}>{order.estimatedMinutes} minutos</div>
          </div>
        </div>
      )}

      {/* Delivery address */}
      <div style={styles.infoCard}>
        <div style={styles.infoLabel}>Dirección de entrega</div>
        <div style={styles.infoValue}>{order.address}</div>
      </div>

      {/* Rating (only after delivery) */}
      {isDelivered && !ratingSubmitted && (
        <div style={styles.ratingCard}>
          <div style={styles.ratingTitle}>¿Cómo fue tu experiencia?</div>
          <div style={styles.stars}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setRating(n)} style={{
                ...styles.star,
                opacity: n <= rating ? 1 : 0.3,
                transform: n <= rating ? 'scale(1.1)' : 'scale(1)'
              }}>⭐</button>
            ))}
          </div>
          {rating > 0 && (
            <>
              <textarea
                style={styles.feedbackInput}
                placeholder="Comentario opcional..."
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                rows={2}
              />
              <button onClick={submitRating} disabled={submitting} style={styles.ratingBtn}>
                {submitting ? 'Enviando...' : 'Enviar calificación'}
              </button>
            </>
          )}
        </div>
      )}

      {ratingSubmitted && isDelivered && (
        <div style={styles.ratingDone}>
          <span>⭐</span> Gracias por tu calificación
        </div>
      )}

      {/* Footer */}
      <div style={styles.footer}>
        Seguimiento por <span style={{ color: '#0ea5e9', fontWeight: 600 }}>RutaEnvio</span>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(14,165,233,0.4)} 50%{box-shadow:0 0 0 12px rgba(14,165,233,0)} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .leaflet-container { background: #111829 !important; }
        .leaflet-tile-pane { filter: saturate(0.3) brightness(0.65); }
        .leaflet-control-attribution { display: none !important; }
      `}</style>
    </div>
  )
}

const styles = {
  page: { maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#0b1120', color: '#e2e8f0' },

  // Header
  header: { background: 'linear-gradient(180deg, #111829 0%, #0b1120 100%)', padding: '20px 20px 16px', borderBottom: '1px solid #1e293b' },
  headerInner: {},
  businessName: { fontSize: 18, fontWeight: 700, color: '#fff' },
  orderNumber: { fontSize: 13, color: '#64748b', marginTop: 2 },

  // Map
  mapContainer: { position: 'relative', height: 260, margin: '0' },
  map: { width: '100%', height: '100%' },
  driverBadge: { position: 'absolute', bottom: 12, left: 12, right: 12, background: 'rgba(17,24,41,0.92)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '10px 14px', fontSize: 14, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 8, zIndex: 1000 },
  driverDot: { width: 8, height: 8, borderRadius: 4, background: '#0ea5e9', display: 'inline-block', animation: 'pulse 2s infinite' },

  // Delivered hero
  deliveredHero: { textAlign: 'center', padding: '32px 20px 24px' },
  deliveredIcon: { fontSize: 48, marginBottom: 8 },
  deliveredTitle: { fontSize: 24, fontWeight: 700, color: '#10b981' },
  deliveredSub: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  deliveredTime: { fontSize: 12, color: '#475569', marginTop: 4 },

  // Cancelled
  cancelledHero: { textAlign: 'center', padding: '32px 20px 24px' },
  cancelledIcon: { fontSize: 48, marginBottom: 8 },
  cancelledTitle: { fontSize: 24, fontWeight: 700, color: '#ef4444' },
  cancelledSub: { fontSize: 14, color: '#94a3b8', marginTop: 4 },

  // Stepper
  stepper: { padding: '24px 20px' },
  stepRow: { display: 'flex', gap: 14 },
  stepLeft: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32 },
  stepDot: { width: 32, height: 32, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease', flexShrink: 0 },
  stepLine: { width: 2, flex: 1, minHeight: 24, transition: 'background 0.3s ease' },
  stepContent: { paddingBottom: 20, flex: 1 },
  stepLabel: { fontSize: 15, transition: 'all 0.2s ease' },
  stepActive: { fontSize: 12, color: '#0ea5e9', fontWeight: 600, marginTop: 2 },

  // ETA
  etaCard: { margin: '0 20px 16px', background: '#111829', border: '1px solid #1e293b', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 },
  etaIcon: { fontSize: 24 },
  etaLabel: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  etaValue: { fontSize: 18, fontWeight: 700, color: '#fff' },

  // Info card
  infoCard: { margin: '0 20px 16px', background: '#111829', border: '1px solid #1e293b', borderRadius: 14, padding: '14px 16px' },
  infoLabel: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  infoValue: { fontSize: 15, color: '#e2e8f0', lineHeight: 1.4 },

  // Rating
  ratingCard: { margin: '0 20px 16px', background: '#111829', border: '1px solid #1e293b', borderRadius: 14, padding: '20px', textAlign: 'center' },
  ratingTitle: { fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 12 },
  stars: { display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 },
  star: { fontSize: 32, background: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.15s ease', padding: 0 },
  feedbackInput: { width: '100%', background: '#0b1120', border: '1px solid #1e293b', borderRadius: 10, padding: '10px 12px', color: '#e2e8f0', fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit', marginBottom: 12 },
  ratingBtn: { background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%' },
  ratingDone: { margin: '0 20px 16px', textAlign: 'center', fontSize: 14, color: '#64748b', padding: 16 },

  // Footer
  footer: { textAlign: 'center', padding: '24px 20px 40px', fontSize: 12, color: '#334155' },

  // Loading & Error
  loadingPage: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0b1120' },
  spinner: { width: 32, height: 32, border: '3px solid #1e293b', borderTopColor: '#0ea5e9', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 12 },
  loadingText: { color: '#64748b', fontSize: 14 },
  errorPage: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0b1120', padding: 32 },
  errorIcon: { fontSize: 48, marginBottom: 12 },
  errorTitle: { fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 },
  errorText: { fontSize: 14, color: '#64748b', textAlign: 'center' },
}
