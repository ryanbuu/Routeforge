import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pluginsApi } from '@/api/resources'
import { parseApisixList } from '@/api/client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Pencil } from 'lucide-react'

export function PluginsPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [ruleId, setRuleId] = useState('')
  const [json, setJson] = useState(JSON.stringify({ plugins: {} }, null, 2))
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string } | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState('')

  const { data: globalRules, isLoading } = useQuery({ queryKey: ['global-rules'], queryFn: pluginsApi.listGlobalRules })
  const rules = parseApisixList(globalRules)

  const saveMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => pluginsApi.putGlobalRule(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['global-rules'] }); closeDialog() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => pluginsApi.deleteGlobalRule(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['global-rules'] }); setDeleteTarget(null) },
  })

  const closeDialog = () => {
    setOpen(false)
    setEditing(null)
    setRuleId('')
    setJson(JSON.stringify({ plugins: {} }, null, 2))
    setError('')
  }

  const openCreate = () => {
    setEditing(null)
    setRuleId('')
    setJson(JSON.stringify({ plugins: {} }, null, 2))
    setError('')
    setOpen(true)
  }

  const openEdit = (item: any) => {
    const id = item.key?.split('/').pop() || item.value?.id
    setEditing(item)
    setRuleId(id)
    setJson(JSON.stringify(item.value || {}, null, 2))
    setError('')
    setOpen(true)
  }

  const handleSave = () => {
    try { setError(''); saveMutation.mutate({ id: ruleId, body: JSON.parse(json) }) }
    catch { setError('JSON 格式错误') }
  }

  return (
    <div>
      <PageHeader
        title="插件配置"
        description="管理全局规则与插件"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />新建全局规则
          </Button>
        }
      />
      <div className="px-10 pb-10">
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground text-[15px]">加载中…</div>
        ) : rules.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-[15px]">暂无全局规则</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {rules.map((item: any) => {
              const id = item.key?.split('/').pop() || item.value?.id
              const plugins = Object.keys(item.value?.plugins || {})
              return (
                <Card key={id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="min-w-0 flex-1">
                        <div className="text-[21px] font-bold leading-[1.19] tracking-apple-card-title text-foreground truncate">
                          全局规则 #{id}
                        </div>
                        <div className="text-[13px] text-muted-foreground mt-1 tracking-apple-caption">
                          {plugins.length} 个插件
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setDeleteTarget({ id }); setDeleteConfirmId('') }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-apple-micro text-muted-foreground mb-2">
                      已启用插件
                    </div>
                    {plugins.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {plugins.map(p => <Badge key={p} variant="outline">{p}</Badge>)}
                      </div>
                    ) : (
                      <span className="text-[14px] text-muted-foreground/60 tracking-apple-caption">无</span>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={closeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? '编辑全局规则' : '新建全局规则'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>规则 ID</Label>
              <Input value={ruleId} onChange={e => setRuleId(e.target.value)} disabled={!!editing} placeholder="1" />
            </div>
            <div className="space-y-1.5">
              <Label>配置 (JSON)</Label>
              <Textarea value={json} onChange={e => setJson(e.target.value)} className="font-mono text-[12px] min-h-[240px] resize-none" />
              {error && <p className="text-[11px] text-destructive">{error}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>取消</Button>
            <Button onClick={handleSave} disabled={!ruleId}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除全局规则</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-[14px] text-muted-foreground tracking-apple-caption">
              此操作不可撤销。请输入规则 ID <span className="font-semibold text-foreground">{deleteTarget?.id}</span> 以确认删除。
            </p>
            <Input
              value={deleteConfirmId}
              onChange={e => setDeleteConfirmId(e.target.value)}
              placeholder={deleteTarget?.id}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmId !== deleteTarget?.id}
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
