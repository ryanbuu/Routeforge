import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { upstreamsApi } from '@/api/resources'
import { parseApisixList } from '@/api/client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Pencil, Trash2 } from 'lucide-react'

function UpstreamForm({ initial, onSave, onClose }: { initial?: any; onSave: (id: string, data: any) => void; onClose: () => void }) {
  const [id, setId] = useState(initial?.key?.split('/').pop() || '')
  const [json, setJson] = useState(initial ? JSON.stringify(initial.value, null, 2) : JSON.stringify({
    name: '',
    type: 'roundrobin',
    nodes: { 'host:port': 1 }
  }, null, 2))
  const [error, setError] = useState('')

  const handleSave = () => {
    try {
      const parsed = JSON.parse(json)
      setError('')
      onSave(id, parsed)
    } catch {
      setError('JSON 格式错误')
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>上游 ID</Label>
        <Input value={id} onChange={e => setId(e.target.value)} placeholder="留空则自动生成" disabled={!!initial} />
      </div>
      <div className="space-y-1.5">
        <Label>配置 (JSON)</Label>
        <Textarea value={json} onChange={e => setJson(e.target.value)} className="font-mono text-xs min-h-[200px]" />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>取消</Button>
        <Button onClick={handleSave}>保存</Button>
      </div>
    </div>
  )
}

export function UpstreamsPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)

  const { data, isLoading } = useQuery({ queryKey: ['upstreams'], queryFn: upstreamsApi.list })
  const items = parseApisixList(data)

  const saveMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      id ? upstreamsApi.update(id, body) : upstreamsApi.create(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['upstreams'] }); setOpen(false); setEditing(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => upstreamsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['upstreams'] }),
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
              <TableHead>节点数</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">加载中...</TableCell></TableRow>}
            {items.map((item: any) => {
              const id = item.key?.split('/').pop() || item.value?.id
              const nodes = item.value?.nodes || {}
              return (
                <TableRow key={id}>
                  <TableCell className="font-mono text-xs">{id}</TableCell>
                  <TableCell>{item.value?.name || '-'}</TableCell>
                  <TableCell><Badge variant="outline">{item.value?.type || 'roundrobin'}</Badge></TableCell>
                  <TableCell>{typeof nodes === 'object' ? Object.keys(nodes).length : '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(item); setOpen(true) }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? '编辑上游' : '新建上游'}</DialogTitle></DialogHeader>
          <UpstreamForm initial={editing} onSave={handleSave} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
