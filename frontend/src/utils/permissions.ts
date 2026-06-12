import type { UserRole } from '@/types'

export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  '/dashboard': ['admin', 'teacher', 'student', 'analyst'],
  '/students': ['admin', 'teacher'],
  '/students/:id': ['admin', 'teacher'],
  '/teachers': ['admin'],
  '/courses': ['admin', 'teacher'],
  '/attendance': ['admin', 'teacher', 'student'],
  '/data-sources': ['admin', 'analyst'],
  '/predictions': ['admin', 'student', 'analyst'],
  '/analytics': ['admin', 'teacher', 'analyst'],
  '/alerts': ['admin', 'teacher', 'analyst'],
  '/reports': ['admin', 'analyst'],
  '/feedback': ['admin', 'teacher', 'student', 'analyst'],
  '/settings': ['admin', 'teacher', 'student', 'analyst'],
  '/profile': ['admin', 'teacher', 'student', 'analyst'],
}

const MENU_ITEMS: { path: string; roles: UserRole[] }[] = [
  { path: '/dashboard', roles: ['admin', 'teacher', 'student', 'analyst'] },
  { path: '/students', roles: ['admin', 'teacher'] },
  { path: '/teachers', roles: ['admin'] },
  { path: '/courses', roles: ['admin', 'teacher'] },
  { path: '/attendance', roles: ['admin', 'teacher', 'student'] },
  { path: '/data-sources', roles: ['admin', 'analyst'] },
  { path: '/predictions', roles: ['admin', 'student', 'analyst'] },
  { path: '/analytics', roles: ['admin', 'teacher', 'analyst'] },
  { path: '/alerts', roles: ['admin', 'teacher', 'analyst'] },
  { path: '/reports', roles: ['admin', 'analyst'] },
  { path: '/feedback', roles: ['admin', 'teacher', 'student', 'analyst'] },
  { path: '/settings', roles: ['admin', 'teacher', 'student', 'analyst'] },
]

export function canAccessRoute(role: UserRole, path: string): boolean {
  const normalized = path.replace(/\/[a-f0-9-]+$/i, '/:id').replace(/\/\d+$/, '/:id')
  const entry = MENU_ITEMS.find((m) => m.path === path || m.path === normalized)
  if (!entry) return true
  return entry.roles.includes(role)
}

export function getMenuForRole(role: UserRole) {
  return MENU_ITEMS.filter((m) => m.roles.includes(role))
}

export function getDefaultRoute(role: UserRole): string {
  switch (role) {
    case 'student':
      return '/dashboard'
    case 'analyst':
      return '/analytics'
    default:
      return '/dashboard'
  }
}
