import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

const LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  students: 'Students',
  teachers: 'Teachers',
  courses: 'Courses',
  attendance: 'Attendance',
  'data-sources': 'Data Sources',
  predictions: 'Predictions',
  analytics: 'Analytics',
  alerts: 'Alerts',
  reports: 'Reports',
  feedback: 'Feedback',
  settings: 'Settings',
  profile: 'Profile',
  login: 'Login',
  register: 'Register',
}

export function useBreadcrumbs() {
  const { pathname } = useLocation()
  return useMemo(() => {
    const segments = pathname.split('/').filter(Boolean)
    return segments.map((seg, i) => ({
      label: LABELS[seg] ?? seg,
      path: '/' + segments.slice(0, i + 1).join('/'),
      isLast: i === segments.length - 1,
    }))
  }, [pathname])
}
