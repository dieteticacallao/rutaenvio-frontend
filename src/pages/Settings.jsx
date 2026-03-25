import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, useAuth } from '../lib/store'
import { Settings as SettingsIcon, Store, MessageCircle, Link2, Check, AlertCircle, MapPin, Plus, Star, Trash2, Unplug, Map, Pencil, Loader2, DollarSign, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Settings() {
  const { business } = useAuth()
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    api.get('/dashboard/settings').then(r => { setSettings(r.data); setLoading(false) })
  }, [])

  useEffect(() => {
    if (searchParams.get('tn') === 'success') {
      toast.success('Tiendanube conectada correctamente')
      searchParams.delete('tn')
      setSearchParams(searchParams, { replace: true })
      api.get('/dashboard/settings').then(r => setSettings(r.data))
    }
  }, [searchParams, setSearchParams])

  if (loading) return <div className="flex items-center justify-center h-96 text-gray-500">Cargando...</div>

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white">Configuración</h1>
        <p className="text-sm text-gray-500">Integraciones y datos del negocio</p>
      </div>

      {/* Plan info */}
      <div className="card-p">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">Plan actual: {settings?.plan}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {settings?.plan === 'FREE' && '1 cadete, 30 envíos/mes'}
              {settings?.plan === 'STARTER' && '5 cadetes, envíos ilimitados'}
              {settings?.plan === 'PRO' && 'Cadetes ilimitados, multi-sucursal'}
            </p>
          </div>
          {settings?.plan !== 'PRO' && (
            <button className="btn-secondary text-xs">Upgrade</button>
          )}
        </div>
      </div>

      {/* Business info */}
      <BusinessInfoSection settings={settings} />

      {/* Puntos de origen */}
      <LocationsSection />

      {/* Zonas y tarifas */}
      <ZonesSection />

      {/* Tiendanube integration */}
      <TiendanubeSection settings={settings} onSettingsUpdate={() => api.get('/dashboard/settings').then(r => setSettings(r.data))} />

      {/* WhatsApp integration */}
      <WhatsAppSection connected={settings?.integrations?.whatsapp} />
    </div>
  )
}

const ZONE_COLORS = {
  'CABA': 'border-blue-500/30 bg-blue-500/5',
  'GBA 1': 'border-emerald-500/30 bg-emerald-500/5',
  'GBA 2': 'border-orange-500/30 bg-orange-500/5',
  'GBA 3': 'border-red-500/30 bg-red-500/5',
  'Lejana': 'border-gray-500/30 bg-gray-500/5',
}

const ZONE_BADGE = {
  'CABA': 'bg-blue-500/20 text-blue-400',
  'GBA 1': 'bg-emerald-500/20 text-emerald-400',
  'GBA 2': 'bg-orange-500/20 text-orange-400',
  'GBA 3': 'bg-red-500/20 text-red-400',
  'Lejana': 'bg-gray-500/20 text-gray-400',
}

function ZoneModal({ zone, onClose, onSaved }) {
  const isNew = !zone
  const [name, setName] = useState(zone?.name || '')
  const [description, setDescription] = useState(zone?.description || '')
  const [localities, setLocalities] = useState(zone?.localities || [])
  const [localityInput, setLocalityInput] = useState('')
  const [price, setPrice] = useState(String(zone?.tariffs?.[0]?.price || ''))
  const [saving, setSaving] = useState(false)

  const addLocality = () => {
    const val = localityInput.trim()
    if (val && !localities.includes(val)) {
      setLocalities(prev => [...prev, val])
    }
    setLocalityInput('')
  }

  const removeLocality = (loc) => {
    setLocalities(prev => prev.filter(l => l !== loc))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addLocality()
    }
  }

  const handleSave = async () => {
    if (!name.trim()) { toast.error('El nombre es obligatorio'); return }
    setSaving(true)
    try {
      if (isNew) {
        await api.post('/zones', { name: name.trim(), description: description.trim() || null, localities })
        // Set price if provided
        const zonesRes = await api.get('/zones')
        const created = (zonesRes.data?.data || []).find(z => z.name === name.trim())
        if (created && price) {
          await api.put(`/zones/${created.id}`, { price: Number(price) })
        }
      } else {
        await api.put(`/zones/${zone.id}`, {
          name: name.trim(),
          description: description.trim() || null,
          localities,
          price: Number(price) || 0
        })
      }
      toast.success(isNew ? 'Zona creada' : 'Zona actualizada')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar zona')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="card-p w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{isNew ? 'Nueva zona' : `Editar ${zone.name}`}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Nombre *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Interior" className="input w-full" />
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Descripcion</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej: Zona interior del pais" className="input w-full" />
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Precio por envio *</label>
          <div className="relative">
            <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0"
              className="input w-full pl-8"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Localidades</label>
          <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
            {localities.map(loc => (
              <span key={loc} className="inline-flex items-center gap-1 text-xs bg-navy-800 text-gray-300 px-2 py-1 rounded-lg border border-navy-700">
                {loc}
                <button onClick={() => removeLocality(loc)} className="text-gray-500 hover:text-red-400 ml-0.5"><X size={12} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={localityInput}
              onChange={e => setLocalityInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribi una localidad y presiona Enter"
              className="input flex-1 text-sm"
            />
            <button onClick={addLocality} disabled={!localityInput.trim()} className="btn-secondary text-xs px-3">
              <Plus size={14} /> Agregar
            </button>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-navy-800">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !name.trim()} className="btn-primary">
            {saving ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : isNew ? 'Crear zona' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ZonesSection() {
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [modal, setModal] = useState(null) // null | 'new' | zone object

  const loadZones = () => {
    setLoading(true)
    api.get('/zones').then(r => {
      setZones(r.data?.data || [])
      setLoading(false)
    }).catch(() => { setZones([]); setLoading(false) })
  }

  useEffect(() => { loadZones() }, [])

  const seedZones = async () => {
    setSeeding(true)
    try {
      await api.post('/zones/seed')
      toast.success('Zonas por defecto creadas')
      loadZones()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear zonas')
    }
    setSeeding(false)
  }

  const deleteZone = async (zone) => {
    if (!window.confirm(`Eliminar la zona "${zone.name}"? Los pedidos asociados quedaran sin zona.`)) return
    try {
      await api.delete(`/zones/${zone.id}`)
      toast.success('Zona eliminada')
      loadZones()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar zona')
    }
  }

  return (
    <div className="card-p space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Map size={18} className="text-brand-400" />
          <h2 className="font-semibold text-white">Zonas y Tarifas</h2>
        </div>
        <div className="flex gap-2">
          {zones.length === 0 && !loading && (
            <button onClick={seedZones} disabled={seeding} className="btn-secondary text-xs">
              {seeding ? <><Loader2 size={14} className="animate-spin" /> Creando...</> : 'Cargar por defecto'}
            </button>
          )}
          <button onClick={() => setModal('new')} className="btn-primary text-xs">
            <Plus size={14} /> Nueva zona
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-gray-500"><Loader2 size={20} className="animate-spin mr-2" /> Cargando zonas...</div>
      ) : zones.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No hay zonas configuradas.</p>
      ) : (
        <div className="space-y-2">
          {zones.map(zone => {
            const price = zone.tariffs?.[0]?.price || 0
            const colorClass = ZONE_COLORS[zone.name] || 'border-navy-700 bg-navy-800/50'
            const badgeClass = ZONE_BADGE[zone.name] || 'bg-gray-500/20 text-gray-400'

            return (
              <div key={zone.id} className={`rounded-xl border p-3 ${colorClass}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>{zone.name}</span>
                    {zone.description && <span className="text-xs text-gray-500">{zone.description}</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">{zone._count?.orders || 0} pedidos</span>
                    <button onClick={() => setModal(zone)} className="text-gray-500 hover:text-brand-400 transition-colors p-1" title="Editar">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => deleteZone(zone)} className="text-gray-500 hover:text-red-400 transition-colors p-1" title="Eliminar">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500 truncate flex-1 mr-4">
                    {(zone.localities || []).length > 0
                      ? (zone.localities || []).slice(0, 8).join(', ') + ((zone.localities || []).length > 8 ? ` (+${zone.localities.length - 8} mas)` : '')
                      : 'Sin localidades asignadas'
                    }
                  </div>
                  <span className="text-sm font-bold text-white whitespace-nowrap">${price.toLocaleString('es-AR')}/envio</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <ZoneModal
          zone={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={loadZones}
        />
      )}
    </div>
  )
}

function BusinessInfoSection({ settings }) {
  const [form, setForm] = useState({
    name: settings?.name || '', phone: settings?.phone || '',
    address: settings?.address || '', country: settings?.country || 'Argentina'
  })
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/dashboard/settings', form)
      toast.success('Datos actualizados')
    } catch (err) {
      toast.error('Error al guardar')
    }
    setSaving(false)
  }

  return (
    <form onSubmit={save} className="card-p space-y-4">
      <h3 className="font-semibold text-white flex items-center gap-2"><Store size={18} /> Datos del negocio</h3>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Nombre</label><input className="input" value={form.name} onChange={set('name')} /></div>
        <div><label className="label">Teléfono</label><input className="input" value={form.phone} onChange={set('phone')} /></div>
      </div>
      <div><label className="label">Dirección (punto de partida de rutas)</label><input className="input" placeholder="Dirección de tu depósito o local" value={form.address} onChange={set('address')} /></div>
      <div><label className="label">País</label><input className="input" value={form.country} onChange={set('country')} /></div>
      <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : 'Guardar'}</button>
    </form>
  )
}

function LocationsSection() {
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', address: '', zipCode: '' })
  const [saving, setSaving] = useState(false)

  const loadLocations = () => {
    api.get('/dashboard/locations').then(r => { setLocations(r.data); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { loadLocations() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/dashboard/locations', form)
      toast.success('Punto de origen agregado')
      setForm({ name: '', address: '', zipCode: '' })
      setShowForm(false)
      loadLocations()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al agregar')
    }
    setSaving(false)
  }

  const handleSetDefault = async (id) => {
    try {
      await api.put(`/dashboard/locations/${id}/default`)
      toast.success('Punto de origen predeterminado actualizado')
      loadLocations()
    } catch (err) {
      toast.error('Error al actualizar')
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/dashboard/locations/${id}`)
      toast.success('Punto de origen eliminado')
      loadLocations()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar')
    }
  }

  return (
    <div className="card-p space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2"><MapPin size={18} /> Puntos de origen</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-secondary text-xs flex items-center gap-1">
          <Plus size={14} /> Agregar
        </button>
      </div>

      <p className="text-sm text-gray-500">
        Definí los puntos de partida para distribuir tus rutas (deposito, sucursal, etc.)
      </p>

      {showForm && (
        <form onSubmit={handleAdd} className="space-y-3 pt-3 border-t border-navy-800">
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Nombre</label><input className="input" placeholder="Ej: Deposito Central" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div><label className="label">Direccion</label><input className="input" placeholder="Av. Corrientes 1234, CABA" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} required /></div>
            <div><label className="label">Codigo Postal</label><input className="input" placeholder="1407" value={form.zipCode} onChange={e => setForm(f => ({ ...f, zipCode: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Cargando...</p>
      ) : locations.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No hay puntos de origen. Agrega uno para usar en la distribucion de rutas.</p>
      ) : (
        <div className="space-y-2">
          {locations.map(loc => (
            <div key={loc.id} className={`flex items-center gap-3 p-3 rounded-lg border ${loc.isDefault ? 'border-brand-500/30 bg-brand-500/5' : 'border-navy-800 bg-navy-900/50'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{loc.name}</span>
                  {loc.isDefault && <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400 font-semibold">Predeterminado</span>}
                </div>
                <div className="text-xs text-gray-500 truncate mt-0.5">{loc.address}</div>
                <div className="text-xs mt-0.5">
                  {loc.lat && loc.lng ? (
                    <span className="text-emerald-400">Geocodificado</span>
                  ) : (
                    <span className="text-amber-400">Sin geocodificar</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!loc.isDefault && (
                  <button onClick={() => handleSetDefault(loc.id)} className="p-1.5 rounded hover:bg-navy-800 text-gray-400 hover:text-amber-400 transition-colors" title="Marcar como predeterminado">
                    <Star size={16} />
                  </button>
                )}
                {loc.isDefault && <Star size={16} className="text-amber-400 mx-1.5" />}
                <button onClick={() => handleDelete(loc.id)} className="p-1.5 rounded hover:bg-navy-800 text-gray-400 hover:text-red-400 transition-colors" title="Eliminar">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TiendanubeSection({ settings, onSettingsUpdate }) {
  const { business } = useAuth()
  const tnStoreId = settings?.tnStoreId
  const [disconnecting, setDisconnecting] = useState(false)

  const handleConnect = () => {
    const apiUrl = (import.meta.env.VITE_API_URL || '/api').replace('/api', '')
    window.location.href = apiUrl + '/api/tiendanube/install?businessId=' + business.id
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      await api.post('/dashboard/settings/tiendanube/disconnect')
      toast.success('Tiendanube desconectada')
      onSettingsUpdate()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al desconectar')
    }
    setDisconnecting(false)
  }

  return (
    <div className="card-p space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Link2 size={18} /> Tiendanube
        </h3>
        {tnStoreId ? (
          <span className="badge bg-emerald-500/10 text-emerald-400"><Check size={12} /> Conectada</span>
        ) : (
          <span className="badge bg-amber-500/10 text-amber-400"><AlertCircle size={12} /> No conectada</span>
        )}
      </div>

      {tnStoreId ? (
        <>
          <p className="text-sm text-gray-500">
            Tienda conectada (Store ID: {tnStoreId}). Las ordenes pagadas se importan automaticamente via webhook.
          </p>
          <button onClick={handleDisconnect} disabled={disconnecting} className="btn-secondary text-red-400 hover:text-red-300">
            <Unplug size={16} /> {disconnecting ? 'Desconectando...' : 'Desconectar'}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            Conecta tu Tiendanube para importar pedidos automaticamente.
          </p>
          <button onClick={handleConnect} className="btn-secondary">Conectar Tiendanube</button>
        </>
      )}
    </div>
  )
}

function WhatsAppSection({ connected }) {
  const [form, setForm] = useState({ phoneId: '', accessToken: '' })
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/dashboard/settings/whatsapp', form)
      toast.success('WhatsApp configurado')
      setShowForm(false)
    } catch (err) {
      toast.error('Error al configurar')
    }
    setSaving(false)
  }

  return (
    <div className="card-p space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <MessageCircle size={18} /> WhatsApp
        </h3>
        {connected ? (
          <span className="badge bg-emerald-500/10 text-emerald-400"><Check size={12} /> Configurado</span>
        ) : (
          <span className="badge bg-gray-500/10 text-gray-400">Opcional</span>
        )}
      </div>

      <p className="text-sm text-gray-500">
        {connected
          ? 'Los clientes reciben notificaciones automáticas con link de tracking.'
          : 'Configurá WhatsApp para enviar tracking automático a tus clientes.'}
      </p>

      {!showForm && (
        <button onClick={() => setShowForm(true)} className="btn-secondary">
          {connected ? 'Reconfigurar' : 'Configurar WhatsApp'}
        </button>
      )}

      {showForm && (
        <form onSubmit={save} className="space-y-3 pt-2 border-t border-navy-800">
          <div><label className="label">Phone Number ID</label><input className="input" placeholder="ID del número" value={form.phoneId} onChange={set('phoneId')} required /></div>
          <div><label className="label">Access Token</label><input className="input" type="password" placeholder="Token de Meta" value={form.accessToken} onChange={set('accessToken')} required /></div>
          <p className="text-xs text-gray-500">Obtenelos en developers.facebook.com, seccion WhatsApp, API Setup</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      )}
    </div>
  )
}
