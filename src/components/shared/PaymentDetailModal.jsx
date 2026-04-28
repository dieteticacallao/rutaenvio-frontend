import { useState, useEffect } from 'react'
import {
  X, Loader2, FileText, ExternalLink, Check, Ban, Trash2, Calendar,
  CreditCard, Hash, User as UserIcon, AlertCircle, Image as ImageIcon
} from 'lucide-react'
import { api, useAuth } from '../../lib/store'
import toast from 'react-hot-toast'

const METHOD_LABEL = {
  TRANSFER: 'Transferencia',
  CASH: 'Efectivo',
  CHECK: 'Cheque',
  MERCADO_PAGO: 'Mercado Pago',
  OTHER: 'Otro',
}

const STATUS_BADGE = {
  PENDING: { label: 'Pendiente', cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  CONFIRMED: { label: 'Confirmado', cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  REJECTED: { label: 'Rechazado', cls: 'bg-red-500/10 text-red-400 border border-red-500/20' },
}

function formatARS(n) {
  const num = typeof n === 'string' ? parseFloat(n) : Number(n || 0)
  return num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

export default function PaymentDetailModal({
  open,
  onClose,
  paymentId,
  onChanged,    // callback (action: 'confirmed'|'rejected'|'deleted')
}) {
  const { user } = useAuth()
  const [payment, setPayment] = useState(null)
  const [loading, setLoading] = useState(false)
  const [acting, setActing] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    if (!open || !paymentId) return
    setLoading(true)
    setShowRejectForm(false)
    setRejectReason('')
    api.get(`/payments/${paymentId}`)
      .then(r => setPayment(r.data?.data))
      .catch(err => {
        toast.error(err.response?.data?.error || 'No se pudo cargar el pago')
        onClose && onClose()
      })
      .finally(() => setLoading(false))
  }, [open, paymentId])

  if (!open) return null

  const isLogistics = user?.role === 'LOGISTICS_ADMIN' || user?.role === 'SUPER_ADMIN'
  const isStore = user?.role === 'STORE_ADMIN' || user?.role === 'SUPER_ADMIN'
  const isPending = payment?.status === 'PENDING'
  const isOwner = payment?.createdById === user?.id || payment?.createdBy?.id === user?.id

  const handleConfirm = async () => {
    if (!confirm(`¿Confirmar pago de $${formatARS(payment.amount)} recibido? Esto no se puede deshacer fácilmente.`)) return
    setActing(true)
    try {
      await api.post(`/payments/${paymentId}/confirm`)
      toast.success('Pago confirmado')
      onChanged && onChanged('confirmed')
      onClose && onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo confirmar')
    } finally {
      setActing(false)
    }
  }

  const handleReject = async () => {
    const reason = rejectReason.trim()
    if (!reason) {
      toast.error('Ingresá una razón del rechazo')
      return
    }
    if (reason.length > 200) {
      toast.error('La razón no puede superar 200 caracteres')
      return
    }
    setActing(true)
    try {
      await api.post(`/payments/${paymentId}/reject`, { reason })
      toast.success('Pago rechazado, la tienda fue notificada')
      onChanged && onChanged('rejected')
      onClose && onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo rechazar')
    } finally {
      setActing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Anular este pago? Esta acción no se puede deshacer.')) return
    setActing(true)
    try {
      await api.delete(`/payments/${paymentId}`)
      toast.success('Pago anulado')
      onChanged && onChanged('deleted')
      onClose && onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo anular')
    } finally {
      setActing(false)
    }
  }

  const isPdf = payment?.attachmentMimeType === 'application/pdf'
  const isImage = payment?.attachmentMimeType?.startsWith('image/')
  // Si la URL es un stub local, no la mostramos como link
  const isRealAttachment = payment?.attachmentUrl && !payment.attachmentUrl.startsWith('local-stub://')

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-navy-800">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white">Detalle del pago</h2>
            {payment && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_BADGE[payment.status]?.cls || ''}`}>
                {STATUS_BADGE[payment.status]?.label || payment.status}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-navy-800 transition-colors"
            disabled={acting}
          >
            <X size={18} />
          </button>
        </div>

        {loading || !payment ? (
          <div className="p-12 flex flex-col items-center gap-3 text-gray-500">
            <Loader2 size={28} className="animate-spin" />
            <span className="text-sm">Cargando...</span>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Monto destacado */}
            <div className="text-center py-4 border-b border-navy-800">
              <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Monto</div>
              <div className="text-3xl font-bold text-white font-mono">$ {formatARS(payment.amount)}</div>
            </div>

            {/* Datos en grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <DataRow icon={<Calendar size={14} />} label="Fecha del pago" value={formatDate(payment.paidAt)} />
              <DataRow icon={<CreditCard size={14} />} label="Método" value={METHOD_LABEL[payment.method] || payment.method} />
              {payment.reference && (
                <DataRow icon={<Hash size={14} />} label="Referencia" value={payment.reference} />
              )}
              <DataRow
                icon={<UserIcon size={14} />}
                label="Cargado por"
                value={`${payment.createdBy?.name || payment.createdBy?.email || '—'}${payment.createdBy?.role === 'STORE_ADMIN' ? ' (tienda)' : payment.createdBy?.role === 'LOGISTICS_ADMIN' ? ' (logística)' : ''}`}
              />
              <DataRow icon={<Calendar size={14} />} label="Creado" value={formatDateTime(payment.createdAt)} />
              {payment.reviewedAt && (
                <DataRow
                  icon={<UserIcon size={14} />}
                  label={payment.status === 'REJECTED' ? 'Rechazado por' : 'Confirmado por'}
                  value={`${payment.reviewedBy?.name || payment.reviewedBy?.email || '—'} — ${formatDateTime(payment.reviewedAt)}`}
                />
              )}
            </div>

            {payment.notes && (
              <div className="border-t border-navy-800 pt-4">
                <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1.5">Notas</div>
                <div className="text-sm text-gray-300 whitespace-pre-wrap">{payment.notes}</div>
              </div>
            )}

            {payment.status === 'REJECTED' && payment.rejectionReason && (
              <div className="border border-red-500/20 bg-red-500/5 rounded-lg p-3 flex gap-2">
                <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-red-400 mb-0.5">Razón del rechazo</div>
                  <div className="text-sm text-gray-300">{payment.rejectionReason}</div>
                </div>
              </div>
            )}

            {/* Comprobante */}
            {payment.attachmentUrl && (
              <div className="border-t border-navy-800 pt-4">
                <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Comprobante</div>
                {!isRealAttachment ? (
                  <div className="flex items-center gap-2 text-xs text-gray-500 bg-navy-800/50 rounded-lg p-3">
                    <ImageIcon size={14} /> Archivo guardado localmente (modo dev)
                  </div>
                ) : isPdf ? (
                  <a
                    href={payment.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                  >
                    <FileText size={14} /> Abrir PDF <ExternalLink size={12} />
                  </a>
                ) : isImage ? (
                  <div>
                    <a href={payment.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block">
                      <img
                        src={payment.attachmentUrl}
                        alt="comprobante"
                        className="max-h-80 w-full object-contain rounded-lg border border-navy-800 bg-navy-950"
                      />
                    </a>
                    <a
                      href={payment.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-teal-400 hover:underline inline-flex items-center gap-1 mt-2"
                    >
                      Abrir en pestaña nueva <ExternalLink size={11} />
                    </a>
                  </div>
                ) : (
                  <a
                    href={payment.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-navy-800 text-gray-300 hover:bg-navy-700 transition-colors"
                  >
                    <FileText size={14} /> Ver archivo <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}

            {/* Acciones */}
            <div className="border-t border-navy-800 pt-4 flex flex-wrap gap-2 justify-end">
              {isLogistics && isPending && !showRejectForm && (
                <>
                  <button
                    onClick={() => setShowRejectForm(true)}
                    className="btn bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                    disabled={acting}
                  >
                    <Ban size={14} /> Rechazar
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="btn bg-emerald-500 hover:bg-emerald-600 text-white"
                    disabled={acting}
                  >
                    {acting && <Loader2 size={14} className="animate-spin" />}
                    <Check size={14} /> Confirmar pago
                  </button>
                </>
              )}

              {isStore && isPending && isOwner && (
                <button
                  onClick={handleDelete}
                  className="btn bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                  disabled={acting}
                >
                  {acting && <Loader2 size={14} className="animate-spin" />}
                  <Trash2 size={14} /> Anular pago
                </button>
              )}

              <button
                onClick={onClose}
                className="btn-secondary"
                disabled={acting}
              >
                Cerrar
              </button>
            </div>

            {/* Form de rechazo inline */}
            {isLogistics && isPending && showRejectForm && (
              <div className="border border-red-500/20 bg-red-500/5 rounded-lg p-4 space-y-3">
                <label className="block">
                  <div className="text-xs font-semibold text-red-400 mb-1.5">Razón del rechazo *</div>
                  <textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    maxLength={200}
                    rows={3}
                    placeholder="Explicá por qué rechazás el pago. La tienda lo va a ver."
                    className="input resize-none"
                    disabled={acting}
                  />
                  <div className="text-[10px] text-gray-600 mt-1 text-right">{rejectReason.length}/200</div>
                </label>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setShowRejectForm(false); setRejectReason('') }}
                    className="btn-secondary"
                    disabled={acting}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleReject}
                    className="btn bg-red-500 hover:bg-red-600 text-white"
                    disabled={acting || !rejectReason.trim()}
                  >
                    {acting && <Loader2 size={14} className="animate-spin" />}
                    Confirmar rechazo
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function DataRow({ icon, label, value }) {
  return (
    <div>
      <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
        {icon} {label}
      </div>
      <div className="text-sm text-gray-200">{value}</div>
    </div>
  )
}
