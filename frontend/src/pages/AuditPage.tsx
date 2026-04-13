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
  FileJson,
} from 'lucide-react'

const ACTION_CONFIG: Record<string, { label: string; icon: typeof Plus; colorClass: string }> = {
  CREATE: { label: '创建', icon: Plus,   colorClass: 'text-[#248a3d] dark:text-[#30d158] bg-[#30d158]/10 border-[#30d158]/25' },
  UPDATE: { label: '更新', icon: Pencil, colorClass: 'text-primary bg-primary/10 border-primary/25' },
  DELETE: { label: '删除', icon: Trash2, colorClass: 'text-[#c5281c] dark:text-[#ff453a] bg-[#ff3b30]/10 border-[#ff3b30]/25' },
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
    try {
      return <pre className="text-[12px] font-mono whitespace-pre-wrap break-all text-foreground/80">{JSON.stringify(JSON.parse(payload), null, 2)}</pre>
    } catch {
      return <pre className="text-[12px] font-mono whitespace-pre-wrap break-all text-foreground/80">{payload}</pre>
    }
  }

  const entries = computeDiff(diff.before, diff.after)

  if (entries.length === 0) {
    return <div className="text-[14px] text-muted-foreground py-4 text-center">无变更</div>
  }

  return (
    <div className="space-y-2">
      {entries.map(entry => (
        <div key={entry.key} className="rounded-lg border border-foreground/[0.08] overflow-hidden">
          <div className="px-3.5 py-2 bg-foreground/[0.03] dark:bg-white/[0.04] text-[12px] font-semibold text-foreground/80 flex items-center gap-2">
            <span className="font-mono">{entry.key}</span>
            {entry.type === 'added' && <Badge variant="success">新增</Badge>}
            {entry.type === 'removed' && <Badge variant="destructive">删除</Badge>}
            {entry.type === 'changed' && <Badge>变更</Badge>}
          </div>
          <div className="px-3.5 py-2.5 text-[12px] font-mono space-y-1">
            {(entry.type === 'removed' || entry.type === 'changed') && (
              <div className="flex gap-2">
                <span className="text-[#ff3b30] shrink-0">−</span>
                <span className="text-[#c5281c] dark:text-[#ff453a] whitespace-pre-wrap break-all bg-[#ff3b30]/5 rounded px-1.5 py-0.5">
                  {typeof entry.before === 'object' ? JSON.stringify(entry.before, null, 2) : String(entry.before)}
                </span>
              </div>
            )}
            {(entry.type === 'added' || entry.type === 'changed') && (
              <div className="flex gap-2">
                <span className="text-[#30d158] shrink-0">+</span>
                <span className="text-[#248a3d] dark:text-[#30d158] whitespace-pre-wrap break-all bg-[#30d158]/5 rounded px-1.5 py-0.5">
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
      <div className="px-10 pb-10">
        {/* Filter tabs */}
        <div className="flex gap-1.5 mb-6 flex-wrap">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key || 'all'}
              onClick={() => { setResource(tab.key); setPage(0) }}
              className={cn(
                'px-3.5 py-1.5 rounded-md text-[13px] font-medium border transition-colors duration-150',
                resource === tab.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-foreground/65 border-foreground/10 hover:bg-foreground/5'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-16 text-[15px]">加载中…</div>
        ) : items.length === 0 ? (
          <div className="text-center text-muted-foreground py-16 text-[15px]">暂无审计记录</div>
        ) : (
          <div className="relative">
            {/* vertical line */}
            <div className="absolute left-[11px] top-3 bottom-3 w-px bg-foreground/[0.08]" />

            <div className="space-y-1.5">
              {items.map((item: any) => {
                const actionCfg = ACTION_CONFIG[item.action] || ACTION_CONFIG.UPDATE
                const resourceCfg = RESOURCE_CONFIG[item.resource] || { label: item.resource, icon: Globe }
                const ActionIcon = actionCfg.icon
                const ResourceIcon = resourceCfg.icon
                const { date, time } = formatTime(item.createdAt)
                const relative = relativeTime(item.createdAt)
                const desc = buildDescription(item)

                let showDateHeader = false
                if (date !== lastDate) {
                  lastDate = date
                  showDateHeader = true
                }

                return (
                  <div key={item.id}>
                    {showDateHeader && (
                      <div className="pl-10 pt-5 pb-2">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-apple-micro">{date}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-3 group">
                      {/* Timeline dot */}
                      <div className={cn(
                        'h-[22px] w-[22px] rounded-full border flex items-center justify-center shrink-0 mt-3 transition-colors',
                        actionCfg.colorClass
                      )}>
                        <ActionIcon className="h-3 w-3" />
                      </div>

                      {/* Card */}
                      <div className="flex-1 rounded-lg bg-card px-4 py-3 border border-foreground/[0.04] dark:border-white/[0.04] group-hover:border-foreground/[0.08] transition-colors duration-150 mb-0.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant={item.action === 'CREATE' ? 'success' : item.action === 'DELETE' ? 'destructive' : 'default'}
                              >
                                {actionCfg.label}
                              </Badge>
                              <div className="flex items-center gap-1.5 text-[14px]">
                                <ResourceIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="font-medium text-foreground tracking-apple-body">{desc.text}</span>
                                {desc.name && (
                                  <span className="text-foreground/80 font-semibold tracking-apple-body">
                                    {desc.name}
                                  </span>
                                )}
                              </div>
                            </div>

                            {item.resourceId && (
                              <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground font-mono">
                                ID: {item.resourceId}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
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
                              <div className="text-[12px] text-foreground/60 font-mono tabular-nums">{time}</div>
                              <div className="text-[10px] text-muted-foreground/60 tracking-apple-micro">{relative}</div>
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-foreground/[0.06]">
            <span className="text-[13px] text-muted-foreground tracking-apple-caption">共 {total} 条记录</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-[13px] text-muted-foreground">{page + 1} / {totalPages}</span>
              <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={detailPayload !== null} onOpenChange={() => setDetailPayload(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {detailPayload?.action === 'UPDATE' ? '变更详情' : detailPayload?.action === 'DELETE' ? '删除快照' : '操作详情'}
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-lg bg-[#fafafc] dark:bg-[#2a2a2d] border border-foreground/[0.06] dark:border-white/[0.08] p-4 overflow-auto max-h-[60vh]">
            {detailPayload?.action === 'UPDATE' ? (
              <DiffView payload={detailPayload.payload} />
            ) : (
              <pre className="text-[12px] font-mono whitespace-pre-wrap break-all text-foreground/80">
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
