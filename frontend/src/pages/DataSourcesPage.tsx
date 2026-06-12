import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Database, Upload, Trash2, Eye, X } from 'lucide-react'
import { toast } from 'sonner'
import { fetchDatasets, uploadDataset, deleteDataset, getDataset } from '@/services/dataService'
import { PageHeader } from '@/components/shared/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

const SOURCE_LABELS: Record<string, string> = {
  academic: 'Academic Records',
  lms: 'LMS Data',
  attendance: 'Attendance Records',
  demographics: 'Demographics',
}

export function DataSourcesPage() {
  const [file, setFile] = useState<File | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<Record<string, unknown> | null>(null)
  const queryClient = useQueryClient()
  const { data: datasets = [], isLoading } = useQuery({ queryKey: ['datasets'], queryFn: fetchDatasets })

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('Select a CSV, Excel, or JSON file')
      return uploadDataset(file)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] })
      toast.success('Dataset uploaded to MongoDB and HDFS')
      setFile(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDataset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] })
      toast.success('Dataset deleted')
    },
  })

  const handlePreview = async (id: string) => {
    const data = await getDataset(id)
    setPreviewId(id)
    setPreviewData(data)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Sources"
        description="Ingest academic, LMS, attendance, and demographic datasets (CSV, Excel, JSON)"
        actions={
          <div className="flex gap-2">
            <Input type="file" accept=".csv,.xlsx,.json" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-56" />
            <Button onClick={() => uploadMutation.mutate()} disabled={uploadMutation.isPending || !file}>
              <Upload className="h-4 w-4" /> Upload to HDFS
            </Button>
          </div>
        }
      />

      {previewData && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Dataset Preview: {String(previewData.filename ?? '')}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => { setPreviewData(null); setPreviewId(null) }}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-sm text-muted">Columns: {(previewData.columns as string[])?.join(', ')}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    {((previewData.columns as string[]) ?? []).map((col) => <th key={col} className="pb-2 pr-4">{col}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {((previewData.sample_rows as Array<Record<string, string>>) ?? []).map((row, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {((previewData.columns as string[]) ?? []).map((col) => <td key={col} className="py-2 pr-4">{row[col]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {datasets.map((ds) => (
            <Card key={ds.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="rounded-lg bg-primary/10 p-2"><Database className="h-5 w-5 text-primary" /></div>
                    <div>
                      <h3 className="font-semibold">{ds.name}</h3>
                      <Badge variant="secondary" className="mt-1">{SOURCE_LABELS[ds.source]}</Badge>
                    </div>
                  </div>
                  <Badge variant={ds.status === 'active' ? 'success' : 'warning'}>{ds.status}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                  <div><p className="font-bold">{ds.records.toLocaleString()}</p><p className="text-xs text-muted">Records</p></div>
                  <div><p className="font-bold">{ds.size}</p><p className="text-xs text-muted">Size</p></div>
                  <div><p className="font-bold text-xs">{new Date(ds.lastUpdated).toLocaleDateString()}</p><p className="text-xs text-muted">Updated</p></div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handlePreview(ds.id)} disabled={previewId === ds.id}>
                    <Eye className="h-4 w-4" /> Preview
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(ds.id)}>
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
