import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthLayout } from '@/layouts/AuthLayout'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { ProtectedRoute, PublicRoute } from '@/routes/ProtectedRoute'
import { RoleRoute } from '@/routes/RoleRoute'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { StudentsPage } from '@/pages/StudentsPage'
import { StudentDetailPage } from '@/pages/StudentDetailPage'
import { TeachersPage } from '@/pages/TeachersPage'
import { CoursesPage } from '@/pages/CoursesPage'
import { AttendancePage } from '@/pages/AttendancePage'
import { DataSourcesPage } from '@/pages/DataSourcesPage'
import { PredictionsPage } from '@/pages/PredictionsPage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { AlertsPage } from '@/pages/AlertsPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { FeedbackPage } from '@/pages/FeedbackPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

function ProtectedPage({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <RoleRoute>{children}</RoleRoute>
    </ProtectedRoute>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route element={<PublicRoute><AuthLayout /></PublicRoute>}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>
      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<ProtectedPage><DashboardPage /></ProtectedPage>} />
        <Route path="/students" element={<ProtectedPage><StudentsPage /></ProtectedPage>} />
        <Route path="/students/:id" element={<ProtectedPage><StudentDetailPage /></ProtectedPage>} />
        <Route path="/teachers" element={<ProtectedPage><TeachersPage /></ProtectedPage>} />
        <Route path="/courses" element={<ProtectedPage><CoursesPage /></ProtectedPage>} />
        <Route path="/attendance" element={<ProtectedPage><AttendancePage /></ProtectedPage>} />
        <Route path="/data-sources" element={<ProtectedPage><DataSourcesPage /></ProtectedPage>} />
        <Route path="/predictions" element={<ProtectedPage><PredictionsPage /></ProtectedPage>} />
        <Route path="/analytics" element={<ProtectedPage><AnalyticsPage /></ProtectedPage>} />
        <Route path="/alerts" element={<ProtectedPage><AlertsPage /></ProtectedPage>} />
        <Route path="/reports" element={<ProtectedPage><ReportsPage /></ProtectedPage>} />
        <Route path="/feedback" element={<ProtectedPage><FeedbackPage /></ProtectedPage>} />
        <Route path="/settings" element={<ProtectedPage><SettingsPage /></ProtectedPage>} />
        <Route path="/profile" element={<Navigate to="/settings" replace />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
