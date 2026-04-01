import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/store'
import { Truck, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await login(email, password)
      const role = data.user?.role
      if (role === 'STORE_ADMIN') {
        navigate('/') // por ahora al dashboard, despues /tienda
      } else {
        navigate('/')
      }
      toast.success('Bienvenido!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Credenciales incorrectas')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-500/30">
            <Truck size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">RutaEnvio</h1>
          <p className="text-gray-500 text-sm mt-1">Gestion inteligente de delivery</p>
        </div>

        <form onSubmit={handleSubmit} className="card-p space-y-4">
          <h2 className="text-lg font-semibold text-white">Iniciar sesion</h2>

          <div>
            <label className="label">Email *</label>
            <input className="input" type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Contrasena *</label>
            <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? 'Ingresando...' : 'Entrar'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>
      </div>
    </div>
  )
}
