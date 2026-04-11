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
import { Plus, Pencil, Trash2, ShieldCheck, User } from 'lucide-react'

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

      <div className="p-6">
        {users.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">暂无用户</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {users.map(user => (
              <Card key={user.id} className="glass-heavy overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'h-10 w-10 rounded-xl flex items-center justify-center shadow-sm',
                        user.role === 'ADMIN'
                          ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                          : 'bg-gradient-to-br from-slate-400 to-slate-500 dark:from-slate-500 dark:to-slate-600'
                      )}>
                        {user.role === 'ADMIN'
                          ? <ShieldCheck className="h-5 w-5 text-white" />
                          : <User className="h-5 w-5 text-white" />
                        }
                      </div>
                      <div>
                        <div className="font-semibold text-[15px] text-foreground">{user.username}</div>
                        <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'} className="mt-0.5">
                          {user.role === 'ADMIN' ? '超级管理员' : '普通用户'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {user.username !== 'admin' && (
                        <Button variant="ghost" size="sm" onClick={() => { setDeleteTarget({ id: user.id, name: user.username }); setDeleteConfirmName('') }}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mb-1.5">可访问实例</div>
                  {user.role === 'ADMIN' ? (
                    <span className="text-sm text-muted-foreground">所有实例</span>
                  ) : user.instanceIds.length > 0 ? (
                    <div className="flex gap-1.5 flex-wrap">
                      {user.instanceIds.map(id => (
                        <Badge key={id} variant="outline" className="text-xs">
                          {instanceNameMap.get(id) || id}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground/50">无</span>
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
          <div className="space-y-4 py-2">
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
                  <span className="ml-2 text-xs font-normal text-muted-foreground">留空则不修改</span>
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
                      'flex-1 py-1.5 rounded-xl border text-sm font-medium transition-all duration-200',
                      form.role === opt.value
                        ? 'bg-primary/15 text-primary border-primary/25 shadow-sm'
                        : 'bg-white/30 dark:bg-white/8 text-muted-foreground border-white/30 dark:border-white/10 hover:bg-white/50 dark:hover:bg-white/12'
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
                  <div className="space-y-1.5 rounded-2xl p-3 glass-inset max-h-40 overflow-auto">
                    {instances.map(inst => (
                      <label key={inst.id} className="flex items-center gap-2.5 text-sm cursor-pointer py-0.5">
                        <input
                          type="checkbox"
                          checked={form.instanceIds.includes(inst.id)}
                          onChange={() => toggleInstance(inst.id)}
                          className="rounded"
                        />
                        <span>{inst.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto font-mono">{inst.adminUrl}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">暂无可用实例</p>
                )}
              </div>
            )}
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
      <Dialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除用户</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
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
