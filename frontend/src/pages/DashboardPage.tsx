import { useQuery } from '@tanstack/react-query'
import {
  Users,
  UserCheck,
  GraduationCap,
  CalendarCheck,
  AlertTriangle,
  BookOpen,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { fetchDashboard } from '@/services/dashboardService'
import { formatNumber, formatPercent } from '@/lib/utils'
import { KpiCard } from '@/components/shared/KpiCard'
import { ChartCard } from '@/components/shared/ChartCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { chartColors } from '@/theme/colors'

export function DashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['dashboard'], queryFn: fetchDashboard })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-danger" />
        <h2 className="text-xl font-semibold">Could not load dashboard</h2>
        <p className="text-muted">Make sure the backend is running on port 8000.</p>
        <button type="button" className="rounded-lg bg-primary px-4 py-2 text-white" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    )
  }

  const kpis = data.kpis

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Dashboard"
        description="Real-time educational analytics overview"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard title="Total Students" value={formatNumber(kpis.totalStudents)} change={data.trends.students_change} icon={Users} trend="up" />
        <KpiCard title="Active Students" value={formatNumber(kpis.activeStudents)} change={data.trends.students_change} icon={UserCheck} trend="up" />
        <KpiCard title="Average GPA" value={kpis.averageGpa.toFixed(2)} change={data.trends.gpa_change} icon={GraduationCap} trend="up" />
        <KpiCard title="Attendance Rate" value={formatPercent(kpis.attendanceRate)} change={data.trends.attendance_change} icon={CalendarCheck} trend="up" />
        <KpiCard title="Dropout Risk" value={kpis.dropoutRiskStudents} change={data.trends.dropout_change} icon={AlertTriangle} trend="down" />
        <KpiCard title="Course Enrollment" value={formatNumber(kpis.courseEnrollment)} change={data.trends.enrollment_change} icon={BookOpen} trend="up" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Student Performance Trend" description="GPA and pass rate over time">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.performanceTrend}>
              <defs>
                <linearGradient id="gpaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="gpa" stroke="#4F46E5" fill="url(#gpaGrad)" name="GPA" />
              <Area type="monotone" dataKey="passRate" stroke="#06B6D4" fill="transparent" name="Pass Rate %" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Attendance Trend">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.attendanceTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[80, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="rate" stroke="#22C55E" strokeWidth={2} name="Attendance %" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Dropout Risk Distribution">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data.dropoutDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4}>
                {data.dropoutDistribution.map((_, i) => (
                  <Cell key={i} fill={chartColors[i % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Course Demand Forecast">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.courseDemandForecast}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="demand" fill="#7C3AED" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Academic Success Rate by Subject" className="lg:col-span-2">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.academicSuccessRate} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} />
            <YAxis dataKey="subject" type="category" width={60} />
            <Tooltip />
            <Bar dataKey="rate" fill="#4F46E5" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data!.activities.map((a) => (
                <div key={a.id} className="flex gap-3 border-l-2 border-primary pl-4">
                  <div>
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted">{a.description}</p>
                    <p className="mt-0.5 text-xs text-muted">{new Date(a.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.alerts.map((alert) => (
              <div key={alert.id} className="flex items-start justify-between rounded-lg bg-background p-3">
                <div>
                  <p className="text-sm font-medium">{alert.title}</p>
                  <p className="text-xs text-muted">{alert.message}</p>
                </div>
                <Badge variant={alert.severity === 'danger' ? 'danger' : 'warning'}>
                  {alert.category}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
