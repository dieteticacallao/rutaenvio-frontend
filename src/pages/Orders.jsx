import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, STATUS_MAP } from '../lib/store'
import { Package, Plus, Download, Search, X, MapPin, RefreshCw, Trash2, Pencil, Eye, Loader2, FileSpreadsheet, Upload, AlertCircle, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Orders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ status: '', page: 1 })
  const [showCreate, setShowCreate] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
  const [importing, setImporting] = useState(false)
  const [showExcelModal, setShowExcelModal] = useState(false)

  const loadOrders = useCallback(() => {
    setLoading(true)
    const params = { page: filter.page, limit: 30 }
    if (filter.status) params.status = filter.status
    api.get('/orders', { params }).then(r => {
      setOrders(r.data.orders); setTotal(r.data.total); setLoading(false)
    }).catch(() => setLoading(false))
  }, [filter])

  useEffect(() => { loadOrders() }, [loadOrders])

  const handleOrderSaved = (savedOrder, isEdit) => {
    if (isEdit) {
      setOrders(prev => prev.map(o => o.id === savedOrder.id ? { ...o, ...savedOrder } : o))
    } else {
      loadOrders()
    }
  }

  const deleteOrder = async (orderId) => {
    if (!window.confirm('Estas seguro de que queres eliminar este pedido?')) return
    try {
      await api.delete(`/orders/${orderId}`)
      toast.success('Pedido eliminado')
      setOrders(prev => prev.filter(o => o.id !== orderId))
      setTotal(prev => prev - 1)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar')
    }
  }

  const importFromTN = async () => {
    setImporting(true)
    try {
      const { data } = await api.post('/orders/import/tiendanube', { status: 'paid' })
      toast.success(`${data.imported} ordenes importadas de ${data.total} encontradas`)
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
          <button onClick={() => setShowExcelModal(true)} className="btn-secondary">
            <FileSpreadsheet size={16} /> Importar Excel
          </button>
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
              <tr><td colSpan={6} className="p-8 text-center text-gray-500"><Loader2 size={24} className="animate-spin inline-block mr-2" />Cargando pedidos...</td></tr>
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
                  <button onClick={() => navigate(`/orders/${order.id}`)} className="text-gray-500 hover:text-emerald-400 transition-colors" title="Ver detalle">
                    <Eye size={16} />
                  </button>
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
      {showCreate && <OrderModal onClose={() => setShowCreate(false)} onSaved={handleOrderSaved} />}
      {editingOrder && <OrderModal order={editingOrder} onClose={() => setEditingOrder(null)} onSaved={handleOrderSaved} />}
      {showExcelModal && <ExcelImportModal onClose={() => setShowExcelModal(false)} onImported={loadOrders} />}
    </div>
  )
}

function OrderModal({ order, onClose, onSaved }) {
  const isEdit = !!order
  const [form, setForm] = useState({
    customerName: order?.customerName || '', customerPhone: order?.customerPhone || '',
    address: order?.address || '', addressDetail: order?.addressDetail || '',
    city: order?.city || '', province: order?.province || 'Buenos Aires', zipCode: order?.zipcode || '', notes: order?.notes || ''
  })
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const autoDetectProvince = (cp) => {
    if (!cp) return
    const n = parseInt(cp, 10)
    if (isNaN(n)) return
    const first = cp.charAt(0)
    let province = null
    if (first === '1' && n < 1300) province = 'CABA'
    else if (first === '1') province = 'Buenos Aires'
    else if (first === '2') province = 'Santa Fe'
    else if (first === '3') province = 'Entre Rios'
    else if (first === '4') province = 'Tucuman'
    else if (first === '5') province = 'Cordoba'
    else if (first === '6') province = 'La Pampa'
    else if (first === '7') province = 'Neuquen'
    else if (first === '8') province = 'Chubut'
    else if (first === '9') province = 'Tierra del Fuego'
    if (province) setForm(f => ({ ...f, province }))
  }

  const handleZipChange = (e) => {
    const val = e.target.value
    setForm(f => ({ ...f, zipCode: val }))
    autoDetectProvince(val)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.zipCode.trim()) {
      toast.error('El codigo postal es obligatorio')
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        const { data } = await api.put(`/orders/${order.id}`, form)
        toast.success('Pedido actualizado')
        onSaved(data, true)
      } else {
        const { data } = await api.post('/orders', form)
        toast.success('Pedido creado')
        onSaved(data, false)
      }
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
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Depto/piso</label><input className="input" placeholder="3ro B" value={form.addressDetail} onChange={set('addressDetail')} /></div>
          <div><label className="label">Ciudad</label><input className="input" value={form.city} onChange={set('city')} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Provincia</label>
            <select className="input" value={form.province} onChange={set('province')}>
              {['Buenos Aires','CABA','Catamarca','Chaco','Chubut','Cordoba','Corrientes','Entre Rios','Formosa','Jujuy','La Pampa','La Rioja','Mendoza','Misiones','Neuquen','Rio Negro','Salta','San Juan','San Luis','Santa Cruz','Santa Fe','Santiago del Estero','Tierra del Fuego','Tucuman'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div><label className="label">Codigo Postal *</label><input className="input" placeholder="1407" value={form.zipCode} onChange={handleZipChange} required /></div>
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

function ExcelImportModal({ onClose, onImported }) {
  const [file, setFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)

  const downloadTemplate = async () => {
    try {
      const response = await api.get('/orders/template', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'plantilla_pedidos.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Error al descargar la plantilla')
    }
  }

  const handleImport = async () => {
    if (!file) {
      toast.error('Selecciona un archivo Excel primero')
      return
    }
    setImporting(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post('/orders/import-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResult(data)
      onImported()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al importar')
    }
    setImporting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="card-p w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Importar pedidos desde Excel</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>

        {!result ? (
          <>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400 mb-2">1. Descarga la plantilla y completa los datos de tus pedidos.</p>
                <button onClick={downloadTemplate} className="btn-secondary text-sm">
                  <Download size={16} /> Descargar plantilla Excel
                </button>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-2">2. Subi el archivo completado.</p>
                <label className="flex items-center gap-3 p-3 border border-dashed border-navy-700 rounded-lg cursor-pointer hover:border-brand-500 transition-colors">
                  <Upload size={20} className="text-gray-500" />
                  <span className="text-sm text-gray-400">
                    {file ? file.name : 'Seleccionar archivo .xlsx'}
                  </span>
                  <input type="file" accept=".xlsx" className="hidden" onChange={e => setFile(e.target.files[0] || null)} />
                </label>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="btn-secondary">Cancelar</button>
              <button onClick={handleImport} disabled={importing || !file} className="btn-primary">
                {importing ? (
                  <><Loader2 size={16} className="animate-spin" /> Importando pedidos...</>
                ) : (
                  <><FileSpreadsheet size={16} /> Importar</>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 size={20} />
                <span className="text-sm font-medium">
                  Se importaron {result.imported} pedidos. {result.errors?.length || 0} errores.
                </span>
              </div>

              {result.errors?.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1 bg-navy-900 rounded-lg p-3">
                  {result.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-red-400">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      <span>Fila {err.row}: {err.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button onClick={onClose} className="btn-primary">Cerrar</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
