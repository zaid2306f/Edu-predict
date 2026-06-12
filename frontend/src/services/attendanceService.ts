import api from '@/services/api'

export async function fetchAttendanceStats() {
  const res = await api.get('/attendance/stats')
  const data = res.data as {
    daily_attendance: number
    weekly_attendance: number
    monthly_attendance: number
    distribution?: { present: number; absent: number; late: number }
  }
  return {
    daily: Math.round(data.daily_attendance * 100),
    weekly: Math.round(data.weekly_attendance * 100),
    monthly: Math.round(data.monthly_attendance * 100),
    distribution: data.distribution ?? { present: 0, absent: 0, late: 0 },
  }
}

export async function fetchAttendanceTrend() {
  const res = await api.get('/analytics/attendance-trend')
  const rows = res.data as Array<{ date?: string; attendance?: number }>

  const byDate = new Map<string, { total: number; count: number }>()
  for (const row of rows) {
    const date = String(row.date ?? '').slice(0, 10)
    if (!date) continue
    const current = byDate.get(date) ?? { total: 0, count: 0 }
    current.total += Number(row.attendance ?? 0)
    current.count += 1
    byDate.set(date, current)
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, value]) => ({
      date,
      rate: Math.round((value.total / value.count) * 100),
    }))
}

export async function recordAttendance(data: { student_id: string; status: number; date?: string }) {
  const res = await api.post('/attendance', data)
  return res.data
}

export async function fetchAttendanceHeatmap() {
  const res = await api.get('/attendance/heatmap')
  return res.data as Array<{ day: string; time: string; value: number }>
}

export async function fetchAttendanceCharts() {
  const [stats, trend, heatmap] = await Promise.all([
    fetchAttendanceStats(),
    fetchAttendanceTrend(),
    fetchAttendanceHeatmap(),
  ])

  const daily = trend.slice(-5).map((t) => ({
    day: t.date.slice(5),
    present: t.rate,
    absent: Math.max(0, 100 - t.rate),
  }))

  const weekly = trend.slice(-4).map((t, i) => ({
    week: `W${i + 1}`,
    rate: t.rate,
  }))

  const monthly = trend.slice(-6).map((t) => ({
    month: t.date.slice(5, 7),
    rate: t.rate,
  }))

  const dist = stats.distribution
  const pieData = [
    { name: 'Present', value: dist.present },
    { name: 'Absent', value: dist.absent },
    { name: 'Late', value: dist.late },
  ]

  return { stats, daily, weekly, monthly, pieData, heatmap }
}
