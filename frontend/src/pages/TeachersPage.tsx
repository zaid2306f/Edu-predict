import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Star, Plus, Pencil, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { fetchTeachers, createTeacher, updateTeacher, deleteTeacher } from '@/services/dataService'
import { useDebounce } from '@/hooks/useDebounce'
import { PageHeader } from '@/components/shared/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { Teacher } from '@/types'

export function TeachersPage() {
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Teacher | null>(null)
  const [form, setForm] = useState({ name: '', email: '', department: '' })
  const debounced = useDebounce(search)
  const queryClient = useQueryClient()

  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ['teachers'],
    queryFn: fetchTeachers,
  })

  const saveMutation = useMutation({
    mutationFn: () => (editing ? updateTeacher(editing.id, form) : createTeacher(form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      toast.success(editing ? 'Teacher updated' : 'Teacher created')
      setFormOpen(false)
      setEditing(null)
      setForm({ name: '', email: '', department: '' })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTeacher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      toast.success('Teacher deleted')
    },
  })

  const filtered = teachers.filter(
    (t) =>
      !debounced ||
      t.name.toLowerCase().includes(debounced.toLowerCase()) ||
      t.department.toLowerCase().includes(debounced.toLowerCase())
  )

  const openEdit = (t: Teacher) => {
    setEditing(t)
    setForm({ name: t.name, email: t.email, department: t.department })
    setFormOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teachers"
        description="Faculty management and performance"
        actions={
          <Button onClick={() => { setEditing(null); setForm({ name: '', email: '', department: '' }); setFormOpen(true) }}>
            <Plus className="h-4 w-4" /> Add Teacher
          </Button>
        }
      />

      {formOpen && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editing ? 'Edit Teacher' : 'Add Teacher'}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setFormOpen(false)}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate() }} className="grid gap-4 sm:grid-cols-3">
              <div><Label>Name</Label><Input className="mt-1.5" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div><Label>Email</Label><Input className="mt-1.5" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
              <div><Label>Department</Label><Input className="mt-1.5" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required /></div>
              <div className="flex gap-2 sm:col-span-3">
                <Button type="submit" disabled={saveMutation.isPending}>Save</Button>
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input placeholder="Search teachers..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48" />)}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <Card key={t.id} className="transition-shadow hover:shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12"><AvatarFallback>{t.name.charAt(0)}</AvatarFallback></Avatar>
                    <div>
                      <h3 className="font-semibold">{t.name}</h3>
                      <p className="text-sm text-muted">{t.department}</p>
                      <p className="text-xs text-muted">{t.email}</p>
                      <div className="mt-2 flex items-center gap-1 text-warning">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="text-sm font-medium">{t.rating}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(t.id)}><Trash2 className="h-4 w-4 text-danger" /></Button>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1">
                  {t.courses.map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
