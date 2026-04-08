import { useState, useEffect, useRef } from 'react'
import { api } from '../../lib/store'
import { Users, Plus, X, Phone, Key, Trash2, ToggleLeft, ToggleRight, MapPin, Search } from 'lucide-react'
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

const CABA_PROVINCE = 'Ciudad Autónoma de Buenos Aires'
const BSAS_PROVINCE = 'Buenos Aires'

const ZONE_PRESETS = [
  { key: 'caba', label: '+ CABA', type: 'province', province: CABA_PROVINCE },
  {
    key: 'gba-norte', label: '+ GBA Norte', type: 'names', province: BSAS_PROVINCE,
    names: ['Olivos', 'Martínez', 'Beccar', 'Boulogne', 'Vicente López', 'Florida', 'Munro', 'San Fernando', 'Tigre', 'Don Torcuato', 'Nordelta', 'San Martín', 'Villa Maipú', 'Villa Lynch', 'San Isidro']
  },
  {
    key: 'gba-sur', label: '+ GBA Sur', type: 'names', province: BSAS_PROVINCE,
    names: ['Avellaneda', 'Lanús', 'Lomas de Zamora', 'Quilmes', 'Bernal', 'Berazategui', 'Florencio Varela', 'Almirante Brown', 'Esteban Echeverría']
  },
  {
    key: 'gba-oeste', label: '+ GBA Oeste', type: 'names', province: BSAS_PROVINCE,
    names: ['Morón', 'Haedo', 'Castelar', 'Ituzaingó', 'Ramos Mejía', 'San Justo', 'La Matanza', 'Merlo', 'Moreno', 'General Rodríguez']
  }
]

function DriverLocalitiesModal({ driver, onClose }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [focused, setFocused] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(null) // preset key while assigning
  const debounceRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    api.get(`/drivers/${driver.id}/localities`)
      .then(r => {
        if (cancelled) return
        setItems(r.data?.data || [])
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        toast.error('Error al cargar localidades')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [driver.id])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const { data } = await api.get('/localities/search', {
          params: { q },
          signal: controller.signal
        })
        setResults(data?.data || [])
      } catch (err) {
        if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
          console.error('search error', err)
        }
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  const add = async (locality) => {
    if (items.some(i => i.id === locality.id)) {
      toast('Ya asignada', { icon: 'ℹ️' })
      setQuery('')
      setResults([])
      return
    }
    try {
      const { data } = await api.post(`/drivers/${driver.id}/localities`, { localityId: locality.id })
      const added = data?.data || locality
      setItems(prev => [...prev, added].sort((a, b) => a.name.localeCompare(b.name)))
      setQuery('')
      setResults([])
      toast.success('Localidad agregada')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al agregar')
    }
  }

  const assignZone = async (preset) => {
    if (bulkLoading) return
    setBulkLoading(preset.key)
    try {
      // 1. Fetch candidate localities from the API
      let candidates = []
      if (preset.type === 'province') {
        const { data } = await api.get('/localities/search', {
          params: { province: preset.province, limit: 200 }
        })
        candidates = data?.data || []
      } else {
        // names: fetch each name in parallel, pick best match within province
        const results = await Promise.all(preset.names.map(async (name) => {
          try {
            const { data } = await api.get('/localities/search', {
              params: { q: name, province: preset.province, limit: 20 }
            })
            const list = data?.data || []
            // Prefer exact (case-insensitive) name match
            const exact = list.find(l => l.name.toLowerCase() === name.toLowerCase())
            return exact || list[0] || null
          } catch {
            return null
          }
        }))
        // Dedupe by id
        const seen = new Set()
        for (const loc of results) {
          if (loc && !seen.has(loc.id)) {
            seen.add(loc.id)
            candidates.push(loc)
          }
        }
      }

      // 2. Filter out already-assigned
      const assignedIds = new Set(items.map(i => i.id))
      const toAssign = candidates.filter(c => !assignedIds.has(c.id))

      if (toAssign.length === 0) {
        toast('Ya estaban todas asignadas', { icon: 'ℹ️' })
        return
      }

      // 3. POST each in parallel, ignore individual failures (duplicates, etc.)
      const assigned = []
      await Promise.all(toAssign.map(async (loc) => {
        try {
          await api.post(`/drivers/${driver.id}/localities`, { localityId: loc.id })
          assigned.push(loc)
        } catch {
          // skip silently — unique constraint or transient
        }
      }))

      if (assigned.length === 0) {
        toast.error('No se pudo asignar ninguna localidad')
        return
      }

      // 4. Merge into local state, sorted
      setItems(prev => {
        const merged = [...prev]
        for (const loc of assigned) {
          if (!merged.some(m => m.id === loc.id)) merged.push(loc)
        }
        return merged.sort((a, b) => a.name.localeCompare(b.name))
      })
      toast.success(`${assigned.length} ${assigned.length === 1 ? 'localidad agregada' : 'localidades agregadas'}`)
    } catch (err) {
      console.error('Bulk assign error:', err)
      toast.error('Error al asignar zona')
    } finally {
      setBulkLoading(null)
    }
  }

  const remove = async (localityId) => {
    try {
      await api.delete(`/drivers/${driver.id}/localities/${localityId}`)
      setItems(prev => prev.filter(i => i.id !== localityId))
      toast.success('Localidad quitada')
    } catch (err) {
      toast.error('Error al quitar localidad')
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

        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
          {ZONE_PRESETS.map(preset => {
            const busy = bulkLoading === preset.key
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => assignZone(preset)}
                disabled={!!bulkLoading}
                className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap ${
                  busy
                    ? 'border-brand-500/50 bg-brand-500/10 text-brand-300'
                    : 'border-navy-700 text-gray-300 hover:border-brand-500/50 hover:text-brand-300 hover:bg-brand-500/5 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {busy ? 'Asignando...' : preset.label}
              </button>
            )
          })}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            placeholder="Buscar localidad o CP..."
            className="input pl-8 w-full"
          />
          {focused && query.trim().length >= 2 && (
            <div className="absolute left-0 right-0 mt-1 bg-navy-900 border border-navy-700 rounded-lg shadow-2xl max-h-60 overflow-y-auto z-10">
              {searching ? (
                <div className="px-3 py-2 text-xs text-gray-500">Buscando...</div>
              ) : results.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-500">Sin resultados</div>
              ) : results.map(loc => (
                <button
                  key={loc.id}
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => add(loc)}
                  className="w-full text-left px-3 py-2 hover:bg-navy-800 border-b border-navy-800 last:border-0"
                >
                  <div className="text-sm text-white">{loc.name}</div>
                  <div className="text-xs text-gray-500">CP {loc.zipCode} — {loc.province}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-xs text-gray-500 mb-2">
            {loading ? 'Cargando...' : `${items.length} ${items.length === 1 ? 'localidad asignada' : 'localidades asignadas'}`}
          </div>
          {!loading && items.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center border border-dashed border-navy-700 rounded-lg">
              Sin zonas asignadas. Buscá arriba para agregar.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {items.map(loc => (
                <span key={loc.id} className="inline-flex items-center gap-1.5 bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs px-2.5 py-1.5 rounded-full">
                  <MapPin size={11} />
                  <span>{loc.name}</span>
                  <span className="text-brand-400/60">{loc.zipCode}</span>
                  <button
                    type="button"
                    onClick={() => remove(loc.id)}
                    className="text-brand-400/60 hover:text-red-400 ml-0.5"
                    title="Quitar"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
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
