import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sslApi, certApi } from '@/api/resources'
import { parseApisixList } from '@/api/client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Eye, ShieldCheck, ShieldAlert, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface CertInfo {
  notBefore: string
  notAfter: string
  subject: string
  issuer: string
  serialNumber: string
}

function daysUntil(dateStr: string): number {
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr: string, fmt = 'yyyy-MM-dd HH:mm:ss') {
  try { return format(new Date(dateStr), fmt) } catch { return dateStr }
}

function statusColorClass(daysLeft: number | null): string {
  if (daysLeft == null) return 'border-foreground/[0.06] bg-[#fafafc] dark:bg-[#2a2a2d] text-foreground/70'
  if (daysLeft < 0) return 'border-[#ff3b30]/30 bg-[#ff3b30]/10 text-[#c5281c] dark:text-[#ff453a]'
  if (daysLeft < 30) return 'border-[#ff9500]/30 bg-[#ff9500]/10 text-[#b26500] dark:text-[#ff9f0a]'
  return 'border-[#30d158]/30 bg-[#30d158]/10 text-[#248a3d] dark:text-[#30d158]'
}

function SslForm({ onSave, onClose }: { onSave: (data: any) => void; onClose: () => void }) {
  const [cert, setCert] = useState('')
  const [key, setKey] = useState('')
  const [snis, setSnis] = useState('')
  const [error, setError] = useState('')
  const [certInfo, setCertInfo] = useState<CertInfo | null>(null)
  const [parsing, setParsing] = useState(false)

  const parseCert = useCallback(async (pem: string) => {
    if (!pem.includes('BEGIN CERTIFICATE')) {
      setCertInfo(null)
      return
    }
    try {
      setParsing(true)
      const info = await certApi.parse(pem)
      setCertInfo(info)
    } catch {
      setCertInfo(null)
    } finally {
      setParsing(false)
    }
  }, [])

  useEffect(() => {
    if (!cert) { setCertInfo(null); return }
    const timer = setTimeout(() => parseCert(cert), 400)
    return () => clearTimeout(timer)
  }, [cert, parseCert])

  const handleSave = () => {
    if (!cert || !key) { setError('证书和私钥不能为空'); return }
    setError('')
    onSave({ cert, key, snis: snis.split(',').map(s => s.trim()).filter(Boolean) })
  }

  const daysLeft = certInfo ? daysUntil(certInfo.notAfter) : null

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="space-y-1.5">
        <Label>SNI 域名</Label>
        <Input value={snis} onChange={e => setSnis(e.target.value)} placeholder="example.com, *.example.com" />
        <p className="text-[11px] text-muted-foreground tracking-apple-micro">多个域名逗号分隔</p>
      </div>
      <div className="space-y-1.5">
        <Label>证书 (PEM)</Label>
        <Textarea
          value={cert}
          onChange={e => setCert(e.target.value)}
          className="font-mono text-[12px] min-h-[120px] resize-none"
          placeholder="-----BEGIN CERTIFICATE-----"
        />
        {parsing && <p className="text-[11px] text-muted-foreground">解析证书中…</p>}
        {certInfo && (
          <div className={cn(
            'flex items-center gap-3 rounded-lg border px-3.5 py-3 text-[13px]',
            statusColorClass(daysLeft)
          )}>
            {daysLeft != null && daysLeft < 0 ? (
              <ShieldAlert className="h-4 w-4 shrink-0" />
            ) : (
              <ShieldCheck className="h-4 w-4 shrink-0" />
            )}
            <div className="flex-1 space-y-0.5">
              <p className="font-medium">
                {daysLeft != null && daysLeft < 0
                  ? `证书已过期 ${Math.abs(daysLeft)} 天`
                  : `证书有效，剩余 ${daysLeft} 天`}
              </p>
              <p className="text-[11px] opacity-80">
                有效期: {formatDate(certInfo.notBefore, 'yyyy-MM-dd HH:mm')} ~ {formatDate(certInfo.notAfter, 'yyyy-MM-dd HH:mm')}
              </p>
              <p className="text-[11px] opacity-80">
                签发者: {certInfo.issuer}
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <Label>私钥 (PEM)</Label>
        <Textarea
          value={key}
          onChange={e => setKey(e.target.value)}
          className="font-mono text-[12px] min-h-[120px] resize-none"
          placeholder="-----BEGIN PRIVATE KEY-----"
        />
      </div>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>取消</Button>
        <Button onClick={handleSave}>上传</Button>
      </div>
    </div>
  )
}

function SslDetailDialog({ id, open, onClose }: { id: string; open: boolean; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['ssl', id],
    queryFn: () => sslApi.get(id),
    enabled: open && !!id,
  })

  const value = data?.value || data?.node?.value || data || {}
  const certPem: string = value.cert || value.certs?.[0] || ''
  const keyPem: string = value.key || value.keys?.[0] || ''
  const snis: string[] = value.snis || []

  const { data: certInfo } = useQuery<CertInfo>({
    queryKey: ['cert-parse', id],
    queryFn: () => certApi.parse(certPem),
    enabled: open && !!certPem,
  })

  const daysLeft = certInfo ? daysUntil(certInfo.notAfter) : null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>证书详情 — {id}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-center text-muted-foreground py-10">加载中…</p>
        ) : (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>SNI 域名</Label>
                <div className="flex flex-wrap gap-1">
                  {snis.length > 0
                    ? snis.map(s => <Badge key={s} variant="outline">{s}</Badge>)
                    : <span className="text-[13px] text-muted-foreground">-</span>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>证书状态</Label>
                {certInfo ? (
                  <div className="flex items-center gap-2">
                    <Badge variant={daysLeft != null && daysLeft < 0 ? 'destructive' : daysLeft != null && daysLeft < 30 ? 'warning' : 'success'}>
                      {daysLeft != null && daysLeft < 0 ? '已过期' : '有效'}
                    </Badge>
                    {daysLeft != null && daysLeft >= 0 && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />剩余 {daysLeft} 天
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[13px] text-muted-foreground">解析中…</span>
                )}
              </div>
            </div>

            {certInfo && (
              <div className={cn(
                'rounded-lg border px-3.5 py-3 text-[13px] space-y-1.5',
                statusColorClass(daysLeft)
              )}>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="opacity-70">生效时间: </span>
                    <span className="font-medium">{formatDate(certInfo.notBefore)}</span>
                  </div>
                  <div>
                    <span className="opacity-70">到期时间: </span>
                    <span className="font-medium">{formatDate(certInfo.notAfter)}</span>
                  </div>
                </div>
                <div className="text-[11px]">
                  <span className="opacity-70">使用者: </span>
                  <span className="font-medium">{certInfo.subject}</span>
                </div>
                <div className="text-[11px]">
                  <span className="opacity-70">签发者: </span>
                  <span className="font-medium">{certInfo.issuer}</span>
                </div>
                <div className="text-[11px]">
                  <span className="opacity-70">序列号: </span>
                  <span className="font-mono">{certInfo.serialNumber}</span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>公钥证书 (PEM)</Label>
              <Textarea
                value={certPem}
                readOnly
                className="font-mono text-[12px] min-h-[140px] resize-none cursor-text"
                onClick={e => (e.target as HTMLTextAreaElement).select()}
              />
            </div>

            <div className="space-y-1.5">
              <Label>私钥 (PEM)</Label>
              <Textarea
                value={keyPem}
                readOnly
                className="font-mono text-[12px] min-h-[140px] resize-none cursor-text"
                onClick={e => (e.target as HTMLTextAreaElement).select()}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => onClose()}>关闭</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function SslPage() {
  const qc = useQueryClient()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [viewId, setViewId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ['ssl'], queryFn: sslApi.list })
  const items = parseApisixList(data)

  const certMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const item of items) {
      const id = (item as any).key?.split('/').pop() || (item as any).value?.id
      const pem = (item as any).value?.cert
      if (id && pem) map[id] = pem
    }
    return map
  }, [items])

  const { data: parsedCerts } = useQuery<Record<string, CertInfo>>({
    queryKey: ['cert-parse-batch', Object.keys(certMap).sort().join(',')],
    queryFn: () => certApi.parseBatch(certMap),
    enabled: Object.keys(certMap).length > 0,
  })

  const createMutation = useMutation({
    mutationFn: (body: any) => sslApi.create(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ssl'] }); setUploadOpen(false) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sslApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ssl'] }),
  })

  return (
    <div>
      <PageHeader
        title="SSL 证书"
        description="管理 HTTPS 证书"
        action={
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />上传证书
          </Button>
        }
      />
      <div className="px-10 pb-10">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">ID</TableHead>
                  <TableHead>SNI 域名</TableHead>
                  <TableHead>签发者</TableHead>
                  <TableHead>到期时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right pr-6">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">加载中…</TableCell>
                  </TableRow>
                )}
                {items.map((item: any) => {
                  const id = item.key?.split('/').pop() || item.value?.id
                  const info = parsedCerts?.[id]
                  const days = info?.notAfter ? daysUntil(info.notAfter) : null
                  const isExpired = days != null && days < 0
                  const isWarning = days != null && days >= 0 && days < 30

                  return (
                    <TableRow key={id}>
                      <TableCell className="font-mono text-[12px] text-foreground/70 pl-6">{id}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(item.value?.snis || []).map((s: string) => (
                            <Badge key={s} variant="outline">{s}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-[12px] text-foreground/70 max-w-[220px] truncate" title={info?.issuer}>
                        {info?.issuer || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {info?.notAfter ? (
                          <span className="text-[13px] text-foreground/70 font-mono">{formatDate(info.notAfter, 'yyyy-MM-dd')}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {days == null
                          ? <Badge variant="secondary">未知</Badge>
                          : isExpired
                            ? <Badge variant="destructive">过期 {Math.abs(days)}d</Badge>
                            : isWarning
                              ? <Badge variant="warning">{days}d 即将过期</Badge>
                              : <Badge variant="success">{days}d 有效</Badge>}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="icon" onClick={() => setViewId(id)} title="查看详情">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(id)} title="删除">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {!isLoading && items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">暂无证书</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>上传 SSL 证书</DialogTitle></DialogHeader>
          <SslForm onSave={(body) => createMutation.mutate(body)} onClose={() => setUploadOpen(false)} />
        </DialogContent>
      </Dialog>

      {viewId && (
        <SslDetailDialog id={viewId} open={!!viewId} onClose={() => setViewId(null)} />
      )}
    </div>
  )
}
