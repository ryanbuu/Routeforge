import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { instancesApi, ApisixInstance } from '@/api/resources'
import { useInstance } from '@/contexts/InstanceContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Pencil, Trash2, Star, KeyRound } from 'lucide-react'

interface FormState {
  name: string
  adminUrl: string
  apiKey: string
  isDefault: boolean
}

const emptyForm: FormState = { name: '', adminUrl: '', apiKey: '', isDefault: false }

export function InstancesPage() {
  const queryClient = useQueryClient()
  const { refresh } = useInstance()
  const { data: instances = [] } = useQuery<ApisixInstance[]>({
    queryKey: ['instances'],
    queryFn: instancesApi.list,
  })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const isCreating = editId === null

  const openCreate = () => {
    setEditId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (inst: ApisixInstance) => {
    setEditId(inst.id)
    setForm({
      name: inst.name,
      adminUrl: inst.adminUrl,
      apiKey: '',
      isDefault: inst.default,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        adminUrl: form.adminUrl,
        default: form.isDefault,
      }
      // Only send apiKey if provided (create: required, edit: optional)
      if (form.apiKey) {
        payload.apiKey = form.apiKey
      }
      if (editId) {
        await instancesApi.update(editId, payload as any)
      } else {
        await instancesApi.create(payload as any)
      }
      queryClient.invalidateQueries({ queryKey: ['instances'] })
      await refresh()
      setDialogOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const canSave = form.name && form.adminUrl && (editId !== null || form.apiKey)

  const handleDelete = async () => {
    if (!deleteId) return
    await instancesApi.remove(deleteId)
    queryClient.invalidateQueries({ queryKey: ['instances'] })
    await refresh()
    setDeleteId(null)
  }

  const handleSetDefault = async (id: number) => {
    await instancesApi.setDefault(id)
    queryClient.invalidateQueries({ queryKey: ['instances'] })
    await refresh()
  }

  return (
    <div>
      <PageHeader
        title="APISIX 实例"
        description="管理多个 APISIX 实例连接"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            添加实例
          </Button>
        }
      />

      <div className="p-6">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>Admin URL</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead className="w-20">状态</TableHead>
                  <TableHead className="w-32 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instances.map((inst, idx) => (
                  <TableRow key={inst.id}>
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{inst.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">{inst.adminUrl}</TableCell>
                    <TableCell>
                      {inst.apiKeySet ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                          <KeyRound className="h-3.5 w-3.5" />
                          <span className="font-mono">••••••••</span>
                        </span>
                      ) : (
                        <Badge variant="destructive">未设置</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {inst.default ? (
                        <Badge variant="success">默认</Badge>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(inst.id)}
                          className="text-muted-foreground/50 hover:text-amber-500 transition-colors"
                          title="设为默认"
                        >
                          <Star className="h-4 w-4" />
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(inst)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {!inst.default && (
                          <Button variant="ghost" size="sm" onClick={() => setDeleteId(inst.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {instances.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      暂无实例
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isCreating ? '添加实例' : '编辑实例'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>名称</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Production"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Admin URL</Label>
              <Input
                value={form.adminUrl}
                onChange={e => setForm(f => ({ ...f, adminUrl: e.target.value }))}
                placeholder="http://127.0.0.1:9180"
              />
            </div>
<div className="space-y-1.5">
              <Label>
                API Key
                {!isCreating && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">留空则不修改</span>
                )}
              </Label>
              <Input
                type="password"
                value={form.apiKey}
                onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                placeholder={isCreating ? 'edd1c9f034335f136f87ad84b625c8f1' : '••••••••'}
                autoComplete="off"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))}
                className="rounded"
              />
              设为默认实例
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving || !canSave}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">确定要删除该实例吗？此操作不可撤销。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
