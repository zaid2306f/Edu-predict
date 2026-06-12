import { useQuery } from '@tanstack/react-query'
import { FileText, Download, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { exportToCsv, printReport } from '@/utils/export'
import api from '@/services/api'
import { fetchReportsCatalog } from '@/services/dataService'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function ReportsPage() {
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports-catalog'],
    queryFn: fetchReportsCatalog,
  })

  const handleDownload = async (type: string, format: 'pdf' | 'excel') => {
    try {
      if (format === 'pdf') {
        const res = await api.get('/reports/download/pdf', { responseType: 'blob' })
        const url = URL.createObjectURL(res.data as Blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${type}-report.pdf`
        a.click()
        URL.revokeObjectURL(url)
      } else if (type === 'performance') {
        const res = await api.get('/reports/performance')
        exportToCsv(res.data as Record<string, unknown>[], `${type}-report`)
      } else {
        const res = await api.get('/reports/download/excel', { responseType: 'blob' })
        const url = URL.createObjectURL(res.data as Blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${type}-report.xlsx`
        a.click()
        URL.revokeObjectURL(url)
      }
      toast.success(`${type} report downloaded as ${format.toUpperCase()}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to download report')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Generate and export institutional reports" />
      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-3"><FileText className="h-6 w-6 text-primary" /></div>
                <div className="flex-1">
                  <h3 className="font-semibold">{r.title}</h3>
                  <p className="mt-1 text-sm text-muted">{r.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleDownload(r.id, 'pdf')}>
                      <Download className="h-4 w-4" /> PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownload(r.id, 'excel')}>
                      <Download className="h-4 w-4" /> Excel
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => printReport(r.title)}>
                      <Printer className="h-4 w-4" /> Print
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
