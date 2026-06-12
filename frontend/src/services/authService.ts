import api from '@/services/api'
import type { User, UserRole } from '@/types'

type BackendRole = 'Admin' | 'Teacher' | 'Student' | 'Analyst'

const roleMap: Record<BackendRole, UserRole> = {
  Admin: 'admin',
  Teacher: 'teacher',
  Student: 'student',
  Analyst: 'analyst',
}

const roleMapReverse: Record<UserRole, BackendRole> = {
  admin: 'Admin',
  teacher: 'Teacher',
  student: 'Student',
  analyst: 'Analyst',
}

function mapUser(raw: Record<string, unknown>): User {
  const role = String(raw.role ?? 'Student') as BackendRole
  return {
    id: String(raw.id ?? raw._id ?? ''),
    name: String(raw.name ?? ''),
    email: String(raw.email ?? ''),
    role: roleMap[role] ?? 'student',
  }
}

async function fetchCurrentUser(token: string): Promise<User> {
  const res = await api.get('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return mapUser(res.data as Record<string, unknown>)
}

export async function login(email: string, password: string) {
  try {
    const res = await api.post('/auth/login', { email, password })
    const token: string = res.data.access_token
    const user = await fetchCurrentUser(token)
    return { user, token, refreshToken: res.data.refresh_token as string }
  } catch (error: unknown) {
    const message = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
    throw new Error(message || 'Invalid email or password')
  }
}

export async function register(data: { name: string; email: string; password: string; role: UserRole }) {
  try {
    await api.post('/auth/register', {
      name: data.name,
      email: data.email,
      password: data.password,
      role: roleMapReverse[data.role],
    })
    return await login(data.email, data.password)
  } catch (error: unknown) {
    const message = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
    throw new Error(message || 'Registration failed')
  }
}

export async function forgotPassword(email: string) {
  try {
    const res = await api.post('/auth/forgot-password', { email })
    return res.data as { message: string; reset_token?: string }
  } catch (error: unknown) {
    const message = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
    throw new Error(message || 'Failed to send reset link')
  }
}

export async function resetPassword(token: string, newPassword: string) {
  try {
    const res = await api.post('/auth/reset-password', { token, new_password: newPassword })
    return res.data as { message: string }
  } catch (error: unknown) {
    const message = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
    throw new Error(message || 'Failed to reset password')
  }
}

export async function getMe() {
  const res = await api.get('/auth/me')
  return mapUser(res.data as Record<string, unknown>)
}

export async function updateProfile(name: string) {
  const res = await api.put('/auth/profile', { name })
  return mapUser(res.data as Record<string, unknown>)
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const res = await api.post('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  })
  return res.data as { message: string }
}
