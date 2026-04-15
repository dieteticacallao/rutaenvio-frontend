import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { MapPin, Navigation, Phone, Package, CheckCircle2, Loader2, Camera, X, Truck, Clock, Play, ScanLine, PackageCheck, MessageCircle, CalendarClock, ChevronLeft, ChevronRight, List, Trophy } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { io as socketIO } from 'socket.io-client'

const API = import.meta.env.VITE_API_URL || '/api'
const SOCKET_URL = API.replace(/\/api\/?$/, '') || window.location.origin

const STATUS_CONFIG = {
  PENDING: { label: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  ASSIGNED: { label: 'Asignado', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  PICKED_UP: { label: 'Retirado', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  IN_TRANSIT: { label: 'En camino', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  ARRIVED: { label: 'Llego', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  DELIVERED: { label: 'Entregado', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  FAILED: { label: 'Fallido', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  RESCHEDULED: { label: 'Reprogramado', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
}

const DONE_STATUSES = ['DELIVERED', 'CANCELLED', 'RESCHEDULED']

function getDriverLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    )
  })
}

export default function RouteView() {
  const { token } = useParams()
  const [route, setRoute] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deliverModal, setDeliverModal] = useState(null)
  const [receiverName, setReceiverName] = useState('')
  const [receiverDni, setReceiverDni] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [rescheduleModal, setRescheduleModal] = useState(null)
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [reschedulePhoto, setReschedulePhoto] = useState(null)
  const [reschedulePhotoPreview, setReschedulePhotoPreview] = useState(null)
  const [submittingReschedule, setSubmittingReschedule] = useState(false)
  const [updatingOrder, setUpdatingOrder] = useState(null)
  const [startingRoute, setStartingRoute] = useState(false)
  const [pickingUp, setPickingUp] = useState(null)
  const [scanModalOrder, setScanModalOrder] = useState(null)
  const [routeEstimate, setRouteEstimate] = useState(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [showAllOrders, setShowAllOrders] = useState(false)
  const [socketToast, setSocketToast] = useState(null)
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef({})
  const scannerRef = useRef(null)

  const fetchRoute = useCallback(async () => {
    try {
      const r = await fetch(`${API}/driver-web/${token}`)
      if (!r.ok) throw new Error('not found')
      const data = await r.json()
      if (data.success) setRoute(data.data)
      else throw new Error('error')
    } catch {
      setError('Ruta no encontrada')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) fetchRoute()
  }, [token, fetchRoute])

  // Socket.IO: escuchar actualizaciones de pedidos en tiempo real (ML Flex, etc.)
  useEffect(() => {
    if (!route?.id) return
    const socket = socketIO(SOCKET_URL, { transports: ['websocket', 'polling'] })
    socket.on('connect', () => {
      socket.emit('route:join', { routeId: route.id })
    })
    socket.on('order:status', ({ orderId, status, customerName }) => {
      setRoute(prev => {
        if (!prev) return prev
        const orderExists = prev.orders.some(o => o.id === orderId)
        if (!orderExists) return prev
        const updated = {
          ...prev,
          orders: prev.orders.map(o => o.id === orderId
            ? { ...o, status, ...(status === 'DELIVERED' ? { deliveredAt: new Date().toISOString() } : {}) }
            : o)
        }
        // Auto-advance if delivered
        if (status === 'DELIVERED') {
          const currentIdx = updated.orders.findIndex(o => o.id === orderId)
          setActiveIdx(prevIdx => {
            if (currentIdx === prevIdx || DONE_STATUSES.includes(updated.orders[prevIdx]?.status)) {
              const nextIdx = updated.orders.findIndex((o, i) => i > prevIdx && !DONE_STATUSES.includes(o.status))
              return nextIdx >= 0 ? nextIdx : prevIdx
            }
            return prevIdx
          })
        }
        return updated
      })
      // Show toast for delivered
      if (status === 'DELIVERED' && customerName) {
        setSocketToast(`\u2713 ${customerName} marcado como entregado por ML Flex`)
        setTimeout(() => setSocketToast(null), 4000)
      }
    })
    return () => { socket.disconnect() }
  }, [route?.id])

  // Extract origin from any possible backend field
  const getOrigin = () => {
    if (!route) return null
    if (route.origin?.lat && route.origin?.lng) return route.origin
    if (route.location?.lat && route.location?.lng) return route.location
    if (route.originLat && route.originLng) return { lat: route.originLat, lng: route.originLng }
    if (route.startLat && route.startLng) return { lat: route.startLat, lng: route.startLng }
    return null
  }

  // Initialize map
  useEffect(() => {
    if (!route || !mapRef.current || mapInstance.current) return
    const L = window.L
    if (!L) return

    mapInstance.current = L.map(mapRef.current, {
      center: [-34.6037, -58.3816], zoom: 12,
      zoomControl: true, attributionControl: false
    })
    L.tileLayer('https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(mapInstance.current)

    const origin = getOrigin()
    const bounds = []
    if (origin) {
      L.marker([origin.lat, origin.lng], {
        icon: L.divIcon({
          className: '',
          html: '<div style="width:32px;height:32px;background:#ef4444;border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;box-shadow:0 2px 8px rgba(239,68,68,0.5)">O</div>',
          iconSize: [32, 32], iconAnchor: [16, 16]
        })
      }).addTo(mapInstance.current)
      bounds.push([origin.lat, origin.lng])
    }

    route.orders.forEach(order => {
      if (!order.lat && !order.lng) return
      addOrderMarker(L, order, bounds, false)
    })

    const lineCoords = route.orders.filter(o => o.lat && o.lng).map(o => [o.lat, o.lng])
    if (origin) lineCoords.unshift([origin.lat, origin.lng])
    if (lineCoords.length > 1) {
      L.polyline(lineCoords, { color: '#3b82f6', weight: 3, opacity: 0.8, dashArray: '8 6' }).addTo(mapInstance.current)
    }
    if (bounds.length > 0) mapInstance.current.fitBounds(bounds, { padding: [30, 30] })

    return () => {
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null }
      markersRef.current = {}
    }
  }, [route?.id])

  // Highlight active order marker on map
  useEffect(() => {
    if (!route || !mapInstance.current) return
    const L = window.L
    if (!L) return
    route.orders.forEach((order, idx) => {
      if (!order.lat || !order.lng) return
      const isActive = idx === activeIdx && !!route.startedAt
      refreshMarker(L, order, isActive)
    })
  }, [activeIdx, route?.orders])

  // Fetch OSRM route estimate
  useEffect(() => {
    if (!route || routeEstimate) return
    const origin = getOrigin()
    const waypoints = []
    if (origin) waypoints.push([origin.lng, origin.lat])
    route.orders.forEach(o => { if (o.lat && o.lng) waypoints.push([o.lng, o.lat]) })
    if (waypoints.length < 2) return
    const coords = waypoints.map(w => w.join(',')).join(';')
    fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`)
      .then(r => r.json())
      .then(data => {
        if (data.routes?.[0]) {
          const dur = Math.round(data.routes[0].duration / 60)
          const dist = (data.routes[0].distance / 1000).toFixed(1)
          setRouteEstimate({ minutes: dur, km: dist })
        }
      })
      .catch(() => {})
  }, [route?.id])

  // Auto-set activeIdx to first non-done order when route data changes
  useEffect(() => {
    if (!route?.startedAt) return
    const nextIdx = route.orders.findIndex(o => !DONE_STATUSES.includes(o.status))
    if (nextIdx >= 0) setActiveIdx(nextIdx)
    else setActiveIdx(route.orders.length - 1) // all done, show last
  }, [route?.startedAt])

  function addOrderMarker(L, order, bounds, isActive) {
    if (!order.lat || !order.lng) return
    const color = order.status === 'DELIVERED' ? '#10b981' : order.status === 'IN_TRANSIT' ? '#3b82f6' : '#f59e0b'
    const size = isActive ? 38 : 28
    const fontSize = isActive ? '14px' : '11px'
    const border = isActive ? '3px solid #fff' : '2px solid #fff'
    const marker = L.marker([order.lat, order.lng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;background:${color};border:${border};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${fontSize};font-weight:700;color:#fff;box-shadow:0 2px 8px ${color}80;z-index:${isActive ? 1000 : 1}">${order.status === 'DELIVERED' ? '\u2713' : order.routePosition}</div>`,
        iconSize: [size, size], iconAnchor: [size/2, size/2]
      }),
      zIndexOffset: isActive ? 1000 : 0
    }).addTo(mapInstance.current)
    markersRef.current[order.id] = marker
    if (bounds) bounds.push([order.lat, order.lng])
  }

  function refreshMarker(L, order, isActive) {
    if (!order.lat || !order.lng || !mapInstance.current) return
    const oldMarker = markersRef.current[order.id]
    if (oldMarker) mapInstance.current.removeLayer(oldMarker)
    addOrderMarker(L, order, null, isActive)
  }

  function updateMarkerColor(orderId, status) {
    const L = window.L
    if (!L || !mapInstance.current) return
    const order = route.orders.find(o => o.id === orderId)
    if (!order || !order.lat || !order.lng) return
    const idx = route.orders.findIndex(o => o.id === orderId)
    const oldMarker = markersRef.current[orderId]
    if (oldMarker) mapInstance.current.removeLayer(oldMarker)
    const updatedOrder = { ...order, status }
    addOrderMarker(L, updatedOrder, null, idx === activeIdx)
  }

  // --- Actions ---

  const advanceToNext = () => {
    if (!route) return
    const nextIdx = route.orders.findIndex((o, i) => i > activeIdx && !DONE_STATUSES.includes(o.status))
    if (nextIdx >= 0) setActiveIdx(nextIdx)
  }

  const confirmPickup = async (orderId) => {
    setPickingUp(orderId)
    try {
      const r = await fetch(`${API}/driver-web/${token}/order/${orderId}/pickup`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }
      })
      const data = await r.json()
      if (data.success) {
        setRoute(prev => ({
          ...prev,
          orders: prev.orders.map(o => o.id === orderId ? { ...o, status: 'PICKED_UP', pickedUpAt: new Date().toISOString() } : o)
        }))
      }
    } catch (err) {
      console.error('Error confirmando retiro:', err)
    } finally {
      setPickingUp(null)
    }
  }

  const openScanner = (order) => {
    setScanModalOrder(order)
  }

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {})
      scannerRef.current.clear()
      scannerRef.current = null
    }
    setScanModalOrder(null)
  }

  // Start html5-qrcode when scan modal opens
  useEffect(() => {
    if (!scanModalOrder) return
    const elementId = 'qr-reader'
    const timer = setTimeout(() => {
      const scanner = new Html5Qrcode(elementId)
      scannerRef.current = scanner
      scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
            const size = Math.max(180, Math.floor(minEdge * 0.7))
            return { width: size, height: size }
          },
          aspectRatio: 1.0
        },
        (decodedText) => {
          let orderId = null
          try {
            const parsed = JSON.parse(decodedText)
            orderId = parsed.orderId || parsed.id
          } catch {
            const found = route?.orders?.find(o => String(o.id) === decodedText)
            if (found) orderId = found.id
          }
          scanner.stop().catch(() => {})
          scanner.clear()
          scannerRef.current = null
          setScanModalOrder(null)
          if (orderId) {
            confirmPickup(orderId)
          }
        },
        () => {}
      ).catch(() => {
        scanner.clear()
        scannerRef.current = null
        setScanModalOrder(null)
      })
    }, 100)
    return () => {
      clearTimeout(timer)
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current.clear()
        scannerRef.current = null
      }
    }
  }, [scanModalOrder?.id])

  const startRoute = async () => {
    setStartingRoute(true)
    try {
      const loc = await getDriverLocation()
      const body = loc ? { lat: loc.lat, lng: loc.lng } : {}
      const r = await fetch(`${API}/driver-web/${token}/start`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await r.json()
      if (data.success) {
        setRoute(prev => ({
          ...prev,
          startedAt: data.startedAt || new Date().toISOString(),
          orders: prev.orders.map(o =>
            o.status === 'PICKED_UP' ? { ...o, status: 'IN_TRANSIT' } : o
          )
        }))
      }
    } catch (err) {
      console.error('Error iniciando ruta:', err)
    } finally {
      setStartingRoute(false)
    }
  }

  const markInTransit = async (orderId) => {
    setUpdatingOrder(orderId)
    try {
      const loc = await getDriverLocation()
      const body = loc ? { lat: loc.lat, lng: loc.lng } : {}
      const r = await fetch(`${API}/driver-web/${token}/order/${orderId}/transit`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
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
    setReceiverDni('')
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
    if (!receiverName.trim() || !receiverDni.trim()) return
    setSubmitting(true)
    try {
      const loc = await getDriverLocation()
      const body = { receiverName: receiverName.trim(), receiverDni: receiverDni.trim(), deliveryPhoto: photoPreview || null }
      if (loc) { body.lat = loc.lat; body.lng = loc.lng }
      const r = await fetch(`${API}/driver-web/${token}/order/${deliverModal.id}/deliver`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await r.json()
      if (data.success) {
        const deliveredId = deliverModal.id
        setRoute(prev => {
          const updated = {
            ...prev,
            orders: prev.orders.map(o => o.id === deliveredId
              ? { ...o, status: 'DELIVERED', deliveredAt: new Date().toISOString(), receiverName }
              : o)
          }
          // Auto-advance to next pending order
          const nextIdx = updated.orders.findIndex((o, i) => i > activeIdx && !DONE_STATUSES.includes(o.status))
          if (nextIdx >= 0) setTimeout(() => setActiveIdx(nextIdx), 300)
          return updated
        })
        updateMarkerColor(deliveredId, 'DELIVERED')
        setDeliverModal(null)
      }
    } catch (err) {
      console.error('Error confirmando entrega:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const navigateTo = (order) => {
    const province = order.province || 'Buenos Aires'
    const parts = [order.address]
    if (order.city) parts.push(order.city)
    parts.push(province, 'Argentina')
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(parts.join(', '))}`, '_blank')
  }

  const openRescheduleModal = (order) => {
    setRescheduleModal(order)
    setRescheduleReason('')
    setReschedulePhoto(null)
    setReschedulePhotoPreview(null)
  }

  const handleReschedulePhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setReschedulePhoto(file)
    const reader = new FileReader()
    reader.onload = (ev) => setReschedulePhotoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const confirmReschedule = async () => {
    if (!rescheduleModal) return
    if (!rescheduleReason.trim()) return
    const order = rescheduleModal
    setSubmittingReschedule(true)
    try {
      const r = await fetch(`${API}/driver-web/${token}/order/${order.id}/reschedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: rescheduleReason.trim(),
          photo: reschedulePhotoPreview || null
        })
      })
      const data = await r.json()
      if (data.success) {
        setRoute(prev => {
          const updated = {
            ...prev,
            orders: prev.orders.map(o => o.id === order.id ? { ...o, status: 'RESCHEDULED', isRescheduled: true, rescheduledReason: rescheduleReason.trim() } : o)
          }
          const nextIdx = updated.orders.findIndex((o, i) => i > activeIdx && !DONE_STATUSES.includes(o.status))
          if (nextIdx >= 0) setTimeout(() => setActiveIdx(nextIdx), 300)
          return updated
        })
        setRescheduleModal(null)
      }
    } catch (err) {
      console.error('Error reprogramando pedido:', err)
    } finally {
      setSubmittingReschedule(false)
    }
  }

  // --- Render ---

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
  const routeStarted = !!route.startedAt

  // Pickup phase: ML orders excluded from manual pickup
  const manualOrders = route.orders.filter(o => o.source !== 'MERCADOLIBRE')
  const pendingPickup = manualOrders.filter(o => ['PENDING', 'ASSIGNED'].includes(o.status))
  const pickedUpCount = manualOrders.filter(o => !['PENDING', 'ASSIGNED'].includes(o.status)).length
  const manualTotal = manualOrders.length
  const allPickedUp = pendingPickup.length === 0

  // Stats
  const deliveredOrders = route.orders.filter(o => o.status === 'DELIVERED' && o.deliveredAt)
  const routeStartTime = route.startedAt ? new Date(route.startedAt) : null
  const now = new Date()
  const lastDeliveryTime = deliveredOrders.length > 0
    ? new Date(Math.max(...deliveredOrders.map(o => new Date(o.deliveredAt).getTime())))
    : null
  const endTime = deliveredCount === totalOrders && lastDeliveryTime ? lastDeliveryTime : now
  const routeMinutes = routeStartTime ? Math.round((endTime - routeStartTime) / 60000) : 0
  const routeHours = Math.floor(routeMinutes / 60)
  const routeMins = routeMinutes % 60
  const avgMinutes = deliveredCount > 0 && routeStartTime
    ? Math.round(((lastDeliveryTime || now) - routeStartTime) / 60000 / deliveredCount)
    : 0

  // Active order for single-view mode
  const activeOrder = route.orders[activeIdx]
  const allDone = route.orders.every(o => DONE_STATUSES.includes(o.status))
  const processedCount = route.orders.filter(o => DONE_STATUSES.includes(o.status)).length

  // Render a single order card (used in both active view and full list)
  const renderOrderCard = (order, { compact = false } = {}) => {
    const isML = order.source === 'MERCADOLIBRE'
    const isTN = order.source === 'TIENDANUBE'
    const needsPickup = ['PENDING', 'ASSIGNED'].includes(order.status)
    const isPickedUp = order.status === 'PICKED_UP'
    const isTransit = order.status === 'IN_TRANSIT' || order.status === 'ARRIVED'
    const isDelivered = order.status === 'DELIVERED'
    const isUpdating = updatingOrder === order.id
    const isPickingUpThis = pickingUp === order.id

    let badgeCfg
    if (isML) {
      badgeCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING
    } else if (needsPickup) {
      badgeCfg = { label: 'Pendiente de retiro', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' }
    } else {
      badgeCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING
    }

    // Compact mode for the "Ver todos" list
    if (compact) {
      return (
        <div
          key={order.id}
          onClick={() => { if (routeStarted) { setActiveIdx(route.orders.indexOf(order)); setShowAllOrders(false) } }}
          className={`flex items-center gap-3 px-3 py-3 min-h-[56px] rounded-lg border transition-colors ${
            isDelivered ? 'bg-emerald-500/5 border-emerald-500/20 opacity-60' :
            order.status === 'RESCHEDULED' ? 'bg-amber-500/5 border-amber-500/20 opacity-60' :
            order.status === 'CANCELLED' ? 'bg-red-500/5 border-red-500/20 opacity-60' :
            'bg-navy-900 border-navy-800 cursor-pointer hover:border-brand-500/30 active:border-brand-500/30'
          }`}
        >
          <span className={`text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isDelivered ? 'bg-emerald-500/20 text-emerald-400' : 'bg-navy-800 text-gray-400'
          }`}>
            {isDelivered ? '\u2713' : order.routePosition}
          </span>
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-medium truncate ${isDelivered ? 'line-through text-gray-500' : 'text-white'}`}>
              {order.customerName}
            </div>
            <div className="text-gray-500 truncate" style={{ fontSize: '12px' }}>{order.address}</div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isML && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">ML</span>}
            {isTN && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">TN</span>}
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${badgeCfg.color}`}>
              {badgeCfg.label}
            </span>
          </div>
        </div>
      )
    }

    // Full card (active order view)
    return (
      <div key={order.id} className={`rounded-xl border p-4 ${isDelivered ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-navy-900 border-navy-800'}`}>
        {/* Top row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white bg-brand-500/20 text-brand-400 w-8 h-8 rounded-full flex items-center justify-center">
              {order.routePosition}
            </span>
            <span className="text-[11px] font-mono text-gray-500">{order.orderNumber}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {isML && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                ML
              </span>
            )}
            {isTN && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-purple-500/20 text-purple-400 border-purple-500/30">
                TN
              </span>
            )}
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeCfg.color}`}>
              {badgeCfg.label}
            </span>
          </div>
        </div>

        <div className="text-base font-semibold text-white mb-1.5 break-words">{order.customerName}</div>

        <div className="text-sm text-gray-400 flex items-start gap-1.5 mb-1">
          <MapPin size={15} className="mt-0.5 flex-shrink-0" />
          <span className="break-words min-w-0">
            {order.address}
            {order.city ? `, ${order.city}` : ''}
            {order.addressDetail ? ` (${order.addressDetail})` : ''}
          </span>
        </div>

        {order.customerPhone && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <a href={`tel:${order.customerPhone}`} className="flex items-center gap-1.5 px-3 min-h-[44px] rounded-lg bg-navy-800 text-brand-400 hover:bg-navy-700 active:bg-navy-700 transition-colors text-sm no-underline border border-navy-700 active:scale-[0.98]">
              <Phone size={16} /> Llamar
            </a>
            <a
              href={`https://wa.me/${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${order.customerName}, soy tu repartidor de RutaEnvio. Estoy en camino con tu pedido #${order.orderNumber || ''}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 min-h-[44px] rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 active:bg-emerald-500/20 transition-colors text-sm no-underline border border-emerald-500/20 active:scale-[0.98] min-w-[140px]"
            >
              <MessageCircle size={16} /> WhatsApp
            </a>
          </div>
        )}

        {order.notes && (
          <div className="text-amber-400/80 mt-3 bg-amber-500/5 rounded-lg px-3 py-2 border border-amber-500/10" style={{ fontSize: '13px' }}>
            <span className="font-semibold">Nota:</span> {order.notes}
          </div>
        )}

        {/* Delivered info */}
        {isDelivered && (
          <div className="mt-3 text-sm text-emerald-400/70 flex items-center gap-1.5">
            <CheckCircle2 size={14} />
            <span>Entregado</span>
            {order.deliveredAt && (
              <span className="text-emerald-400 font-medium ml-1">
                {new Date(order.deliveredAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
              </span>
            )}
            {order.receiverName && (
              <span className="text-gray-500 ml-1">a {order.receiverName}</span>
            )}
          </div>
        )}

        {/* PICKUP PHASE: scan or manual confirm (before route started) - not for ML orders */}
        {needsPickup && !routeStarted && !isML && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => openScanner(order)}
              disabled={isPickingUpThis}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 min-h-[48px] rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors text-sm font-medium disabled:opacity-50 active:scale-[0.98]"
            >
              {isPickingUpThis ? <Loader2 size={16} className="animate-spin" /> : <ScanLine size={16} />}
              Escanear retiro
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Confirmar retiro manual del pedido #${order.routePosition} de ${order.customerName}?`)) {
                  confirmPickup(order.id)
                }
              }}
              disabled={isPickingUpThis}
              className="flex items-center justify-center gap-1.5 px-3 min-h-[48px] rounded-lg bg-navy-800 text-amber-400 hover:bg-navy-700 transition-colors text-sm font-medium border border-amber-500/30 disabled:opacity-50 active:scale-[0.98]"
            >
              {isPickingUpThis ? <Loader2 size={16} className="animate-spin" /> : <PackageCheck size={16} />}
              Retiro manual
            </button>
          </div>
        )}

        {/* Picked up but route not started yet */}
        {isPickedUp && !routeStarted && (
          <div className="mt-3 text-sm text-emerald-400/70 flex items-center gap-1.5">
            <PackageCheck size={14} /> Paquete retirado
          </div>
        )}

        {/* Rescheduled info */}
        {order.status === 'RESCHEDULED' && (
          <div className="mt-3 text-sm text-amber-400/70 flex items-center gap-1.5">
            <CalendarClock size={14} />
            <span>Reprogramado para manana</span>
          </div>
        )}

        {/* ML orders: only Navigate button */}
        {isML && !isDelivered && order.status !== 'CANCELLED' && order.status !== 'RESCHEDULED' && (
          <div className="mt-3">
            <button
              onClick={() => navigateTo(order)}
              className="w-full flex items-center justify-center gap-2 px-3 min-h-[48px] rounded-xl bg-navy-800 text-white hover:bg-navy-950 transition-colors text-sm font-medium border border-navy-700 active:scale-[0.98]"
            >
              <Navigation size={18} /> Navegar
            </button>
            <p className="text-center text-gray-600 mt-1.5" style={{ fontSize: '12px' }}>Entrega gestionada por MercadoLibre Flex</p>
          </div>
        )}

        {/* ROUTE PHASE: navigate + deliver + reschedule (after route started) - not for ML */}
        {routeStarted && !isML && (isPickedUp || isTransit) && (
          <div className="space-y-2 mt-3">
            <div className="flex gap-2">
              <button
                onClick={() => navigateTo(order)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 min-h-[52px] rounded-xl bg-navy-800 text-white hover:bg-navy-950 transition-colors text-sm font-medium border border-navy-700 active:scale-[0.98]"
              >
                <Navigation size={18} /> Navegar
              </button>
              {isPickedUp && (
                <button
                  onClick={() => markInTransit(order.id)}
                  disabled={isUpdating}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 min-h-[52px] rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 active:scale-[0.98]"
                >
                  {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Truck size={18} />}
                  En camino
                </button>
              )}
              {isTransit && (
                <button
                  onClick={() => openDeliverModal(order)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 min-h-[52px] rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-sm font-medium active:scale-[0.98]"
                >
                  <CheckCircle2 size={18} /> Entregar
                </button>
              )}
            </div>
            <button
              onClick={() => openRescheduleModal(order)}
              disabled={isUpdating}
              className="w-full flex items-center justify-center gap-1.5 px-3 min-h-[48px] rounded-xl bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors text-sm font-medium border border-amber-500/20 disabled:opacity-50 active:scale-[0.98]"
            >
              <CalendarClock size={16} /> Reprogramar para manana
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="route-view-root min-h-[100dvh] bg-navy-950 overflow-x-hidden">
      {/* Socket toast notification */}
      {socketToast && (
        <div className="fixed left-1/2 -translate-x-1/2 z-[9999] bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg animate-pulse max-w-[90vw] text-center" style={{ top: 'calc(1rem + env(safe-area-inset-top))' }}>
          {socketToast}
        </div>
      )}

      {/* Header */}
      <div className="bg-navy-900 border-b border-navy-800 px-4 sticky top-0 z-50" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))', paddingBottom: '0.75rem' }}>
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
        <div className="border-b border-navy-800" style={{ height: '220px' }}>
          <div ref={mapRef} className="w-full h-full" />
        </div>

        {/* PHASE 1: Pickup phase (before route started) */}
        {!routeStarted && (
          <div className="px-3 pt-3 space-y-3">
            {/* Progress bar */}
            <div className="bg-navy-900 border border-navy-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white">Retiro de paquetes</span>
                <span className="text-xs text-gray-400">{pickedUpCount}/{manualTotal} retirados</span>
              </div>
              <div className="w-full h-2 bg-navy-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${allPickedUp ? 'bg-emerald-400' : 'bg-amber-400'}`}
                  style={{ width: `${manualTotal > 0 ? (pickedUpCount / manualTotal) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Route estimate from OSRM */}
            {routeEstimate && (
              <div className="bg-navy-900 border border-navy-800 rounded-xl p-3 flex items-center justify-center gap-3 text-xs text-gray-400">
                <Clock size={14} className="text-brand-400" />
                <span>Tiempo estimado: {Math.floor(routeEstimate.minutes / 60)}h {routeEstimate.minutes % 60}min</span>
                <span className="text-navy-700">|</span>
                <span>{routeEstimate.km} km</span>
              </div>
            )}

            {/* Iniciar ruta button */}
            {pickedUpCount > 0 && (
              <div className="space-y-2">
                {!allPickedUp && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-400">
                    Tenes {pendingPickup.length} pedido{pendingPickup.length !== 1 ? 's' : ''} sin confirmar retiro. Los pedidos no confirmados quedaran como pendientes.
                  </div>
                )}
                <button
                  onClick={() => {
                    if (allPickedUp) {
                      startRoute()
                    } else {
                      if (window.confirm(`Estas seguro? Tenes ${pendingPickup.length} pedido${pendingPickup.length !== 1 ? 's' : ''} sin confirmar retiro. Estos pedidos no se incluiran en la ruta.`)) {
                        startRoute()
                      }
                    }
                  }}
                  disabled={startingRoute}
                  className={`w-full flex items-center justify-center gap-2.5 min-h-[56px] py-4 rounded-xl text-white font-bold text-base transition-colors disabled:opacity-50 active:scale-[0.98] ${
                    allPickedUp ? 'bg-brand-500 hover:bg-brand-600' : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {startingRoute ? (
                    <><Loader2 size={22} className="animate-spin" /> Iniciando ruta...</>
                  ) : allPickedUp ? (
                    <><Play size={22} /> Iniciar ruta</>
                  ) : (
                    <><Play size={22} /> Iniciar ruta igual</>
                  )}
                </button>
              </div>
            )}

            {/* Pickup phase: show orders as list (need to see all for scanning) */}
            <div className="space-y-2">
              {route.orders.map(order => renderOrderCard(order))}
            </div>
          </div>
        )}

        {/* PHASE 2: Route started */}
        {routeStarted && (
          <div className="px-3 pt-3 space-y-3">
            {/* Stats bar */}
            <div className="flex items-center justify-center gap-4 py-2 text-xs text-gray-400 flex-wrap">
              <div className="flex items-center gap-1">
                <Clock size={12} className="text-emerald-400" />
                <span>Inicio {new Date(route.startedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</span>
              </div>
              {deliveredCount > 0 && (
                <>
                  <span className="text-navy-700">|</span>
                  <div>{routeHours}h {routeMins}m</div>
                  <span className="text-navy-700">|</span>
                  <div>~{avgMinutes} min/entrega</div>
                </>
              )}
            </div>

            {/* Route completed summary */}
            {allDone ? (
              <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 text-center space-y-3">
                <Trophy size={48} className="mx-auto text-emerald-400" />
                <h2 className="text-xl font-bold text-white">Ruta completada</h2>
                <div className="text-3xl font-bold text-emerald-400">{deliveredCount}/{totalOrders}</div>
                <p className="text-sm text-gray-400">pedidos entregados</p>
                {routeStartTime && (
                  <div className="text-xs text-gray-500 pt-2 border-t border-navy-800">
                    Tiempo total: {routeHours}h {routeMins}m
                    {avgMinutes > 0 && ` — Promedio: ${avgMinutes} min por entrega`}
                  </div>
                )}
                <button
                  onClick={() => setShowAllOrders(!showAllOrders)}
                  className="mt-2 flex items-center justify-center gap-1.5 mx-auto text-xs text-brand-400 hover:text-brand-300"
                >
                  <List size={14} /> Ver detalle de pedidos
                </button>
              </div>
            ) : (
              <>
                {/* Progress indicator */}
                <div className="bg-navy-900 border border-navy-800 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-white">
                      Pedido {activeIdx + 1} de {totalOrders}
                    </span>
                    <span className="text-xs text-gray-400">
                      {processedCount} procesados
                    </span>
                  </div>
                  <div className="w-full h-2 bg-navy-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-400 transition-all"
                      style={{ width: `${(processedCount / totalOrders) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Active order card */}
                {activeOrder && renderOrderCard(activeOrder)}

                {/* Navigation buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveIdx(Math.max(0, activeIdx - 1))}
                    disabled={activeIdx === 0}
                    className="flex-1 flex items-center justify-center gap-1.5 min-h-[48px] rounded-xl bg-navy-900 text-gray-400 hover:text-white hover:bg-navy-800 transition-colors text-sm font-medium border border-navy-800 disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:bg-navy-900 active:scale-[0.98]"
                  >
                    <ChevronLeft size={18} /> Anterior
                  </button>
                  <button
                    onClick={() => setActiveIdx(Math.min(totalOrders - 1, activeIdx + 1))}
                    disabled={activeIdx === totalOrders - 1}
                    className="flex-1 flex items-center justify-center gap-1.5 min-h-[48px] rounded-xl bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-colors text-sm font-medium border border-brand-500/20 disabled:opacity-30 disabled:hover:bg-brand-500/10 active:scale-[0.98]"
                  >
                    Siguiente <ChevronRight size={18} />
                  </button>
                </div>
              </>
            )}

            {/* Toggle full list */}
            {!allDone && (
              <button
                onClick={() => setShowAllOrders(!showAllOrders)}
                className="w-full flex items-center justify-center gap-1.5 min-h-[44px] text-sm text-gray-500 hover:text-gray-300 active:text-gray-300 transition-colors"
              >
                <List size={16} /> {showAllOrders ? 'Ocultar lista' : 'Ver todos los pedidos'}
              </button>
            )}

            {/* Full orders list (expandable) */}
            {showAllOrders && (
              <div className="space-y-1.5 pb-2">
                {route.orders.map(order => renderOrderCard(order, { compact: true }))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-gray-700 mt-6" style={{ fontSize: '12px', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
          Powered by <span className="text-brand-400 font-semibold">RutaEnvio</span>
        </div>
      </div>

      {/* QR Scanner Modal */}
      {scanModalOrder && (
        <div className="fixed inset-0 bg-black/90 z-[9999] flex items-end sm:items-center justify-center" onClick={stopScanner}>
          <div
            className="bg-navy-900 w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-navy-800 flex flex-col"
            style={{ maxHeight: '95dvh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-navy-800/50 flex-shrink-0">
              <h3 className="text-sm font-bold text-white truncate pr-2">Escanear QR - Pedido #{scanModalOrder.routePosition}</h3>
              <button onClick={stopScanner} aria-label="Cerrar scanner" className="text-gray-500 hover:text-white flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-1">
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div id="qr-reader" className="w-full rounded-lg overflow-hidden bg-black" style={{ minHeight: '260px' }} />
              <p className="text-gray-500 mt-2 text-center" style={{ fontSize: '12px' }}>Apunta la camara al codigo QR del paquete</p>
            </div>

            <div
              className="border-t border-navy-800/50 px-4 pt-3 bg-navy-900 flex-shrink-0"
              style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
            >
              <button
                onClick={() => { stopScanner(); confirmPickup(scanModalOrder.id) }}
                className="w-full flex items-center justify-center gap-1.5 min-h-[48px] rounded-lg bg-navy-800 text-amber-400 hover:bg-navy-700 active:bg-navy-700 transition-colors text-sm font-medium border border-amber-500/30"
              >
                <PackageCheck size={16} /> No puedo escanear, confirmar manual
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Modal */}
      {deliverModal && (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-end sm:items-center justify-center" onClick={() => !submitting && setDeliverModal(null)}>
          <div
            className="bg-navy-900 w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-navy-800 flex flex-col"
            style={{ maxHeight: '92dvh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Sticky header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-navy-800/50 flex-shrink-0">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-white">Confirmar entrega</h2>
                <p className="text-gray-400 truncate" style={{ fontSize: '13px' }}>Pedido #{deliverModal.routePosition} - {deliverModal.customerName}</p>
              </div>
              <button onClick={() => !submitting && setDeliverModal(null)} aria-label="Cerrar" className="text-gray-500 hover:text-white flex-shrink-0 -mr-1 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X size={22} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <label className="block text-gray-400 mb-1.5" style={{ fontSize: '13px' }}>Nombre de quien recibe *</label>
                <input
                  type="text"
                  value={receiverName}
                  onChange={e => setReceiverName(e.target.value)}
                  onFocus={e => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
                  placeholder="Ej: Juan Perez"
                  autoComplete="name"
                  className="w-full bg-navy-950 border border-navy-800 rounded-lg px-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500"
                  style={{ fontSize: '16px', minHeight: '48px' }}
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1.5" style={{ fontSize: '13px' }}>DNI *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={receiverDni}
                  onChange={e => setReceiverDni(e.target.value.replace(/\D/g, ''))}
                  onFocus={e => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
                  placeholder="Ej: 12345678"
                  className="w-full bg-navy-950 border border-navy-800 rounded-lg px-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500"
                  style={{ fontSize: '16px', minHeight: '48px' }}
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1.5" style={{ fontSize: '13px' }}>Foto entrega (opcional)</label>
                {!photoPreview ? (
                  <label className="flex items-center justify-center gap-2 w-full py-6 border-2 border-dashed border-navy-800 rounded-xl text-gray-500 hover:border-brand-500 hover:text-brand-400 active:border-brand-500 transition-colors cursor-pointer">
                    <Camera size={22} /> <span className="text-sm">Sacar foto</span>
                    <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
                  </label>
                ) : (
                  <div className="relative">
                    <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-xl border border-navy-800" />
                    <button onClick={() => { setPhoto(null); setPhotoPreview(null) }} aria-label="Quitar foto" className="absolute top-2 right-2 bg-black/70 rounded-full min-w-[36px] min-h-[36px] flex items-center justify-center">
                      <X size={18} className="text-white" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky footer with action button (safe-area aware) */}
            <div
              className="border-t border-navy-800/50 px-5 pt-3 bg-navy-900 flex-shrink-0"
              style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
            >
              <button
                onClick={confirmDelivery}
                disabled={submitting || !receiverName.trim() || !receiverDni.trim()}
                className="w-full flex items-center justify-center gap-2 min-h-[52px] rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 active:scale-[0.98]"
              >
                {submitting ? (<><Loader2 size={18} className="animate-spin" /> Confirmando...</>) : (<><CheckCircle2 size={18} /> Confirmar entrega</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModal && (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-end sm:items-center justify-center" onClick={() => !submittingReschedule && setRescheduleModal(null)}>
          <div
            className="bg-navy-900 w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-navy-800 flex flex-col"
            style={{ maxHeight: '92dvh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Sticky header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-navy-800/50 flex-shrink-0">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <CalendarClock size={18} className="text-amber-400" /> Reprogramar pedido
                </h2>
                <p className="text-gray-400 truncate mt-0.5" style={{ fontSize: '13px' }}>Pedido #{rescheduleModal.routePosition} - {rescheduleModal.customerName}</p>
              </div>
              <button onClick={() => !submittingReschedule && setRescheduleModal(null)} aria-label="Cerrar" className="text-gray-500 hover:text-white flex-shrink-0 -mr-1 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X size={22} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <label className="block text-gray-400 mb-1.5" style={{ fontSize: '13px' }}>Motivo de reprogramacion *</label>
                <textarea
                  value={rescheduleReason}
                  onChange={e => setRescheduleReason(e.target.value)}
                  onFocus={e => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
                  placeholder="Ej: No habia nadie en el domicilio"
                  rows={3}
                  className="w-full bg-navy-950 border border-navy-800 rounded-lg px-3 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 resize-none"
                  style={{ fontSize: '16px' }}
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1.5" style={{ fontSize: '13px' }}>Foto (opcional)</label>
                {!reschedulePhotoPreview ? (
                  <label className="flex items-center justify-center gap-2 w-full py-6 border-2 border-dashed border-navy-800 rounded-xl text-gray-500 hover:border-amber-500 hover:text-amber-400 active:border-amber-500 transition-colors cursor-pointer">
                    <Camera size={22} /> <span className="text-sm">Sacar foto</span>
                    <input type="file" accept="image/*" capture="environment" onChange={handleReschedulePhoto} className="hidden" />
                  </label>
                ) : (
                  <div className="relative">
                    <img src={reschedulePhotoPreview} alt="Preview" className="w-full h-48 object-cover rounded-xl border border-navy-800" />
                    <button onClick={() => { setReschedulePhoto(null); setReschedulePhotoPreview(null) }} aria-label="Quitar foto" className="absolute top-2 right-2 bg-black/70 rounded-full min-w-[36px] min-h-[36px] flex items-center justify-center">
                      <X size={18} className="text-white" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky footer */}
            <div
              className="border-t border-navy-800/50 px-5 pt-3 bg-navy-900 flex gap-2 flex-shrink-0"
              style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
            >
              <button
                onClick={() => setRescheduleModal(null)}
                disabled={submittingReschedule}
                className="flex-1 min-h-[52px] rounded-xl bg-navy-800 text-gray-300 font-semibold text-sm hover:bg-navy-700 transition-colors disabled:opacity-50 active:scale-[0.98]"
              >
                Cancelar
              </button>
              <button
                onClick={confirmReschedule}
                disabled={submittingReschedule || !rescheduleReason.trim()}
                className="flex-1 flex items-center justify-center gap-2 min-h-[52px] rounded-xl bg-amber-600 text-white font-semibold text-sm hover:bg-amber-700 transition-colors disabled:opacity-50 active:scale-[0.98]"
              >
                {submittingReschedule ? (<><Loader2 size={18} className="animate-spin" /> Enviando...</>) : (<><CalendarClock size={18} /> Confirmar</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        html, body { overflow-x: hidden; }
        .route-view-root { -webkit-tap-highlight-color: transparent; }
        .route-view-root button, .route-view-root a { touch-action: manipulation; }
        .leaflet-container { background: #111829 !important; }
        .leaflet-control-attribution { display: none !important; }
        #qr-reader { border: none !important; width: 100% !important; }
        #qr-reader video { border-radius: 8px; width: 100% !important; height: auto !important; max-height: 60vh; object-fit: cover; }
        #qr-reader__scan_region { background: transparent !important; min-height: 260px; }
        #qr-reader__scan_region img { display: none; }
        #qr-reader__dashboard { background: transparent !important; padding-top: 8px !important; }
        #qr-reader__dashboard button { background: #1e293b !important; color: #e2e8f0 !important; border: 1px solid #334155 !important; border-radius: 8px !important; padding: 10px 16px !important; min-height: 44px; font-size: 14px !important; }
        #qr-reader__camera_selection { background: #1e293b !important; color: #e2e8f0 !important; border: 1px solid #334155 !important; border-radius: 8px !important; padding: 8px !important; font-size: 14px !important; min-height: 44px; max-width: 100%; }
      `}</style>
    </div>
  )
}
