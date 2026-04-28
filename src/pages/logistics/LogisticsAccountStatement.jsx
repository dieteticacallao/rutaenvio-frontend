import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '../../lib/store'
import {
  DollarSign, ArrowLeft, AlertCircle, Plus, Eye, FileText, Inbox,
  Loader2, ArrowDown, ArrowUp, Wallet, Store as StoreIcon
} from 'lucide-react'
import toast from 'react-hot-toast'
import PaymentFormModal from '../../components/shared/PaymentFormModal'
import PaymentDetailModal from '../../components/shared/PaymentDetailModal'

function formatARS(n) {
  const num = typeof n === 'string' ? parseFloat(n) : Number(n || 0)
  return num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

function toLocalDate(date) {
  return (date || new Date()).toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
}

const STATUS_BADGE = {
  PENDING: { label: 'Pendiente', cls: 'bg-amber-500/10 text-amber-400' },
  CONFIRMED: { label: 'Confirmado', cls: 'bg-emerald-500/10 text-emerald-400' },
  REJECTED: { label: 'Rechazado', cls: 'bg-red-500/10 text-red-400' },
}

export default function LogisticsAccountStatement() {
  const [view, setView] = useState('overview') // 'overview' | 'detail'
  const [selectedStoreId, setSelectedStoreId] = useState(null)
  const [pendingCount, setPendingCount] = useState(0)

  return (
    <div className="space-y-5">
      <Header />

      {view === 'overview' ? (
        <Overview
          onSelectStore={(id) => { setSelectedStoreId(id); setView('detail') }}
          pendingCount={pendingCount}
          setPendingCount={setPendingCount}
        />
      ) : (
        <Detail
          storeCompanyId={selectedStoreId}
          onBack={() => { setView('overview'); setSelectedStoreId(null) }}
        />
      )}
    </div>
  )
}

function Header() {
  return (
    <div>
      <h1 className="text-xl font-bold text-white flex items-center gap-2">
        <DollarSign size={20} className="text-brand-400" /> Cuenta corriente
      </h1>
      <p className="text-sm text-gray-500">Saldos por cliente</p>
    </div>
  )
}

function Overview({ onSelectStore, pendingCount, setPendingCount }) {
  const [stores, setStores] = useState([])
  const [grandTotal, setGrandTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get('/logistics/account-statement'),
      api.get('/payments/pending-count'),
    ])
      .then(([stmt, pend]) => {
        setStores(stmt.data?.data?.stores || [])
        setGrandTotal(stmt.data?.data?.grandTotal || 0)
        setPendingCount(pend.data?.data?.count || 0)
      })
      .catch(err => {
        toast.error(err.response?.data?.error || 'Error al cargar la cuenta corriente')
      })
      .finally(() => setLoading(false))
  }, [setPendingCount])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="card-p flex items-center justify-center gap-3 text-gray-500 py-16">
        <Loader2 size={20} className="animate-spin" /> Cargando saldos...
      </div>
    )
  }

  if (stores.length === 0) {
    return (
      <div className="card-p text-center py-16">
        <Inbox size={40} className="mx-auto text-gray-700 mb-3" />
        <p className="text-gray-400">No tenés clientes con cuenta corriente todavía.</p>
        <p className="text-xs text-gray-600 mt-1">
          Cuando una tienda empiece a trabajar con tu logística vas a ver su saldo acá.
        </p>
      </div>
    )
  }

  return (
    <>
      {pendingCount > 0 && (
        <div className="card-p bg-amber-500/5 border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <AlertCircle size={20} className="text-amber-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-amber-300">
                Tenés {pendingCount} {pendingCount === 1 ? 'pago esperando confirmación' : 'pagos esperando confirmación'}
              </div>
              <div className="text-xs text-gray-500">Revisalos abajo en el cliente correspondiente.</div>
            </div>
          </div>
        </div>
      )}

      <div className="card-p flex items-center justify-between">
        <div>
          <div className="text-[11px] text-gray-500 uppercase tracking-wider">Saldo total a cobrar</div>
          <div className={`text-2xl font-bold font-mono ${grandTotal > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
            $ {formatARS(grandTotal)}
          </div>
        </div>
        <Wallet size={32} className="text-gray-700" />
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-navy-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Clientes</h3>
          <span className="text-xs text-gray-500">{stores.length} {stores.length === 1 ? 'tienda' : 'tiendas'}</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-800 text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left p-3 pl-4">Cliente</th>
              <th className="text-right p-3">Total facturado</th>
              <th className="text-right p-3">Total pagado</th>
              <th className="text-right p-3">Pendiente confirmar</th>
              <th className="text-right p-3">Saldo a cobrar</th>
              <th className="text-right p-3 pr-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {stores.map(s => (
              <tr key={s.agreementId} className="table-row">
                <td className="p-3 pl-4 text-white font-medium">
                  <span className="inline-flex items-center gap-2">
                    <StoreIcon size={14} className="text-gray-500" />
                    {s.storeName || '—'}
                  </span>
                </td>
                <td className="p-3 text-right text-gray-300 font-mono">$ {formatARS(s.totalBilled)}</td>
                <td className="p-3 text-right text-emerald-400 font-mono">$ {formatARS(s.totalConfirmed)}</td>
                <td className={`p-3 text-right font-mono ${s.totalPending > 0 ? 'text-amber-400' : 'text-gray-500'}`}>
                  $ {formatARS(s.totalPending)}
                </td>
                <td className={`p-3 text-right font-mono font-bold ${s.balance > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
                  $ {formatARS(s.balance)}
                </td>
                <td className="p-3 pr-4 text-right">
                  <button
                    onClick={() => onSelectStore(s.storeId)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-300 border border-brand-500/20 hover:bg-brand-500/20 transition-colors inline-flex items-center gap-1"
                  >
                    <Eye size={12} /> Ver detalle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function Detail({ storeCompanyId, onBack }) {
  const [agreement, setAgreement] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [detailPaymentId, setDetailPaymentId] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    const params = { storeCompanyId }
    if (dateFrom) params.from = dateFrom
    if (dateTo) params.to = dateTo
    api.get('/logistics/account-statement', { params })
      .then(r => {
        const list = r.data?.data?.agreements || []
        setAgreement(list[0] || null)
      })
      .catch(err => {
        toast.error(err.response?.data?.error || 'Error al cargar el detalle')
        setAgreement(null)
      })
      .finally(() => setLoading(false))
  }, [storeCompanyId, dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  const handleQuickDate = (preset) => {
    const now = new Date()
    if (preset === 'today') {
      const d = toLocalDate(now); setDateFrom(d); setDateTo(d)
    } else if (preset === 'week') {
      const day = now.getDay()
      const diff = day === 0 ? 6 : day - 1
      const mon = new Date(now); mon.setDate(now.getDate() - diff)
      setDateFrom(toLocalDate(mon)); setDateTo(toLocalDate(now))
    } else if (preset === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      setDateFrom(toLocalDate(first)); setDateTo(toLocalDate(now))
    } else if (preset === 'clear') {
      setDateFrom(''); setDateTo('')
    }
  }

  if (loading) {
    return (
      <div className="card-p flex items-center justify-center gap-3 text-gray-500 py-16">
        <Loader2 size={20} className="animate-spin" /> Cargando...
      </div>
    )
  }

  if (!agreement) {
    return (
      <div className="card-p text-center py-12">
        <button onClick={onBack} className="btn-secondary mb-4">
          <ArrowLeft size={14} /> Volver
        </button>
        <p className="text-gray-500">No se encontró información para esta tienda.</p>
      </div>
    )
  }

  const balance = agreement.balance || {}
  const movements = agreement.movements || []

  return (
    <>
      <button onClick={onBack} className="btn-secondary">
        <ArrowLeft size={14} /> Volver al listado
      </button>

      <div className="card-p">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[11px] text-gray-500 uppercase tracking-wider">
              Saldo a cobrar de {agreement.storeCompany?.name}
            </div>
            <div className={`text-4xl font-bold font-mono mt-1 ${balance.balance > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
              $ {formatARS(balance.balance)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {balance.balance > 0 ? 'Esta tienda te debe este monto' : 'Cuenta saldada'}
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn bg-emerald-500 hover:bg-emerald-600 text-white"
            title="Para registrar pagos en mano que no pasan por la tienda"
          >
            <Plus size={14} /> Registrar pago manual
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-navy-800">
          <MiniStat label="Total facturado" value={`$ ${formatARS(balance.totalBilled)}`} />
          <MiniStat label="Total cobrado" value={`$ ${formatARS(balance.totalConfirmed)}`} valueCls="text-emerald-400" />
          <MiniStat label="Pendiente confirmar" value={`$ ${formatARS(balance.totalPending)}`} valueCls={balance.totalPending > 0 ? 'text-amber-400' : ''} />
          <MiniStat label="Saldo" value={`$ ${formatARS(balance.balance)}`} valueCls={balance.balance > 0 ? 'text-emerald-400' : 'text-gray-400'} />
        </div>
      </div>

      <div className="card-p space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Desde</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input text-sm" />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input text-sm" />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { label: 'Hoy', preset: 'today' },
            { label: 'Esta semana', preset: 'week' },
            { label: 'Este mes', preset: 'month' },
          ].map(b => (
            <button key={b.preset} onClick={() => handleQuickDate(b.preset)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-navy-800 text-gray-400 hover:text-white hover:bg-navy-700 transition-colors">
              {b.label}
            </button>
          ))}
          {(dateFrom || dateTo) && (
            <button onClick={() => handleQuickDate('clear')}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
              Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-navy-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Movimientos</h3>
          <span className="text-xs text-gray-500">{movements.length} {movements.length === 1 ? 'movimiento' : 'movimientos'}</span>
        </div>

        {movements.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Inbox size={36} className="mx-auto text-gray-700 mb-3" />
            <p className="text-sm">Aún no hay movimientos con esta tienda.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-800 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left p-3 pl-4">Fecha</th>
                <th className="text-left p-3">Tipo</th>
                <th className="text-left p-3">Descripción</th>
                <th className="text-left p-3">Estado</th>
                <th className="text-right p-3">Monto</th>
                <th className="text-right p-3 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {movements.map(m => {
                const isReceipt = m.type === 'receipt'
                const isPayment = m.type === 'payment'
                const isRejected = isPayment && m.status === 'REJECTED'
                // Desde la óptica de la logística: receipt = ingreso pendiente (positivo verde claro),
                // payment confirmado = ingreso recibido (verde fuerte).
                return (
                  <tr key={`${m.type}-${m.id}`} className="table-row">
                    <td className="p-3 pl-4 text-gray-300 whitespace-nowrap">{formatDate(m.date)}</td>
                    <td className="p-3">
                      {isReceipt ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/10 text-gray-300 border border-gray-500/20">
                          <FileText size={11} /> Remito
                        </span>
                      ) : isRejected ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          Pago rechazado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          Pago recibido
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-gray-300">{m.description}</td>
                    <td className="p-3">
                      {isPayment ? (
                        <span className={`badge ${STATUS_BADGE[m.status]?.cls || ''}`}>
                          {STATUS_BADGE[m.status]?.label || m.status}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>
                    <td className={`p-3 text-right font-mono whitespace-nowrap ${
                      isReceipt ? 'text-gray-300' : isRejected ? 'text-gray-500 line-through' : 'text-emerald-400'
                    }`}>
                      {isReceipt ? (
                        <span className="inline-flex items-center gap-1"><ArrowUp size={11} /> $ {formatARS(m.amount)}</span>
                      ) : isRejected ? (
                        <span>$ {formatARS(m.grossAmount)}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1"><ArrowDown size={11} /> $ {formatARS(Math.abs(m.amount))}</span>
                      )}
                    </td>
                    <td className="p-3 pr-4 text-right">
                      {isPayment && (
                        <button
                          onClick={() => setDetailPaymentId(m.id)}
                          className={`text-xs px-2.5 py-1 rounded inline-flex items-center gap-1 ${
                            m.status === 'PENDING'
                              ? 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                              : 'bg-navy-800 text-gray-300 hover:bg-navy-700'
                          }`}
                        >
                          <Eye size={11} /> {m.status === 'PENDING' ? 'Revisar' : 'Ver'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <PaymentFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={() => load()}
        agreementId={agreement.id}
        agreementLabel={`Pago manual de ${agreement.storeCompany?.name}`}
        asLogistics={true}
      />

      <PaymentDetailModal
        open={!!detailPaymentId}
        onClose={() => setDetailPaymentId(null)}
        paymentId={detailPaymentId}
        onChanged={() => load()}
      />
    </>
  )
}

function MiniStat({ label, value, valueCls = 'text-white' }) {
  return (
    <div>
      <div className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`text-sm font-bold font-mono mt-0.5 ${valueCls}`}>{value}</div>
    </div>
  )
}
