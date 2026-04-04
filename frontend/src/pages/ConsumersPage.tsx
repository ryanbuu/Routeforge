import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { consumersApi } from '@/api/resources'
import { parseApisixList } from '@/api/client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Pencil, Trash2 } from 'lucide-react'

function ConsumerForm({ initial, onSave, onClose }: { initial?: any; onSave: (username: string, data: any) => void; onClose: () => void }) {
  const [username, setUsername] = useState(initial?.value?.username || '')
  const [json, setJson] = useState(initial ? JSON.stringify(initial.value, null, 2) : JSON.stringify({
    username: '',
    plugins: { 'key-auth': { key: 'my-api-key' } }
  }, null, 2))
  const [error, setError] = useState('')

  const handleSave = () => {
    try { setError(''); onSave(username, JSON.parse(json)) } catch { setError('JSON 格式错误') }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5"><Label>用户名</Label><Input value={username} onChange={e => setUsername(e.target.value)} disabled={!!initial} /></div>
      <div className="space-y-1.5">
        <Label>配置 (JSON)</Label>
        <Textarea value={json} onChange={e => setJson(e.target.value)} className="font-mono text-xs min-h-[200px]" />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>取消</Button><Button onClick={handleSave}>保存</Button></div>
    </div>
  )
}

export function ConsumersPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)

  const { data, isLoading } = useQuery({ queryKey: ['consumers'], queryFn: consumersApi.list })
  const items = parseApisixList(data)

  const saveMutation = useMutation({
    mutationFn: ({ username, body }: { username: string; body: any }) => consumersApi.upsert(username, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['consumers'] }); setOpen(false); setEditing(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: (username: string) => consumersApi.remove(username),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consumers'] }),
  })

  return (
    <div>
      <PageHeader
        title="消费者管理"
        description="管理 API 消费者与认证"
        action={<Button size="sm" onClick={() => { setEditing(null); setOpen(true) }}><Plus className="h-4 w-4 mr-1" />新建消费者</Button>}
      />
      <div className="p-6">
        <Table>
          <TableHeader>
            <TableRow><TableHead>用户名</TableHead><TableHead>插件</TableHead><TableHead className="text-right">操作</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">加载中...</TableCell></TableRow>}
            {items.map((item: any) => {
              const username = item.value?.username || item.key?.split('/').pop()
              return (
                <TableRow key={username}>
                  <TableCell className="font-medium">{username}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{Object.keys(item.value?.plugins || {}).join(', ') || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(item); setOpen(true) }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(username)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? '编辑消费者' : '新建消费者'}</DialogTitle></DialogHeader>
          <ConsumerForm initial={editing} onSave={(username, body) => saveMutation.mutate({ username, body })} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
