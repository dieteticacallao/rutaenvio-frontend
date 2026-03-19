import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/store'
import { Truck, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const [mode, setMode] = useState('login') // login | register
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', name: '', businessName: '', phone: '' })
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
      } else {
        await register(form)
      }
      navigate('/')
      toast.success(mode === 'login' ? 'Bienvenido!' : 'Cuenta creada!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al iniciar sesión')
    }
    setLoading(false)
  }

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-500/30">
            <Truck size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">RutaEnvio</h1>
          <p className="text-gray-500 text-sm mt-1">Gestión inteligente de delivery</p>
        </div>

        <form onSubmit={handleSubmit} className="card-p space-y-4">
          <h2 className="text-lg font-semibold text-white">
            {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </h2>

          {mode === 'register' && <>
            <div>
              <label className="label">Nombre de tu negocio</label>
              <input className="input" placeholder="Mi Tienda" value={form.businessName} onChange={set('businessName')} required />
            </div>
            <div>
              <label className="label">Tu nombre</label>
              <input className="input" placeholder="Juan Pérez" value={form.name} onChange={set('name')} required />
            </div>
          </>}

          <div>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="tu@email.com" value={form.email} onChange={set('email')} required />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            <ArrowRight size={16} />
          </button>

          <button type="button" onClick={() => setMode(m => m === 'login' ? 'register' : 'login')}
            className="text-sm text-gray-500 hover:text-brand-400 w-full text-center transition-colors">
            {mode === 'login' ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Iniciá sesión'}
          </button>
        </form>
      </div>
    </div>
  )
}
