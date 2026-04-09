import { useState } from 'react'
import { api } from '../../lib/store'
import { X, Download, Upload, Loader2, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ExcelImportModal({ clients, onClose, onImported }) {
  const showClientSelector = Array.isArray(clients)
  const [file, setFile] = useState(null)
  const [clientId, setClientId] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)

  const downloadTemplate = async () => {
    try {
      const response = await api.get('/orders/template', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'plantilla_pedidos.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Error al descargar la plantilla')
    }
  }

  const handleImport = async () => {
    if (!file) {
      toast.error('Selecciona un archivo Excel primero')
      return
    }
    setImporting(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (showClientSelector && clientId) formData.append('clientId', clientId)
      const { data } = await api.post('/orders/import-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResult(data)
      onImported()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al importar')
    }
    setImporting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="card-p w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Importar pedidos desde Excel</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>

        {!result ? (
          <>
            <div className="space-y-3">
              {showClientSelector && (
                <div>
                  <label className="label">Cliente</label>
                  <select className="input" value={clientId} onChange={e => setClientId(e.target.value)}>
                    <option value="">Sin cliente asignado</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-400 mb-2">1. Descarga la plantilla y completa los datos de tus pedidos.</p>
                <button onClick={downloadTemplate} className="btn-secondary text-sm">
                  <Download size={16} /> Descargar plantilla Excel
                </button>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-2">2. Subi el archivo completado.</p>
                <label className="flex items-center gap-3 p-3 border border-dashed border-navy-700 rounded-lg cursor-pointer hover:border-brand-500 transition-colors">
                  <Upload size={20} className="text-gray-500" />
                  <span className="text-sm text-gray-400">
                    {file ? file.name : 'Seleccionar archivo .xlsx'}
                  </span>
                  <input type="file" accept=".xlsx" className="hidden" onChange={e => setFile(e.target.files[0] || null)} />
                </label>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="btn-secondary">Cancelar</button>
              <button onClick={handleImport} disabled={importing || !file} className="btn-primary">
                {importing ? (
                  <><Loader2 size={16} className="animate-spin" /> Importando pedidos...</>
                ) : (
                  <><FileSpreadsheet size={16} /> Importar</>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 size={20} />
                <span className="text-sm font-medium">
                  Se importaron {result.imported} pedidos. {result.errors?.length || 0} errores.
                </span>
              </div>

              {result.errors?.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1 bg-navy-900 rounded-lg p-3">
                  {result.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-red-400">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      <span>Fila {err.row}: {err.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button onClick={onClose} className="btn-primary">Cerrar</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
