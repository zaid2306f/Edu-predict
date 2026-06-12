import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/services/api'
import { fetchFeedback } from '@/services/dataService'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'

const feedbackSchema = z.object({
  message: z.string().min(10, 'Please provide at least 10 characters'),
})

const ticketSchema = z.object({
  subject: z.string().min(3),
  priority: z.enum(['low', 'medium', 'high']),
  description: z.string().min(10),
})

export function FeedbackPage() {
  const queryClient = useQueryClient()
  const feedbackForm = useForm({ resolver: zodResolver(feedbackSchema) })
  const ticketForm = useForm({
    resolver: zodResolver(ticketSchema),
    defaultValues: { priority: 'medium' as const },
  })

  const { data: feedbackList = [], isLoading } = useQuery({
    queryKey: ['feedback'],
    queryFn: fetchFeedback,
  })

  const submitFeedback = async (payload: { message: string }) => {
    await api.post('/feedback', {
      type: 'feedback',
      message: payload.message,
    })
    toast.success('Feedback submitted!')
    feedbackForm.reset()
    queryClient.invalidateQueries({ queryKey: ['feedback'] })
  }

  const submitTicket = async (payload: { subject: string; priority: 'low' | 'medium' | 'high'; description: string }) => {
    await api.post('/feedback', {
      type: 'ticket',
      subject: payload.subject,
      priority: payload.priority,
      message: payload.description,
    })
    toast.success('Ticket created!')
    ticketForm.reset({ priority: 'medium', subject: '', description: '' })
    queryClient.invalidateQueries({ queryKey: ['feedback'] })
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Feedback & Support" description="Share feedback or raise a support ticket" />
      <Tabs defaultValue="feedback">
        <TabsList>
          <TabsTrigger value="feedback">Submit Feedback</TabsTrigger>
          <TabsTrigger value="support">Contact Support</TabsTrigger>
          <TabsTrigger value="ticket">Raise Ticket</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="feedback">
          <Card>
            <CardHeader><CardTitle>Your Feedback</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={feedbackForm.handleSubmit(submitFeedback)} className="space-y-4">
                <div>
                  <Label>Message</Label>
                  <Textarea className="mt-1.5" rows={5} {...feedbackForm.register('message')} />
                  {feedbackForm.formState.errors.message && (
                    <p className="text-xs text-danger">{feedbackForm.formState.errors.message.message}</p>
                  )}
                </div>
                <Button type="submit">Submit Feedback</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="support">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted">Email us at <strong>support@edupredict.com</strong></p>
              <p className="mt-2 text-muted">Phone: +1 (800) 555-0199 · Mon–Fri 9am–6pm EST</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="ticket">
          <Card>
            <CardHeader><CardTitle>Support Ticket</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={ticketForm.handleSubmit(submitTicket)} className="space-y-4">
                <div>
                  <Label>Subject</Label>
                  <Input className="mt-1.5" {...ticketForm.register('subject')} />
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={ticketForm.watch('priority')} onValueChange={(v) => ticketForm.setValue('priority', v as 'low' | 'medium' | 'high')}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea className="mt-1.5" rows={4} {...ticketForm.register('description')} />
                </div>
                <Button type="submit">Submit Ticket</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle>Submitted Feedback & Tickets</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
              ) : feedbackList.length === 0 ? (
                <p className="text-sm text-muted">No feedback submitted yet.</p>
              ) : (
                <div className="space-y-3">
                  {feedbackList.map((item) => (
                    <div key={item._id} className="rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium capitalize">{item.type ?? 'feedback'}</p>
                        <p className="text-xs text-muted">{item.created_at ? String(item.created_at).slice(0, 10) : ''}</p>
                      </div>
                      {item.subject && <p className="mt-1 text-sm font-medium">{item.subject}</p>}
                      <p className="mt-1 text-sm text-muted">{item.message}</p>
                      {item.priority && <p className="mt-1 text-xs text-muted">Priority: {item.priority}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
