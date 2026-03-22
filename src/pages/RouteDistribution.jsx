import { useState, useEffect, useRef } from 'react'
import { api, ROUTE_COLORS } from '../lib/store'
import { Route, Users, Zap, Check, QrCode, ArrowRight, RotateCcw, Package, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RouteDistribution() {
  const [step, setStep] = useState(1) // 1: select, 2: preview, 3: confirmed
  const [orders, setOrders] = useState([])
  const [drivers, setDrivers] = useState([])
  const [selectedOrders, setSelectedOrders] = useState([])
  const [selectedDrivers, setSelectedDrivers] = useState([])
  const [distribution, setDistribution] = useState(null)
  const [confirmedRoutes, setConfirmedRoutes] = useState(null)
  const [loading, setLoading] = useState(true)
  const [distributing, setDistributing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef([])

  useEffect(() => {
    Promise.all([
      api.get('/orders/unassigned'),
      api.get('/drivers')
    ]).then(([ordRes, drvRes]) => {
      setOrders(ordRes.data)
      setDrivers(drvRes.data.filter(d => d.isActive))
      setSelectedOrders(ordRes.data.map(o => o.id))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return
    const L = window.L
    if (!L) return

    mapInstance.current = L.map(mapRef.current, {
      center: [-34.6037, -58.3816], // Buenos Aires
      zoom: 12,
      zoomControl: true
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(mapInstance.current)

    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null } }
  }, [])

  // Ensure map recalculates size when step changes
  useEffect(() => {
    if (mapInstance.current) {
      setTimeout(() => mapInstance.current?.invalidateSize(), 200)
    }
  }, [step])

  // Update map markers
  useEffect(() => {
    if (!mapInstance.current) return
    const L = window.L

    // Clear existing markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    if (step === 1) {
      // Show all unassigned orders
      const selected = orders.filter(o => selectedOrders.includes(o.id))
      const bounds = []

      selected.forEach((order, i) => {
        if (!order.lat || !order.lng) return
        const marker = L.marker([order.lat, order.lng], {
          icon: L.divIcon({ className: 'order-marker', html: `${i + 1}` })
        }).bindPopup(`<b>${order.orderNumber}</b><br>${order.customerName}<br>${order.address}`)
        marker.addTo(mapInstance.current)
        markersRef.current.push(marker)
        bounds.push([order.lat, order.lng])
      })

      if (bounds.length > 0) mapInstance.current.fitBounds(bounds, { padding: [40, 40] })
    }

    if (step === 2 && distribution) {
      // Show distributed routes with colors
      const bounds = []

      distribution.routes.forEach((route, ri) => {
        const color = ROUTE_COLORS[ri % ROUTE_COLORS.length]

        route.orders.forEach((order, oi) => {
          if (!order.lat || !order.lng) return
          const marker = L.marker([order.lat, order.lng], {
            icon: L.divIcon({
              className: '',
              html: `<div style="width:28px;height:28px;background:${color};border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;box-shadow:0 0 8px ${color}60">${order.routePosition}</div>`
            })
          }).bindPopup(`<b>${route.driverName}</b> - Parada ${order.routePosition}<br>${order.customerName}<br>${order.address}`)
          marker.addTo(mapInstance.current)
          markersRef.current.push(marker)
          bounds.push([order.lat, order.lng])
        })

        // Draw route line
        const routeCoords = route.orders.filter(o => o.lat && o.lng).map(o => [o.lat, o.lng])
        if (routeCoords.length > 1) {
          const polyline = L.polyline(routeCoords, { color, weight: 3, opacity: 0.7, dashArray: '8 6' })
          polyline.addTo(mapInstance.current)
          markersRef.current.push(polyline)
        }
      })

      if (bounds.length > 0) mapInstance.current.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [step, selectedOrders, distribution, orders])

  const handleDistribute = async () => {
    if (selectedOrders.length === 0) return toast.error('Seleccioná al menos un pedido')
    if (selectedDrivers.length === 0) return toast.error('Seleccioná al menos un cadete')

    setDistributing(true)
    try {
      const { data } = await api.post('/routes/distribute', {
        orderIds: selectedOrders,
        driverIds: selectedDrivers
      })
      setDistribution(data)
      setStep(2)
      toast.success(`${data.totalOrders} pedidos distribuidos en ${data.totalDrivers} rutas`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al distribuir')
    }
    setDistributing(false)
  }

  const handleConfirm = async () => {
    if (!distribution) return
    setConfirming(true)
    try {
      const { data } = await api.post('/routes/confirm', {
        routes: distribution.routes.map(r => ({
          driverId: r.driverId,
          driverName: r.driverName,
          orders: r.orders.map(o => ({ id: o.id, routePosition: o.routePosition }))
        })),
        date: new Date().toISOString()
      })
      setConfirmedRoutes(data.routes)
      setStep(3)
      toast.success('Rutas confirmadas y QR generados')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al confirmar')
    }
    setConfirming(false)
  }

  const toggleOrder = (id) => setSelectedOrders(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  )
  const toggleDriver = (id) => setSelectedDrivers(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  )
  const selectAll = () => setSelectedOrders(orders.map(o => o.id))
  const selectNone = () => setSelectedOrders([])

  if (loading) return <div className="flex items-center justify-center h-96 text-gray-500">Cargando datos...</div>

  return (
    <div className="space-y-5">
      {/* Header with steps */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Distribuir rutas</h1>
          <p className="text-sm text-gray-500">
            {step === 1 && `${orders.length} pedidos pendientes, ${drivers.length} cadetes disponibles`}
            {step === 2 && 'Revisá la distribución y confirmá'}
            {step === 3 && 'Rutas listas — compartí los QR con tus cadetes'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3].map(s => (
            <div key={s} className={`flex items-center gap-1 ${s <= step ? 'text-brand-400' : 'text-gray-600'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                s < step ? 'bg-brand-500 text-white' : s === step ? 'bg-brand-500/20 text-brand-400 border border-brand-500' : 'bg-navy-800 text-gray-600'
              }`}>{s < step ? '✓' : s}</div>
              {s < 3 && <div className={`w-8 h-0.5 ${s < step ? 'bg-brand-500' : 'bg-navy-800'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4" style={{ minHeight: '600px' }}>
        {/* Left panel */}
        <div className="space-y-4 overflow-y-auto max-h-[700px] pr-1">
          {step === 1 && <>
            {/* Select orders */}
            <div className="card-p">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Package size={16} className="text-amber-400" /> Pedidos ({selectedOrders.length}/{orders.length})
                </h3>
                <div className="flex gap-1">
                  <button onClick={selectAll} className="text-xs text-brand-400 hover:underline">Todos</button>
                  <span className="text-gray-600">|</span>
                  <button onClick={selectNone} className="text-xs text-gray-400 hover:underline">Ninguno</button>
                </div>
              </div>

              {orders.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">No hay pedidos pendientes geocodificados. Importá pedidos primero.</p>
              ) : (
                <div className="space-y-1 max-h-[250px] overflow-y-auto">
                  {orders.map(order => (
                    <label key={order.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                        selectedOrders.includes(order.id) ? 'bg-brand-500/10 border border-brand-500/20' : 'hover:bg-navy-800/50 border border-transparent'
                      }`}>
                      <input type="checkbox" checked={selectedOrders.includes(order.id)}
                        onChange={() => toggleOrder(order.id)}
                        className="rounded border-navy-800 bg-navy-950 text-brand-500 focus:ring-brand-500" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">{order.customerName}</div>
                        <div className="text-xs text-gray-500 truncate">{order.address}</div>
                      </div>
                      <div className="text-xs font-mono text-gray-500">{order.orderNumber}</div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Select drivers */}
            <div className="card-p">
              <h3 className="font-semibold text-white flex items-center gap-2 mb-3">
                <Users size={16} className="text-brand-400" /> Cadetes ({selectedDrivers.length})
              </h3>
              <div className="space-y-1">
                {drivers.map(driver => (
                  <label key={driver.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                      selectedDrivers.includes(driver.id) ? 'bg-brand-500/10 border border-brand-500/20' : 'hover:bg-navy-800/50 border border-transparent'
                    }`}>
                    <input type="checkbox" checked={selectedDrivers.includes(driver.id)}
                      onChange={() => toggleDriver(driver.id)}
                      className="rounded border-navy-800 bg-navy-950 text-brand-500 focus:ring-brand-500" />
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      driver.isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-navy-800 text-gray-500'
                    }`}>{driver.name.charAt(0)}</div>
                    <div className="flex-1">
                      <div className="text-sm text-white">{driver.name}</div>
                      <div className="text-xs text-gray-500">{driver.isOnline ? 'Online' : 'Offline'} — {driver.totalDeliveries} entregas</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Distribute button */}
            <button onClick={handleDistribute} disabled={distributing || selectedOrders.length === 0 || selectedDrivers.length === 0}
              className="btn-primary w-full justify-center text-base py-3">
              <Zap size={18} /> {distributing ? 'Calculando rutas...' : `Distribuir ${selectedOrders.length} pedidos en ${selectedDrivers.length} rutas`}
            </button>
          </>}

          {step === 2 && distribution && <>
            {/* Distribution preview */}
            {distribution.routes.map((route, i) => (
              <div key={route.driverId} className="card-p">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: ROUTE_COLORS[i % ROUTE_COLORS.length] }}>
                    {route.driverName.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{route.driverName}</div>
                    <div className="text-xs text-gray-500">{route.totalOrders} paradas</div>
                  </div>
                </div>
                <div className="space-y-1">
                  {route.orders.map(order => (
                    <div key={order.id} className="flex items-center gap-2 py-1.5 px-2 rounded text-xs">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ background: ROUTE_COLORS[i % ROUTE_COLORS.length] }}>
                        {order.routePosition}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-gray-300 truncate">{order.customerName}</div>
                        <div className="text-gray-500 truncate">{order.address}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex gap-2">
              <button onClick={() => { setStep(1); setDistribution(null) }} className="btn-secondary flex-1 justify-center">
                <RotateCcw size={16} /> Volver
              </button>
              <button onClick={handleConfirm} disabled={confirming} className="btn-primary flex-1 justify-center">
                <Check size={16} /> {confirming ? 'Confirmando...' : 'Confirmar rutas'}
              </button>
            </div>
          </>}

          {step === 3 && confirmedRoutes && <>
            {/* QR codes for each route */}
            {confirmedRoutes.map((route, i) => (
              <div key={route.id} className="card-p text-center">
                <div className="text-sm font-semibold text-white mb-2">{route.name}</div>
                {route.qrCode && (
                  <img src={route.qrCode} alt="QR" className="w-48 h-48 mx-auto rounded-lg bg-white p-2" />
                )}
                <p className="text-xs text-gray-500 mt-2">
                  El cadete escanea este QR desde la app para cargar su ruta
                </p>
              </div>
            ))}
            <button onClick={() => { setStep(1); setDistribution(null); setConfirmedRoutes(null) }}
              className="btn-secondary w-full justify-center">
              <RotateCcw size={16} /> Armar nuevas rutas
            </button>
          </>}
        </div>

        {/* Map */}
        <div className="card overflow-hidden" style={{ minHeight: '500px' }}>
          <div ref={mapRef} className="w-full h-full min-h-[500px]" />
        </div>
      </div>
    </div>
  )
}
