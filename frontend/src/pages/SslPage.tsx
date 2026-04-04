import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sslApi, certApi } from '@/api/resources'
import { parseApisixList } from '@/api/client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Eye, ShieldCheck, ShieldAlert, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

/* ─── Types ─── */

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

/* ─── Upload Form ─── */

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

  // debounce cert parsing
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
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <div className="space-y-1.5">
        <Label>SNI 域名（逗号分隔）</Label>
        <Input value={snis} onChange={e => setSnis(e.target.value)} placeholder="example.com, *.example.com" />
      </div>
      <div className="space-y-1.5">
        <Label>证书 (PEM)</Label>
        <Textarea
          value={cert}
          onChange={e => setCert(e.target.value)}
          className="font-mono text-xs min-h-[120px] resize-none"
          placeholder="-----BEGIN CERTIFICATE-----"
        />
        {parsing && <p className="text-xs text-muted-foreground">解析证书中...</p>}
        {certInfo && (
          <div className={cn(
            'flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm backdrop-blur-sm',
            daysLeft != null && daysLeft < 0
              ? 'border-red-300/40 bg-red-500/10 text-red-700'
              : daysLeft != null && daysLeft < 30
                ? 'border-amber-300/40 bg-amber-500/10 text-amber-700'
                : 'border-emerald-300/40 bg-emerald-500/10 text-emerald-700'
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
              <p className="text-xs opacity-80">
                有效期: {formatDate(certInfo.notBefore, 'yyyy-MM-dd HH:mm')} ~ {formatDate(certInfo.notAfter, 'yyyy-MM-dd HH:mm')}
              </p>
              <p className="text-xs opacity-80">
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
          className="font-mono text-xs min-h-[120px] resize-none"
          placeholder="-----BEGIN PRIVATE KEY-----"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="outline" onClick={onClose}>取消</Button>
        <Button onClick={handleSave}>上传</Button>
      </div>
    </div>
  )
}

/* ─── Detail View Dialog ─── */

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

  // parse cert via backend
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
          <p className="text-center text-muted-foreground py-8">加载中...</p>
        ) : (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">SNI 域名</Label>
                <div className="flex flex-wrap gap-1">
                  {snis.length > 0
                    ? snis.map(s => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)
                    : <span className="text-sm text-muted-foreground">-</span>}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">证书状态</Label>
                {certInfo ? (
                  <div className="flex items-center gap-2">
                    <Badge variant={daysLeft != null && daysLeft < 0 ? 'destructive' : daysLeft != null && daysLeft < 30 ? 'warning' : 'success'}>
                      {daysLeft != null && daysLeft < 0 ? '已过期' : '有效'}
                    </Badge>
                    {daysLeft != null && daysLeft >= 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />剩余 {daysLeft} 天
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">解析中...</span>
                )}
              </div>
            </div>

            {/* 证书信息 */}
            {certInfo && (
              <div className={cn(
                'rounded-2xl border px-3 py-2.5 text-sm space-y-1.5 backdrop-blur-sm',
                daysLeft != null && daysLeft < 0
                  ? 'border-red-300/40 bg-red-500/10'
                  : daysLeft != null && daysLeft < 30
                    ? 'border-amber-300/40 bg-amber-500/10'
                    : 'border-emerald-300/40 bg-emerald-500/10'
              )}>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">生效时间: </span>
                    <span className="font-medium">{formatDate(certInfo.notBefore)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">到期时间: </span>
                    <span className="font-medium">{formatDate(certInfo.notAfter)}</span>
                  </div>
                </div>
                <div className="text-xs">
                  <span className="text-muted-foreground">使用者: </span>
                  <span className="font-medium">{certInfo.subject}</span>
                </div>
                <div className="text-xs">
                  <span className="text-muted-foreground">签发者: </span>
                  <span className="font-medium">{certInfo.issuer}</span>
                </div>
                <div className="text-xs">
                  <span className="text-muted-foreground">序列号: </span>
                  <span className="font-mono">{certInfo.serialNumber}</span>
                </div>
              </div>
            )}

            {/* 公钥证书 */}
            <div className="space-y-1.5">
              <Label>公钥证书 (PEM)</Label>
              <Textarea
                value={certPem}
                readOnly
                className="font-mono text-xs min-h-[140px] resize-none bg-muted/50 cursor-text"
                onClick={e => (e.target as HTMLTextAreaElement).select()}
              />
            </div>

            {/* 私钥 */}
            <div className="space-y-1.5">
              <Label>私钥 (PEM)</Label>
              <Textarea
                value={keyPem}
                readOnly
                className="font-mono text-xs min-h-[140px] resize-none bg-muted/50 cursor-text"
                onClick={e => (e.target as HTMLTextAreaElement).select()}
              />
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button variant="outline" onClick={() => onClose()}>关闭</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/* ─── Main Page ─── */

export function SslPage() {
  const qc = useQueryClient()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [viewId, setViewId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ['ssl'], queryFn: sslApi.list })
  const items = parseApisixList(data)

  // collect certs from list items for batch parsing
  const certMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const item of items) {
      const id = (item as any).key?.split('/').pop() || (item as any).value?.id
      const pem = (item as any).value?.cert
      if (id && pem) map[id] = pem
    }
    return map
  }, [items])

  // batch parse all certs via backend
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
        action={<Button size="sm" onClick={() => setUploadOpen(true)}><Plus className="h-4 w-4 mr-1" />上传证书</Button>}
      />
      <div className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>SNI 域名</TableHead>
              <TableHead>签发者</TableHead>
              <TableHead>到期时间</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">加载中...</TableCell>
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
                  <TableCell className="font-mono text-xs">{id}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(item.value?.snis || []).map((s: string) => (
                        <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate" title={info?.issuer}>
                    {info?.issuer || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>
                    {info?.notAfter ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{formatDate(info.notAfter, 'yyyy-MM-dd')}</span>
                        <Badge variant={isExpired ? 'destructive' : isWarning ? 'warning' : 'secondary'} className="text-xs">
                          {isExpired ? `过期 ${Math.abs(days!)}d` : `${days}d`}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {days == null
                      ? <Badge variant="secondary">未知</Badge>
                      : isExpired
                        ? <Badge variant="destructive">已过期</Badge>
                        : isWarning
                          ? <Badge variant="warning">即将过期</Badge>
                          : <Badge variant="success">有效</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setViewId(id)} title="查看详情">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(id)} title="删除">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
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
