import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: { detail?: string } } }).response
        setError(response?.data?.detail || 'Authentication failed. Please try again.')
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const quickFill = (userEmail: string, userPass: string) => {
    setEmail(userEmail)
    setPassword(userPass)
    setError('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-blue-50/20 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle decorative background blur shapes */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-brand-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-blue-200/40 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md animate-slide-up relative z-10">
        {/* Header */}
        <div className="text-center mb-7">
          <div className="w-16 h-16 bg-gradient-to-tr from-brand-600 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-xl shadow-brand-500/25 text-white">
            🚨
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Campus Crisis Platform</h1>
          <p className="text-slate-500 text-sm mt-1">
            Sign in with your campus account
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-7 shadow-xl shadow-slate-200/50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="you@campus.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              id="submit-btn"
              type="submit"
              className="btn-primary w-full mt-2 py-3"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* Quick Demo Accounts */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider text-center mb-3">
              ⚡ Quick Fill Demo Accounts
            </p>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => quickFill('admin@test.com', 'admin123')}
                className="bg-slate-50 hover:bg-brand-50/50 hover:border-brand-300 text-left p-2.5 rounded-xl border border-slate-200/90 transition-all duration-150 group"
              >
                <p className="font-bold text-slate-800 group-hover:text-brand-600 transition-colors">Admin</p>
                <p className="text-slate-500 text-[11px] truncate">admin@test.com</p>
              </button>
              <button
                type="button"
                onClick={() => quickFill('officer@test.com', 'officer123')}
                className="bg-slate-50 hover:bg-emerald-50/50 hover:border-emerald-300 text-left p-2.5 rounded-xl border border-slate-200/90 transition-all duration-150 group"
              >
                <p className="font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">Crisis Officer</p>
                <p className="text-slate-500 text-[11px] truncate">officer@test.com</p>
              </button>
              <button
                type="button"
                onClick={() => quickFill('tech@test.com', 'tech123')}
                className="bg-slate-50 hover:bg-amber-50/50 hover:border-amber-300 text-left p-2.5 rounded-xl border border-slate-200/90 transition-all duration-150 group"
              >
                <p className="font-bold text-slate-800 group-hover:text-amber-600 transition-colors">Technician</p>
                <p className="text-slate-500 text-[11px] truncate">tech@test.com</p>
              </button>
              <button
                type="button"
                onClick={() => quickFill('student@test.com', 'student123')}
                className="bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 text-left p-2.5 rounded-xl border border-slate-200/90 transition-all duration-150 group"
              >
                <p className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">Student</p>
                <p className="text-slate-500 text-[11px] truncate">student@test.com</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
