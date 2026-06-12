import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { canAccessRoute, getDefaultRoute } from '@/utils/permissions'

export function RoleRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const path = window.location.pathname

  if (!user) return <Navigate to="/login" replace />

  if (!canAccessRoute(user.role, path)) {
    return <Navigate to={getDefaultRoute(user.role)} replace />
  }

  return <>{children}</>
}
