import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/store'
import {
  DollarSign, Plus, FileText, Eye, Trash2, Loader2, Truck,
  AlertCircle, Inbox, ArrowDown, ArrowUp, Wallet
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

export default function StoreAccountStatement() {
  const navigate = useNavigate()
  const [agreements, setAgreements] = useState([])
  const [grandTotal, setGrandTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(null)

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [detailPaymentId, setDetailPaymentId] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (dateFrom) params.from = dateFrom
    if (dateTo) params.to = dateTo
    api.get('/store/account-statement', { params })
      .then(r => {
        const list = r.data?.data?.agreements || []
        setAgreements(list)
        setGrandTotal(r.data?.data?.grandTotal || 0)
        setActiveTab(prev => {
          if (prev && list.find(a => a.id === prev)) return prev
          return list[0]?.id || null
        })
      })
      .catch(err => {
        toast.error(err.response?.data?.error || 'Error al cargar la cuenta corriente')
        setAgreements([])
      })
      .finally(() => setLoading(false))
  }, [dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  const activeAgreement = useMemo(
    () => agreements.find(a => a.id === activeTab) || null,
    [agreements, activeTab]
  )

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

  const handlePaymentSuccess = () => {
    load()
  }

  const handlePaymentChanged = () => {
    load()
  }

  if (loading && agreements.length === 0) {
    return (
      <div className="space-y-5">
        <Header />
        <div className="card-p flex items-center justify-center gap-3 text-gray-500 py-16">
          <Loader2 size={20} className="animate-spin" /> Cargando cuenta corriente...
        </div>
      </div>
    )
  }

  if (!loading && agreements.length === 0) {
    return (
      <div className="space-y-5">
        <Header />
        <div className="card-p text-center py-16">
          <Inbox size={40} className="mx-auto text-gray-700 mb-3" />
          <p className="text-gray-400">No tenés logísticas asociadas todavía.</p>
          <p className="text-xs text-gray-600 mt-1">
            Cuando una logística empiece a operar tus envíos vas a ver acá tu saldo.
          </p>
        </div>
      </div>
    )
  }

  const showTabs = agreements.length > 1

  return (
    <div className="space-y-5">
      <Header />

      {showTabs && (
        <div className="flex flex-wrap gap-2">
          {agreements.map(a => {
            const isActive = a.id === activeTab
            const bal = a.balance?.balance || 0
            const balCls = bal > 0 ? 'text-red-400' : 'text-emerald-400'
            return (
              <button
                key={a.id}
                onClick={() => setActiveTab(a.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                    : 'bg-navy-900 border border-navy-800 text-gray-400 hover:text-white hover:border-navy-700'
                }`}
              >
                <Truck size={14} />
                {a.logisticsCompany?.name || 'Logística'}
                <span className={`font-mono text-xs ${isActive ? balCls : 'text-gray-500'}`}>
                  $ {formatARS(bal)}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {agreements.length > 1 && (
        <div className="card-p flex items-center justify-between">
          <div>
            <div className="text-[11px] text-gray-500 uppercase tracking-wider">Saldo total con todas las logísticas</div>
            <div className={`text-xl font-bold font-mono ${grandTotal > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              $ {formatARS(grandTotal)}
            </div>
          </div>
          <Wallet size={28} className="text-gray-700" />
        </div>
      )}

      {activeAgreement && (
        <AgreementView
          agreement={activeAgreement}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onChangeFrom={setDateFrom}
          onChangeTo={setDateTo}
          onQuickDate={handleQuickDate}
          onRegisterPayment={() => setShowForm(true)}
          onViewPayment={(id) => setDetailPaymentId(id)}
          onViewReceipt={(receiptId) => navigate(`/tienda/administracion/remitos/${receiptId}`)}
          onPaymentDeleted={handlePaymentChanged}
        />
      )}

      {activeAgreement && (
        <PaymentFormModal
          open={showForm}
          onClose={() => setShowForm(false)}
          onSuccess={handlePaymentSuccess}
          agreementId={activeAgreement.id}
          agreementLabel={`Pago a ${activeAgreement.logisticsCompany?.name || 'la logística'}`}
        />
      )}

      <PaymentDetailModal
        open={!!detailPaymentId}
        onClose={() => setDetailPaymentId(null)}
        paymentId={detailPaymentId}
        onChanged={handlePaymentChanged}
      />
    </div>
  )
}

function Header() {
  return (
    <div>
      <h1 className="text-xl font-bold text-white flex items-center gap-2">
        <DollarSign size={20} className="text-teal-400" /> Cuenta corriente
      </h1>
      <p className="text-sm text-gray-500">Saldo y pagos por cada logística asociada</p>
    </div>
  )
}

function AgreementView({
  agreement, dateFrom, dateTo, onChangeFrom, onChangeTo, onQuickDate,
  onRegisterPayment, onViewPayment, onViewReceipt, onPaymentDeleted
}) {
  const balance = agreement.balance || {}
  const movements = agreement.movements || []

  return (
    <>
      {/* Saldo + acciones */}
      <div className="card-p">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[11px] text-gray-500 uppercase tracking-wider">Saldo actual con {agreement.logisticsCompany?.name}</div>
            <div className={`text-4xl font-bold font-mono mt-1 ${balance.balance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              $ {formatARS(balance.balance)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {balance.balance > 0 ? 'Tu tienda debe este monto' : balance.balance < 0 ? 'A favor' : 'Saldo en cero'}
            </div>
          </div>
          <button
            onClick={onRegisterPayment}
            className="btn bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/20"
          >
            <Plus size={14} /> Registrar pago
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-navy-800">
          <MiniStat label="Total facturado" value={`$ ${formatARS(balance.totalBilled)}`} />
          <MiniStat label="Total pagado" value={`$ ${formatARS(balance.totalConfirmed)}`} valueCls="text-emerald-400" />
          <MiniStat label="Pendiente de confirmar" value={`$ ${formatARS(balance.totalPending)}`} valueCls={balance.totalPending > 0 ? 'text-amber-400' : ''} />
          <MiniStat label="Saldo" value={`$ ${formatARS(balance.balance)}`} valueCls={balance.balance > 0 ? 'text-red-400' : 'text-emerald-400'} />
        </div>
      </div>

      {/* Filtros */}
      <div className="card-p space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Desde</label>
            <input type="date" value={dateFrom} onChange={e => onChangeFrom(e.target.value)} className="input text-sm" />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input type="date" value={dateTo} onChange={e => onChangeTo(e.target.value)} className="input text-sm" />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { label: 'Hoy', preset: 'today' },
            { label: 'Esta semana', preset: 'week' },
            { label: 'Este mes', preset: 'month' },
          ].map(b => (
            <button key={b.preset} onClick={() => onQuickDate(b.preset)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-navy-800 text-gray-400 hover:text-white hover:bg-navy-700 transition-colors">
              {b.label}
            </button>
          ))}
          {(dateFrom || dateTo) && (
            <button onClick={() => onQuickDate('clear')}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-navy-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Movimientos</h3>
          <span className="text-xs text-gray-500">{movements.length} {movements.length === 1 ? 'movimiento' : 'movimientos'}</span>
        </div>

        {movements.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Inbox size={36} className="mx-auto text-gray-700 mb-3" />
            <p className="text-sm">Aún no tenés movimientos con esta logística.</p>
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
              {movements.map(m => <MovementRow
                key={`${m.type}-${m.id}`}
                m={m}
                onViewPayment={onViewPayment}
                onViewReceipt={onViewReceipt}
              />)}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

function MovementRow({ m, onViewPayment, onViewReceipt }) {
  const isReceipt = m.type === 'receipt'
  const isPayment = m.type === 'payment'
  const isRejected = isPayment && m.status === 'REJECTED'

  return (
    <tr className="table-row">
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-500/10 text-teal-300 border border-teal-500/20">
            Pago
          </span>
        )}
      </td>

      <td className="p-3 text-gray-300">
        {isReceipt ? (
          <button
            onClick={() => onViewReceipt(m.id)}
            className="text-teal-400 hover:underline text-left"
          >
            {m.description}
          </button>
        ) : (
          <span>{m.description}</span>
        )}
      </td>

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
        isReceipt ? 'text-red-400' : isRejected ? 'text-gray-500 line-through' : 'text-emerald-400'
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
            onClick={() => onViewPayment(m.id)}
            className="text-xs px-2.5 py-1 rounded bg-navy-800 text-gray-300 hover:bg-navy-700 inline-flex items-center gap-1"
          >
            <Eye size={11} /> Ver
          </button>
        )}
      </td>
    </tr>
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
