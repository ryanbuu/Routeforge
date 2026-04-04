import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pluginsApi } from '@/api/resources'
import { parseApisixList } from '@/api/client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2 } from 'lucide-react'

export function PluginsPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [ruleId, setRuleId] = useState('')
  const [json, setJson] = useState(JSON.stringify({ plugins: {} }, null, 2))
  const [error, setError] = useState('')

  const { data: globalRules, isLoading } = useQuery({ queryKey: ['global-rules'], queryFn: pluginsApi.listGlobalRules })
  const rules = parseApisixList(globalRules)

  const saveMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => pluginsApi.putGlobalRule(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['global-rules'] }); setOpen(false) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => pluginsApi.deleteGlobalRule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['global-rules'] }),
  })

  const handleSave = () => {
    try { setError(''); saveMutation.mutate({ id: ruleId, body: JSON.parse(json) }) } catch { setError('JSON 格式错误') }
  }

  return (
    <div>
      <PageHeader
        title="插件配置"
        description="管理全局规则与插件"
        action={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />新建全局规则</Button>}
      />
      <div className="p-6 space-y-4">
        {isLoading && <p className="text-muted-foreground text-sm">加载中...</p>}
        {rules.map((item: any) => {
          const id = item.key?.split('/').pop() || item.value?.id
          return (
            <Card key={id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">全局规则 #{id}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {Object.keys(item.value?.plugins || {}).map(p => <Badge key={p} variant="secondary">{p}</Badge>)}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>新建全局规则</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>规则 ID</Label><Input value={ruleId} onChange={e => setRuleId(e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>配置 (JSON)</Label>
              <Textarea value={json} onChange={e => setJson(e.target.value)} className="font-mono text-xs min-h-[200px]" />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>取消</Button><Button onClick={handleSave}>保存</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
