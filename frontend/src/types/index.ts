export type UserRole = 'admin' | 'teacher' | 'student' | 'analyst'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
}

export type RiskLevel = 'low' | 'medium' | 'high'

export interface Student {
  id: string
  studentId: string
  name: string
  email: string
  course: string
  gpa: number
  attendance: number
  riskLevel: RiskLevel
  grade?: string
  phone?: string
  enrollmentDate?: string
  semester?: number
}

export interface Teacher {
  id: string
  name: string
  email: string
  department: string
  courses: string[]
  studentCount: number
  rating: number
  avatar?: string
}

export interface Course {
  id: string
  name: string
  code: string
  instructor: string
  enrollment: number
  capacity: number
  completionRate: number
  popularity: number
}

export interface Alert {
  id: string
  title: string
  message: string
  category: 'attendance' | 'academic' | 'risk' | 'system'
  read: boolean
  createdAt: string
  severity: 'info' | 'warning' | 'danger'
}

export interface Activity {
  id: string
  title: string
  description: string
  timestamp: string
  type: 'student' | 'course' | 'system' | 'prediction'
}

export interface Dataset {
  id: string
  name: string
  source: 'academic' | 'lms' | 'attendance' | 'demographics'
  records: number
  size: string
  lastUpdated: string
  status: 'active' | 'processing' | 'error'
}

export interface Notification {
  id: string
  title: string
  message: string
  read: boolean
  createdAt: string
}

export interface KpiData {
  totalStudents: number
  activeStudents: number
  averageGpa: number
  attendanceRate: number
  dropoutRiskStudents: number
  courseEnrollment: number
}
