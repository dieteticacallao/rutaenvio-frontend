import { useState, useEffect } from 'react'
import { api } from '../../lib/store'
import { Users, Plus, X, Phone, Key, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Drivers() {
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newPin, setNewPin] = useState(null) // Show PIN after creation

  const load = () => api.get('/drivers').then(r => { setDrivers(r.data); setLoading(false) })
  useEffect(load, [])

  const create = async (form) => {
    try {
      const { data } = await api.post('/drivers', form)
      setNewPin({ name: data.name, pin: data.pin, phone: data.phone })
      setShowCreate(false)
      toast.success('Cadete creado')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear cadete')
    }
  }

  const resetPin = async (id, name) => {
    try {
      const { data } = await api.post(`/drivers/${id}/reset-pin`)
      setNewPin({ name, pin: data.pin })
      toast.success('PIN reseteado')
    } catch (err) {
      toast.error('Error al resetear PIN')
    }
  }

  const toggleActive = async (id, currentActive) => {
    try {
      await api.put(`/drivers/${id}`, { isActive: !currentActive })
      toast.success(currentActive ? 'Cadete desactivado' : 'Cadete activado')
      load()
    } catch (err) {
      toast.error('Error al actualizar')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Cadetes</h1>
          <p className="text-sm text-gray-500">{drivers.length} registrados</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={16} /> Agregar cadete</button>
      </div>

      {/* PIN display modal */}
      {newPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setNewPin(null)}>
          <div onClick={e => e.stopPropagation()} className="card-p w-full max-w-sm text-center space-y-4">
            <Key size={32} className="text-brand-400 mx-auto" />
            <h2 className="text-lg font-bold text-white">PIN de {newPin.name}</h2>
            <p className="text-sm text-gray-400">Compartí este PIN con el cadete para que inicie sesión en la app</p>
            <div className="text-4xl font-mono font-bold text-brand-400 tracking-[0.5em] bg-brand-500/10 py-4 rounded-xl">
              {newPin.pin}
            </div>
            <p className="text-xs text-gray-500">Teléfono: {newPin.phone}</p>
            <button onClick={() => setNewPin(null)} className="btn-primary w-full justify-center">Entendido</button>
          </div>
        </div>
      )}

      {/* Drivers grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center text-gray-500 py-12">Cargando...</div>
        ) : drivers.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-12">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p>No hay cadetes registrados</p>
            <p className="text-xs mt-1">Agregá tu primer cadete para empezar</p>
          </div>
        ) : drivers.map(driver => (
          <div key={driver.id} className={`card-p ${!driver.isActive ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold ${
                driver.isOnline ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/30' : 'bg-navy-800 text-gray-500'
              }`}>
                {driver.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-white">{driver.name}</div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Phone size={10} /> {driver.phone}
                </div>
              </div>
              <div className={`w-2.5 h-2.5 rounded-full ${driver.isOnline ? 'bg-emerald-500' : 'bg-gray-600'}`} />
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3 text-center">
              <div><div className="text-lg font-bold text-white">{driver.totalDeliveries}</div><div className="text-[10px] text-gray-500">Entregas</div></div>
              <div><div className="text-lg font-bold text-white">{driver.avgRating?.toFixed(1) || '—'}</div><div className="text-[10px] text-gray-500">Rating</div></div>
              <div><div className="text-lg font-bold text-white">{driver._count?.orders || 0}</div><div className="text-[10px] text-gray-500">Activas</div></div>
            </div>

            <div className="flex gap-1.5">
              <button onClick={() => resetPin(driver.id, driver.name)} className="btn-ghost text-xs flex-1 justify-center">
                <Key size={14} /> Reset PIN
              </button>
              <button onClick={() => toggleActive(driver.id, driver.isActive)}
                className={`btn-ghost text-xs flex-1 justify-center ${!driver.isActive ? 'text-emerald-400' : 'text-amber-400'}`}>
                {driver.isActive ? <><ToggleRight size={14} /> Desactivar</> : <><ToggleLeft size={14} /> Activar</>}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create driver modal */}
      {showCreate && <CreateDriverModal onClose={() => setShowCreate(false)} onCreate={create} />}
    </div>
  )
}

function CreateDriverModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '' })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <form onClick={e => e.stopPropagation()} onSubmit={e => { e.preventDefault(); onCreate(form) }} className="card-p w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Nuevo cadete</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>
        <div><label className="label">Nombre *</label><input className="input" placeholder="Juan Pérez" value={form.name} onChange={set('name')} required /></div>
        <div><label className="label">Teléfono *</label><input className="input" placeholder="1155554444" value={form.phone} onChange={set('phone')} required /></div>
        <div><label className="label">Email (opcional)</label><input className="input" type="email" value={form.email} onChange={set('email')} /></div>
        <p className="text-xs text-gray-500">Se generará un PIN de 4 dígitos automáticamente que el cadete usa para entrar a la app.</p>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" className="btn-primary">Crear cadete</button>
        </div>
      </form>
    </div>
  )
}
