import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, useAuth } from '../../lib/store'
import { Link2, Check, AlertCircle, Unplug, Loader2, ShoppingBag, MessageCircle, Truck } from 'lucide-react'
import toast from 'react-hot-toast'

export default function StoreSettings() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()

  const reload = () => api.get('/dashboard/settings').then(r => setSettings(r.data))

  useEffect(() => {
    api.get('/dashboard/settings').then(r => { setSettings(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (searchParams.get('tn') === 'success') {
      toast.success('Tiendanube conectada correctamente')
      searchParams.delete('tn')
      setSearchParams(searchParams, { replace: true })
      reload()
    }
    if (searchParams.get('ml') === 'connected') {
      toast.success('MercadoLibre conectado correctamente')
      searchParams.delete('ml')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  if (loading) return <div className="flex items-center justify-center h-96 text-gray-500">Cargando...</div>

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white">Configuración</h1>
        <p className="text-sm text-gray-500">Integraciones de tu tienda</p>
      </div>

      <TiendanubeSection settings={settings} onSettingsUpdate={reload} />
      <MercadoLibreSection />
      <MyLogisticsSection />
      <WhatsAppComingSoonSection />
    </div>
  )
}

function TiendanubeSection({ settings, onSettingsUpdate }) {
  const { user } = useAuth()
  const tnStoreId = settings?.tnStoreId
  const [disconnecting, setDisconnecting] = useState(false)

  const handleConnect = () => {
    const apiUrl = (import.meta.env.VITE_API_URL || '/api').replace('/api', '')
    window.location.href = apiUrl + '/api/tiendanube/install?businessId=' + user.companyId
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

function MercadoLibreSection() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)

  const loadStatus = () => {
    setLoading(true)
    const baseUrl = import.meta.env.VITE_API_URL || '/api'
    const token = localStorage.getItem('token')
    fetch(baseUrl + '/mercadolibre/status', {
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(res => { setStatus(res?.data || res || {}); setLoading(false) })
      .catch(() => { setStatus({ connected: false }); setLoading(false) })
  }

  useEffect(() => { loadStatus() }, [])

  const handleConnect = () => {
    const apiUrl = (import.meta.env.VITE_API_URL || '/api').replace('/api', '')
    const token = localStorage.getItem('token')
    window.location.href = apiUrl + '/api/mercadolibre/auth?token=' + token
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '/api'
      const token = localStorage.getItem('token')
      const res = await fetch(baseUrl + '/mercadolibre/disconnect', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
      })
      if (!res.ok) throw new Error('Error')
      toast.success('MercadoLibre desconectado')
      loadStatus()
    } catch (err) {
      toast.error('Error al desconectar')
    }
    setDisconnecting(false)
  }

  const connected = status?.connected

  return (
    <div className="card-p space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <ShoppingBag size={18} className="text-yellow-400" /> MercadoLibre
        </h3>
        {loading ? (
          <Loader2 size={16} className="animate-spin text-gray-500" />
        ) : connected ? (
          <span className="badge bg-emerald-500/10 text-emerald-400"><Check size={12} /> Conectado</span>
        ) : (
          <span className="badge bg-amber-500/10 text-amber-400"><AlertCircle size={12} /> No conectado</span>
        )}
      </div>

      {!loading && connected ? (
        <>
          <p className="text-sm text-gray-500">
            Cuenta conectada: <span className="text-white font-medium">{status?.nickname || 'MercadoLibre'}</span>. Importa pedidos desde el boton Importar en Pedidos.
          </p>
          <button onClick={handleDisconnect} disabled={disconnecting} className="btn-secondary text-red-400 hover:text-red-300">
            <Unplug size={16} /> {disconnecting ? 'Desconectando...' : 'Desconectar'}
          </button>
        </>
      ) : !loading ? (
        <>
          <p className="text-sm text-gray-500">
            Conecta tu cuenta de MercadoLibre para importar pedidos de Flex.
          </p>
          <button
            onClick={handleConnect}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
            style={{ backgroundColor: '#FFE600', color: '#000' }}
          >
            <ShoppingBag size={16} /> Conectar MercadoLibre
          </button>
        </>
      ) : null}
    </div>
  )
}

function MyLogisticsSection() {
  const [logistics, setLogistics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/companies/my-logistics').then(r => {
      setLogistics(r.data?.data || [])
      setLoading(false)
    }).catch(() => { setLogistics([]); setLoading(false) })
  }, [])

  return (
    <div className="card-p space-y-3">
      <h3 className="font-semibold text-white flex items-center gap-2">
        <Truck size={18} className="text-teal-400" /> Mis logísticas
      </h3>

      {loading ? (
        <p className="text-sm text-gray-500">Cargando...</p>
      ) : logistics.length === 0 ? (
        <p className="text-sm text-gray-500">Todavía no tenés logísticas asignadas. Contactá al equipo para vincular una.</p>
      ) : (
        <div className="space-y-2">
          {logistics.map(l => (
            <div key={l.id} className="flex items-center justify-between p-3 rounded-lg border border-navy-800 bg-navy-900/50">
              <div className="flex items-center gap-2">
                <Truck size={14} className="text-teal-400" />
                <span className="text-sm text-white font-medium">{l.name}</span>
              </div>
              {l.isExternal && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400 font-semibold">Externa</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function WhatsAppComingSoonSection() {
  return (
    <div className="card-p space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <MessageCircle size={18} /> WhatsApp
        </h3>
        <span className="badge bg-gray-500/10 text-gray-400">Próximamente</span>
      </div>
      <p className="text-sm text-gray-500">
        Próximamente podrás configurar notificaciones automáticas por WhatsApp
      </p>
    </div>
  )
}
