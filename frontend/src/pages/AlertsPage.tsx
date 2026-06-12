import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { fetchAlerts, markAlertRead, scanAlerts } from '@/services/dataService'
import { useAlertsSocket } from '@/hooks/useAlertsSocket'
import { PageHeader } from '@/components/shared/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function AlertsPage() {
  const queryClient = useQueryClient()
  const { data: alerts = [], isLoading } = useQuery({ queryKey: ['alerts'], queryFn: fetchAlerts })
  const liveAlerts = useAlertsSocket(alerts)
  const [filter, setFilter] = useState('all')

  const readMutation = useMutation({
    mutationFn: markAlertRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  })

  const scanMutation = useMutation({
    mutationFn: scanAlerts,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast.success(`Scanned thresholds — ${data.created} new alerts`)
    },
  })

  const items = liveAlerts
  const filtered = filter === 'all' ? items : items.filter((a) => a.category === filter)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts Center"
        description="Real-time notifications for academic anomalies and threshold breaches"
        actions={
          <Button variant="outline" onClick={() => scanMutation.mutate()} disabled={scanMutation.isPending}>
            <RefreshCw className="h-4 w-4" /> Scan Thresholds
          </Button>
        }
      />
      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          <SelectItem value="attendance">Attendance</SelectItem>
          <SelectItem value="academic">Academic</SelectItem>
          <SelectItem value="risk">Risk</SelectItem>
          <SelectItem value="system">System</SelectItem>
        </SelectContent>
      </Select>
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => (
            <Card key={alert.id} className={alert.read ? 'opacity-60' : ''}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex gap-3">
                  <div className="rounded-lg bg-primary/10 p-2"><Bell className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="font-medium">{alert.title}</p>
                    <p className="text-sm text-muted">{alert.message}</p>
                    <p className="mt-1 text-xs text-muted">{new Date(alert.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={alert.severity === 'danger' ? 'danger' : alert.severity === 'warning' ? 'warning' : 'default'}>
                    {alert.category}
                  </Badge>
                  {!alert.read && (
                    <Button variant="outline" size="sm" onClick={() => readMutation.mutate(alert.id)}>Mark read</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
