import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { servicesApi } from '@/api/resources'
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
import { Plus, Pencil, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react'

const LB_TYPES = ['roundrobin', 'chash', 'ewma', 'least_conn'] as const
const UPSTREAM_SCHEMES = ['http', 'https', 'grpc', 'grpcs'] as const

interface UpstreamNode {
  host: string
  port: string
  weight: string
}

interface ServiceFormState {
  id: string
  name: string
  desc: string
  upstreamMode: 'id' | 'inline'
  upstream_id: string
  upstreamType: string
  upstreamScheme: string
  upstreamNodes: UpstreamNode[]
  upstreamRetries: string
  upstreamTimeout: { connect: string; send: string; read: string }
  hosts: string
  enable_websocket: boolean
  labels: string
  plugins: string
}

function initForm(initial?: any): ServiceFormState {
  const v = initial?.value || {}
  const up = v.upstream || {}
  const hasInline = v.upstream && (up.nodes || up.type)

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
    upstreamMode: hasInline ? 'inline' : 'id',
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
    hosts: (v.hosts || []).join(', ') || '',
    enable_websocket: v.enable_websocket ?? false,
    labels: v.labels ? Object.entries(v.labels).map(([k, val]) => `${k}=${val}`).join(', ') : '',
    plugins: v.plugins && Object.keys(v.plugins).length > 0
      ? JSON.stringify(v.plugins, null, 2)
      : '',
  }
}

function buildPayload(form: ServiceFormState) {
  const hostList = form.hosts.split(',').map(s => s.trim()).filter(Boolean)
  const payload: Record<string, any> = {
    name: form.name || undefined,
    desc: form.desc || undefined,
    enable_websocket: form.enable_websocket,
  }

  if (form.upstreamMode === 'id') {
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

  if (hostList.length > 0) payload.hosts = hostList
  if (form.labels) {
    const labels: Record<string, string> = {}
    form.labels.split(',').map(s => s.trim()).filter(Boolean).forEach(pair => {
      const [k, ...rest] = pair.split('=')
      if (k) labels[k.trim()] = rest.join('=').trim()
    })
    if (Object.keys(labels).length > 0) payload.labels = labels
  }
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

function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-md border text-[12px] font-medium transition-colors duration-150',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-transparent text-foreground/60 border-foreground/10 hover:bg-foreground/5'
      )}
    >
      {children}
    </button>
  )
}

function ServiceForm({ initial, onSave, onClose }: { initial?: any; onSave: (id: string, data: any) => void; onClose: () => void }) {
  const [form, setForm] = useState<ServiceFormState>(() => initForm(initial))
  const [pluginError, setPluginError] = useState('')
  const isEdit = !!initial

  const set = (field: keyof ServiceFormState, value: any) =>
    setForm(f => ({ ...f, [field]: value }))

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
          <Label>服务 ID</Label>
          <Input value={form.id} onChange={e => set('id', e.target.value)} placeholder="留空则自动生成" disabled={isEdit} />
        </div>
        <div className="space-y-1.5">
          <Label>名称</Label>
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="my-service" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>描述</Label>
        <Input value={form.desc} onChange={e => set('desc', e.target.value)} placeholder="服务描述（可选）" />
      </div>

      <SectionTitle>上游配置</SectionTitle>
      <div className="flex gap-2">
        {([
          { label: '引用已有上游', value: 'id' as const },
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

      {form.upstreamMode === 'id' ? (
        <div className="space-y-1.5">
          <Label>Upstream ID</Label>
          <Input value={form.upstream_id} onChange={e => set('upstream_id', e.target.value)} placeholder="填写上游 ID" />
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

      <SectionTitle>其他配置</SectionTitle>
      <div className="space-y-1.5">
        <Label>Hosts</Label>
        <Input value={form.hosts} onChange={e => set('hosts', e.target.value)} placeholder="example.com, *.example.com" />
        <p className="text-[11px] text-muted-foreground tracking-apple-micro">多个 Host 逗号分隔</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>标签</Label>
          <Input value={form.labels} onChange={e => set('labels', e.target.value)} placeholder="env=prod, team=backend" />
          <p className="text-[11px] text-muted-foreground tracking-apple-micro">key=value, 逗号分隔</p>
        </div>
        <div className="space-y-1.5">
          <Label>WebSocket</Label>
          <div className="flex gap-2">
            {[{ label: '启用', value: true }, { label: '禁用', value: false }].map(opt => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => set('enable_websocket', opt.value)}
                className={cn(
                  'flex-1 h-10 rounded-md text-[14px] font-medium transition-colors duration-150 border',
                  form.enable_websocket === opt.value
                    ? opt.value
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

function getUpstreamSummary(value: any): { label: string; nodes: string } {
  if (value?.upstream_id) {
    return { label: `引用: ${value.upstream_id}`, nodes: '' }
  }
  const up = value?.upstream
  if (!up) return { label: '-', nodes: '' }

  const type = up.type || 'roundrobin'
  let nodeCount = 0
  let nodeList: string[] = []
  if (Array.isArray(up.nodes)) {
    nodeCount = up.nodes.length
    nodeList = up.nodes.slice(0, 3).map((n: any) => `${n.host}:${n.port}`)
  } else if (up.nodes && typeof up.nodes === 'object') {
    const entries = Object.entries(up.nodes)
    nodeCount = entries.length
    nodeList = entries.slice(0, 3).map(([addr]) => addr)
  }
  return {
    label: `${type} / ${up.scheme || 'http'}`,
    nodes: nodeCount > 0 ? (nodeList.join(', ') + (nodeCount > 3 ? ` +${nodeCount - 3}` : '')) : '-',
  }
}

interface ServiceItem {
  key: string
  value: {
    id: string
    name?: string
    desc?: string
    upstream_id?: string
    upstream?: any
    hosts?: string[]
    enable_websocket?: boolean
    labels?: Record<string, string>
  }
}

export function ServicesPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ServiceItem | null>(null)
  const [page, setPage] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['services', page],
    queryFn: () => servicesApi.list(page),
  })
  const items: ServiceItem[] = parseApisixList(data)
  const totalPages: number = data?.totalPages || 0
  const total: number = data?.total || 0

  const saveMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      id ? servicesApi.update(id, body) : servicesApi.create(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['services'] }); setOpen(false); setEditing(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => servicesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  })

  const handleSave = (id: string, body: any) => {
    const serviceId = id || editing?.key?.split('/').pop() || ''
    saveMutation.mutate({ id: serviceId, body })
  }

  return (
    <div>
      <PageHeader
        title="服务管理"
        description="管理 APISIX 服务抽象层"
        action={
          <Button onClick={() => { setEditing(null); setOpen(true) }}>
            <Plus className="h-4 w-4 mr-1" />新建服务
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
                  <TableHead>上游类型</TableHead>
                  <TableHead>目标节点</TableHead>
                  <TableHead>Hosts</TableHead>
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
                  const upSummary = getUpstreamSummary(item.value)
                  return (
                    <TableRow key={id}>
                      <TableCell className="text-muted-foreground pl-6">{page * 10 + idx + 1}</TableCell>
                      <TableCell>
                        {item.value?.name
                          ? <span className="font-medium text-foreground">{item.value.name}</span>
                          : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{upSummary.label}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[12px] text-foreground/70 max-w-[220px] truncate">
                        {upSummary.nodes || '-'}
                      </TableCell>
                      <TableCell>
                        {item.value?.hosts?.length
                          ? <div className="flex gap-1 flex-wrap">
                              {item.value.hosts.map(h => (
                                <Badge key={h} variant="outline">{h}</Badge>
                              ))}
                            </div>
                          : <span className="text-muted-foreground">-</span>}
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
            <DialogTitle>{editing ? '编辑服务' : '新建服务'}</DialogTitle>
          </DialogHeader>
          <ServiceForm initial={editing} onSave={handleSave} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除服务</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-[14px] text-muted-foreground tracking-apple-caption">
              此操作不可撤销。请输入服务名称 <span className="font-semibold text-foreground">{deleteTarget?.name}</span> 以确认删除。
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
