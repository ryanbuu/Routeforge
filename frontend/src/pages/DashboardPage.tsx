import { useQuery } from '@tanstack/react-query'
import { routesApi, upstreamsApi, servicesApi, consumersApi, healthApi } from '@/api/resources'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { parseApisixList } from '@/api/client'

/*
 * Apple-inspired dashboard.
 * - Flat stat tiles on card surface
 * - Huge, tightly-tracked number display
 * - Monochrome icons (no gradients), description below
 * - Connection status as a small text pill, not a loud badge
 */

const statItems = [
  { key: 'routes', title: '路由', description: '已配置路由总数' },
  { key: 'upstreams', title: '上游', description: '后端服务目标' },
  { key: 'services', title: '服务', description: '共享配置组合' },
  { key: 'consumers', title: '消费者', description: 'API 调用方' },
] as const

function StatCard({ title, description, value }: { title: string; description: string; value: number | string }) {
  return (
    <Card className="p-7">
      <CardContent className="p-0 space-y-3">
        <div className="text-[13px] font-medium text-muted-foreground tracking-apple-caption">{title}</div>
        <div className="text-[56px] font-semibold leading-[1.05] tracking-[-0.022em] text-foreground tabular-nums">
          {value}
        </div>
        <div className="text-[13px] text-muted-foreground tracking-apple-caption">{description}</div>
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
        description="APISIX 资源统计与运行状态"
        action={
          <div className="flex items-center gap-2 text-[13px] tracking-apple-caption">
            <div className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-[#30d158]' : 'bg-destructive'}`} />
            <span className="text-muted-foreground">
              {isConnected ? 'APISIX 已连接' : 'APISIX 未连接'}
            </span>
          </div>
        }
      />
      <div className="px-10 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {statItems.map(({ key, title, description }) => (
            <StatCard key={key} title={title} description={description} value={counts[key]} />
          ))}
        </div>
      </div>
    </div>
  )
}
