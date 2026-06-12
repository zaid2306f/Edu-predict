import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Search, Bell, Moon, Sun, ChevronRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useThemeStore } from '@/store/themeStore'
import { useUiStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs'
import { fetchNotifications } from '@/services/dataService'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export function Navbar() {
  const { theme, toggleTheme } = useThemeStore()
  const { setMobileSidebarOpen } = useUiStore()
  const user = useAuthStore((s) => s.user)
  const breadcrumbs = useBreadcrumbs()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showNotif, setShowNotif] = useState(false)

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
  })

  const unread = notifications.filter((n) => !n.read).length

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) navigate(`/students?search=${encodeURIComponent(search)}`)
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card/80 px-4 backdrop-blur-md lg:px-6">
      <button
        type="button"
        onClick={() => setMobileSidebarOpen(true)}
        className="rounded-lg p-2 hover:bg-background lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <nav className="hidden items-center gap-1 text-sm md:flex">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.path} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-4 w-4 text-muted" />}
            <span className={cn(crumb.isLast ? 'font-medium text-foreground' : 'text-muted')}>
              {crumb.label}
            </span>
          </span>
        ))}
      </nav>

      <form onSubmit={handleSearch} className="ml-auto flex max-w-xs flex-1 items-center gap-2 sm:max-w-sm">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search students, courses..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </form>

      <div className="flex items-center gap-1">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotif(!showNotif)}
            className="relative rounded-lg p-2 hover:bg-background"
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] text-white">
                {unread}
              </span>
            )}
          </button>
          {showNotif && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card p-2 shadow-xl">
              <p className="px-2 py-1 text-sm font-semibold">Notifications</p>
              {notifications.slice(0, 5).map((n) => (
                <div key={n.id} className="rounded-lg px-2 py-2 hover:bg-background">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted line-clamp-1">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-lg p-2 hover:bg-background"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </button>

        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="rounded-full"
        >
          <Avatar>
            <AvatarFallback>{user?.name?.charAt(0) ?? 'U'}</AvatarFallback>
          </Avatar>
        </button>
      </div>
    </header>
  )
}
