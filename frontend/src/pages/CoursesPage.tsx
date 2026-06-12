import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '@/services/api'
import { fetchCourses, createCourse, updateCourse, deleteCourse } from '@/services/dataService'
import { PageHeader } from '@/components/shared/PageHeader'
import { ChartCard } from '@/components/shared/ChartCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Course } from '@/types'

async function fetchCourseDemandForecast() {
  const res = await api.get('/analytics/course-demand')
  return (res.data as Array<{ course?: string; demand?: number }>).map((row) => ({
    month: String(row.course ?? '').slice(0, 8),
    demand: Number(row.demand ?? 0),
  }))
}

export function CoursesPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Course | null>(null)
  const [form, setForm] = useState({ name: '', code: '', instructor: '', enrolled: 50, completed: 40, rating: 4 })
  const queryClient = useQueryClient()

  const { data: courses = [], isLoading } = useQuery({ queryKey: ['courses'], queryFn: fetchCourses })
  const { data: courseDemandForecast = [] } = useQuery({
    queryKey: ['course-demand-forecast'],
    queryFn: fetchCourseDemandForecast,
  })

  const saveMutation = useMutation({
    mutationFn: () => (editing ? updateCourse(editing.id, form) : createCourse(form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      toast.success(editing ? 'Course updated' : 'Course created')
      setFormOpen(false)
      setEditing(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCourse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      toast.success('Course deleted')
    },
  })

  const completionData = courses.slice(0, 8).map((c) => ({ name: c.code, rate: c.completionRate }))

  const openEdit = (c: Course) => {
    setEditing(c)
    setForm({
      name: c.name,
      code: c.code,
      instructor: c.instructor,
      enrolled: c.enrollment,
      completed: Math.round(c.enrollment * (c.completionRate / 100)),
      rating: c.popularity / 20,
    })
    setFormOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Courses"
        description="Course catalog and enrollment analytics"
        actions={
          <Button onClick={() => { setEditing(null); setForm({ name: '', code: '', instructor: '', enrolled: 50, completed: 40, rating: 4 }); setFormOpen(true) }}>
            <Plus className="h-4 w-4" /> Add Course
          </Button>
        }
      />

      {formOpen && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editing ? 'Edit Course' : 'Add Course'}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setFormOpen(false)}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate() }} className="grid gap-4 sm:grid-cols-3">
              <div><Label>Name</Label><Input className="mt-1.5" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div><Label>Code</Label><Input className="mt-1.5" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required /></div>
              <div><Label>Instructor</Label><Input className="mt-1.5" value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })} required /></div>
              <div><Label>Enrolled</Label><Input className="mt-1.5" type="number" value={form.enrolled} onChange={(e) => setForm({ ...form, enrolled: Number(e.target.value) })} required /></div>
              <div><Label>Completed</Label><Input className="mt-1.5" type="number" value={form.completed} onChange={(e) => setForm({ ...form, completed: Number(e.target.value) })} /></div>
              <div><Label>Rating</Label><Input className="mt-1.5" type="number" step="0.1" min={0} max={5} value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} /></div>
              <div className="flex gap-2 sm:col-span-3">
                <Button type="submit" disabled={saveMutation.isPending}>Save</Button>
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Enrollment Growth">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={courseDemandForecast}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="demand" stroke="#4F46E5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Completion Rate">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={completionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="rate" fill="#7C3AED" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge>{c.code}</Badge>
                    <h3 className="mt-2 font-semibold">{c.name}</h3>
                    <p className="text-sm text-muted">{c.instructor}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="h-4 w-4 text-danger" /></Button>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-sm"><span>Enrollment</span><span>{c.enrollment}/{c.capacity}</span></div>
                  <div className="mt-1 h-2 rounded-full bg-background">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${(c.enrollment / c.capacity) * 100}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
