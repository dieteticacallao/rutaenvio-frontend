import { useState, useEffect } from 'react'
import { api, STATUS_MAP } from '../lib/store'
import { Package, Plus, Download, Search, X, MapPin, RefreshCw, Trash2, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ status: '', page: 1 })
  const [showCreate, setShowCreate] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
  const [importing, setImporting] = useState(false)

  const loadOrders = () => {
    setLoading(true)
    const params = { page: filter.page, limit: 30 }
    if (filter.status) params.status = filter.status
    api.get('/orders', { params }).then(r => {
      setOrders(r.data.orders); setTotal(r.data.total); setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(loadOrders, [filter])

  const deleteOrder = async (orderId) => {
    if (!window.confirm('Estas seguro de que queres eliminar este pedido?')) return
    try {
      await api.delete(`/orders/${orderId}`)
      toast.success('Pedido eliminado')
      loadOrders()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar')
    }
  }

  const importFromTN = async () => {
    setImporting(true)
    try {
      const { data } = await api.post('/orders/import/tiendanube', { status: 'paid' })
      toast.success(`${data.imported} órdenes importadas de ${data.total} encontradas`)
      loadOrders()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al importar')
    }
    setImporting(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Pedidos</h1>
          <p className="text-sm text-gray-500">{total} total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={importFromTN} disabled={importing} className="btn-secondary">
            <Download size={16} /> {importing ? 'Importando...' : 'Importar de TN'}
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} /> Nuevo pedido
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['', 'PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'].map(s => (
          <button key={s} onClick={() => setFilter(f => ({ ...f, status: s, page: 1 }))}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              filter.status === s ? 'bg-brand-500 text-white' : 'bg-navy-800 text-gray-400 hover:text-white'
            }`}>
            {s ? STATUS_MAP[s]?.label : 'Todos'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-800 text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left p-3 pl-4">Pedido</th>
              <th className="text-left p-3">Cliente</th>
              <th className="text-left p-3">Dirección</th>
              <th className="text-left p-3">Estado</th>
              <th className="text-left p-3">Cadete</th>
              <th className="text-right p-3 pr-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">Cargando...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">No hay pedidos. Importá de Tiendanube o creá uno manual.</td></tr>
            ) : orders.map(order => (
              <tr key={order.id} className="table-row">
                <td className="p-3 pl-4">
                  <div className="font-medium text-white">{order.orderNumber}</div>
                  <div className="text-xs text-gray-500">{order.source}</div>
                </td>
                <td className="p-3">
                  <div className="text-gray-200">{order.customerName}</div>
                  <div className="text-xs text-gray-500">{order.customerPhone}</div>
                </td>
                <td className="p-3">
                  <div className="text-gray-300 max-w-[200px] truncate">{order.address}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    {order.lat ? <><MapPin size={10} className="text-emerald-400" /> Geocodificado</> : <><MapPin size={10} className="text-amber-400" /> Sin ubicación</>}
                  </div>
                </td>
                <td className="p-3">
                  <span className={STATUS_MAP[order.status]?.color || 'badge'}>
                    {STATUS_MAP[order.status]?.label || order.status}
                  </span>
                </td>
                <td className="p-3 text-gray-400">{order.driver?.name || '—'}</td>
                <td className="p-3 pr-4 text-right flex items-center justify-end gap-1">
                  <button onClick={() => setEditingOrder(order)} className="text-gray-500 hover:text-brand-400 transition-colors" title="Editar pedido">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => deleteOrder(order.id)} className="text-gray-500 hover:text-red-400 transition-colors" title="Eliminar pedido">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 30 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setFilter(f => ({ ...f, page: f.page - 1 }))} disabled={filter.page <= 1} className="btn-ghost text-xs">Anterior</button>
          <span className="text-sm text-gray-500 self-center">Página {filter.page}</span>
          <button onClick={() => setFilter(f => ({ ...f, page: f.page + 1 }))} disabled={orders.length < 30} className="btn-ghost text-xs">Siguiente</button>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreate && <OrderModal onClose={() => setShowCreate(false)} onSaved={loadOrders} />}
      {editingOrder && <OrderModal order={editingOrder} onClose={() => setEditingOrder(null)} onSaved={loadOrders} />}
    </div>
  )
}

function OrderModal({ order, onClose, onSaved }) {
  const isEdit = !!order
  const [form, setForm] = useState({
    customerName: order?.customerName || '', customerPhone: order?.customerPhone || '',
    address: order?.address || '', addressDetail: order?.addressDetail || '',
    city: order?.city || '', zipCode: order?.zipCode || '', notes: order?.notes || ''
  })
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.zipCode.trim()) {
      toast.error('El codigo postal es obligatorio')
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        await api.put(`/orders/${order.id}`, form)
        toast.success('Pedido actualizado')
      } else {
        await api.post('/orders', form)
        toast.success('Pedido creado')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || (isEdit ? 'Error al actualizar' : 'Error al crear'))
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <form onClick={e => e.stopPropagation()} onSubmit={handleSubmit} className="card-p w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{isEdit ? 'Editar pedido' : 'Nuevo pedido'}</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Nombre cliente *</label><input className="input" value={form.customerName} onChange={set('customerName')} required /></div>
          <div><label className="label">Telefono</label><input className="input" value={form.customerPhone} onChange={set('customerPhone')} /></div>
        </div>
        <div><label className="label">Direccion *</label><input className="input" placeholder="Av. Corrientes 1234" value={form.address} onChange={set('address')} required /></div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className="label">Depto/piso</label><input className="input" placeholder="3ro B" value={form.addressDetail} onChange={set('addressDetail')} /></div>
          <div><label className="label">Ciudad</label><input className="input" value={form.city} onChange={set('city')} /></div>
          <div><label className="label">Codigo Postal *</label><input className="input" placeholder="1407" value={form.zipCode} onChange={set('zipCode')} required /></div>
        </div>
        <div><label className="label">Notas</label><input className="input" placeholder="Tocar timbre 2B" value={form.notes} onChange={set('notes')} /></div>

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear pedido')}</button>
        </div>
      </form>
    </div>
  )
}
