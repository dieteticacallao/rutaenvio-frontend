import { useState, useRef, useEffect } from 'react'
import { X, Upload, FileText, Loader2, Image as ImageIcon, Trash2 } from 'lucide-react'
import { api } from '../../lib/store'
import toast from 'react-hot-toast'

const METHOD_OPTIONS = [
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'CASH', label: 'Efectivo' },
  { value: 'CHECK', label: 'Cheque' },
  { value: 'MERCADO_PAGO', label: 'Mercado Pago' },
  { value: 'OTHER', label: 'Otro' },
]

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_BYTES = 5 * 1024 * 1024

function todayLocal() {
  const now = new Date()
  const tz = now.getTimezoneOffset()
  const local = new Date(now.getTime() - tz * 60000)
  return local.toISOString().slice(0, 10)
}

function formatARS(n) {
  if (!isFinite(n)) return ''
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function PaymentFormModal({
  open,
  onClose,
  onSuccess,
  agreementId,
  agreementLabel,    // ej: "Pago a Jo Express" o "Pago de Dietetica Callao"
  asLogistics = false, // true: archivo opcional + status CONFIRMED
}) {
  const [amount, setAmount] = useState('')
  const [paidAt, setPaidAt] = useState(todayLocal())
  const [method, setMethod] = useState('TRANSFER')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (open) {
      // reset al abrir
      setAmount('')
      setPaidAt(todayLocal())
      setMethod('TRANSFER')
      setReference('')
      setNotes('')
      setFile(null)
      setFilePreview(null)
    }
  }, [open])

  useEffect(() => {
    if (!file) { setFilePreview(null); return }
    if (file.type === 'application/pdf') { setFilePreview('pdf'); return }
    const url = URL.createObjectURL(file)
    setFilePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  if (!open) return null

  const amountNum = parseFloat(amount.replace(',', '.'))
  const amountValid = isFinite(amountNum) && amountNum > 0

  const handleFile = (f) => {
    if (!f) return
    if (!ALLOWED_TYPES.includes(f.type)) {
      toast.error('Tipo de archivo no permitido. Usá JPG, PNG, WEBP o PDF.')
      return
    }
    if (f.size > MAX_BYTES) {
      toast.error('El archivo supera 5 MB.')
      return
    }
    setFile(f)
  }

  const removeFile = () => {
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!amountValid) {
      toast.error('Ingresá un monto válido (mayor a 0)')
      return
    }
    if (!paidAt) {
      toast.error('Ingresá la fecha del pago')
      return
    }
    if (!asLogistics && !file) {
      toast.error('El comprobante es obligatorio')
      return
    }
    if (notes && notes.length > 500) {
      toast.error('Las notas no pueden superar 500 caracteres')
      return
    }
    if (reference && reference.length > 100) {
      toast.error('La referencia no puede superar 100 caracteres')
      return
    }

    const fd = new FormData()
    fd.append('agreementId', agreementId)
    fd.append('amount', String(amountNum))
    fd.append('paidAt', new Date(paidAt + 'T12:00:00').toISOString())
    fd.append('method', method)
    if (reference) fd.append('reference', reference.trim())
    if (notes) fd.append('notes', notes.trim())
    if (file) fd.append('attachment', file)

    setSubmitting(true)
    try {
      const res = await api.post('/payments', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success(asLogistics
        ? 'Pago registrado y confirmado'
        : 'Pago registrado, esperando confirmación de la logística')
      onSuccess && onSuccess(res.data?.data)
      onClose && onClose()
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al registrar el pago'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-navy-800">
          <div>
            <h2 className="text-lg font-bold text-white">Registrar pago</h2>
            {agreementLabel && (
              <p className="text-xs text-gray-500 mt-0.5">{agreementLabel}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-navy-800 transition-colors"
            disabled={submitting}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Monto *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
                placeholder="0,00"
                className="input pl-7"
                disabled={submitting}
                required
              />
            </div>
            {amount && amountValid && (
              <p className="text-xs text-gray-500 mt-1">$ {formatARS(amountNum)}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha del pago *</label>
              <input
                type="date"
                value={paidAt}
                onChange={e => setPaidAt(e.target.value)}
                className="input"
                disabled={submitting}
                required
              />
            </div>
            <div>
              <label className="label">Método *</label>
              <select
                value={method}
                onChange={e => setMethod(e.target.value)}
                className="input"
                disabled={submitting}
                required
              >
                {METHOD_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Referencia / N° de comprobante</label>
            <input
              type="text"
              value={reference}
              onChange={e => setReference(e.target.value)}
              maxLength={100}
              placeholder="Opcional"
              className="input"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="label">
              Comprobante {asLogistics ? '(opcional)' : '*'}
            </label>
            {!file ? (
              <label className="flex flex-col items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-navy-800 rounded-lg cursor-pointer hover:border-teal-500/40 hover:bg-navy-800/30 transition-colors">
                <Upload size={20} className="text-gray-500" />
                <div className="text-xs text-gray-400">Hacé click o arrastrá un archivo</div>
                <div className="text-[10px] text-gray-600">JPG, PNG, WEBP o PDF — máx 5 MB</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                  onChange={e => handleFile(e.target.files?.[0])}
                  className="hidden"
                  disabled={submitting}
                />
              </label>
            ) : (
              <div className="border border-navy-800 rounded-lg p-3 bg-navy-950 flex items-center gap-3">
                {filePreview === 'pdf' ? (
                  <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <FileText size={22} className="text-red-400" />
                  </div>
                ) : filePreview ? (
                  <img src={filePreview} alt="preview" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-navy-800 flex items-center justify-center flex-shrink-0">
                    <ImageIcon size={20} className="text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{file.name}</div>
                  <div className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs px-2 py-1 rounded bg-navy-800 text-gray-300 hover:bg-navy-700 cursor-pointer">
                    Cambiar
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                      onChange={e => handleFile(e.target.files?.[0])}
                      className="hidden"
                      disabled={submitting}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 inline-flex items-center justify-center gap-1"
                    disabled={submitting}
                  >
                    <Trash2 size={11} /> Quitar
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="label">Notas</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Opcional"
              className="input resize-none"
              disabled={submitting}
            />
            <div className="text-[10px] text-gray-600 mt-1 text-right">{notes.length}/500</div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-navy-800">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`btn ${asLogistics ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-teal-500 hover:bg-teal-600 text-white'}`}
              disabled={submitting || !amountValid}
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Registrar pago
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
