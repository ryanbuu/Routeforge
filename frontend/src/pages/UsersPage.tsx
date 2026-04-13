import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi, instancesApi, AppUser, ApisixInstance } from '@/api/resources'
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
import { cn } from '@/lib/utils'
import { Plus, Pencil, Trash2 } from 'lucide-react'

interface FormState {
  username: string
  password: string
  role: string
  instanceIds: number[]
}

const emptyForm: FormState = { username: '', password: '', role: 'USER', instanceIds: [] }

export function UsersPage() {
  const queryClient = useQueryClient()
  const { data: users = [] } = useQuery<AppUser[]>({
    queryKey: ['users'],
    queryFn: usersApi.list,
  })
  const { data: instances = [] } = useQuery<ApisixInstance[]>({
    queryKey: ['instances'],
    queryFn: instancesApi.list,
  })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [saving, setSaving] = useState(false)

  const isCreating = editId === null

  const openCreate = () => {
    setEditId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (user: AppUser) => {
    setEditId(user.id)
    setForm({
      username: user.username,
      password: '',
      role: user.role,
      instanceIds: user.instanceIds,
    })
    setDialogOpen(true)
  }

  const toggleInstance = (id: number) => {
    setForm(f => ({
      ...f,
      instanceIds: f.instanceIds.includes(id)
        ? f.instanceIds.filter(i => i !== id)
        : [...f.instanceIds, id],
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: any = {
        username: form.username,
        role: form.role,
        instanceIds: form.instanceIds,
      }
      if (form.password) payload.password = form.password
      if (editId) {
        await usersApi.update(editId, payload)
      } else {
        payload.password = form.password
        await usersApi.create(payload)
      }
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDialogOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await usersApi.remove(deleteTarget.id)
    queryClient.invalidateQueries({ queryKey: ['users'] })
    setDeleteTarget(null)
  }

  const canSave = form.username && (editId !== null || form.password)

  const instanceNameMap = new Map(instances.map(i => [i.id, i.name]))

  return (
    <div>
      <PageHeader
        title="人员管理"
        description="管理用户账号和 APISIX 实例权限"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            添加用户
          </Button>
        }
      />

      <div className="px-10 pb-10">
        {users.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-[15px]">暂无用户</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {users.map(user => (
              <Card key={user.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-[21px] font-bold leading-[1.19] tracking-apple-card-title text-foreground truncate">
                        {user.username}
                      </div>
                      <div className="mt-1.5">
                        <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                          {user.role === 'ADMIN' ? '超级管理员' : '普通用户'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {user.username !== 'admin' && (
                        <Button variant="ghost" size="icon" onClick={() => { setDeleteTarget({ id: user.id, name: user.username }); setDeleteConfirmName('') }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] font-semibold uppercase tracking-apple-micro text-muted-foreground mb-2">
                    可访问实例
                  </div>
                  {user.role === 'ADMIN' ? (
                    <span className="text-[14px] text-foreground/70 tracking-apple-caption">所有实例</span>
                  ) : user.instanceIds.length > 0 ? (
                    <div className="flex gap-1.5 flex-wrap">
                      {user.instanceIds.map(id => (
                        <Badge key={id} variant="outline">
                          {instanceNameMap.get(id) || id}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[14px] text-muted-foreground/60 tracking-apple-caption">无</span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isCreating ? '添加用户' : '编辑用户'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>用户名</Label>
              <Input
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="username"
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                密码
                {!isCreating && (
                  <span className="ml-2 text-[11px] font-normal text-muted-foreground">留空则不修改</span>
                )}
              </Label>
              <Input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder={isCreating ? '设置密码' : '••••••••'}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label>角色</Label>
              <div className="flex gap-2">
                {[
                  { label: '普通用户', value: 'USER' },
                  { label: '超级管理员', value: 'ADMIN' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, role: opt.value }))}
                    className={cn(
                      'flex-1 h-10 rounded-md text-[14px] font-medium transition-colors duration-150 border',
                      form.role === opt.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-transparent text-foreground/70 border-foreground/10 hover:bg-foreground/5'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {form.role !== 'ADMIN' && (
              <div className="space-y-1.5">
                <Label>可访问的 APISIX 实例</Label>
                {instances.length > 0 ? (
                  <div className="space-y-1 rounded-lg border border-foreground/10 p-2 max-h-40 overflow-auto bg-[#fafafc] dark:bg-[#2a2a2d]">
                    {instances.map(inst => (
                      <label key={inst.id} className="flex items-center gap-2.5 text-[13px] cursor-pointer py-1.5 px-2 rounded hover:bg-foreground/[0.04]">
                        <input
                          type="checkbox"
                          checked={form.instanceIds.includes(inst.id)}
                          onChange={() => toggleInstance(inst.id)}
                          className="accent-primary"
                        />
                        <span>{inst.name}</span>
                        <span className="text-[11px] text-muted-foreground ml-auto font-mono">{inst.adminUrl}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-muted-foreground">暂无可用实例</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving || !canSave}>
              {saving ? '保存中…' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除用户</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-[14px] text-muted-foreground tracking-apple-caption">
              此操作不可撤销。请输入用户名 <span className="font-semibold text-foreground">{deleteTarget?.name}</span> 以确认删除。
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
              onClick={handleDelete}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
