import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authApi } from '@/api/resources'

interface AuthState {
  username: string | null
  role: string | null
  isAdmin: boolean
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authApi.me()
      .then(data => { setUsername(data.username); setRole(data.role) })
      .catch(() => { setUsername(null); setRole(null) })
      .finally(() => setLoading(false))
  }, [])

  const login = async (user: string, pass: string) => {
    const data = await authApi.login(user, pass)
    setUsername(data.username)
    setRole(data.role)
  }

  const logout = async () => {
    await authApi.logout()
    setUsername(null)
    setRole(null)
  }

  return (
    <AuthContext.Provider value={{ username, role, isAdmin: role === 'ADMIN', loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
