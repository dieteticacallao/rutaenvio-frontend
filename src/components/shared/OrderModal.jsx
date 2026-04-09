import { useState } from 'react'
import { api } from '../../lib/store'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function OrderModal({ order, clients, onClose, onSaved }) {
  const isEdit = !!order
  const showClientSelector = Array.isArray(clients) && !isEdit
  const [form, setForm] = useState({
    customerName: order?.customerName || '', customerPhone: order?.customerPhone || '',
    address: order?.address || '', addressDetail: order?.addressDetail || '',
    city: order?.city || '', province: order?.province || 'Buenos Aires', zipCode: order?.zipcode || '', notes: order?.notes || ''
  })
  const [clientId, setClientId] = useState('')
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
        const body = { ...form }
        if (showClientSelector && clientId) body.clientId = clientId
        const { data } = await api.post('/orders', body)
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

        {showClientSelector && (
          <div>
            <label className="label">Cliente</label>
            <select className="input" value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">Sin cliente asignado</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

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
