import { useState, useEffect } from 'react'
import { api, useAuth } from '../lib/store'
import { Settings as SettingsIcon, Store, MessageCircle, Link2, Check, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Settings() {
  const { business } = useAuth()
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/settings').then(r => { setSettings(r.data); setLoading(false) })
  }, [])

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

      {/* Tiendanube integration */}
      <TiendanubeSection connected={settings?.integrations?.tiendanube} />

      {/* WhatsApp integration */}
      <WhatsAppSection connected={settings?.integrations?.whatsapp} />
    </div>
  )
}

function BusinessInfoSection({ settings }) {
  const [form, setForm] = useState({
    name: settings?.name || '', phone: settings?.phone || '',
    address: settings?.address || ''
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
      <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : 'Guardar'}</button>
    </form>
  )
}

function TiendanubeSection({ connected }) {
  const [form, setForm] = useState({ storeId: '', accessToken: '' })
  const [connecting, setConnecting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const connect = async (e) => {
    e.preventDefault()
    setConnecting(true)
    try {
      const { data } = await api.post('/dashboard/settings/tiendanube', form)
      toast.success(data.message)
      setShowForm(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al conectar')
    }
    setConnecting(false)
  }

  return (
    <div className="card-p space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Link2 size={18} /> Tiendanube
        </h3>
        {connected ? (
          <span className="badge bg-emerald-500/10 text-emerald-400"><Check size={12} /> Conectada</span>
        ) : (
          <span className="badge bg-amber-500/10 text-amber-400"><AlertCircle size={12} /> No conectada</span>
        )}
      </div>

      <p className="text-sm text-gray-500">
        {connected
          ? 'Las órdenes pagadas se importan automáticamente vía webhook.'
          : 'Conectá tu Tiendanube para importar pedidos automáticamente.'}
      </p>

      {!connected && !showForm && (
        <button onClick={() => setShowForm(true)} className="btn-secondary">Conectar Tiendanube</button>
      )}

      {showForm && (
        <form onSubmit={connect} className="space-y-3 pt-2 border-t border-navy-800">
          <div><label className="label">Store ID</label><input className="input" placeholder="Tu ID de tienda" value={form.storeId} onChange={set('storeId')} required /></div>
          <div><label className="label">Access Token</label><input className="input" type="password" placeholder="Token de acceso a la API" value={form.accessToken} onChange={set('accessToken')} required /></div>
          <p className="text-xs text-gray-500">Encontras estos datos en Tiendanube, seccion Configuracion, API / Integraciones</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={connecting} className="btn-primary">{connecting ? 'Conectando...' : 'Conectar'}</button>
          </div>
        </form>
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
