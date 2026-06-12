import { Fragment, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { fetchAttendanceCharts, recordAttendance } from '@/services/attendanceService'
import { fetchStudents } from '@/services/studentsService'
import { useAuthStore } from '@/store/authStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { ChartCard } from '@/components/shared/ChartCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { chartColors } from '@/theme/colors'

export function AttendancePage() {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [studentId, setStudentId] = useState('')
  const [status, setStatus] = useState('1')

  const { data, isLoading } = useQuery({
    queryKey: ['attendance-charts'],
    queryFn: fetchAttendanceCharts,
  })
  const { data: studentsData } = useQuery({
    queryKey: ['students-list'],
    queryFn: () => fetchStudents({ pageSize: 1000 }),
    enabled: user?.role === 'admin' || user?.role === 'teacher',
  })

  const recordMutation = useMutation({
    mutationFn: () => recordAttendance({ student_id: studentId, status: Number(status) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-charts'] })
      toast.success('Attendance recorded')
      setStudentId('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72" />)}
        </div>
      </div>
    )
  }

  const timeSlots = [...new Set(data.heatmap.map((h) => h.time))]
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

  const canRecord = user?.role === 'admin' || user?.role === 'teacher'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Analytics"
        description={`Live attendance: daily ${data.stats.daily}%, weekly ${data.stats.weekly}%, monthly ${data.stats.monthly}%`}
      />

      {canRecord && (
        <Card>
          <CardHeader><CardTitle>Record Attendance</CardTitle></CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => { e.preventDefault(); recordMutation.mutate() }}
              className="flex flex-col gap-4 sm:flex-row sm:items-end"
            >
              <div className="flex-1">
                <Label>Student</Label>
                <Select value={studentId} onValueChange={setStudentId}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>
                    {(studentsData?.data ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.studentId}>{s.name} ({s.studentId})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-40">
                <Label>Status (0=absent, 1=present)</Label>
                <Input className="mt-1.5" type="number" min={0} max={1} step={0.5} value={status} onChange={(e) => setStatus(e.target.value)} />
              </div>
              <Button type="submit" disabled={!studentId || recordMutation.isPending}>Save</Button>
            </form>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Daily Attendance">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line dataKey="present" stroke="#22C55E" name="Present %" />
              <Line dataKey="absent" stroke="#EF4444" name="Absent %" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Weekly Trend">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.weekly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line dataKey="rate" stroke="#4F46E5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Monthly Overview">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line dataKey="rate" stroke="#06B6D4" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Attendance Distribution">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                {data.pieData.map((_, i) => <Cell key={i} fill={chartColors[i]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <ChartCard title="Attendance Heatmap (by day & week)">
        <div className="grid gap-1 text-xs" style={{ gridTemplateColumns: `auto repeat(${timeSlots.length}, 1fr)` }}>
          <div />
          {timeSlots.map((t) => (
            <div key={t} className="text-center text-muted">{t}</div>
          ))}
          {days.map((day) => (
            <Fragment key={day}>
              <div className="flex items-center text-muted">{day}</div>
              {timeSlots.map((time) => {
                const cell = data.heatmap.find((h) => h.day === day && h.time === time)
                const value = cell?.value ?? 0
                return (
                  <div
                    key={`${day}-${time}`}
                    className="flex h-10 items-center justify-center rounded text-white"
                    style={{ backgroundColor: `rgba(79, 70, 229, ${value / 100})` }}
                    title={`${value}%`}
                  >
                    {value}%
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
      </ChartCard>
    </div>
  )
}
