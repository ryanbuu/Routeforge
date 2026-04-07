import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { routesApi, upstreamsApi, servicesApi } from '@/api/resources'
import { parseApisixList } from '@/api/client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react'

const ALL_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-50 text-blue-700 border-blue-200 data-[active=true]:bg-blue-600 data-[active=true]:text-white data-[active=true]:border-blue-600',
  POST: 'bg-green-50 text-green-700 border-green-200 data-[active=true]:bg-green-600 data-[active=true]:text-white data-[active=true]:border-green-600',
  PUT: 'bg-yellow-50 text-yellow-700 border-yellow-200 data-[active=true]:bg-yellow-500 data-[active=true]:text-white data-[active=true]:border-yellow-500',
  DELETE: 'bg-red-50 text-red-700 border-red-200 data-[active=true]:bg-red-600 data-[active=true]:text-white data-[active=true]:border-red-600',
  PATCH: 'bg-orange-50 text-orange-700 border-orange-200 data-[active=true]:bg-orange-500 data-[active=true]:text-white data-[active=true]:border-orange-500',
  HEAD: 'bg-purple-50 text-purple-700 border-purple-200 data-[active=true]:bg-purple-600 data-[active=true]:text-white data-[active=true]:border-purple-600',
  OPTIONS: 'bg-gray-50 text-gray-700 border-gray-200 data-[active=true]:bg-gray-600 data-[active=true]:text-white data-[active=true]:border-gray-600',
}

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
  // upstream
  upstreamMode: 'ref' | 'inline'
  upstream_id: string
  upstreamType: string
  upstreamScheme: string
  upstreamNodes: UpstreamNode[]
  upstreamRetries: string
  upstreamTimeout: { connect: string; send: string; read: string }
  // service
  service_id: string
  // advanced
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

  // upstream
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
  return <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest pt-3">{children}</p>
}

const selectClass = `flex h-10 w-full rounded-xl border bg-white/40 backdrop-blur-sm px-3 py-2 text-sm
  ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30
  focus-visible:ring-offset-1 transition-shadow duration-200 appearance-none cursor-pointer`

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
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      {/* 基本信息 */}
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

      {/* 匹配规则 */}
      <SectionTitle>匹配规则</SectionTitle>
      <div className="space-y-1.5">
        <Label>
          URI
          <span className="ml-1 text-xs text-muted-foreground font-normal">多个路径换行分隔，支持通配符 <code className="bg-muted px-1 rounded">/api/*</code></span>
        </Label>
        <textarea
          value={form.uri}
          onChange={e => set('uri', e.target.value)}
          rows={form.uri.split('\n').length > 1 ? 3 : 1}
          placeholder="/api/v1/users"
          className="flex w-full rounded-xl bg-white/40 backdrop-blur-sm border border-white/40 px-3 py-1.5 text-sm shadow-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:bg-white/60 font-mono resize-none transition-all duration-200"
        />
      </div>
      <div className="space-y-1.5">
        <Label>HTTP 方法</Label>
        <div className="flex flex-wrap gap-1.5">
          {ALL_METHODS.map(m => (
            <button
              key={m}
              type="button"
              data-active={form.methods.includes(m)}
              onClick={() => toggleMethod(m)}
              className={cn(
                'px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all duration-200',
                METHOD_COLORS[m]
              )}
            >
              {m}
            </button>
          ))}
        </div>
        {form.methods.length === 0 && (
          <p className="text-xs text-muted-foreground">未选择时 APISIX 默认允许所有方法</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label>
          Host
          <span className="ml-1 text-xs text-muted-foreground font-normal">多个 Host 逗号分隔</span>
        </Label>
        <Input value={form.host} onChange={e => set('host', e.target.value)} placeholder="example.com, *.example.com" />
      </div>

      {/* 上游配置 */}
      <SectionTitle>上游配置</SectionTitle>
      <div className="space-y-1.5">
        <Label>配置方式</Label>
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
                'flex-1 py-1.5 rounded-xl border text-sm font-medium transition-all duration-200',
                form.upstreamMode === opt.value
                  ? 'bg-primary/15 text-primary border-primary/25 shadow-sm'
                  : 'bg-white/30 text-muted-foreground border-white/30 hover:bg-white/50'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
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
        <div className="space-y-3 rounded-2xl p-3 glass-inset">
          {/* 负载均衡 & 协议 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>负载均衡</Label>
              <div className="flex flex-wrap gap-1.5">
                {LB_TYPES.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set('upstreamType', t)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg border text-xs font-medium transition-all duration-200',
                      form.upstreamType === t
                        ? 'bg-primary/15 text-primary border-primary/25 shadow-sm'
                        : 'bg-white/30 text-muted-foreground border-white/30 hover:bg-white/50'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>协议</Label>
              <div className="flex flex-wrap gap-1.5">
                {UPSTREAM_SCHEMES.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set('upstreamScheme', s)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg border text-xs font-medium transition-all duration-200',
                      form.upstreamScheme === s
                        ? 'bg-primary/15 text-primary border-primary/25 shadow-sm'
                        : 'bg-white/30 text-muted-foreground border-white/30 hover:bg-white/50'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 节点列表 */}
          <div className="space-y-1.5">
            <Label>目标节点</Label>
            <div className="space-y-2">
              {form.upstreamNodes.map((node, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    value={node.host}
                    onChange={e => setNode(idx, 'host', e.target.value)}
                    placeholder="主机地址"
                    className="flex-[3]"
                  />
                  <Input
                    value={node.port}
                    onChange={e => setNode(idx, 'port', e.target.value)}
                    placeholder="端口"
                    className="flex-1"
                    type="number"
                  />
                  <Input
                    value={node.weight}
                    onChange={e => setNode(idx, 'weight', e.target.value)}
                    placeholder="权重"
                    className="flex-1"
                    type="number"
                  />
                  {form.upstreamNodes.length > 1 && (
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removeNode(idx)}>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              ))}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex-[3]">主机</span>
                <span className="flex-1">端口</span>
                <span className="flex-1">权重</span>
                {form.upstreamNodes.length > 1 && <span className="w-9" />}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={addNode} className="mt-1">
              <Plus className="h-3 w-3 mr-1" />添加节点
            </Button>
          </div>

          {/* 超时 & 重试 */}
          <div className="grid grid-cols-4 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">连接超时(s)</Label>
              <Input value={form.upstreamTimeout.connect} onChange={e => setTimeout('connect', e.target.value)} placeholder="60" type="number" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">发送超时(s)</Label>
              <Input value={form.upstreamTimeout.send} onChange={e => setTimeout('send', e.target.value)} placeholder="60" type="number" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">读取超时(s)</Label>
              <Input value={form.upstreamTimeout.read} onChange={e => setTimeout('read', e.target.value)} placeholder="60" type="number" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">重试次数</Label>
              <Input value={form.upstreamRetries} onChange={e => set('upstreamRetries', e.target.value)} placeholder="1" type="number" />
            </div>
          </div>
        </div>
      )}

      {/* 绑定服务 */}
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

      {/* 高级设置 */}
      <SectionTitle>高级设置</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>优先级</Label>
          <Input
            type="number"
            value={form.priority}
            onChange={e => set('priority', e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <Label>状态</Label>
          <div className="flex gap-2 pt-0.5">
            {[{ label: '启用', value: 1 }, { label: '禁用', value: 0 }].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('status', opt.value)}
                className={cn(
                  'flex-1 py-1.5 rounded-xl border text-sm font-medium transition-all duration-200',
                  form.status === opt.value
                    ? opt.value === 1
                      ? 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30 shadow-sm'
                      : 'bg-gray-500/15 text-gray-600 border-gray-500/20 shadow-sm'
                    : 'bg-white/30 text-muted-foreground border-white/30 hover:bg-white/50'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>
          插件配置
          <span className="ml-1 text-xs text-muted-foreground font-normal">JSON 格式（可选）</span>
        </Label>
        <Textarea
          value={form.plugins}
          onChange={e => { set('plugins', e.target.value); setPluginError('') }}
          className="font-mono text-xs min-h-[80px] resize-none"
          placeholder='{ "limit-count": { "count": 100, "time_window": 60 } }'
        />
        {pluginError && <p className="text-xs text-destructive">{pluginError}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
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
  }
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
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true) }}>
            <Plus className="h-4 w-4 mr-1" />新建路由
          </Button>
        }
      />
      <div className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>主机名</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">加载中...</TableCell>
              </TableRow>
            )}
            {items.map((item, idx) => {
              const id = item.key?.split('/').pop() || item.value?.id
              return (
                <TableRow key={id}>
                  <TableCell className="text-muted-foreground text-xs">{page * 10 + idx + 1}</TableCell>
                  <TableCell>
                    {item.value?.name
                      ? <span className="inline-block bg-white/50 border border-white/30 rounded-md px-2 py-0.5 text-sm font-semibold text-foreground/80">{item.value.name}</span>
                      : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-xs">
                    {item.value?.host || (item.value?.hosts || []).join(', ') || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.value?.status === 1 ? 'success' : 'secondary'}>
                      {item.value?.status === 1 ? '启用' : '禁用'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(item); setOpen(true) }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setDeleteTarget({ id, name: item.value?.name || id }); setDeleteConfirmName('') }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-muted-foreground">共 {total} 条</span>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑路由' : '新建路由'}</DialogTitle>
          </DialogHeader>
          <RouteForm initial={editing} onSave={handleSave} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <Dialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除路由</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
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
