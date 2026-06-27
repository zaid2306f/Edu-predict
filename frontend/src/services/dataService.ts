import api from '@/services/api'
import type { Alert, Course, Dataset, Teacher } from '@/types'

function toTeacher(raw: Record<string, unknown>): Teacher {
  return {
    id: String(raw._id ?? raw.id ?? ''),
    name: String(raw.name ?? ''),
    email: String(raw.email ?? ''),
    department: String(raw.department ?? 'General'),
    courses: Array.isArray(raw.courses) ? (raw.courses as string[]) : [],
    studentCount: Number(raw.studentCount ?? 0),
    rating: Number(raw.rating ?? 4.2),
  }
}

function toCourse(raw: Record<string, unknown>): Course {
  const enrollment = Number(raw.enrollment_count ?? raw.enrolled ?? 0)
  const capacity = Math.max(enrollment, Number(raw.capacity ?? enrollment + 30))
  return {
    id: String(raw._id ?? raw.id ?? ''),
    name: String(raw.name ?? ''),
    code: String(raw.code ?? `CRS-${String(raw._id ?? raw.id ?? '').slice(-4)}`),
    instructor: String(raw.instructor ?? 'TBD'),
    enrollment,
    capacity,
    completionRate: Number(raw.completion_rate ?? 0),
    popularity: Number(raw.popularity_score ?? 0),
  }
}

function toDataset(raw: Record<string, unknown>): Dataset & { hdfsPath?: string; hadoopProcessed?: boolean } {
  const source = String(raw.source ?? 'academic') as Dataset['source']
  return {
    id: String(raw._id ?? raw.id ?? ''),
    name: String(raw.filename ?? raw.name ?? ''),
    source: ['academic', 'lms', 'attendance', 'demographics'].includes(source) ? source : 'academic',
    records: Number(raw.rows_after ?? raw.records ?? 0),
    size: String(raw.size ?? 'N/A'),
    lastUpdated: String(raw.created_at ?? new Date().toISOString()),
    status: String(raw.hdfs_status ?? 'active') === 'stored' ? 'active' : 'processing',
    hdfsPath: typeof raw.hdfs_path === 'string' ? raw.hdfs_path : undefined,
    hadoopProcessed: Boolean(raw.hadoop_processed),
  }
}

function toAlert(raw: Record<string, unknown>, idx: number): Alert {
  const kind = String(raw.type ?? 'System Alert').toLowerCase()
  const category: Alert['category'] = kind.includes('attendance')
    ? 'attendance'
    : kind.includes('academic')
      ? 'academic'
      : kind.includes('dropout') || kind.includes('risk')
        ? 'risk'
        : 'system'

  return {
    id: String(raw._id ?? idx),
    title: String(raw.type ?? 'Alert'),
    message: String(raw.message ?? ''),
    category,
    read: false,
    createdAt: String(raw.created_at ?? new Date().toISOString()),
    severity: String(raw.severity ?? 'warning').toLowerCase() === 'high' ? 'danger' : 'warning',
  }
}

export async function fetchTeachers() {
  const res = await api.get('/teachers')
  return (res.data as Record<string, unknown>[]).map(toTeacher)
}

export async function fetchCourses() {
  const res = await api.get('/courses')
  return (res.data as Record<string, unknown>[]).map(toCourse)
}

export async function fetchDatasets() {
  const res = await api.get('/datasets')
  return (res.data as Record<string, unknown>[]).map(toDataset)
}

export async function fetchAlerts() {
  const res = await api.get('/alerts')
  return (res.data as Record<string, unknown>[]).map((row, idx) => {
    const alert = toAlert(row, idx)
    return { ...alert, read: Boolean(row.read) }
  })
}

export async function markAlertRead(id: string) {
  await api.patch(`/alerts/${id}/read`)
}

export async function scanAlerts() {
  const res = await api.post('/alerts/scan')
  return res.data as { created: number }
}

export async function createTeacher(data: { name: string; email: string; department: string }) {
  const res = await api.post('/teachers', data)
  return toTeacher(res.data as Record<string, unknown>)
}

export async function updateTeacher(id: string, data: Partial<{ name: string; email: string; department: string }>) {
  const res = await api.put(`/teachers/${id}`, data)
  return toTeacher(res.data as Record<string, unknown>)
}

export async function deleteTeacher(id: string) {
  await api.delete(`/teachers/${id}`)
}

export async function createCourse(data: { name: string; code: string; instructor: string; enrolled: number; completed?: number; rating?: number }) {
  const res = await api.post('/courses', data)
  return toCourse(res.data as Record<string, unknown>)
}

export async function updateCourse(id: string, data: Partial<{ name: string; code: string; instructor: string; enrolled: number; completed: number; rating: number }>) {
  const res = await api.put(`/courses/${id}`, data)
  return toCourse(res.data as Record<string, unknown>)
}

export async function deleteCourse(id: string) {
  await api.delete(`/courses/${id}`)
}

export async function getDataset(id: string) {
  const res = await api.get(`/datasets/${id}`)
  return res.data as Record<string, unknown>
}

export async function deleteDataset(id: string) {
  await api.delete(`/datasets/${id}`)
}

export async function fetchNotifications() {
  let alerts: Awaited<ReturnType<typeof fetchAlerts>> = []
  try {
    alerts = await fetchAlerts()
  } catch {
    // Students or offline backend — notifications optional
  }
  return alerts.map((a) => ({
    id: a.id,
    title: a.title,
    message: a.message,
    read: a.read,
    createdAt: a.createdAt,
  }))
}

export async function fetchHadoopMetrics() {
  const res = await api.get('/analytics/hadoop-overview')
  return res.data as {
    dataProcessed: string
    hdfsUsage: number
    nodes: number
    fileCount?: number
    clusterStatus: string
    connected?: boolean
    namenodeUrl?: string
    totalStorage?: string
    usedStorage?: string
    hdfsFiles?: Array<{ name: string; path: string; size: string; size_bytes?: number }>
    processingSpeed: Array<{ time: string; speed: number }>
    resourceUtilization: Array<{ name: string; value: number }>
    storageGrowth: Array<{ month: string; tb: number }>
  }
}

export async function fetchHdfsFiles() {
  const res = await api.get('/hdfs/files')
  return res.data as { base_path: string; files: Array<{ name: string; path: string; size: string }> }
}

export async function fetchHdfsCluster() {
  const res = await api.get('/hdfs/cluster')
  return res.data as Record<string, unknown>
}

export async function processHdfsDataset(datasetId: string) {
  const res = await api.post(`/hdfs/process/${datasetId}`)
  return res.data as { message: string; stats: Record<string, unknown> }
}

export async function fetchPredictions() {
  const res = await api.get('/analytics/predictions-overview')
  return res.data as {
    performance: number
    dropout: number
    courseDemand: number
    riskDetection: string
    trends: Array<{ week: string; performance: number; dropout: number }>
    probabilities: Array<{ range: string; count: number }>
    gauges: Array<{ label: string; value: number; color: string }>
  }
}

export async function fetchReportsCatalog() {
  const res = await api.get('/reports/catalog')
  return res.data as Array<{ id: string; title: string; description: string }>
}

export async function fetchFeedback() {
  const res = await api.get('/feedback')
  return res.data as Array<{
    _id: string
    type?: string
    message?: string
    subject?: string
    priority?: string
    created_at?: string
  }>
}

export async function uploadDataset(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await api.post('/datasets/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return toDataset(res.data as Record<string, unknown>)
}
