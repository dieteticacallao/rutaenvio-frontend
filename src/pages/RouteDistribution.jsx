import { useState, useEffect, useRef } from 'react'
import { api, ROUTE_COLORS } from '../lib/store'
import { Route, Users, Zap, Check, QrCode, ArrowRight, RotateCcw, Package, MapPin, X, Copy, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RouteDistribution() {
  const [step, setStep] = useState(1) // 1: select, 2: preview, 3: confirmed
  const [orders, setOrders] = useState([])
  const [drivers, setDrivers] = useState([])
  const [selectedOrders, setSelectedOrders] = useState([])
  const [selectedDrivers, setSelectedDrivers] = useState([])
  const [distribution, setDistribution] = useState(null)
  const [confirmedRoutes, setConfirmedRoutes] = useState(null)
  const [locations, setLocations] = useState([])
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [loading, setLoading] = useState(true)
  const [distributing, setDistributing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [unassignedOrders, setUnassignedOrders] = useState([])
  const [reassignTargets, setReassignTargets] = useState({})
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef([])
  const originMarkerRef = useRef(null)

  useEffect(() => {
    Promise.all([
      api.get('/orders/unassigned'),
      api.get('/drivers'),
      api.get('/dashboard/locations')
    ]).then(([ordRes, drvRes, locRes]) => {
      setOrders(ordRes.data)
      setDrivers(drvRes.data.filter(d => d.isActive))
      setSelectedOrders(ordRes.data.map(o => o.id))
      const locs = locRes.data
      setLocations(locs)
      if (locs.length === 1) {
        setSelectedLocationId(locs[0].id)
      } else {
        const def = locs.find(l => l.isDefault)
        if (def) setSelectedLocationId(def.id)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Initialize map once (depends on loading so it runs after the map div is in the DOM)
  useEffect(() => {
    if (loading) return
    if (!mapRef.current || mapInstance.current) return
    const L = window.L
    if (!L) return

    mapInstance.current = L.map(mapRef.current, {
      center: [-34.6037, -58.3816], // Buenos Aires
      zoom: 12,
      zoomControl: true
    })

    L.tileLayer('https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors, © CARTO'
    }).addTo(mapInstance.current)

    setTimeout(() => mapInstance.current?.invalidateSize(), 300)

    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null } }
  }, [loading])

  // Ensure map recalculates size when step changes
  useEffect(() => {
    if (mapInstance.current) {
      setTimeout(() => mapInstance.current?.invalidateSize(), 200)
    }
  }, [step])

  // Update origin marker on map
  useEffect(() => {
    if (!mapInstance.current) return
    const L = window.L
    if (originMarkerRef.current) { originMarkerRef.current.remove(); originMarkerRef.current = null }

    const loc = locations.find(l => l.id === selectedLocationId)
    if (loc && loc.lat && loc.lng) {
      originMarkerRef.current = L.marker([loc.lat, loc.lng], {
        icon: L.divIcon({
          className: '',
          html: '<div style="width:32px;height:32px;background:#ef4444;border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;box-shadow:0 0 10px #ef444480">O</div>'
        })
      }).bindPopup(`<b>Origen: ${loc.name}</b><br>${loc.address}`)
      originMarkerRef.current.addTo(mapInstance.current)
    }
  }, [selectedLocationId, locations, step])

  // Update map markers
  useEffect(() => {
    if (!mapInstance.current) return
    const L = window.L

    // Clear existing markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    // Include origin in bounds if selected
    const originLoc = locations.find(l => l.id === selectedLocationId)

    if (step === 1) {
      // Show all unassigned orders
      const selected = orders.filter(o => selectedOrders.includes(o.id))
      const bounds = []

      selected.forEach((order, i) => {
        if (!order.lat || !order.lng) return
        const marker = L.marker([order.lat, order.lng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="width:28px;height:28px;background:#3b82f6;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;box-shadow:0 0 8px #3b82f660">${i + 1}</div>`
          })
        }).bindPopup(`<b>${order.orderNumber}</b><br>${order.customerName}<br>${order.address}`)
        marker.addTo(mapInstance.current)
        markersRef.current.push(marker)
        bounds.push([order.lat, order.lng])
      })

      if (originLoc?.lat && originLoc?.lng) bounds.push([originLoc.lat, originLoc.lng])
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

      if (originLoc?.lat && originLoc?.lng) bounds.push([originLoc.lat, originLoc.lng])
      if (bounds.length > 0) mapInstance.current.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [step, selectedOrders, distribution, orders, selectedLocationId, locations])

  const removeFromRoute = (routeIndex, orderId) => {
    setDistribution(prev => {
      const newRoutes = prev.routes.map((route, ri) => {
        if (ri !== routeIndex) return route
        const removedOrder = route.orders.find(o => o.id === orderId)
        if (removedOrder) {
          setUnassignedOrders(ua => [...ua, removedOrder])
        }
        const newOrders = route.orders.filter(o => o.id !== orderId).map((o, idx) => ({ ...o, routePosition: idx + 1 }))
        return { ...route, orders: newOrders, totalOrders: newOrders.length }
      })
      return { ...prev, routes: newRoutes, totalOrders: newRoutes.reduce((sum, r) => sum + r.orders.length, 0) }
    })
  }

  const reassignOrder = (orderId, targetDriverId) => {
    if (!targetDriverId) return
    const order = unassignedOrders.find(o => o.id === orderId)
    if (!order) return

    setUnassignedOrders(prev => prev.filter(o => o.id !== orderId))
    setDistribution(prev => {
      const newRoutes = prev.routes.map(route => {
        if (route.driverId !== targetDriverId) return route
        const newOrders = [...route.orders, { ...order, routePosition: route.orders.length + 1 }]
        return { ...route, orders: newOrders, totalOrders: newOrders.length }
      })
      return { ...prev, routes: newRoutes, totalOrders: newRoutes.reduce((sum, r) => sum + r.orders.length, 0) }
    })
    setReassignTargets(prev => { const n = { ...prev }; delete n[orderId]; return n })
    toast.success('Pedido reasignado')
  }

  const handleDistribute = async () => {
    if (selectedOrders.length === 0) return toast.error('Seleccioná al menos un pedido')
    if (selectedDrivers.length === 0) return toast.error('Seleccioná al menos un cadete')

    setDistributing(true)
    try {
      const body = { orderIds: selectedOrders, driverIds: selectedDrivers }
      if (selectedLocationId) body.locationId = selectedLocationId
      const { data } = await api.post('/routes/distribute', body)
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

            {/* Punto de origen */}
            {locations.length > 0 && (
              <div className="card-p">
                <h3 className="font-semibold text-white flex items-center gap-2 mb-3">
                  <MapPin size={16} className="text-red-400" /> Punto de origen
                </h3>
                <select
                  className="input w-full"
                  value={selectedLocationId}
                  onChange={e => setSelectedLocationId(e.target.value)}
                >
                  <option value="">Seleccionar punto de origen</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} — {loc.address} {loc.isDefault ? '(predeterminado)' : ''} {!loc.lat ? '(sin geocodificar)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
                    <div key={order.id} className="flex items-center gap-2 py-1.5 px-2 rounded text-xs hover:bg-navy-800/50 group">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ background: ROUTE_COLORS[i % ROUTE_COLORS.length] }}>
                        {order.routePosition}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-gray-500 font-mono truncate">{order.orderNumber}</div>
                        <div className="text-gray-300 font-semibold truncate">{order.customerName}</div>
                        <div className="text-gray-500 truncate">{order.address}</div>
                      </div>
                      <button onClick={() => removeFromRoute(i, order.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                        title="Sacar de esta ruta">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Pedidos sin asignar */}
            {unassignedOrders.length > 0 && (
              <div className="card-p border border-amber-500/30">
                <h3 className="font-semibold text-amber-400 flex items-center gap-2 mb-3">
                  <Package size={16} /> Pedidos sin asignar ({unassignedOrders.length})
                </h3>
                <div className="space-y-2">
                  {unassignedOrders.map(order => (
                    <div key={order.id} className="flex items-center gap-2 py-2 px-2 rounded bg-navy-800/50 text-xs">
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-gray-500 font-mono truncate">{order.orderNumber}</div>
                        <div className="text-gray-300 font-semibold truncate">{order.customerName}</div>
                        <div className="text-gray-500 truncate">{order.address}</div>
                      </div>
                      <select
                        className="bg-navy-900 border border-navy-700 rounded text-xs text-gray-300 px-1.5 py-1"
                        value={reassignTargets[order.id] || ''}
                        onChange={e => setReassignTargets(prev => ({ ...prev, [order.id]: e.target.value }))}
                      >
                        <option value="">Cadete...</option>
                        {distribution.routes.map(r => (
                          <option key={r.driverId} value={r.driverId}>{r.driverName}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => reassignOrder(order.id, reassignTargets[order.id])}
                        disabled={!reassignTargets[order.id]}
                        className="text-xs text-brand-400 hover:text-brand-300 disabled:text-gray-600 whitespace-nowrap"
                      >
                        Reasignar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => { setStep(1); setDistribution(null); setUnassignedOrders([]); setReassignTargets({}) }} className="btn-secondary flex-1 justify-center">
                <RotateCcw size={16} /> Volver
              </button>
              <button onClick={handleConfirm} disabled={confirming || unassignedOrders.length > 0} className="btn-primary flex-1 justify-center">
                <Check size={16} /> {confirming ? 'Confirmando...' : 'Confirmar rutas'}
              </button>
            </div>
          </>}

          {step === 3 && confirmedRoutes && <>
            {/* QR codes for each route */}
            {confirmedRoutes.map((route, i) => {
              const routeLink = route.linkToken ? `${window.location.origin}/ruta/${route.linkToken}` : null
              return (
                <div key={route.id} className="card-p text-center">
                  <div className="text-sm font-semibold text-white mb-2">{route.name}</div>
                  {route.qrCode && (
                    <img src={route.qrCode} alt="QR" className="w-48 h-48 mx-auto rounded-lg bg-white p-2" />
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    El cadete escanea este QR desde la app para cargar su ruta
                  </p>
                  {routeLink && (
                    <div className="flex gap-2 mt-3 justify-center">
                      <button
                        onClick={() => { navigator.clipboard.writeText(routeLink); toast.success('Link copiado') }}
                        className="btn-secondary text-xs"
                      >
                        <Copy size={14} /> Copiar link
                      </button>
                      {route.driverPhone && (
                        <a
                          href={`https://wa.me/${route.driverPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola! Aca tenes tu ruta de hoy: ${routeLink}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary text-xs inline-flex items-center gap-1.5"
                        >
                          <MessageCircle size={14} /> Enviar por WhatsApp
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
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
