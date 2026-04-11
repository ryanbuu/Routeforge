import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { upstreamsApi } from '@/api/resources'
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
      {/* 基本信息 */}
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

      {/* 负载均衡 & 协议 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>负载均衡</Label>
          <div className="flex flex-wrap gap-1.5">
            {LB_TYPES.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => set('type', t)}
                className={cn(
                  'px-2.5 py-1 rounded-lg border text-xs font-medium transition-all duration-200',
                  form.type === t
                    ? 'bg-primary/15 text-primary border-primary/25 shadow-sm'
                    : 'bg-white/30 dark:bg-white/8 text-muted-foreground border-white/30 dark:border-white/10 hover:bg-white/50 dark:hover:bg-white/12'
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
            {SCHEMES.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => set('scheme', s)}
                className={cn(
                  'px-2.5 py-1 rounded-lg border text-xs font-medium transition-all duration-200',
                  form.scheme === s
                    ? 'bg-primary/15 text-primary border-primary/25 shadow-sm'
                    : 'bg-white/30 dark:bg-white/8 text-muted-foreground border-white/30 dark:border-white/10 hover:bg-white/50 dark:hover:bg-white/12'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* chash 配置 */}
      {form.type === 'chash' && (
        <div className="grid grid-cols-2 gap-3 rounded-2xl p-3 glass-inset">
          <div className="space-y-1.5">
            <Label className="text-xs">Hash On</Label>
            <div className="flex flex-wrap gap-1.5">
              {HASH_ON_OPTIONS.map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => set('hashOn', h)}
                  className={cn(
                    'px-2 py-0.5 rounded-lg border text-[11px] font-medium transition-all duration-200',
                    form.hashOn === h
                      ? 'bg-primary/15 text-primary border-primary/25 shadow-sm'
                      : 'bg-white/30 dark:bg-white/8 text-muted-foreground border-white/30 dark:border-white/10 hover:bg-white/50 dark:hover:bg-white/12'
                  )}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Hash Key</Label>
            <Input value={form.hashKey} onChange={e => set('hashKey', e.target.value)} placeholder="e.g. remote_addr" />
          </div>
        </div>
      )}

      {/* 目标节点 */}
      <div className="space-y-1.5">
        <Label>目标节点</Label>
        <div className="space-y-2">
          {form.nodes.map((node, idx) => (
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
              {form.nodes.length > 1 && (
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
            {form.nodes.length > 1 && <span className="w-9" />}
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
          <Input value={form.timeout.connect} onChange={e => setTimeout('connect', e.target.value)} placeholder="60" type="number" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">发送超时(s)</Label>
          <Input value={form.timeout.send} onChange={e => setTimeout('send', e.target.value)} placeholder="60" type="number" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">读取超时(s)</Label>
          <Input value={form.timeout.read} onChange={e => setTimeout('read', e.target.value)} placeholder="60" type="number" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">重试次数</Label>
          <Input value={form.retries} onChange={e => set('retries', e.target.value)} placeholder="1" type="number" />
        </div>
      </div>

      {/* 健康检查 (高级 JSON) */}
      <div className="space-y-1.5">
        <Label>健康检查 (JSON, 可选)</Label>
        <Textarea
          value={form.checks}
          onChange={e => set('checks', e.target.value)}
          className="font-mono text-xs min-h-[80px]"
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
        action={<Button size="sm" onClick={() => { setEditing(null); setOpen(true) }}><Plus className="h-4 w-4 mr-1" />新建上游</Button>}
      />
      <div className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>负载均衡类型</TableHead>
              <TableHead>协议</TableHead>
              <TableHead>节点数</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">加载中...</TableCell></TableRow>}
            {items.map((item: any) => {
              const id = item.key?.split('/').pop() || item.value?.id
              const v = item.value || {}
              const nodes = v.nodes || {}
              const nodeCount = Array.isArray(nodes) ? nodes.length : (typeof nodes === 'object' ? Object.keys(nodes).length : 0)
              return (
                <TableRow key={id}>
                  <TableCell className="font-mono text-xs">{id}</TableCell>
                  <TableCell>{v.name || '-'}</TableCell>
                  <TableCell><Badge variant="outline">{v.type || 'roundrobin'}</Badge></TableCell>
                  <TableCell><Badge variant="secondary">{v.scheme || 'http'}</Badge></TableCell>
                  <TableCell>{nodeCount}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(item); setOpen(true) }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setDeleteTarget({ id, name: v.name || id }); setDeleteConfirmName('') }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
            {!isLoading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">暂无上游</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? '编辑上游' : '新建上游'}</DialogTitle></DialogHeader>
          <UpstreamForm initial={editing} onSave={handleSave} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除上游</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
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
