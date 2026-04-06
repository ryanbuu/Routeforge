import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authApi } from '@/api/resources'

interface AuthState {
  username: string | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authApi.me()
      .then(data => setUsername(data.username))
      .catch(() => setUsername(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (user: string, pass: string) => {
    const data = await authApi.login(user, pass)
    setUsername(data.username)
  }

  const logout = async () => {
    await authApi.logout()
    setUsername(null)
  }

  return (
    <AuthContext.Provider value={{ username, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
