import { useState, useEffect, useCallback } from 'react'
import { api } from '../../lib/store'
import { X, Loader2, AlertCircle, Cloud, Check } from 'lucide-react'
import toast from 'react-hot-toast'

function toLocalDate(date) {
  const d = date || new Date()
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
}

export default function TNImportModal({ onClose, onImported }) {
  const today = toLocalDate(new Date())
  const [tnOrders, setTnOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(new Set())
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState(null)
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)

  const fetchTNOrders = useCallback((from, to) => {
    setLoading(true)
    setError(null)
    setSelected(new Set())
    const params = { filter_shipping: 'rutaenvio' }
    if (from) params.date_from = from
    if (to) params.date_to = to
    api.get('/tiendanube/orders', { params })
      .then(r => {
        const d = r.data
        const all = Array.isArray(d) ? d
          : Array.isArray(d?.data) ? d.data
          : Array.isArray(d?.orders) ? d.orders
          : []
        const list = all.filter(order => {
          const s = (order.shippingMethod || order.shipping || order.shipping_option || '').toLowerCase()
          return s.includes('rutaenvio')
        })
        setTnOrders(list)
        setLoading(false)
      })
      .catch(err => {
        setTnOrders([])
        setError(err.response?.data?.error || 'Error al obtener pedidos de Tiendanube')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    fetchTNOrders(dateFrom, dateTo)
  }, [dateFrom, dateTo, fetchTNOrders])

  const setQuickDate = (from, to) => {
    setDateFrom(from)
    setDateTo(to)
  }

  const yesterday = toLocalDate(new Date(Date.now() - 86400000))
  const threeDaysAgo = toLocalDate(new Date(Date.now() - 3 * 86400000))
  const sevenDaysAgo = toLocalDate(new Date(Date.now() - 7 * 86400000))

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const importableOrders = tnOrders.filter(o => !o.alreadyImported)

  const toggleAll = () => {
    if (selected.size === importableOrders.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(importableOrders.map(o => o.id)))
    }
  }

  const handleImport = async () => {
    if (selected.size === 0) {
      toast.error('Selecciona al menos un pedido')
      return
    }
    setImporting(true)
    try {
      const selectedIds = Array.from(selected)
      const selectedOrders = tnOrders.filter(o => selected.has(o.id))
      const { data } = await api.post('/tiendanube/import', {
        orderIds: selectedIds,
        orders: selectedOrders
      })
      const imported = data?.imported ?? selectedIds.length
      toast.success(`Se importaron ${imported} pedidos`)
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
              <span className="inline-flex items-center gap-1 text-sm font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/20">
                <Cloud size={14} /> TN
              </span>
            </h2>
            <p className="text-sm text-gray-500 mt-1">Pedidos con envio RutaEnvio pendientes</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: 'Hoy', from: today, to: today },
            { label: 'Ayer', from: yesterday, to: yesterday },
            { label: '3 dias', from: threeDaysAgo, to: today },
            { label: '7 dias', from: sevenDaysAgo, to: today },
          ].map(btn => (
            <button
              key={btn.label}
              onClick={() => setQuickDate(btn.from, btn.to)}
              className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                dateFrom === btn.from && dateTo === btn.to
                  ? 'bg-brand-500 text-white'
                  : 'bg-navy-800 text-gray-400 hover:text-white hover:bg-navy-700'
              }`}
            >
              {btn.label}
            </button>
          ))}
          <div className="flex items-center gap-1.5 ml-auto">
            <label className="text-xs text-gray-500">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => { if (e.target.value) setDateFrom(e.target.value) }}
              className="input text-xs py-1.5 px-2 cursor-pointer [color-scheme:dark]"
            />
            <label className="text-xs text-gray-500">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => { if (e.target.value) setDateTo(e.target.value) }}
              className="input text-xs py-1.5 px-2 cursor-pointer [color-scheme:dark]"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <Loader2 size={24} className="animate-spin mr-2" /> Cargando pedidos de Tiendanube...
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-red-400 py-8 justify-center">
            <AlertCircle size={20} />
            <span className="text-sm">{error}</span>
          </div>
        ) : tnOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No hay pedidos de Tiendanube pendientes.</p>
            <button onClick={onClose} className="btn-secondary mt-4">Cerrar</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{importableOrders.length} pedidos nuevos con envio RutaEnvio{tnOrders.length > importableOrders.length ? ` (${tnOrders.length - importableOrders.length} ya importados)` : ''}</span>
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
                    <th className="p-2 text-left">Pedido</th>
                    <th className="p-2 text-left">Cliente</th>
                    <th className="p-2 text-left">Direccion</th>
                    <th className="p-2 text-left">Ciudad</th>
                    <th className="p-2 text-left">Envio</th>
                    <th className="p-2 pr-3 text-left">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-800/50">
                  {tnOrders.map(order => {
                    const imported = order.alreadyImported
                    return (
                      <tr
                        key={order.id}
                        onClick={() => !imported && toggleSelect(order.id)}
                        className={`transition-colors ${imported ? 'opacity-40' : 'cursor-pointer'} ${
                          !imported && selected.has(order.id) ? 'bg-brand-500/5' : !imported ? 'hover:bg-navy-800/30' : ''
                        }`}
                      >
                        <td className="p-2 pl-3" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={!imported && selected.has(order.id)}
                            onChange={() => !imported && toggleSelect(order.id)}
                            disabled={imported}
                            className="rounded border-navy-700 bg-navy-900 text-brand-500 disabled:opacity-30"
                          />
                        </td>
                        <td className="p-2 font-mono text-xs">
                          <span className="inline-flex items-center gap-1">
                            <span className={imported ? 'text-gray-500' : 'text-white'}>#{order.number || order.orderNumber || order.id}</span>
                            {imported && <Check size={12} className="text-emerald-500" />}
                          </span>
                        </td>
                        <td className="p-2 text-gray-300 truncate max-w-[140px]">{order.customerName || order.customer?.name || order.contact_name || 'Sin nombre'}</td>
                        <td className="p-2 text-gray-400 truncate max-w-[180px]">{order.address || order.shipping_address?.address || order.shipping_address?.street || '\u2014'}</td>
                        <td className="p-2 text-gray-400 truncate max-w-[100px]">{order.city || order.shipping_address?.city || '\u2014'}</td>
                        <td className="p-2 text-gray-400 truncate max-w-[120px] text-xs">{order.shippingMethod || order.shipping_option || order.shipping || '\u2014'}</td>
                        <td className="p-2 pr-3 text-gray-400 text-xs whitespace-nowrap">{order.createdAt || order.created_at ? new Date(order.createdAt || order.created_at).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) : '\u2014'}</td>
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
