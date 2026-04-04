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
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

export function Sidebar() {
  return (
    <aside className="w-60 glass-heavy flex flex-col border-r-0 rounded-r-3xl m-2 mr-0 overflow-hidden">
      {/* Logo */}
      <div className="h-14 flex items-center px-5">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <Route className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-semibold text-[15px] tracking-tight text-foreground/90">RouteForge</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
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
      </nav>

      {/* Footer */}
      <div className="px-5 py-3 text-[11px] text-muted-foreground/70">
        APISIX Dashboard v0.1
      </div>
    </aside>
  )
}
