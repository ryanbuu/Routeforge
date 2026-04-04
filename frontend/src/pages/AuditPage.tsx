import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditApi } from '@/api/resources'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const ACTION_VARIANTS: Record<string, 'default' | 'destructive' | 'success' | 'secondary'> = {
  CREATE: 'success',
  UPDATE: 'default',
  DELETE: 'destructive',
}

const RESOURCE_LABELS: Record<string, string> = {
  route: '路由', upstream: '上游', service: '服务',
  consumer: '消费者', ssl: 'SSL', global_rule: '全局规则',
}

export function AuditPage() {
  const [page, setPage] = useState(0)
  const [resource, setResource] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, resource],
    queryFn: () => auditApi.list(page, 20, resource || undefined),
  })

  const items = data?.content || []
  const totalPages = data?.totalPages || 0

  return (
    <div>
      <PageHeader title="审计日志" description="记录所有对 APISIX 的写操作" />
      <div className="p-6">
        <div className="flex gap-2 mb-4">
          {['', 'route', 'upstream', 'service', 'consumer', 'ssl', 'global_rule'].map(r => (
            <Button
              key={r || 'all'}
              variant={resource === r ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setResource(r); setPage(0) }}
            >
              {r ? (RESOURCE_LABELS[r] || r) : '全部'}
            </Button>
          ))}
        </div>
        <Table>
          <TableHeader>
            <TableRow><TableHead>时间</TableHead><TableHead>操作</TableHead><TableHead>资源类型</TableHead><TableHead>资源 ID</TableHead><TableHead>内容摘要</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">加载中...</TableCell></TableRow>}
            {items.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {item.createdAt ? format(parseISO(item.createdAt), 'MM-dd HH:mm:ss') : '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={ACTION_VARIANTS[item.action] || 'secondary'}>{item.action}</Badge>
                </TableCell>
                <TableCell>{RESOURCE_LABELS[item.resource] || item.resource}</TableCell>
                <TableCell className="font-mono text-xs">{item.resourceId || '-'}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                  {item.payload ? item.payload.slice(0, 80) + (item.payload.length > 80 ? '...' : '') : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 mt-4">
            <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">第 {page + 1} / {totalPages} 页</span>
            <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
