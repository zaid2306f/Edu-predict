import api from '@/services/api'

async function safeGet<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await api.get(url)
    return res.data as T
  } catch {
    return fallback
  }
}

export async function fetchDashboard() {
  const overview = await safeGet<{
    total_students: number
    active_students: number
    avg_gpa: number
    attendance_rate: number
    dropout_risk: number
    course_demand: number
    high_risk_students?: number
    total_enrollment?: number
    trends?: {
      students_change: string
      gpa_change: string
      attendance_change: string
      dropout_change: string
      enrollment_change: string
    }
  }>('/dashboard/overview', {
    total_students: 0,
    active_students: 0,
    avg_gpa: 0,
    attendance_rate: 0,
    dropout_risk: 0,
    course_demand: 0,
  })

  const [performanceRows, attendanceRows, dropoutRaw, alertRows, courseDemandRows, courseRows] = await Promise.all([
    safeGet<Array<{ semester?: number; gpa?: number }>>('/analytics/performance-trend', []),
    safeGet<Array<{ date?: string; attendance?: number }>>('/analytics/attendance-trend', []),
    safeGet<{ low: number; medium: number; high: number }>('/analytics/dropout-distribution', { low: 0, medium: 0, high: 0 }),
    safeGet<Array<Record<string, unknown>>>('/alerts', []),
    safeGet<Array<{ course?: string; demand?: number }>>('/analytics/course-demand', []),
    safeGet<Array<{ name?: string; completion_rate?: number }>>('/courses', []),
  ])

  const semesterMap = new Map<number, { gpaSum: number; count: number }>()
  for (const row of performanceRows) {
    const semester = Number(row.semester ?? 0)
    const current = semesterMap.get(semester) ?? { gpaSum: 0, count: 0 }
    current.gpaSum += Number(row.gpa ?? 0)
    current.count += 1
    semesterMap.set(semester, current)
  }
  const performanceTrend = Array.from(semesterMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([semester, value]) => ({
      month: `S${semester}`,
      gpa: Number((value.gpaSum / value.count).toFixed(2)),
      passRate: Math.round(Math.max(0, Math.min(100, (value.gpaSum / value.count) * 25))),
    }))

  const dateMap = new Map<string, { total: number; count: number }>()
  for (const row of attendanceRows) {
    const key = String(row.date ?? '').slice(0, 10)
    if (!key) continue
    const current = dateMap.get(key) ?? { total: 0, count: 0 }
    current.total += Number(row.attendance ?? 0)
    current.count += 1
    dateMap.set(key, current)
  }
  const attendanceTrend = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([date, value]) => ({
      month: date.slice(5),
      rate: Math.round((value.total / value.count) * 100),
    }))

  const dropoutDistribution = [
    { name: 'Low', value: Number(dropoutRaw.low ?? 0) },
    { name: 'Medium', value: Number(dropoutRaw.medium ?? 0) },
    { name: 'High', value: Number(dropoutRaw.high ?? 0) },
  ]

  const courseDemandForecast = courseDemandRows.slice(0, 8).map((row) => ({
    month: String(row.course ?? '').slice(0, 8),
    demand: Number(row.demand ?? 0),
  }))

  const academicSuccessRate = courseRows.slice(0, 8).map((course) => ({
    subject: String(course.name ?? '').slice(0, 10),
    rate: Number(course.completion_rate ?? 0),
  }))

  const alerts = alertRows.slice(0, 4).map((a, idx) => {
    const type = String(a.type ?? 'System Alert').toLowerCase()
    const category = type.includes('attendance')
      ? 'attendance'
      : type.includes('academic')
        ? 'academic'
        : type.includes('dropout') || type.includes('risk')
          ? 'risk'
          : 'system'
    return {
      id: String(a._id ?? idx),
      title: String(a.type ?? 'System Alert'),
      message: String(a.message ?? ''),
      category: category as 'attendance' | 'academic' | 'risk' | 'system',
      severity: String(a.severity ?? '').toLowerCase() === 'high' ? ('danger' as const) : ('warning' as const),
    }
  })

  return {
    kpis: {
      totalStudents: overview.total_students ?? 0,
      activeStudents: overview.active_students ?? 0,
      averageGpa: overview.avg_gpa ?? 0,
      attendanceRate: overview.attendance_rate ?? 0,
      dropoutRiskStudents: overview.high_risk_students ?? Math.round((overview.dropout_risk ?? 0) * (overview.total_students ?? 0)),
      courseEnrollment: Math.round(overview.course_demand ?? 0),
    },
    performanceTrend,
    attendanceTrend,
    dropoutDistribution,
    courseDemandForecast,
    academicSuccessRate,
    activities: alertRows.slice(0, 4).map((row, idx) => ({
      id: String(row._id ?? idx),
      title: String(row.type ?? 'System Alert'),
      description: String(row.message ?? ''),
      timestamp: String(row.created_at ?? new Date().toISOString()),
      type: 'system' as const,
    })),
    alerts,
    trends: overview.trends ?? {
      students_change: `${overview.active_students} active`,
      gpa_change: `${overview.avg_gpa} avg GPA`,
      attendance_change: `${overview.attendance_rate}% attendance`,
      dropout_change: `${overview.high_risk_students ?? 0} at risk`,
      enrollment_change: `${overview.total_enrollment ?? 0} enrollments`,
    },
  }
}
