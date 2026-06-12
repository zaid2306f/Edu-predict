import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Filter, Download, Eye, Pencil, Trash2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { fetchStudents, deleteStudent, createStudent, updateStudent, type StudentFormData } from '@/services/studentsService'
import { fetchCourses } from '@/services/dataService'
import { useDebounce } from '@/hooks/useDebounce'
import { exportToCsv } from '@/utils/export'
import { PageHeader } from '@/components/shared/PageHeader'
import { RiskBadge } from '@/components/shared/RiskBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users } from 'lucide-react'
import type { Student } from '@/types'

const emptyForm: StudentFormData = {
  studentId: '',
  name: '',
  course: '',
  semester: 4,
  attendance: 85,
  gpa: 3.0,
}

export function StudentsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [course, setCourse] = useState('')
  const [riskLevel, setRiskLevel] = useState('')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)
  const [form, setForm] = useState<StudentFormData>(emptyForm)
  const debouncedSearch = useDebounce(search)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['students', debouncedSearch, course, riskLevel, page],
    queryFn: () => fetchStudents({ search: debouncedSearch, course, riskLevel, page, pageSize: 10 }),
  })
  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: fetchCourses })

  const deleteMutation = useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      toast.success('Student deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) return updateStudent(editing.id, form)
      return createStudent(form)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      toast.success(editing ? 'Student updated' : 'Student created')
      closeForm()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  const openEdit = (student: Student) => {
    setEditing(student)
    setForm({
      studentId: student.studentId,
      name: student.name,
      course: student.course,
      semester: student.semester ?? 4,
      attendance: student.attendance,
      gpa: student.gpa,
    })
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
    setForm(emptyForm)
  }

  const handleExport = () => {
    if (data?.data) exportToCsv(data.data as unknown as Record<string, unknown>[], 'students')
    toast.success('Exported to CSV')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Management"
        description="Manage and monitor student records"
        actions={
          <div className="flex gap-2">
            <Button onClick={openCreate}><Plus className="h-4 w-4" /> Add Student</Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export
            </Button>
          </div>
        }
      />

      {formOpen && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editing ? 'Edit Student' : 'Add Student'}</CardTitle>
            <Button variant="ghost" size="icon" onClick={closeForm}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => { e.preventDefault(); saveMutation.mutate() }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <div>
                <Label>Student ID</Label>
                <Input
                  className="mt-1.5"
                  value={form.studentId}
                  disabled={!!editing}
                  onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Name</Label>
                <Input className="mt-1.5" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <Label>Course</Label>
                <Select value={form.course} onValueChange={(v) => setForm({ ...form, course: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select course" /></SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Semester</Label>
                <Input
                  className="mt-1.5"
                  type="number"
                  min={1}
                  max={12}
                  value={form.semester}
                  onChange={(e) => setForm({ ...form, semester: Number(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label>Attendance %</Label>
                <Input
                  className="mt-1.5"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={form.attendance}
                  onChange={(e) => setForm({ ...form, attendance: Number(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label>GPA</Label>
                <Input
                  className="mt-1.5"
                  type="number"
                  min={0}
                  max={4}
                  step={0.01}
                  value={form.gpa}
                  onChange={(e) => setForm({ ...form, gpa: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {editing ? 'Save Changes' : 'Create Student'}
                </Button>
                <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input placeholder="Search students..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            </div>
            <Select value={course || 'all'} onValueChange={(v) => { setCourse(v === 'all' ? '' : v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-44"><Filter className="mr-2 h-4 w-4" /><SelectValue placeholder="Course" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={riskLevel || 'all'} onValueChange={(v) => { setRiskLevel(v === 'all' ? '' : v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Risk" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="mt-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : !data?.data.length ? (
            <EmptyState icon={Users} title="No students found" description="Try adjusting your search or filters" />
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="pb-3 pr-4 font-medium">Student ID</th>
                    <th className="pb-3 pr-4 font-medium">Name</th>
                    <th className="pb-3 pr-4 font-medium hidden md:table-cell">Course</th>
                    <th className="pb-3 pr-4 font-medium">GPA</th>
                    <th className="pb-3 pr-4 font-medium hidden sm:table-cell">Attendance</th>
                    <th className="pb-3 pr-4 font-medium">Risk</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((s) => (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-background/50">
                      <td className="py-3 pr-4 font-mono text-xs">{s.studentId}</td>
                      <td className="py-3 pr-4 font-medium">{s.name}</td>
                      <td className="py-3 pr-4 hidden md:table-cell text-muted">{s.course}</td>
                      <td className="py-3 pr-4">{s.gpa.toFixed(2)}</td>
                      <td className="py-3 pr-4 hidden sm:table-cell">{s.attendance}%</td>
                      <td className="py-3 pr-4"><RiskBadge level={s.riskLevel} /></td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => navigate(`/students/${s.id}`)}><Eye className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(s.id)}><Trash2 className="h-4 w-4 text-danger" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted">Showing {data.data.length} of {data.total}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page * data.pageSize >= data.total} onClick={() => setPage(page + 1)}>Next</Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
