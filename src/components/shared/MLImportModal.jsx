import { useState, useEffect } from 'react'
import { api } from '../../lib/store'
import { X, Loader2, AlertCircle, ShoppingBag, Check, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function MLImportModal({ onClose, onImported }) {
  const [mlOrders, setMlOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(new Set())
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState(null)

  const getOrderKey = (order, idx) => {
    if (order.mlShipmentId) return String(order.mlShipmentId)
    if (order.shipmentId) return String(order.shipmentId)
    return `${order.packId || order.id || 'order'}-${idx}`
  }

  useEffect(() => {
    api.get('/mercadolibre/orders')
      .then(r => {
        const d = r.data
        const list = Array.isArray(d) ? d
          : Array.isArray(d?.data) ? d.data
          : Array.isArray(d?.orders) ? d.orders
          : []
        setMlOrders(list)
        setLoading(false)
      })
      .catch(err => {
        setMlOrders([])
        setError(err.response?.data?.error || err.response?.data?.message || 'Error al obtener pedidos de MercadoLibre')
        setLoading(false)
      })
  }, [])

  const toggleSelect = (key) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const importableOrders = mlOrders.filter(o => !o.alreadyImported)

  const toggleAll = () => {
    if (selected.size === importableOrders.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(importableOrders.map((o, i) => getOrderKey(o, i))))
    }
  }

  const handleImport = async () => {
    if (selected.size === 0) {
      toast.error('Selecciona al menos un pedido')
      return
    }
    setImporting(true)
    try {
      const selectedKeys = Array.from(selected)
      const selectedOrders = mlOrders.filter((o, i) => selectedKeys.includes(getOrderKey(o, i)))
      const orderIds = selectedOrders.map(o => o.mlShipmentId || o.shipmentId || o.packId || o.id)
      const { data } = await api.post('/mercadolibre/orders/import', {
        orderIds
      })
      const imported = data?.imported ?? orderIds.length
      toast.success(`Se importaron ${imported} pedidos de MercadoLibre`)
      onImported()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al importar')
    }
    setImporting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="card-p w-full max-w-4xl space-y-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Importar pedidos
              <span className="inline-flex items-center gap-1 text-sm font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FFE600', color: '#000' }}>
                <ShoppingBag size={14} /> ML
              </span>
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-gray-500">Pedidos Flex pendientes de envio</p>
              <button
                onClick={() => {
                  setLoading(true)
                  setError(null)
                  setSelected(new Set())
                  api.post('/mercadolibre/orders/refresh')
                    .then(r => {
                      const d = r.data
                      const list = Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : Array.isArray(d?.orders) ? d.orders : []
                      setMlOrders(list)
                      setLoading(false)
                    })
                    .catch(err => {
                      setMlOrders([])
                      setError(err.response?.data?.error || 'Error al refrescar pedidos')
                      setLoading(false)
                    })
                }}
                disabled={loading}
                className="text-gray-500 hover:text-white transition-colors p-0.5"
                title="Refrescar desde MercadoLibre"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <Loader2 size={24} className="animate-spin mr-2" /> Cargando pedidos Flex...
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-red-400 py-8 justify-center">
            <AlertCircle size={20} />
            <span className="text-sm">{error}</span>
          </div>
        ) : mlOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No hay pedidos Flex pendientes de envio.</p>
            <button onClick={onClose} className="btn-secondary mt-4">Cerrar</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{importableOrders.length} pedidos nuevos{mlOrders.length > importableOrders.length ? ` (${mlOrders.length - importableOrders.length} ya importados)` : ''}</span>
              <span className="text-gray-500">{selected.size} seleccionados</span>
            </div>

            <div className="overflow-y-auto flex-1 min-h-0 border border-navy-800 rounded-lg">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-navy-900 z-10">
                  <tr className="border-b border-navy-800 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="p-2 pl-3 text-left w-8">
                      <input
                        type="checkbox"
                        checked={selected.size === importableOrders.length && importableOrders.length > 0}
                        onChange={toggleAll}
                        className="rounded border-navy-700 bg-navy-900 text-brand-500"
                      />
                    </th>
                    <th className="p-2 text-left">Cliente</th>
                    <th className="p-2 text-left">Usuario ML</th>
                    <th className="p-2 text-left">Direccion</th>
                    <th className="p-2 text-left">Ciudad</th>
                    <th className="p-2 pr-3 text-left">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-800/50">
                  {mlOrders.map((order, idx) => {
                    const imported = order.alreadyImported
                    const key = getOrderKey(order, idx)
                    const dateRaw = order.dateCreated || order.createdAt || order.date_created
                    const dateStr = dateRaw ? new Date(dateRaw).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) : '\u2014'
                    return (
                      <tr
                        key={key}
                        onClick={() => !imported && toggleSelect(key)}
                        className={`transition-colors ${imported ? 'opacity-40' : 'cursor-pointer'} ${
                          !imported && selected.has(key) ? 'bg-brand-500/5' : !imported ? 'hover:bg-navy-800/30' : ''
                        }`}
                      >
                        <td className="p-2 pl-3" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={!imported && selected.has(key)}
                            onChange={() => !imported && toggleSelect(key)}
                            disabled={imported}
                            className="rounded border-navy-700 bg-navy-900 text-brand-500 disabled:opacity-30"
                          />
                        </td>
                        <td className="p-2 text-gray-300 truncate max-w-[160px]">
                          <span className="inline-flex items-center gap-1">
                            {order.customerName || '\u2014'}
                            {imported && <Check size={12} className="text-emerald-500 shrink-0" />}
                          </span>
                        </td>
                        <td className="p-2 text-gray-400 truncate max-w-[120px] text-xs">{order.buyerNickname || order.buyer?.nickname || '\u2014'}</td>
                        <td className="p-2 text-gray-400 truncate max-w-[200px]">{order.address || order.shipping?.receiver_address?.street_name || '\u2014'}</td>
                        <td className="p-2 text-gray-400 truncate max-w-[100px]">{order.city || order.shipping?.receiver_address?.city?.name || '\u2014'}</td>
                        <td className="p-2 pr-3 text-gray-400 text-xs whitespace-nowrap">{dateStr}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-navy-800">
              <button onClick={onClose} className="btn-secondary">Cancelar</button>
              <button onClick={handleImport} disabled={importing || selected.size === 0} className="btn-primary">
                {importing ? (
                  <><Loader2 size={16} className="animate-spin" /> Importando...</>
                ) : (
                  <>Importar {selected.size} pedido{selected.size !== 1 ? 's' : ''} seleccionado{selected.size !== 1 ? 's' : ''}</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
