import { useQuery } from '@tanstack/react-query'
import { routesApi, upstreamsApi, servicesApi, consumersApi, healthApi } from '@/api/resources'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Route, Server, Layers, Users, Activity } from 'lucide-react'
import { parseApisixList } from '@/api/client'

const statItems = [
  { key: 'routes', title: '路由', icon: Route, color: 'from-blue-500 to-blue-600' },
  { key: 'upstreams', title: '上游', icon: Server, color: 'from-emerald-500 to-emerald-600' },
  { key: 'services', title: '服务', icon: Layers, color: 'from-violet-500 to-violet-600' },
  { key: 'consumers', title: '消费者', icon: Users, color: 'from-orange-500 to-orange-600' },
] as const

function StatCard({ title, icon: Icon, value, color }: { title: string; icon: any; value: number | string; color: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-sm`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { data: routes } = useQuery({ queryKey: ['routes'], queryFn: () => routesApi.list() })
  const { data: upstreams } = useQuery({ queryKey: ['upstreams'], queryFn: () => upstreamsApi.list() })
  const { data: services } = useQuery({ queryKey: ['services'], queryFn: () => servicesApi.list() })
  const { data: consumers } = useQuery({ queryKey: ['consumers'], queryFn: () => consumersApi.list() })
  const { data: health } = useQuery({ queryKey: ['health'], queryFn: healthApi.check, refetchInterval: 30_000 })

  const isConnected = health?.apisix === 'connected'
  const counts: Record<string, number> = {
    routes: parseApisixList(routes).length,
    upstreams: parseApisixList(upstreams).length,
    services: parseApisixList(services).length,
    consumers: parseApisixList(consumers).length,
  }

  return (
    <div>
      <PageHeader
        title="概览"
        description="APISIX 资源统计"
        action={
          <Badge variant={isConnected ? 'success' : 'destructive'}>
            <Activity className="h-3 w-3 mr-1" />
            {isConnected ? 'APISIX 已连接' : 'APISIX 未连接'}
          </Badge>
        }
      />
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map(({ key, title, icon, color }) => (
          <StatCard key={key} title={title} icon={icon} value={counts[key]} color={color} />
        ))}
      </div>
    </div>
  )
}
