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
  Sun,
  Moon,
  Monitor,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useInstance } from '@/contexts/InstanceContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useState, useRef, useEffect } from 'react'

/*
 * Apple-inspired sidebar.
 * Always uses the dark translucent glass treatment — in Apple's system,
 * the navigation is always the dark blurred surface regardless of the
 * content below. This preserves the signature "floating UI" feel.
 */

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

const themeOptions = [
  { value: 'light' as const, icon: Sun, label: '亮色' },
  { value: 'dark' as const, icon: Moon, label: '暗色' },
  { value: 'system' as const, icon: Monitor, label: '系统' },
]

export function Sidebar() {
  const { username, isAdmin, logout } = useAuth()
  const { instances, current, setCurrent } = useInstance()
  const { theme, setTheme } = useTheme()
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
    <aside className="w-60 shrink-0 flex flex-col nav-glass text-white">
      {/* Logo */}
      <div className="h-12 flex items-center px-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4 text-white" />
          <span className="text-[15px] font-semibold tracking-tight">Routeforge</span>
        </div>
      </div>

      {/* Instance Selector */}
      {instances.length > 0 && (
        <div className="px-3 pt-3 relative" ref={pickerRef}>
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-[12px]
              bg-white/[0.08] hover:bg-white/[0.12] transition-colors duration-150"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-1.5 w-1.5 rounded-full bg-[#30d158] shrink-0" />
              <span className="truncate text-white/90 font-medium">{current?.name || '选择实例'}</span>
            </div>
            <ChevronDown className={cn("h-3 w-3 text-white/60 shrink-0 transition-transform", showPicker && "rotate-180")} />
          </button>
          {showPicker && (
            <div className="absolute left-3 right-3 top-full mt-1 bg-[#1d1d1f] border border-white/10 rounded-md shadow-2xl z-50 py-1 max-h-48 overflow-auto">
              {instances.map(inst => (
                <button
                  key={inst.id}
                  onClick={() => { setCurrent(inst); setShowPicker(false) }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-[12px] hover:bg-white/[0.08] transition-colors flex items-center gap-2",
                    inst.id === current?.id && "bg-white/[0.08]"
                  )}
                >
                  <div className={cn(
                    "h-1.5 w-1.5 rounded-full shrink-0",
                    inst.id === current?.id ? "bg-[#30d158]" : "bg-white/30"
                  )} />
                  <span className="truncate text-white/90">{inst.name}</span>
                  {inst.default && <span className="text-[10px] text-white/40 ml-auto">默认</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-[7px] text-[13px] transition-colors duration-150',
                isActive
                  ? 'bg-white/[0.12] text-white font-medium'
                  : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
              )
            }
          >
            <Icon className="h-[15px] w-[15px]" strokeWidth={2} />
            <span>{label}</span>
          </NavLink>
        ))}
        {isAdmin && (
          <>
            <div className="pt-3 pb-1 px-3">
              <div className="border-t border-white/10" />
            </div>
            <div className="px-3 pb-1 text-[10px] uppercase tracking-wider text-white/40">管理</div>
            {adminNavItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-[7px] text-[13px] transition-colors duration-150',
                    isActive
                      ? 'bg-white/[0.12] text-white font-medium'
                      : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
                  )
                }
              >
                <Icon className="h-[15px] w-[15px]" strokeWidth={2} />
                <span>{label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 space-y-2.5 border-t border-white/10">
        {/* Theme switcher */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-white/[0.06]">
          {themeOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] transition-colors duration-150',
                theme === opt.value
                  ? 'bg-white/15 text-white'
                  : 'text-white/50 hover:text-white/80'
              )}
              title={opt.label}
            >
              <opt.icon className="h-3 w-3" />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] text-white/60 truncate">{username}</span>
          <button
            onClick={logout}
            className="text-white/50 hover:text-white transition-colors"
            title="退出登录"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="px-1 text-[10px] text-white/30 tracking-wider">
          Routeforge v0.1
        </div>
      </div>
    </aside>
  )
}
