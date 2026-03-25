import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/store'
import { Loader2 } from 'lucide-react'
import { DateFilter, ZONE_COLORS, ZONE_BAR_COLORS } from './Stats'

export default function StatsBilling() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (dateFrom) params.dateFrom = dateFrom
    if (dateTo) params.dateTo = dateTo
    api.get('/zones/billing', { params }).then(r => {
      setData(r.data?.data || null)
      setLoading(false)
    }).catch(() => { setData(null); setLoading(false) })
  }, [dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  const zones = data?.zones || []
  const total = data?.total || 0
  const maxCount = Math.max(...zones.map(z => z.count), 1)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Facturacion por Zona</h1>
        <p className="text-sm text-gray-500">Envios y montos facturados por zona de entrega</p>
      </div>

      <DateFilter dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo} />

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-500"><Loader2 size={24} className="animate-spin mr-2" /> Cargando...</div>
      ) : !data || zones.length === 0 ? (
        <div className="card-p text-center py-12 text-gray-500">No hay datos de facturacion. Configura las zonas en Config primero.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {zones.map(z => (
              <div key={z.name} className="card-p space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${ZONE_COLORS[z.name] || ZONE_COLORS['Sin zona']}`}>{z.name}</span>
                  <span className="text-xs text-gray-500">{z.count} envios</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase">Precio/envio</p>
                    <p className="text-sm text-gray-300">${z.price.toLocaleString('es-AR')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-600 uppercase">Subtotal</p>
                    <p className="text-lg font-bold text-white">${z.subtotal.toLocaleString('es-AR')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card-p">
            <h3 className="text-sm font-semibold text-white mb-4">Distribucion por zona</h3>
            <div className="space-y-2.5">
              {zones.filter(z => z.count > 0).map(z => (
                <div key={z.name} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-16 text-right flex-shrink-0">{z.name}</span>
                  <div className="flex-1 h-5 bg-navy-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${ZONE_BAR_COLORS[z.name] || 'bg-gray-600'} transition-all`}
                      style={{ width: `${(z.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-12 flex-shrink-0">{z.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-p text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total facturado</p>
            <p className="text-3xl font-bold text-white">${total.toLocaleString('es-AR')}</p>
          </div>
        </>
      )}
    </div>
  )
}
