import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { routesApi, upstreamsApi, servicesApi } from '@/api/resources'
import { parseApisixList } from '@/api/client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, X, Server, Layers } from 'lucide-react'

const ALL_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

const LB_TYPES = ['roundrobin', 'chash', 'ewma', 'least_conn'] as const
const UPSTREAM_SCHEMES = ['http', 'https', 'grpc', 'grpcs'] as const

interface UpstreamNode {
  host: string
  port: string
  weight: string
}

interface RouteFormState {
  id: string
  name: string
  desc: string
  uri: string
  methods: string[]
  host: string
  upstreamMode: 'ref' | 'inline'
  upstream_id: string
  upstreamType: string
  upstreamScheme: string
  upstreamNodes: UpstreamNode[]
  upstreamRetries: string
  upstreamTimeout: { connect: string; send: string; read: string }
  service_id: string
  status: number
  priority: string
  plugins: string
}

function initForm(initial?: any): RouteFormState {
  const v = initial?.value || {}
  const up = v.upstream || {}
  const hasInlineUpstream = v.upstream && (up.nodes || up.type)

  let nodes: UpstreamNode[] = [{ host: '', port: '80', weight: '1' }]
  if (up.nodes) {
    if (Array.isArray(up.nodes)) {
      nodes = up.nodes.map((n: any) => ({
        host: n.host || '',
        port: String(n.port || 80),
        weight: String(n.weight || 1),
      }))
    } else {
      nodes = Object.entries(up.nodes).map(([addr, w]) => {
        const [host, port] = addr.split(':')
        return { host, port: port || '80', weight: String(w) }
      })
    }
    if (nodes.length === 0) nodes = [{ host: '', port: '80', weight: '1' }]
  }

  const timeout = up.timeout || {}

  return {
    id: initial?.key?.split('/').pop() || '',
    name: v.name || '',
    desc: v.desc || '',
    uri: v.uri || (v.uris || []).join('\n') || '/',
    methods: v.methods || ['GET'],
    host: v.host || (v.hosts || []).join(', ') || '',
    upstreamMode: hasInlineUpstream ? 'inline' : 'ref',
    upstream_id: v.upstream_id || '',
    upstreamType: up.type || 'roundrobin',
    upstreamScheme: up.scheme || 'http',
    upstreamNodes: nodes,
    upstreamRetries: up.retries != null ? String(up.retries) : '',
    upstreamTimeout: {
      connect: timeout.connect != null ? String(timeout.connect) : '',
      send: timeout.send != null ? String(timeout.send) : '',
      read: timeout.read != null ? String(timeout.read) : '',
    },
    service_id: v.service_id || '',
    status: v.status ?? 1,
    priority: v.priority != null ? String(v.priority) : '0',
    plugins: v.plugins && Object.keys(v.plugins).length > 0
      ? JSON.stringify(v.plugins, null, 2) : '',
  }
}

function buildPayload(form: RouteFormState) {
  const uriList = form.uri.split('\n').map(s => s.trim()).filter(Boolean)
  const hostList = form.host.split(',').map(s => s.trim()).filter(Boolean)
  const payload: Record<string, any> = {
    name: form.name || undefined,
    desc: form.desc || undefined,
    methods: form.methods.length > 0 ? form.methods : undefined,
    status: form.status,
    priority: form.priority !== '' ? Number(form.priority) : 0,
  }
  if (uriList.length === 1) payload.uri = uriList[0]
  else if (uriList.length > 1) payload.uris = uriList
  if (hostList.length === 1) payload.host = hostList[0]
  else if (hostList.length > 1) payload.hosts = hostList

  if (form.upstreamMode === 'ref') {
    if (form.upstream_id) payload.upstream_id = form.upstream_id
  } else {
    const validNodes = form.upstreamNodes.filter(n => n.host.trim())
    if (validNodes.length > 0) {
      const upstream: Record<string, any> = {
        type: form.upstreamType,
        scheme: form.upstreamScheme,
        nodes: validNodes.map(n => ({
          host: n.host.trim(),
          port: Number(n.port) || 80,
          weight: Number(n.weight) || 1,
        })),
      }
      if (form.upstreamRetries !== '') upstream.retries = Number(form.upstreamRetries)
      const timeout: Record<string, number> = {}
      if (form.upstreamTimeout.connect) timeout.connect = Number(form.upstreamTimeout.connect)
      if (form.upstreamTimeout.send) timeout.send = Number(form.upstreamTimeout.send)
      if (form.upstreamTimeout.read) timeout.read = Number(form.upstreamTimeout.read)
      if (Object.keys(timeout).length > 0) upstream.timeout = timeout
      payload.upstream = upstream
    }
  }

  if (form.service_id) payload.service_id = form.service_id

  if (form.plugins.trim()) {
    try { payload.plugins = JSON.parse(form.plugins) } catch { /* skip */ }
  }

  return payload
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-apple-micro pt-4">
      {children}
    </p>
  )
}

const selectClass = 'flex h-10 w-full rounded-lg bg-[#fafafc] dark:bg-[#2a2a2d] ' +
  'border border-foreground/[0.06] dark:border-white/[0.08] px-3.5 py-2 text-[14px] text-foreground ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent ' +
  'transition-colors duration-150 appearance-none cursor-pointer'

/* Apple-inspired toggle chip — used for methods, LB, status */
function ToggleChip({
  active,
  onClick,
  children,
  variant = 'default',
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  variant?: 'default' | 'success' | 'muted'
}) {
  const activeClass =
    variant === 'success' ? 'bg-[#30d158]/15 text-[#248a3d] dark:text-[#30d158] border-[#30d158]/30'
    : variant === 'muted' ? 'bg-foreground/10 text-foreground/70 border-foreground/15'
    : 'bg-primary text-primary-foreground border-primary'
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-md border text-[12px] font-medium transition-colors duration-150',
        active
          ? activeClass
          : 'bg-transparent text-foreground/60 border-foreground/10 hover:bg-foreground/5'
      )}
    >
      {children}
    </button>
  )
}

function RouteForm({ initial, onSave, onClose }: { initial?: any; onSave: (id: string, data: any) => void; onClose: () => void }) {
  const [form, setForm] = useState<RouteFormState>(() => initForm(initial))
  const [pluginError, setPluginError] = useState('')
  const isEdit = !!initial

  const { data: upstreamsData } = useQuery({ queryKey: ['upstreams'], queryFn: () => upstreamsApi.list() })
  const { data: servicesData } = useQuery({ queryKey: ['services'], queryFn: () => servicesApi.list() })
  const upstreamItems = parseApisixList(upstreamsData)
  const serviceItems = parseApisixList(servicesData)

  const set = (field: keyof RouteFormState, value: any) =>
    setForm(f => ({ ...f, [field]: value }))

  const toggleMethod = (m: string) =>
    set('methods', form.methods.includes(m) ? form.methods.filter(x => x !== m) : [...form.methods, m])

  const setNode = (idx: number, field: keyof UpstreamNode, value: string) =>
    setForm(f => ({
      ...f,
      upstreamNodes: f.upstreamNodes.map((n, i) => i === idx ? { ...n, [field]: value } : n),
    }))

  const addNode = () =>
    setForm(f => ({ ...f, upstreamNodes: [...f.upstreamNodes, { host: '', port: '80', weight: '1' }] }))

  const removeNode = (idx: number) =>
    setForm(f => ({ ...f, upstreamNodes: f.upstreamNodes.filter((_, i) => i !== idx) }))

  const setTimeout = (field: string, value: string) =>
    setForm(f => ({ ...f, upstreamTimeout: { ...f.upstreamTimeout, [field]: value } }))

  const handleSave = () => {
    if (form.plugins.trim()) {
      try { JSON.parse(form.plugins); setPluginError('') }
      catch { setPluginError('插件 JSON 格式错误'); return }
    }
    onSave(form.id, buildPayload(form))
  }

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <SectionTitle>基本信息</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>路由 ID</Label>
          <Input
            value={form.id}
            onChange={e => set('id', e.target.value)}
            placeholder="留空则自动生成"
            disabled={isEdit}
          />
        </div>
        <div className="space-y-1.5">
          <Label>名称</Label>
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="my-route" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>描述</Label>
        <Input value={form.desc} onChange={e => set('desc', e.target.value)} placeholder="路由描述（可选）" />
      </div>

      <SectionTitle>匹配规则</SectionTitle>
      <div className="space-y-1.5">
        <Label>URI</Label>
        <textarea
          value={form.uri}
          onChange={e => set('uri', e.target.value)}
          rows={form.uri.split('\n').length > 1 ? 3 : 1}
          placeholder="/api/v1/users"
          className="flex w-full rounded-lg bg-[#fafafc] dark:bg-[#2a2a2d] border border-foreground/[0.06] dark:border-white/[0.08] px-3.5 py-2 text-[14px] font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent transition-colors duration-150 resize-none"
        />
        <p className="text-[11px] text-muted-foreground tracking-apple-micro">多个路径换行分隔，支持通配符 /api/*</p>
      </div>
      <div className="space-y-1.5">
        <Label>HTTP 方法</Label>
        <div className="flex flex-wrap gap-1.5">
          {ALL_METHODS.map(m => (
            <ToggleChip key={m} active={form.methods.includes(m)} onClick={() => toggleMethod(m)}>
              {m}
            </ToggleChip>
          ))}
        </div>
        {form.methods.length === 0 && (
          <p className="text-[11px] text-muted-foreground">未选择时 APISIX 默认允许所有方法</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label>Host</Label>
        <Input value={form.host} onChange={e => set('host', e.target.value)} placeholder="example.com, *.example.com" />
        <p className="text-[11px] text-muted-foreground tracking-apple-micro">多个 Host 逗号分隔</p>
      </div>

      <SectionTitle>上游配置</SectionTitle>
      <div className="flex gap-2">
        {([
          { label: '引用已有上游', value: 'ref' as const },
          { label: '内联配置', value: 'inline' as const },
        ]).map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => set('upstreamMode', opt.value)}
            className={cn(
              'flex-1 h-10 rounded-md text-[14px] font-medium transition-colors duration-150 border',
              form.upstreamMode === opt.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-transparent text-foreground/70 border-foreground/10 hover:bg-foreground/5'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {form.upstreamMode === 'ref' ? (
        <div className="space-y-1.5">
          <Label>上游</Label>
          <select
            value={form.upstream_id}
            onChange={e => set('upstream_id', e.target.value)}
            className={selectClass}
          >
            <option value="">不指定</option>
            {upstreamItems.map((item: any) => {
              const id = item.key?.split('/').pop() || item.value?.id
              const name = item.value?.name || id
              return <option key={id} value={id}>{name}（{id}）</option>
            })}
          </select>
        </div>
      ) : (
        <div className="space-y-3 rounded-lg p-4 bg-[#fafafc] dark:bg-[#2a2a2d] border border-foreground/[0.06] dark:border-white/[0.08]">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>负载均衡</Label>
              <div className="flex flex-wrap gap-1.5">
                {LB_TYPES.map(t => (
                  <ToggleChip key={t} active={form.upstreamType === t} onClick={() => set('upstreamType', t)}>
                    {t}
                  </ToggleChip>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>协议</Label>
              <div className="flex flex-wrap gap-1.5">
                {UPSTREAM_SCHEMES.map(s => (
                  <ToggleChip key={s} active={form.upstreamScheme === s} onClick={() => set('upstreamScheme', s)}>
                    {s}
                  </ToggleChip>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>目标节点</Label>
            <div className="space-y-2">
              {form.upstreamNodes.map((node, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input value={node.host} onChange={e => setNode(idx, 'host', e.target.value)} placeholder="主机地址" className="flex-[3]" />
                  <Input value={node.port} onChange={e => setNode(idx, 'port', e.target.value)} placeholder="端口" className="flex-1" type="number" />
                  <Input value={node.weight} onChange={e => setNode(idx, 'weight', e.target.value)} placeholder="权重" className="flex-1" type="number" />
                  {form.upstreamNodes.length > 1 && (
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removeNode(idx)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button variant="secondary" size="sm" onClick={addNode} className="mt-1">
              <Plus className="h-3.5 w-3.5 mr-1" />添加节点
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="space-y-1.5">
              <Label>连接超时(s)</Label>
              <Input value={form.upstreamTimeout.connect} onChange={e => setTimeout('connect', e.target.value)} placeholder="60" type="number" />
            </div>
            <div className="space-y-1.5">
              <Label>发送超时(s)</Label>
              <Input value={form.upstreamTimeout.send} onChange={e => setTimeout('send', e.target.value)} placeholder="60" type="number" />
            </div>
            <div className="space-y-1.5">
              <Label>读取超时(s)</Label>
              <Input value={form.upstreamTimeout.read} onChange={e => setTimeout('read', e.target.value)} placeholder="60" type="number" />
            </div>
            <div className="space-y-1.5">
              <Label>重试次数</Label>
              <Input value={form.upstreamRetries} onChange={e => set('upstreamRetries', e.target.value)} placeholder="1" type="number" />
            </div>
          </div>
        </div>
      )}

      <SectionTitle>绑定服务</SectionTitle>
      <div className="space-y-1.5">
        <Label>服务</Label>
        <select
          value={form.service_id}
          onChange={e => set('service_id', e.target.value)}
          className={selectClass}
        >
          <option value="">不指定</option>
          {serviceItems.map((item: any) => {
            const id = item.key?.split('/').pop() || item.value?.id
            const name = item.value?.name || id
            return <option key={id} value={id}>{name}（{id}）</option>
          })}
        </select>
      </div>

      <SectionTitle>高级设置</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>优先级</Label>
          <Input type="number" value={form.priority} onChange={e => set('priority', e.target.value)} placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label>状态</Label>
          <div className="flex gap-2">
            {[{ label: '启用', value: 1 }, { label: '禁用', value: 0 }].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('status', opt.value)}
                className={cn(
                  'flex-1 h-10 rounded-md text-[14px] font-medium transition-colors duration-150 border',
                  form.status === opt.value
                    ? opt.value === 1
                      ? 'bg-[#30d158]/15 text-[#248a3d] dark:text-[#30d158] border-[#30d158]/30'
                      : 'bg-foreground/10 text-foreground/70 border-foreground/15'
                    : 'bg-transparent text-foreground/60 border-foreground/10 hover:bg-foreground/5'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>插件配置</Label>
        <Textarea
          value={form.plugins}
          onChange={e => { set('plugins', e.target.value); setPluginError('') }}
          className="font-mono text-[12px] min-h-[100px] resize-none"
          placeholder='{ "limit-count": { "count": 100, "time_window": 60 } }'
        />
        {pluginError && <p className="text-[11px] text-destructive">{pluginError}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>取消</Button>
        <Button onClick={handleSave}>保存</Button>
      </div>
    </div>
  )
}

interface RouteItem {
  key: string
  value: {
    id: string
    name?: string
    uri?: string
    uris?: string[]
    methods?: string[]
    host?: string
    hosts?: string[]
    status?: number
    upstream_id?: string
    service_id?: string
    upstream?: {
      type?: string
      scheme?: string
      nodes?: any
    }
  }
}

function summarizeNodes(nodes: any): string {
  if (!nodes) return ''
  if (Array.isArray(nodes)) {
    if (nodes.length === 1) {
      const n = nodes[0]
      return `${n.host}:${n.port}`
    }
    if (nodes.length > 1) return `${nodes.length} 个节点`
    return ''
  }
  if (typeof nodes === 'object') {
    const keys = Object.keys(nodes)
    if (keys.length === 1) return keys[0]
    if (keys.length > 1) return `${keys.length} 个节点`
  }
  return ''
}

function UpstreamCell({
  value,
  upstreamMap,
  serviceMap,
}: {
  value: RouteItem['value']
  upstreamMap: Record<string, string>
  serviceMap: Record<string, string>
}) {
  const inline = value?.upstream
  if (inline && (inline.nodes || inline.type)) {
    const type = inline.type || 'roundrobin'
    const summary = summarizeNodes(inline.nodes)
    return (
      <div className="flex items-center gap-2 min-w-0">
        <Badge variant="outline" className="font-mono shrink-0">{type}</Badge>
        {summary && (
          <span className="text-[12px] text-foreground/70 font-mono truncate" title={summary}>
            {summary}
          </span>
        )}
      </div>
    )
  }
  if (value?.upstream_id) {
    const name = upstreamMap[value.upstream_id] || value.upstream_id
    return (
      <div className="flex items-center gap-1.5 min-w-0" title={`上游 ID: ${value.upstream_id}`}>
        <Server className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-[13px] text-foreground/80 truncate">{name}</span>
      </div>
    )
  }
  if (value?.service_id) {
    const name = serviceMap[value.service_id] || value.service_id
    return (
      <div className="flex items-center gap-1.5 min-w-0" title={`继承自服务: ${value.service_id}`}>
        <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-[13px] text-foreground/70 truncate">{name}</span>
      </div>
    )
  }
  return <span className="text-muted-foreground text-[13px]">-</span>
}

export function RoutesPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<RouteItem | null>(null)
  const [page, setPage] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['routes', page],
    queryFn: () => routesApi.list(page),
  })
  const items: RouteItem[] = parseApisixList(data)
  const totalPages: number = data?.totalPages || 0
  const total: number = data?.total || 0

  /* Lookup maps so referenced upstreams/services show their names, not just IDs */
  const { data: upstreamsData } = useQuery({ queryKey: ['upstreams'], queryFn: () => upstreamsApi.list() })
  const { data: servicesData } = useQuery({ queryKey: ['services'], queryFn: () => servicesApi.list() })
  const upstreamMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const item of parseApisixList(upstreamsData) as any[]) {
      const id = item.key?.split('/').pop() || item.value?.id
      if (id) map[id] = item.value?.name || id
    }
    return map
  }, [upstreamsData])
  const serviceMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const item of parseApisixList(servicesData) as any[]) {
      const id = item.key?.split('/').pop() || item.value?.id
      if (id) map[id] = item.value?.name || id
    }
    return map
  }, [servicesData])

  const saveMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      id ? routesApi.update(id, body) : routesApi.create(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['routes'] }); setOpen(false); setEditing(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => routesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routes'] }),
  })

  const handleSave = (id: string, body: any) => {
    const routeId = id || editing?.key?.split('/').pop() || ''
    saveMutation.mutate({ id: routeId, body })
  }

  return (
    <div>
      <PageHeader
        title="路由管理"
        description="管理 APISIX 路由规则"
        action={
          <Button onClick={() => { setEditing(null); setOpen(true) }}>
            <Plus className="h-4 w-4 mr-1" />新建路由
          </Button>
        }
      />
      <div className="px-10 pb-10">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 pl-6">#</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>主机名</TableHead>
                  <TableHead>上游</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right pr-6">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">加载中…</TableCell>
                  </TableRow>
                )}
                {items.map((item, idx) => {
                  const id = item.key?.split('/').pop() || item.value?.id
                  return (
                    <TableRow key={id}>
                      <TableCell className="text-muted-foreground pl-6">{page * 10 + idx + 1}</TableCell>
                      <TableCell>
                        {item.value?.name
                          ? <span className="font-medium text-foreground">{item.value.name}</span>
                          : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-foreground/70">
                        {item.value?.host || (item.value?.hosts || []).join(', ') || '-'}
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        <UpstreamCell value={item.value} upstreamMap={upstreamMap} serviceMap={serviceMap} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.value?.status === 1 ? 'success' : 'secondary'}>
                          {item.value?.status === 1 ? '启用' : '禁用'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(item); setOpen(true) }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setDeleteTarget({ id, name: item.value?.name || id }); setDeleteConfirmName('') }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-[13px] text-muted-foreground tracking-apple-caption">共 {total} 条</span>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑路由' : '新建路由'}</DialogTitle>
          </DialogHeader>
          <RouteForm initial={editing} onSave={handleSave} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除路由</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-[14px] text-muted-foreground tracking-apple-caption">
              此操作不可撤销。请输入路由名称 <span className="font-semibold text-foreground">{deleteTarget?.name}</span> 以确认删除。
            </p>
            <Input
              value={deleteConfirmName}
              onChange={e => setDeleteConfirmName(e.target.value)}
              placeholder={deleteTarget?.name}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmName !== deleteTarget?.name}
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget.id)
                  setDeleteTarget(null)
                }
              }}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
