import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-[360px]">
        {/* Hero brand */}
        <div className="text-center mb-10">
          <h1 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.022em] text-foreground">
            Routeforge
          </h1>
          <p className="text-[17px] text-muted-foreground mt-2 tracking-apple-body">
            APISIX Dashboard
          </p>
        </div>

        {/* Form — flat card */}
        <form onSubmit={handleSubmit} className="bg-card rounded-xl p-7 space-y-5 shadow-apple">
          <div className="space-y-1.5">
            <Label>用户名</Label>
            <Input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>密码</Label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-[13px] text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full"
            size="lg"
          >
            {loading ? '登录中…' : '登录'}
          </Button>
        </form>
      </div>
    </div>
  )
}
