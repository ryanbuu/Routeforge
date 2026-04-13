import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { upstreamsApi } from '@/api/resources'
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
import { Plus, Pencil, Trash2, X } from 'lucide-react'

const LB_TYPES = ['roundrobin', 'chash', 'ewma', 'least_conn']
const SCHEMES = ['http', 'https', 'grpc', 'grpcs']
const HASH_ON_OPTIONS = ['vars', 'header', 'cookie', 'consumer', 'vars_combinations']

interface UpstreamNode {
  host: string
  port: string
  weight: string
}

interface UpstreamFormState {
  id: string
  name: string
  desc: string
  type: string
  scheme: string
  hashOn: string
  hashKey: string
  nodes: UpstreamNode[]
  retries: string
  timeout: { connect: string; send: string; read: string }
  checks: string
}

function initForm(initial?: any): UpstreamFormState {
  const v = initial?.value || {}
  const timeout = v.timeout || {}

  let nodes: UpstreamNode[] = [{ host: '', port: '80', weight: '1' }]
  if (v.nodes) {
    if (Array.isArray(v.nodes)) {
      nodes = v.nodes.map((n: any) => ({
        host: n.host || '',
        port: String(n.port || 80),
        weight: String(n.weight || 1),
      }))
    } else {
      nodes = Object.entries(v.nodes).map(([addr, w]) => {
        const [host, port] = addr.split(':')
        return { host, port: port || '80', weight: String(w) }
      })
    }
    if (nodes.length === 0) nodes = [{ host: '', port: '80', weight: '1' }]
  }

  return {
    id: initial?.key?.split('/').pop() || '',
    name: v.name || '',
    desc: v.desc || '',
    type: v.type || 'roundrobin',
    scheme: v.scheme || 'http',
    hashOn: v.hash_on || 'vars',
    hashKey: v.key || '',
    nodes,
    retries: v.retries != null ? String(v.retries) : '',
    timeout: {
      connect: timeout.connect != null ? String(timeout.connect) : '',
      send: timeout.send != null ? String(timeout.send) : '',
      read: timeout.read != null ? String(timeout.read) : '',
    },
    checks: v.checks ? JSON.stringify(v.checks, null, 2) : '',
  }
}

function buildPayload(form: UpstreamFormState) {
  const payload: Record<string, any> = {
    name: form.name || undefined,
    desc: form.desc || undefined,
    type: form.type,
    scheme: form.scheme,
  }

  if (form.type === 'chash') {
    payload.hash_on = form.hashOn
    if (form.hashKey) payload.key = form.hashKey
  }

  const validNodes = form.nodes.filter(n => n.host.trim())
  if (validNodes.length > 0) {
    payload.nodes = validNodes.map(n => ({
      host: n.host.trim(),
      port: Number(n.port) || 80,
      weight: Number(n.weight) || 1,
    }))
  }

  if (form.retries !== '') payload.retries = Number(form.retries)

  const timeout: Record<string, number> = {}
  if (form.timeout.connect) timeout.connect = Number(form.timeout.connect)
  if (form.timeout.send) timeout.send = Number(form.timeout.send)
  if (form.timeout.read) timeout.read = Number(form.timeout.read)
  if (Object.keys(timeout).length > 0) payload.timeout = timeout

  if (form.checks.trim()) {
    try { payload.checks = JSON.parse(form.checks) } catch { /* skip */ }
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

function UpstreamForm({ initial, onSave, onClose }: { initial?: any; onSave: (id: string, data: any) => void; onClose: () => void }) {
  const [form, setForm] = useState<UpstreamFormState>(() => initForm(initial))

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }))
  const setNode = (idx: number, key: keyof UpstreamNode, value: string) =>
    setForm(f => ({ ...f, nodes: f.nodes.map((n, i) => i === idx ? { ...n, [key]: value } : n) }))
  const addNode = () => setForm(f => ({ ...f, nodes: [...f.nodes, { host: '', port: '80', weight: '1' }] }))
  const removeNode = (idx: number) => setForm(f => ({ ...f, nodes: f.nodes.filter((_, i) => i !== idx) }))
  const setTimeout = (key: string, value: string) => setForm(f => ({ ...f, timeout: { ...f.timeout, [key]: value } }))

  const handleSave = () => {
    onSave(form.id, buildPayload(form))
  }

  const canSave = form.nodes.some(n => n.host.trim())

  return (
    <div className="space-y-4 max-h-[70vh] overflow-auto pr-1">
      <SectionTitle>基本信息</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>上游 ID</Label>
          <Input value={form.id} onChange={e => set('id', e.target.value)} placeholder="留空则自动生成" disabled={!!initial} />
        </div>
        <div className="space-y-1.5">
          <Label>名称</Label>
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="upstream name" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>描述</Label>
        <Input value={form.desc} onChange={e => set('desc', e.target.value)} placeholder="可选描述" />
      </div>

      <SectionTitle>负载均衡</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>类型</Label>
          <div className="flex flex-wrap gap-1.5">
            {LB_TYPES.map(t => (
              <ToggleChip key={t} active={form.type === t} onClick={() => set('type', t)}>
                {t}
              </ToggleChip>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>协议</Label>
          <div className="flex flex-wrap gap-1.5">
            {SCHEMES.map(s => (
              <ToggleChip key={s} active={form.scheme === s} onClick={() => set('scheme', s)}>
                {s}
              </ToggleChip>
            ))}
          </div>
        </div>
      </div>

      {form.type === 'chash' && (
        <div className="grid grid-cols-2 gap-3 rounded-lg p-4 bg-[#fafafc] dark:bg-[#2a2a2d] border border-foreground/[0.06] dark:border-white/[0.08]">
          <div className="space-y-1.5">
            <Label>Hash On</Label>
            <div className="flex flex-wrap gap-1.5">
              {HASH_ON_OPTIONS.map(h => (
                <ToggleChip key={h} active={form.hashOn === h} onClick={() => set('hashOn', h)}>
                  {h}
                </ToggleChip>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Hash Key</Label>
            <Input value={form.hashKey} onChange={e => set('hashKey', e.target.value)} placeholder="e.g. remote_addr" />
          </div>
        </div>
      )}

      <SectionTitle>目标节点</SectionTitle>
      <div className="space-y-2">
        {form.nodes.map((node, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <Input value={node.host} onChange={e => setNode(idx, 'host', e.target.value)} placeholder="主机地址" className="flex-[3]" />
            <Input value={node.port} onChange={e => setNode(idx, 'port', e.target.value)} placeholder="端口" className="flex-1" type="number" />
            <Input value={node.weight} onChange={e => setNode(idx, 'weight', e.target.value)} placeholder="权重" className="flex-1" type="number" />
            {form.nodes.length > 1 && (
              <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removeNode(idx)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
      <Button variant="secondary" size="sm" onClick={addNode}>
        <Plus className="h-3.5 w-3.5 mr-1" />添加节点
      </Button>

      <SectionTitle>超时与重试</SectionTitle>
      <div className="grid grid-cols-4 gap-2">
        <div className="space-y-1.5">
          <Label>连接超时(s)</Label>
          <Input value={form.timeout.connect} onChange={e => setTimeout('connect', e.target.value)} placeholder="60" type="number" />
        </div>
        <div className="space-y-1.5">
          <Label>发送超时(s)</Label>
          <Input value={form.timeout.send} onChange={e => setTimeout('send', e.target.value)} placeholder="60" type="number" />
        </div>
        <div className="space-y-1.5">
          <Label>读取超时(s)</Label>
          <Input value={form.timeout.read} onChange={e => setTimeout('read', e.target.value)} placeholder="60" type="number" />
        </div>
        <div className="space-y-1.5">
          <Label>重试次数</Label>
          <Input value={form.retries} onChange={e => set('retries', e.target.value)} placeholder="1" type="number" />
        </div>
      </div>

      <SectionTitle>健康检查</SectionTitle>
      <div className="space-y-1.5">
        <Label>配置 (JSON, 可选)</Label>
        <Textarea
          value={form.checks}
          onChange={e => set('checks', e.target.value)}
          className="font-mono text-[12px] min-h-[80px] resize-none"
          placeholder='{"active":{"type":"http","http_path":"/health","healthy":{"interval":2}}}'
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>取消</Button>
        <Button onClick={handleSave} disabled={!canSave}>保存</Button>
      </div>
    </div>
  )
}

export function UpstreamsPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')

  const { data, isLoading } = useQuery({ queryKey: ['upstreams'], queryFn: upstreamsApi.list })
  const items = parseApisixList(data)

  const saveMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      id ? upstreamsApi.update(id, body) : upstreamsApi.create(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['upstreams'] }); setOpen(false); setEditing(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => upstreamsApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['upstreams'] }); setDeleteTarget(null) },
  })

  const handleSave = (id: string, body: any) => {
    saveMutation.mutate({ id: id || editing?.key?.split('/').pop() || '', body })
  }

  return (
    <div>
      <PageHeader
        title="上游管理"
        description="管理负载均衡上游节点"
        action={
          <Button onClick={() => { setEditing(null); setOpen(true) }}>
            <Plus className="h-4 w-4 mr-1" />新建上游
          </Button>
        }
      />
      <div className="px-10 pb-10">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">ID</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>负载均衡</TableHead>
                  <TableHead>协议</TableHead>
                  <TableHead>节点数</TableHead>
                  <TableHead className="text-right pr-6">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">加载中…</TableCell>
                  </TableRow>
                )}
                {items.map((item: any) => {
                  const id = item.key?.split('/').pop() || item.value?.id
                  const v = item.value || {}
                  const nodes = v.nodes || {}
                  const nodeCount = Array.isArray(nodes) ? nodes.length : (typeof nodes === 'object' ? Object.keys(nodes).length : 0)
                  return (
                    <TableRow key={id}>
                      <TableCell className="font-mono text-[12px] text-foreground/70 pl-6">{id}</TableCell>
                      <TableCell>
                        {v.name
                          ? <span className="font-medium text-foreground">{v.name}</span>
                          : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell><Badge variant="outline">{v.type || 'roundrobin'}</Badge></TableCell>
                      <TableCell><Badge variant="outline">{v.scheme || 'http'}</Badge></TableCell>
                      <TableCell className="text-foreground/70">{nodeCount}</TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(item); setOpen(true) }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setDeleteTarget({ id, name: v.name || id }); setDeleteConfirmName('') }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {!isLoading && items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">暂无上游</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? '编辑上游' : '新建上游'}</DialogTitle></DialogHeader>
          <UpstreamForm initial={editing} onSave={handleSave} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除上游</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-[14px] text-muted-foreground tracking-apple-caption">
              此操作不可撤销。请输入名称 <span className="font-semibold text-foreground">{deleteTarget?.name}</span> 以确认删除。
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
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
