import api from '@/services/api'
import type { RiskLevel, Student } from '@/types'

function inferRiskLevel(attendance: number, gpa: number): RiskLevel {
  const score = (100 - attendance) * 0.6 + (4 - gpa) * 10
  if (score > 50) return 'high'
  if (score > 30) return 'medium'
  return 'low'
}

function mapStudent(raw: Record<string, unknown>): Student {
  const attendance = Number(raw.attendance ?? 0)
  const gpa = Number(raw.gpa ?? 0)
  const riskFromApi = raw.risk_level as RiskLevel | undefined
  return {
    id: String(raw._id ?? raw.id ?? ''),
    studentId: String(raw.student_id ?? raw.studentId ?? ''),
    name: String(raw.name ?? ''),
    email: String(raw.email ?? `${String(raw.student_id ?? 'student').toLowerCase()}@edupredict.com`),
    course: String(raw.course ?? ''),
    gpa,
    attendance,
    riskLevel: riskFromApi ?? inferRiskLevel(attendance, gpa),
    grade: typeof raw.grade === 'string' ? raw.grade : undefined,
    phone: typeof raw.phone === 'string' ? raw.phone : undefined,
    enrollmentDate: typeof raw.enrollmentDate === 'string' ? raw.enrollmentDate : undefined,
    semester: Number(raw.semester ?? 4),
  }
}

export type StudentFormData = {
  studentId: string
  name: string
  course: string
  semester: number
  attendance: number
  gpa: number
}

export async function fetchStudents(params?: {
  search?: string
  course?: string
  riskLevel?: string
  page?: number
  pageSize?: number
}) {
  let data: Student[]

  if (params?.riskLevel) {
    const riskRes = await api.get('/students/risk-level')
    data = (riskRes.data as Record<string, unknown>[]).map(mapStudent)
    data = data.filter((s) => s.riskLevel === params.riskLevel)
  } else if (params?.search) {
    const searchRes = await api.get('/students/search', { params: { q: params.search } })
    data = (searchRes.data as Record<string, unknown>[]).map(mapStudent)
  } else {
    const res = await api.get('/students')
    data = (res.data as Record<string, unknown>[]).map(mapStudent)
  }

  if (params?.course) data = data.filter((s) => s.course === params.course)

  const page = params?.page ?? 1
  const pageSize = params?.pageSize ?? 10
  const total = data.length
  const start = (page - 1) * pageSize
  return { data: data.slice(start, start + pageSize), total, page, pageSize }
}

export async function fetchStudent(id: string) {
  const res = await api.get(`/students/${id}`)
  const raw = res.data as Record<string, unknown>
  const student = mapStudent(raw)
  const semester = Number(raw.semester ?? 4)

  const [performance, dropout, attendanceRes, academicRes] = await Promise.all([
    api.post('/ml/performance/predict', { attendance: student.attendance, semester }).catch(() => null),
    api.post('/ml/dropout/predict', { attendance: student.attendance, gpa: student.gpa }).catch(() => null),
    api.get(`/attendance/student/${student.studentId}`).catch(() => ({ data: [] })),
    api.get(`/students/academic-records/${student.studentId}`).catch(() => ({ data: [] })),
  ])

  const attendanceRows = (attendanceRes.data as Array<{ date?: string; timestamp?: string; status?: number }>).slice(0, 12)
  const monthlyAttendance = attendanceRows.length
    ? attendanceRows.map((row) => {
        const stamp = String(row.date ?? row.timestamp ?? '')
        const label = stamp ? stamp.slice(5, 10) : 'N/A'
        return { month: label, rate: Math.round(Number(row.status ?? 0) * 100) }
      })
    : [{ month: 'Current', rate: Math.round(student.attendance) }]

  const academicRows = academicRes.data as Array<{ semester?: number; gpa?: number }>
  const grades = academicRows.length
    ? academicRows.map((row) => ({
        course: `${student.course} (Sem ${row.semester ?? '?'})`,
        grade: Number(row.gpa ?? 0) >= 3.5 ? 'A' : Number(row.gpa ?? 0) >= 3 ? 'B+' : Number(row.gpa ?? 0) >= 2.5 ? 'B' : 'C',
        credits: 3,
      }))
    : [{ course: student.course, grade: student.grade ?? (student.gpa >= 3.5 ? 'A' : student.gpa >= 3 ? 'B+' : 'B'), credits: 3 }]

  const passProbability = performance
    ? Math.round(Number(performance.data.pass_probability ?? 0) * 100)
    : Math.round((student.gpa / 4) * 100)
  const dropoutRisk = dropout
    ? Math.round(Number(dropout.data.dropout_probability ?? 0) * 100)
    : Math.round(Math.max(0, (100 - student.attendance) / 100) * 100)

  return {
    ...student,
    predictions: {
      passProbability,
      dropoutRisk,
      performanceForecast: performance
        ? Number(performance.data.future_performance ?? student.gpa)
        : student.gpa,
    },
    monthlyAttendance,
    grades,
  }
}

export async function createStudent(data: StudentFormData) {
  const res = await api.post('/students', {
    student_id: data.studentId,
    name: data.name,
    course: data.course,
    semester: data.semester,
    attendance: data.attendance,
    gpa: data.gpa,
  })
  return mapStudent(res.data as Record<string, unknown>)
}

export async function updateStudent(id: string, data: Partial<StudentFormData>) {
  const payload: Record<string, unknown> = {}
  if (data.name !== undefined) payload.name = data.name
  if (data.course !== undefined) payload.course = data.course
  if (data.semester !== undefined) payload.semester = data.semester
  if (data.attendance !== undefined) payload.attendance = data.attendance
  if (data.gpa !== undefined) payload.gpa = data.gpa
  const res = await api.put(`/students/${id}`, payload)
  return mapStudent(res.data as Record<string, unknown>)
}

export async function deleteStudent(id: string) {
  await api.delete(`/students/${id}`)
  return { success: true, id }
}
