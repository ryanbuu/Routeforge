import { Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { RoutesPage } from '@/pages/RoutesPage'
import { UpstreamsPage } from '@/pages/UpstreamsPage'
import { ServicesPage } from '@/pages/ServicesPage'
import { ConsumersPage } from '@/pages/ConsumersPage'
import { PluginsPage } from '@/pages/PluginsPage'
import { SslPage } from '@/pages/SslPage'
import { AuditPage } from '@/pages/AuditPage'

export default function App() {
  return (
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
      </Route>
    </Routes>
  )
}
