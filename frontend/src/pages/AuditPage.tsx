import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditApi } from '@/api/resources'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Route,
  Server,
  Layers,
  Users,
  Shield,
  Globe,
  Clock,
  FileJson,
} from 'lucide-react'

const ACTION_CONFIG: Record<string, { label: string; icon: typeof Plus; color: string; bg: string }> = {
  CREATE: { label: '创建', icon: Plus,   color: 'text-emerald-600', bg: 'bg-emerald-500/15 border-emerald-500/25' },
  UPDATE: { label: '更新', icon: Pencil, color: 'text-blue-600',    bg: 'bg-blue-500/15 border-blue-500/25' },
  DELETE: { label: '删除', icon: Trash2,  color: 'text-red-500',     bg: 'bg-red-500/15 border-red-500/25' },
}

const RESOURCE_CONFIG: Record<string, { label: string; icon: typeof Route }> = {
  route:       { label: '路由',     icon: Route },
  upstream:    { label: '上游',     icon: Server },
  service:     { label: '服务',     icon: Layers },
  consumer:    { label: '消费者',   icon: Users },
  ssl:         { label: 'SSL 证书', icon: Shield },
  global_rule: { label: '全局规则', icon: Globe },
}

const FILTER_TABS = [
  { key: '',            label: '全部' },
  { key: 'route',       label: '路由' },
  { key: 'upstream',    label: '上游' },
  { key: 'service',     label: '服务' },
  { key: 'consumer',    label: '消费者' },
  { key: 'ssl',         label: 'SSL' },
  { key: 'global_rule', label: '全局规则' },
]

function formatTime(ts: string | null): { date: string; time: string } {
  if (!ts) return { date: '-', time: '' }
  try {
    const d = new Date(ts)
    const pad = (n: number) => String(n).padStart(2, '0')
    return {
      date: `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
    }
  } catch {
    return { date: '-', time: '' }
  }
}

function relativeTime(ts: string | null): string {
  if (!ts) return ''
  try {
    const diff = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return '刚刚'
    if (mins < 60) return `${mins} 分钟前`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} 小时前`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days} 天前`
    return `${Math.floor(days / 30)} 个月前`
  } catch {
    return ''
  }
}

function buildDescription(item: any): { text: string; name: string | null } {
  const resource = RESOURCE_CONFIG[item.resource]?.label || item.resource

  if (item.action === 'DELETE') {
    const name = tryParsePayloadName(item.payload)
    return { text: `删除了${resource}`, name: name || item.resourceId || null }
  }
  if (item.action === 'CREATE') {
    const name = tryParsePayloadName(item.payload)
    return { text: `创建了${resource}`, name: name || item.resourceId || null }
  }
  const name = tryParsePayloadName(item.payload)
  return { text: `更新了${resource}`, name: name || item.resourceId || null }
}

function tryParsePayloadName(payload: string | null): string | null {
  if (!payload) return null
  try {
    const obj = JSON.parse(payload)
    // For UPDATE payloads with before/after structure, check both
    if (obj.before?.name) return obj.before.name
    if (obj.after?.name) return obj.after.name
    return obj.name || null
  } catch {
    return null
  }
}

interface DiffEntry {
  key: string
  before: any
  after: any
  type: 'added' | 'removed' | 'changed' | 'unchanged'
}

function computeDiff(before: any, after: any): DiffEntry[] {
  const entries: DiffEntry[] = []
  const IGNORED_KEYS = new Set(['update_time', 'create_time', 'id'])
  const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})].filter(k => !IGNORED_KEYS.has(k)))
  for (const key of allKeys) {
    const bVal = before?.[key]
    const aVal = after?.[key]
    const bStr = JSON.stringify(bVal)
    const aStr = JSON.stringify(aVal)
    if (bVal === undefined) {
      entries.push({ key, before: bVal, after: aVal, type: 'added' })
    } else if (aVal === undefined) {
      entries.push({ key, before: bVal, after: aVal, type: 'removed' })
    } else if (bStr !== aStr) {
      entries.push({ key, before: bVal, after: aVal, type: 'changed' })
    }
  }
  return entries
}

function tryParseDiffPayload(payload: string | null): { before: any; after: any } | null {
  if (!payload) return null
  try {
    const obj = JSON.parse(payload)
    if (obj.before !== undefined || obj.after !== undefined) {
      return { before: obj.before || {}, after: obj.after || {} }
    }
  } catch {}
  return null
}

function DiffView({ payload }: { payload: string }) {
  const diff = tryParseDiffPayload(payload)
  if (!diff) {
    // Fallback: plain JSON
    try {
      return <pre className="text-xs font-mono whitespace-pre-wrap break-all">{JSON.stringify(JSON.parse(payload), null, 2)}</pre>
    } catch {
      return <pre className="text-xs font-mono whitespace-pre-wrap break-all">{payload}</pre>
    }
  }

  const entries = computeDiff(diff.before, diff.after)

  if (entries.length === 0) {
    return <div className="text-sm text-muted-foreground py-4 text-center">无变更</div>
  }

  return (
    <div className="space-y-2">
      {entries.map(entry => (
        <div key={entry.key} className="rounded-lg border border-white/20 overflow-hidden">
          <div className="px-3 py-1.5 bg-white/20 dark:bg-white/5 text-xs font-semibold text-foreground/80 flex items-center gap-2">
            <span className="font-mono">{entry.key}</span>
            {entry.type === 'added' && <Badge variant="success" className="text-[10px] px-1.5 py-0">新增</Badge>}
            {entry.type === 'removed' && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">删除</Badge>}
            {entry.type === 'changed' && <Badge className="text-[10px] px-1.5 py-0">变更</Badge>}
          </div>
          <div className="px-3 py-2 text-xs font-mono space-y-1">
            {(entry.type === 'removed' || entry.type === 'changed') && (
              <div className="flex gap-2">
                <span className="text-red-500 shrink-0">-</span>
                <span className="text-red-600/80 whitespace-pre-wrap break-all bg-red-500/5 rounded px-1">
                  {typeof entry.before === 'object' ? JSON.stringify(entry.before, null, 2) : String(entry.before)}
                </span>
              </div>
            )}
            {(entry.type === 'added' || entry.type === 'changed') && (
              <div className="flex gap-2">
                <span className="text-emerald-500 shrink-0">+</span>
                <span className="text-emerald-600/80 whitespace-pre-wrap break-all bg-emerald-500/5 rounded px-1">
                  {typeof entry.after === 'object' ? JSON.stringify(entry.after, null, 2) : String(entry.after)}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export function AuditPage() {
  const [page, setPage] = useState(0)
  const [resource, setResource] = useState('')
  const [detailPayload, setDetailPayload] = useState<{ payload: string; action: string } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, resource],
    queryFn: () => auditApi.list(page, 20, resource || undefined),
  })

  const items: any[] = data?.content || []
  const totalPages = data?.totalPages || 0
  const total = data?.totalElements || 0

  let lastDate = ''

  return (
    <div>
      <PageHeader title="审计日志" description="记录所有对 APISIX 的写操作" />
      <div className="p-6">
        {/* Filter tabs */}
        <div className="flex gap-1.5 mb-6 flex-wrap">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key || 'all'}
              onClick={() => { setResource(tab.key); setPage(0) }}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200',
                resource === tab.key
                  ? 'bg-primary/15 text-primary border-primary/25 shadow-sm'
                  : 'bg-white/30 text-muted-foreground border-white/20 dark:border-white/8 hover:bg-white/50 dark:hover:bg-white/12'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Timeline */}
        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">加载中...</div>
        ) : items.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">暂无审计记录</div>
        ) : (
          <div className="relative">
            {/* vertical line */}
            <div className="absolute left-[23px] top-2 bottom-2 w-px bg-gradient-to-b from-border/60 via-border/30 to-transparent" />

            <div className="space-y-1">
              {items.map((item: any) => {
                const actionCfg = ACTION_CONFIG[item.action] || ACTION_CONFIG.UPDATE
                const resourceCfg = RESOURCE_CONFIG[item.resource] || { label: item.resource, icon: Globe }
                const ActionIcon = actionCfg.icon
                const ResourceIcon = resourceCfg.icon
                const { date, time } = formatTime(item.createdAt)
                const relative = relativeTime(item.createdAt)
                const desc = buildDescription(item)

                // Date separator
                let showDateHeader = false
                if (date !== lastDate) {
                  lastDate = date
                  showDateHeader = true
                }

                return (
                  <div key={item.id}>
                    {showDateHeader && (
                      <div className="flex items-center gap-3 py-2 pl-[14px]">
                        <div className="h-[18px] w-[18px] rounded-full bg-white/60 dark:bg-white/10 border border-white/40 dark:border-white/10 flex items-center justify-center">
                          <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">{date}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-3 group pl-[14px]">
                      {/* Timeline dot */}
                      <div className={cn(
                        'h-[18px] w-[18px] rounded-full border flex items-center justify-center shrink-0 mt-3 transition-all duration-200',
                        actionCfg.bg
                      )}>
                        <ActionIcon className={cn('h-2.5 w-2.5', actionCfg.color)} />
                      </div>

                      {/* Card */}
                      <div className="flex-1 rounded-xl glass-subtle px-4 py-3 group-hover:bg-white/40 dark:group-hover:bg-white/10 transition-all duration-200 mb-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {/* Main line */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant={item.action === 'CREATE' ? 'success' : item.action === 'DELETE' ? 'destructive' : 'default'}
                                className="text-[10px] px-1.5 py-0"
                              >
                                {actionCfg.label}
                              </Badge>
                              <div className="flex items-center gap-1.5 text-sm">
                                <ResourceIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="font-medium">{desc.text}</span>
                                {desc.name && (
                                  <span className="bg-white/50 dark:bg-white/10 border border-white/30 dark:border-white/10 rounded-md px-1.5 py-0.5 text-xs font-semibold text-foreground/80">
                                    {desc.name}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Detail line */}
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                              {item.resourceId && (
                                <span className="font-mono text-[11px]">ID: {item.resourceId}</span>
                              )}
                            </div>
                          </div>

                          {/* Right side: time + action */}
                          <div className="flex items-center gap-2 shrink-0">
                            {item.payload && (
                              <button
                                onClick={() => setDetailPayload({ payload: item.payload, action: item.action })}
                                className="text-muted-foreground/50 hover:text-primary transition-colors"
                                title="查看详情"
                              >
                                <FileJson className="h-4 w-4" />
                              </button>
                            )}
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground font-mono">{time}</div>
                              <div className="text-[10px] text-muted-foreground/50">{relative}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/15 dark:border-white/8">
            <span className="text-sm text-muted-foreground">共 {total} 条记录</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
              <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Payload detail dialog */}
      <Dialog open={detailPayload !== null} onOpenChange={() => setDetailPayload(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {detailPayload?.action === 'UPDATE' ? '变更详情' : detailPayload?.action === 'DELETE' ? '删除快照' : '操作详情'}
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-xl glass-inset p-4 overflow-auto max-h-[60vh]">
            {detailPayload?.action === 'UPDATE' ? (
              <DiffView payload={detailPayload.payload} />
            ) : (
              <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                {(() => {
                  try { return JSON.stringify(JSON.parse(detailPayload?.payload || ''), null, 2) }
                  catch { return detailPayload?.payload }
                })()}
              </pre>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
