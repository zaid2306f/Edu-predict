import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { fetchStudent } from '@/services/studentsService'
import { PageHeader } from '@/components/shared/PageHeader'
import { RiskBadge } from '@/components/shared/RiskBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: student, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: () => fetchStudent(id!),
    enabled: !!id,
  })

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64" /></div>
  if (!student) return <p>Student not found</p>

  return (
    <div className="space-y-6">
      <PageHeader title={student.name} description={student.studentId} />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div><p className="text-sm text-muted">Email</p><p className="font-medium">{student.email}</p></div>
              <div><p className="text-sm text-muted">Phone</p><p className="font-medium">{student.phone}</p></div>
              <div><p className="text-sm text-muted">Course</p><p className="font-medium">{student.course}</p></div>
              <div><p className="text-sm text-muted">Enrollment</p><p className="font-medium">{student.enrollmentDate}</p></div>
              <div><p className="text-sm text-muted">Risk Level</p><RiskBadge level={student.riskLevel} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academic">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>GPA Overview</CardTitle></CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-primary">{student.gpa.toFixed(2)}</p>
                <p className="text-sm text-muted">Current cumulative GPA</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Grades</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead><tr className="text-muted"><th className="pb-2 text-left">Course</th><th>Grade</th><th>Credits</th></tr></thead>
                  <tbody>
                    {student.grades.map((g) => (
                      <tr key={g.course} className="border-t border-border"><td className="py-2">{g.course}</td><td className="text-center font-medium">{g.grade}</td><td className="text-center">{g.credits}</td></tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader><CardTitle>Monthly Attendance</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={student.monthlyAttendance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="rate" fill="#4F46E5" radius={[4, 4, 0, 0]} name="Attendance %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card><CardContent className="p-6 text-center"><p className="text-sm text-muted">Pass Probability</p><p className="mt-2 text-3xl font-bold text-success">{student.predictions.passProbability}%</p></CardContent></Card>
            <Card><CardContent className="p-6 text-center"><p className="text-sm text-muted">Dropout Risk</p><p className="mt-2 text-3xl font-bold text-danger">{student.predictions.dropoutRisk}%</p></CardContent></Card>
            <Card><CardContent className="p-6 text-center"><p className="text-sm text-muted">Performance Forecast</p><p className="mt-2 text-3xl font-bold text-primary">{student.predictions.performanceForecast.toFixed(2)}</p></CardContent></Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
