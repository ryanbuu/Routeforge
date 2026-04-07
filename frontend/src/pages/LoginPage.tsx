import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Route } from 'lucide-react'

export function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
    } catch {
      setError('用户名或密码错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg mb-4">
            <Route className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground/90">Routeforge</h1>
          <p className="text-sm text-muted-foreground mt-1">APISIX Dashboard</p>
        </div>

        {/* Login Card */}
        <form onSubmit={handleSubmit} className="glass-heavy rounded-2xl p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground/80">用户名</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="flex h-10 w-full rounded-xl border bg-white/40 backdrop-blur-sm px-3 py-2 text-sm
                ring-offset-background placeholder:text-muted-foreground
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-1
                transition-shadow duration-200"
              placeholder="admin"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground/80">密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="flex h-10 w-full rounded-xl border bg-white/40 backdrop-blur-sm px-3 py-2 text-sm
                ring-offset-background placeholder:text-muted-foreground
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-1
                transition-shadow duration-200"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50/50 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full h-10 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium
              shadow-sm hover:shadow-md transition-all duration-200
              active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  )
}
