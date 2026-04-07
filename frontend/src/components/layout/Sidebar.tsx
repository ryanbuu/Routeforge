import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Route,
  Server,
  Layers,
  Users,
  Puzzle,
  Shield,
  ClipboardList,
  Database,
  UserCog,
  LogOut,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useInstance } from '@/contexts/InstanceContext'
import { useState, useRef, useEffect } from 'react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '概览' },
  { to: '/routes', icon: Route, label: '路由' },
  { to: '/upstreams', icon: Server, label: '上游' },
  { to: '/services', icon: Layers, label: '服务' },
  { to: '/consumers', icon: Users, label: '消费者' },
  { to: '/plugins', icon: Puzzle, label: '插件' },
  { to: '/ssl', icon: Shield, label: 'SSL 证书' },
  { to: '/audit', icon: ClipboardList, label: '审计日志' },
]

const adminNavItems = [
  { to: '/instances', icon: Database, label: 'APISIX 实例' },
  { to: '/users', icon: UserCog, label: '人员管理' },
]

export function Sidebar() {
  const { username, isAdmin, logout } = useAuth()
  const { instances, current, setCurrent } = useInstance()
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <aside className="w-60 glass-heavy flex flex-col border-r-0 rounded-r-3xl m-2 mr-0 overflow-hidden">
      {/* Logo */}
      <div className="h-14 flex items-center px-5">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <Route className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-semibold text-[15px] tracking-tight text-foreground/90">Routeforge</span>
        </div>
      </div>

      {/* Instance Selector */}
      {instances.length > 0 && (
        <div className="px-3 mb-1 relative" ref={pickerRef}>
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-[12px] font-medium
              glass-subtle hover:bg-white/40 transition-colors duration-200"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate text-foreground/80">{current?.name || '选择实例'}</span>
            </div>
            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200", showPicker && "rotate-180")} />
          </button>
          {showPicker && (
            <div className="absolute left-3 right-3 top-full mt-1 glass-heavy rounded-xl shadow-lg z-50 py-1 max-h-48 overflow-auto">
              {instances.map(inst => (
                <button
                  key={inst.id}
                  onClick={() => { setCurrent(inst); setShowPicker(false) }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-[12px] hover:bg-white/40 transition-colors duration-150 flex items-center gap-2",
                    inst.id === current?.id && "bg-white/30 font-medium"
                  )}
                >
                  <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", inst.id === current?.id ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                  <span className="truncate">{inst.name}</span>
                  {inst.default && <span className="text-[10px] text-muted-foreground ml-auto">默认</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200',
                isActive
                  ? 'glass text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/30'
              )
            }
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </NavLink>
        ))}
        {isAdmin && (
          <>
            <div className="pt-2 pb-1 px-3">
              <div className="border-t border-white/20" />
            </div>
            {adminNavItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200',
                    isActive
                      ? 'glass text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/30'
                  )
                }
              >
                <Icon className="h-[18px] w-[18px]" />
                {label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 space-y-2">
        <div className="flex items-center justify-between px-2">
          <span className="text-[12px] text-muted-foreground/80 truncate">{username}</span>
          <button
            onClick={logout}
            className="text-muted-foreground/60 hover:text-destructive transition-colors duration-200"
            title="退出登录"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <div className="px-2 text-[11px] text-muted-foreground/50">
          Routeforge v0.1
        </div>
      </div>
    </aside>
  )
}
