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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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

      <div className="p-6">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>用户名</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>可访问实例</TableHead>
                  <TableHead className="w-32 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user, idx) => (
                  <TableRow key={user.id}>
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                        {user.role === 'ADMIN' ? '超级管理员' : '普通用户'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.role === 'ADMIN' ? (
                        <span className="text-sm text-muted-foreground">所有实例</span>
                      ) : user.instanceIds.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {user.instanceIds.map(id => (
                            <Badge key={id} variant="outline" className="text-xs">
                              {instanceNameMap.get(id) || id}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground/50">无</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {user.username !== 'admin' && (
                          <Button variant="ghost" size="sm" onClick={() => { setDeleteTarget({ id: user.id, name: user.username }); setDeleteConfirmName('') }}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      暂无用户
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
                        : 'bg-white/30 text-muted-foreground border-white/30 hover:bg-white/50'
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
