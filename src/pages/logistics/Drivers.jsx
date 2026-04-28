import { useState, useEffect } from 'react'
import { api } from '../../lib/store'
import { Users, Plus, X, Phone, Key, ToggleLeft, ToggleRight, MapPin, Check, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Drivers() {
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newPin, setNewPin] = useState(null) // Show PIN after creation
  const [zonesDriver, setZonesDriver] = useState(null) // Driver whose coverage is open

  const load = () => api.get('/drivers').then(r => { setDrivers(r.data); setLoading(false) })
  useEffect(() => { load() }, [])

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

  const removeDriver = async (driver) => {
    const ok = window.confirm(
      `¿Estás seguro que querés eliminar a ${driver.name}? Esta acción desactiva al cadete pero conserva su historial de rutas. No podrá volver a ingresar.`
    )
    if (!ok) return
    try {
      await api.delete(`/drivers/${driver.id}`)
      toast.success('Cadete eliminado')
      load()
    } catch (err) {
      const status = err.response?.status
      const msg = err.response?.data?.error
      if (status === 409) {
        toast.error(msg || 'Este cadete tiene una ruta en curso. Finalizá la ruta primero.')
      } else {
        toast.error(msg || 'Error al eliminar cadete')
      }
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

            <div className="flex gap-1.5 mb-1.5">
              <button onClick={() => setZonesDriver(driver)} className="btn-ghost text-xs flex-1 justify-center">
                <MapPin size={14} /> Zonas
              </button>
              <button onClick={() => resetPin(driver.id, driver.name)} className="btn-ghost text-xs flex-1 justify-center">
                <Key size={14} /> Reset PIN
              </button>
              <button onClick={() => toggleActive(driver.id, driver.isActive)}
                className={`btn-ghost text-xs flex-1 justify-center ${!driver.isActive ? 'text-emerald-400' : 'text-amber-400'}`}>
                {driver.isActive ? <><ToggleRight size={14} /> Desactivar</> : <><ToggleLeft size={14} /> Activar</>}
              </button>
              <button
                onClick={() => removeDriver(driver)}
                className="btn-ghost text-xs justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10"
                title="Eliminar cadete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create driver modal */}
      {showCreate && <CreateDriverModal onClose={() => setShowCreate(false)} onCreate={create} />}

      {/* Coverage zones modal */}
      {zonesDriver && <DriverLocalitiesModal driver={zonesDriver} onClose={() => setZonesDriver(null)} />}
    </div>
  )
}

function DriverLocalitiesModal({ driver, onClose }) {
  const [allZones, setAllZones] = useState([])
  const [assignedIds, setAssignedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState(null) // zoneId currently toggling

  useEffect(() => {
    let cancelled = false
    Promise.all([
      api.get('/zones'),
      api.get(`/drivers/${driver.id}`)
    ]).then(([zonesRes, driverRes]) => {
      if (cancelled) return
      const zones = zonesRes.data?.data || []
      const assigned = driverRes.data?.data?.zones || []
      setAllZones(zones)
      setAssignedIds(new Set(assigned.map(z => z.id)))
      setLoading(false)
    }).catch(() => {
      if (cancelled) return
      toast.error('Error al cargar zonas')
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [driver.id])

  const toggle = async (zone) => {
    if (pendingId) return
    setPendingId(zone.id)
    const isAssigned = assignedIds.has(zone.id)
    try {
      if (isAssigned) {
        await api.delete(`/drivers/${driver.id}/zones/${zone.id}`)
        setAssignedIds(prev => {
          const next = new Set(prev)
          next.delete(zone.id)
          return next
        })
        toast.success(`${zone.name} quitada`)
      } else {
        await api.post(`/drivers/${driver.id}/zones`, { zoneId: zone.id })
        setAssignedIds(prev => new Set(prev).add(zone.id))
        toast.success(`${zone.name} asignada`)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al actualizar zona')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="card-p w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <MapPin size={18} className="text-brand-400" /> Zonas de cobertura
            </h2>
            <p className="text-xs text-gray-500">{driver.name}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>

        <div>
          <div className="text-xs text-gray-500 mb-3">
            {loading
              ? 'Cargando zonas...'
              : `${assignedIds.size} de ${allZones.length} zonas asignadas`}
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">Cargando...</div>
          ) : allZones.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center border border-dashed border-navy-700 rounded-lg">
              No hay zonas configuradas. Creá zonas desde la seccion de Zonas.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allZones.map(zone => {
                const active = assignedIds.has(zone.id)
                const busy = pendingId === zone.id
                return (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => toggle(zone)}
                    disabled={!!pendingId}
                    className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      active
                        ? 'bg-brand-500/15 border-brand-500/50 text-brand-300 hover:bg-brand-500/25'
                        : 'bg-navy-800/50 border-navy-700 text-gray-400 hover:border-brand-500/40 hover:text-brand-300'
                    } ${busy ? 'opacity-60 cursor-wait' : pendingId ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={zone.description || zone.name}
                  >
                    {active ? <Check size={12} /> : <Plus size={12} />}
                    <span>{zone.name}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">Cerrar</button>
        </div>
      </div>
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
