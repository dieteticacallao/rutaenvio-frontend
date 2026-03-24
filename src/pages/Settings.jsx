import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, useAuth } from '../lib/store'
import { Settings as SettingsIcon, Store, MessageCircle, Link2, Check, AlertCircle, MapPin, Plus, Star, Trash2, Unplug } from 'lucide-react'
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

      {/* Tiendanube integration */}
      <TiendanubeSection settings={settings} onSettingsUpdate={() => api.get('/dashboard/settings').then(r => setSettings(r.data))} />

      {/* WhatsApp integration */}
      <WhatsAppSection connected={settings?.integrations?.whatsapp} />
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
