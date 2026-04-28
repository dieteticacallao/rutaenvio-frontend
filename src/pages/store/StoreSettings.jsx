import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, useAuth } from '../../lib/store'
import { Link2, Check, AlertCircle, Unplug, Loader2, ShoppingBag, MessageCircle, Truck, FileText, Save } from 'lucide-react'
import toast from 'react-hot-toast'

export default function StoreSettings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tnRefreshKey, setTnRefreshKey] = useState(0)
  const [mlRefreshKey, setMlRefreshKey] = useState(0)
  const billingRef = useRef(null)

  useEffect(() => {
    const tnParam = searchParams.get('tn')
    if (tnParam === 'success') {
      toast.success('Tiendanube conectada correctamente')
      setTnRefreshKey(k => k + 1)
      searchParams.delete('tn')
      setSearchParams(searchParams, { replace: true })
    } else if (tnParam === 'error') {
      const reason = searchParams.get('reason')
      toast.error(`Error al conectar Tiendanube${reason ? ': ' + reason : ''}`)
      searchParams.delete('tn')
      searchParams.delete('reason')
      setSearchParams(searchParams, { replace: true })
    }
    const mlParam = searchParams.get('ml')
    if (mlParam === 'connected' || mlParam === 'success') {
      toast.success('MercadoLibre conectado correctamente')
      setMlRefreshKey(k => k + 1)
      searchParams.delete('ml')
      setSearchParams(searchParams, { replace: true })
    } else if (mlParam === 'error') {
      toast.error('Error al conectar MercadoLibre')
      searchParams.delete('ml')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (searchParams.get('section') === 'billing' && billingRef.current) {
      billingRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      const flash = billingRef.current
      flash.classList.add('ring-2', 'ring-teal-500/60')
      setTimeout(() => flash.classList.remove('ring-2', 'ring-teal-500/60'), 2200)
      searchParams.delete('section')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white">Configuración</h1>
        <p className="text-sm text-gray-500">Integraciones de tu tienda</p>
      </div>

      <BillingDataSection forwardedRef={billingRef} />
      <TiendanubeSection refreshKey={tnRefreshKey} />
      <MercadoLibreSection refreshKey={mlRefreshKey} />
      <MyLogisticsSection />
      <WhatsAppComingSoonSection />
    </div>
  )
}

function BillingDataSection({ forwardedRef }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [legalName, setLegalName] = useState('')
  const [taxId, setTaxId] = useState('')
  const [address, setAddress] = useState('')

  useEffect(() => {
    api.get('/companies/me')
      .then(r => {
        const c = r.data?.data || {}
        setLegalName(c.legalName || '')
        setTaxId(c.taxId || '')
        setAddress(c.address || '')
        setLoading(false)
      })
      .catch(() => { setLoading(false) })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.patch('/companies/me', {
        legalName: legalName.trim() || null,
        taxId: taxId.trim() || null,
        address: address.trim() || null,
      })
      toast.success('Datos de facturación guardados')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar')
    }
    setSaving(false)
  }

  return (
    <div ref={forwardedRef} id="billing-data" className="card-p space-y-3 transition-shadow rounded-xl">
      <h3 className="font-semibold text-white flex items-center gap-2">
        <FileText size={18} className="text-teal-400" /> Datos de facturación
      </h3>
      <p className="text-xs text-gray-500">
        Estos datos aparecen en los remitos que generás para tus logísticas.
      </p>

      {loading ? (
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Cargando...
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Razón social</label>
            <input
              type="text"
              value={legalName}
              onChange={e => setLegalName(e.target.value)}
              placeholder="Mi Tienda S.A."
              className="input w-full"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">CUIT/DNI *</label>
            <input
              type="text"
              value={taxId}
              onChange={e => setTaxId(e.target.value)}
              placeholder="30-12345678-9 o 12345678"
              className="input w-full"
            />
            <p className="text-[11px] text-gray-600 mt-1">Obligatorio para generar remitos</p>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Dirección fiscal</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Av. Corrientes 1234, CABA"
              className="input w-full"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm bg-teal-500 text-white hover:bg-teal-600 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      )}
    </div>
  )
}

function TiendanubeSection({ refreshKey }) {
  const { user } = useAuth()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)

  const loadStatus = () => {
    setLoading(true)
    api.get('/tiendanube/status')
      .then(r => { setStatus(r.data?.data || { connected: false }); setLoading(false) })
      .catch(() => { setStatus({ connected: false }); setLoading(false) })
  }

  useEffect(() => { loadStatus() }, [refreshKey])

  const handleConnect = () => {
    const apiUrl = (import.meta.env.VITE_API_URL || '/api').replace('/api', '')
    window.location.href = apiUrl + '/api/tiendanube/install?businessId=' + user.companyId
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      await api.post('/dashboard/settings/tiendanube/disconnect')
      toast.success('Tiendanube desconectada')
      loadStatus()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al desconectar')
    }
    setDisconnecting(false)
  }

  const connected = status?.connected

  return (
    <div className="card-p space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Link2 size={18} /> Tiendanube
        </h3>
        {loading ? (
          <Loader2 size={16} className="animate-spin text-gray-500" />
        ) : connected ? (
          <span className="badge bg-emerald-500/10 text-emerald-400"><Check size={12} /> Conectada</span>
        ) : (
          <span className="badge bg-amber-500/10 text-amber-400"><AlertCircle size={12} /> No conectada</span>
        )}
      </div>

      {!loading && connected ? (
        <>
          <p className="text-sm text-gray-500">
            Tienda conectada{status?.storeName ? `: ${status.storeName}` : ''}{status?.storeId ? ` (Store ID: ${status.storeId})` : ''}. Las ordenes pagadas se importan automaticamente via webhook.
          </p>
          <button onClick={handleDisconnect} disabled={disconnecting} className="btn-secondary text-red-400 hover:text-red-300">
            <Unplug size={16} /> {disconnecting ? 'Desconectando...' : 'Desconectar'}
          </button>
        </>
      ) : !loading ? (
        <>
          <p className="text-sm text-gray-500">
            Conecta tu Tiendanube para importar pedidos automaticamente.
          </p>
          <button onClick={handleConnect} className="btn-secondary">Conectar Tiendanube</button>
        </>
      ) : null}
    </div>
  )
}

function MercadoLibreSection({ refreshKey }) {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)

  const loadStatus = () => {
    setLoading(true)
    api.get('/mercadolibre/status')
      .then(r => { setStatus(r.data?.data || r.data || { connected: false }); setLoading(false) })
      .catch(() => { setStatus({ connected: false }); setLoading(false) })
  }

  useEffect(() => { loadStatus() }, [refreshKey])

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
