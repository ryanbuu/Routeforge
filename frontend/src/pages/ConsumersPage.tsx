import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { consumersApi } from '@/api/resources'
import { parseApisixList } from '@/api/client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { Plus, Pencil, Trash2, KeyRound, User } from 'lucide-react'

/* ─── Known auth plugins with visual fields ─── */
const AUTH_PLUGINS = [
  { key: 'key-auth', label: 'Key Auth', fields: [{ name: 'key', label: 'API Key', placeholder: 'my-api-key' }] },
  { key: 'basic-auth', label: 'Basic Auth', fields: [{ name: 'username', label: '用户名', placeholder: 'user' }, { name: 'password', label: '密码', placeholder: '••••', type: 'password' }] },
  { key: 'jwt-auth', label: 'JWT Auth', fields: [{ name: 'key', label: 'Key', placeholder: 'jwt-key' }, { name: 'secret', label: 'Secret', placeholder: 'jwt-secret' }] },
  { key: 'hmac-auth', label: 'HMAC Auth', fields: [{ name: 'access_key', label: 'Access Key', placeholder: 'access-key' }, { name: 'secret_key', label: 'Secret Key', placeholder: 'secret-key' }] },
] as const

interface PluginState {
  enabled: boolean
  fields: Record<string, string>
}

function initPluginState(plugins: Record<string, any> = {}): Record<string, PluginState> {
  const state: Record<string, PluginState> = {}
  for (const p of AUTH_PLUGINS) {
    const existing = plugins[p.key]
    state[p.key] = {
      enabled: !!existing,
      fields: Object.fromEntries(
        p.fields.map(f => [f.name, existing?.[f.name] ?? ''])
      ),
    }
  }
  return state
}

function buildPluginsPayload(pluginState: Record<string, PluginState>, extraJson: string): Record<string, any> {
  const plugins: Record<string, any> = {}
  for (const p of AUTH_PLUGINS) {
    const s = pluginState[p.key]
    if (s?.enabled) {
      const config: Record<string, string> = {}
      for (const [k, v] of Object.entries(s.fields)) {
        if (v) config[k] = v
      }
      plugins[p.key] = config
    }
  }
  // merge extra JSON plugins
  if (extraJson.trim()) {
    try {
      const extra = JSON.parse(extraJson)
      Object.assign(plugins, extra)
    } catch { /* skip */ }
  }
  return plugins
}

function getKnownPluginKeys(plugins: Record<string, any> = {}): string[] {
  return AUTH_PLUGINS.map(p => p.key).filter(k => k in plugins)
}

function getExtraPlugins(plugins: Record<string, any> = {}): Record<string, any> {
  const knownKeys = new Set<string>(AUTH_PLUGINS.map(p => p.key))
  const extra: Record<string, any> = {}
  for (const [k, v] of Object.entries(plugins)) {
    if (!knownKeys.has(k)) extra[k] = v
  }
  return extra
}

/* ─── Consumer Form ─── */

function ConsumerForm({ initial, onSave, onClose }: {
  initial?: any
  onSave: (username: string, data: any) => void
  onClose: () => void
}) {
  const existingPlugins = initial?.value?.plugins || {}
  const [username, setUsername] = useState(initial?.value?.username || '')
  const [desc, setDesc] = useState(initial?.value?.desc || '')
  const [pluginState, setPluginState] = useState<Record<string, PluginState>>(() => initPluginState(existingPlugins))
  const extraPlugins = getExtraPlugins(existingPlugins)
  const [extraJson, setExtraJson] = useState(
    Object.keys(extraPlugins).length > 0 ? JSON.stringify(extraPlugins, null, 2) : ''
  )
  const [jsonError, setJsonError] = useState('')

  const togglePlugin = (key: string) => {
    setPluginState(s => ({
      ...s,
      [key]: { ...s[key], enabled: !s[key].enabled },
    }))
  }

  const setField = (pluginKey: string, fieldName: string, value: string) => {
    setPluginState(s => ({
      ...s,
      [pluginKey]: {
        ...s[pluginKey],
        fields: { ...s[pluginKey].fields, [fieldName]: value },
      },
    }))
  }

  const handleSave = () => {
    if (extraJson.trim()) {
      try { JSON.parse(extraJson); setJsonError('') }
      catch { setJsonError('JSON 格式错误'); return }
    }
    const plugins = buildPluginsPayload(pluginState, extraJson)
    const body: Record<string, any> = {
      username,
      plugins,
    }
    if (desc) body.desc = desc
    onSave(username, body)
  }

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>用户名</Label>
          <Input value={username} onChange={e => setUsername(e.target.value)} disabled={!!initial} placeholder="consumer-name" />
        </div>
        <div className="space-y-1.5">
          <Label>描述</Label>
          <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="可选描述" />
        </div>
      </div>

      <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest pt-2">认证插件</p>
      <div className="space-y-2">
        {AUTH_PLUGINS.map(p => {
          const s = pluginState[p.key]
          return (
            <div key={p.key} className={cn(
              'rounded-2xl border p-3 transition-all duration-200',
              s.enabled
                ? 'glass border-primary/20'
                : 'border-white/20 dark:border-white/8 bg-white/20 dark:bg-white/5'
            )}>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={s.enabled}
                    onChange={() => togglePlugin(p.key)}
                    className="rounded"
                  />
                  {p.label}
                </label>
              </div>
              {s.enabled && (
                <div className="grid grid-cols-2 gap-2 mt-2.5">
                  {p.fields.map(f => (
                    <div key={f.name} className="space-y-1">
                      <Label className="text-xs">{f.label}</Label>
                      <Input
                        type={'type' in f ? f.type : 'text'}
                        value={s.fields[f.name] || ''}
                        onChange={e => setField(p.key, f.name, e.target.value)}
                        placeholder={f.placeholder}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest pt-2">其他插件</p>
      <Textarea
        value={extraJson}
        onChange={e => { setExtraJson(e.target.value); setJsonError('') }}
        className="font-mono text-xs min-h-[80px] resize-none"
        placeholder='{ "limit-count": { "count": 100, "time_window": 60 } }'
      />
      {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="outline" onClick={onClose}>取消</Button>
        <Button onClick={handleSave} disabled={!username}>保存</Button>
      </div>
    </div>
  )
}

/* ─── Main Page ─── */

export function ConsumersPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ username: string } | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')

  const { data, isLoading } = useQuery({ queryKey: ['consumers'], queryFn: consumersApi.list })
  const items = parseApisixList(data)

  const saveMutation = useMutation({
    mutationFn: ({ username, body }: { username: string; body: any }) => consumersApi.upsert(username, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['consumers'] }); setOpen(false); setEditing(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: (username: string) => consumersApi.remove(username),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['consumers'] }); setDeleteTarget(null) },
  })

  return (
    <div>
      <PageHeader
        title="消费者管理"
        description="管理 API 消费者与认证"
        action={<Button size="sm" onClick={() => { setEditing(null); setOpen(true) }}><Plus className="h-4 w-4 mr-1" />新建消费者</Button>}
      />
      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">加载中...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">暂无消费者</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((item: any) => {
              const username = item.value?.username || item.key?.split('/').pop()
              const plugins = item.value?.plugins || {}
              const pluginNames = Object.keys(plugins)
              return (
                <Card key={username} className="glass-heavy overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shadow-sm">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-[15px] text-foreground">{username}</div>
                          {item.value?.desc && (
                            <div className="text-xs text-muted-foreground mt-0.5">{item.value.desc}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(item); setOpen(true) }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setDeleteTarget({ username }); setDeleteConfirmName('') }}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mb-1.5">认证插件</div>
                    {pluginNames.length > 0 ? (
                      <div className="flex gap-1.5 flex-wrap">
                        {pluginNames.map(name => (
                          <Badge key={name} variant="secondary" className="text-xs">
                            <KeyRound className="h-2.5 w-2.5 mr-1" />
                            {name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground/50">无</span>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? '编辑消费者' : '新建消费者'}</DialogTitle></DialogHeader>
          <ConsumerForm initial={editing} onSave={(username, body) => saveMutation.mutate({ username, body })} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除消费者</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              此操作不可撤销。请输入消费者名称 <span className="font-semibold text-foreground">{deleteTarget?.username}</span> 以确认删除。
            </p>
            <Input
              value={deleteConfirmName}
              onChange={e => setDeleteConfirmName(e.target.value)}
              placeholder={deleteTarget?.username}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmName !== deleteTarget?.username}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.username)}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
