import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  Database,
  Brain,
  BarChart3,
  Bell,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
  ChevronLeft,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { getMenuForRole } from '@/utils/permissions'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  '/dashboard': LayoutDashboard,
  '/students': Users,
  '/teachers': GraduationCap,
  '/courses': BookOpen,
  '/attendance': CalendarCheck,
  '/data-sources': Database,
  '/predictions': Brain,
  '/analytics': BarChart3,
  '/alerts': Bell,
  '/reports': FileText,
  '/feedback': MessageSquare,
  '/settings': Settings,
}

const LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/students': 'Students',
  '/teachers': 'Teachers',
  '/courses': 'Courses',
  '/attendance': 'Attendance',
  '/data-sources': 'Data Sources',
  '/predictions': 'Predictions',
  '/analytics': 'Analytics',
  '/alerts': 'Alerts',
  '/reports': 'Reports',
  '/feedback': 'Feedback',
  '/settings': 'Settings',
}

export function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { sidebarCollapsed, mobileSidebarOpen, toggleSidebar, setMobileSidebarOpen } = useUiStore()
  const navigate = useNavigate()
  const menu = user ? getMenuForRole(user.role) : []

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        {!sidebarCollapsed && (
          <span className="text-lg font-bold gradient-text">EduPredict</span>
        )}
        <button
          type="button"
          onClick={toggleSidebar}
          className="hidden rounded-lg p-1.5 hover:bg-background lg:block"
        >
          <ChevronLeft
            className={cn('h-5 w-5 transition-transform', sidebarCollapsed && 'rotate-180')}
          />
        </button>
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(false)}
          className="rounded-lg p-1.5 hover:bg-background lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {menu.map(({ path }) => {
          const Icon = ICONS[path] ?? LayoutDashboard
          return (
            <NavLink
              key={path}
              to={path}
              onClick={() => setMobileSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted hover:bg-background hover:text-foreground'
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span>{LABELS[path]}</span>}
            </NavLink>
          )
        })}
      </nav>
      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="mb-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-background"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback>{user?.name?.charAt(0) ?? 'U'}</AvatarFallback>
          </Avatar>
          {!sidebarCollapsed && (
            <div className="text-left">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted capitalize">{user?.role}</p>
            </div>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/login')
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-danger hover:bg-danger/10"
        >
          <LogOut className="h-5 w-5" />
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden border-r border-border bg-card transition-all duration-300 lg:block',
          sidebarCollapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        {content}
      </aside>
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card lg:hidden"
            >
              {content}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
