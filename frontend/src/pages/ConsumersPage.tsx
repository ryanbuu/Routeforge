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
import { Plus, Pencil, Trash2 } from 'lucide-react'

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
  if (extraJson.trim()) {
    try {
      const extra = JSON.parse(extraJson)
      Object.assign(plugins, extra)
    } catch { /* skip */ }
  }
  return plugins
}

function getExtraPlugins(plugins: Record<string, any> = {}): Record<string, any> {
  const knownKeys = new Set<string>(AUTH_PLUGINS.map(p => p.key))
  const extra: Record<string, any> = {}
  for (const [k, v] of Object.entries(plugins)) {
    if (!knownKeys.has(k)) extra[k] = v
  }
  return extra
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-apple-micro pt-4">
      {children}
    </p>
  )
}

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
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <SectionTitle>基本信息</SectionTitle>
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

      <SectionTitle>认证插件</SectionTitle>
      <div className="space-y-2">
        {AUTH_PLUGINS.map(p => {
          const s = pluginState[p.key]
          return (
            <div
              key={p.key}
              className={cn(
                'rounded-lg border p-4 transition-colors duration-150',
                s.enabled
                  ? 'border-primary/40 bg-primary/[0.04]'
                  : 'border-foreground/[0.06] dark:border-white/[0.08] bg-[#fafafc] dark:bg-[#2a2a2d]'
              )}
            >
              <label className="flex items-center gap-2.5 cursor-pointer text-[14px] font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={s.enabled}
                  onChange={() => togglePlugin(p.key)}
                  className="accent-primary"
                />
                {p.label}
              </label>
              {s.enabled && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {p.fields.map(f => (
                    <div key={f.name} className="space-y-1.5">
                      <Label>{f.label}</Label>
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

      <SectionTitle>其他插件</SectionTitle>
      <div className="space-y-1.5">
        <Textarea
          value={extraJson}
          onChange={e => { setExtraJson(e.target.value); setJsonError('') }}
          className="font-mono text-[12px] min-h-[80px] resize-none"
          placeholder='{ "limit-count": { "count": 100, "time_window": 60 } }'
        />
        {jsonError && <p className="text-[11px] text-destructive">{jsonError}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>取消</Button>
        <Button onClick={handleSave} disabled={!username}>保存</Button>
      </div>
    </div>
  )
}

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
        action={
          <Button onClick={() => { setEditing(null); setOpen(true) }}>
            <Plus className="h-4 w-4 mr-1" />新建消费者
          </Button>
        }
      />
      <div className="px-10 pb-10">
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground text-[15px]">加载中…</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-[15px]">暂无消费者</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {items.map((item: any) => {
              const username = item.value?.username || item.key?.split('/').pop()
              const plugins = item.value?.plugins || {}
              const pluginNames = Object.keys(plugins)
              return (
                <Card key={username}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="min-w-0 flex-1">
                        <div className="text-[21px] font-bold leading-[1.19] tracking-apple-card-title text-foreground truncate">
                          {username}
                        </div>
                        {item.value?.desc && (
                          <div className="text-[13px] text-muted-foreground mt-1 tracking-apple-caption truncate">
                            {item.value.desc}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(item); setOpen(true) }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setDeleteTarget({ username }); setDeleteConfirmName('') }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-apple-micro text-muted-foreground mb-2">
                      认证插件
                    </div>
                    {pluginNames.length > 0 ? (
                      <div className="flex gap-1.5 flex-wrap">
                        {pluginNames.map(name => (
                          <Badge key={name} variant="outline">{name}</Badge>
                        ))}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? '编辑消费者' : '新建消费者'}</DialogTitle></DialogHeader>
          <ConsumerForm initial={editing} onSave={(username, body) => saveMutation.mutate({ username, body })} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除消费者</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-[14px] text-muted-foreground tracking-apple-caption">
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
