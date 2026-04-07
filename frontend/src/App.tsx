import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { InstanceProvider } from '@/contexts/InstanceContext'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { RoutesPage } from '@/pages/RoutesPage'
import { UpstreamsPage } from '@/pages/UpstreamsPage'
import { ServicesPage } from '@/pages/ServicesPage'
import { ConsumersPage } from '@/pages/ConsumersPage'
import { PluginsPage } from '@/pages/PluginsPage'
import { SslPage } from '@/pages/SslPage'
import { AuditPage } from '@/pages/AuditPage'
import { InstancesPage } from '@/pages/InstancesPage'
import { UsersPage } from '@/pages/UsersPage'

export default function App() {
  const { username, isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!username) {
    return <LoginPage />
  }

  return (
    <InstanceProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/upstreams" element={<UpstreamsPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/consumers" element={<ConsumersPage />} />
          <Route path="/plugins" element={<PluginsPage />} />
          <Route path="/ssl" element={<SslPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/instances" element={isAdmin ? <InstancesPage /> : <Navigate to="/" replace />} />
          <Route path="/users" element={isAdmin ? <UsersPage /> : <Navigate to="/" replace />} />
        </Route>
      </Routes>
    </InstanceProvider>
  )
}
