import { useQuery } from '@tanstack/react-query'
import { Server, HardDrive, Cpu, Activity, ExternalLink, FolderOpen } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { fetchHadoopMetrics } from '@/services/dataService'
import { PageHeader } from '@/components/shared/PageHeader'
import { KpiCard } from '@/components/shared/KpiCard'
import { ChartCard } from '@/components/shared/ChartCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { chartColors } from '@/theme/colors'

export function AnalyticsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['hadoop'], queryFn: fetchHadoopMetrics })

  if (isLoading) return <Skeleton className="h-96" />

  const namenodeUi = data?.namenodeUrl ? `${data.namenodeUrl}/dfshealth.html#tab-overview` : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Big Data Analytics"
        description="Hadoop HDFS cluster — live metrics from NameNode & DataNode"
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={data!.clusterStatus === 'healthy' ? 'success' : 'danger'}>
              HDFS {data!.connected === false ? 'Offline' : data!.clusterStatus}
            </Badge>
            {namenodeUi && (
              <Button variant="outline" size="sm" asChild>
                <a href={namenodeUi} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" /> NameNode UI
                </a>
              </Button>
            )}
          </div>
        }
      />

      {data?.connected === false && (
        <Card className="border-danger/50 bg-danger/5">
          <CardContent className="p-4 text-sm">
            Hadoop is not running. Start it with:{' '}
            <code className="rounded bg-background px-2 py-1">cd backend && docker compose up -d namenode datanode</code>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Data on HDFS" value={data!.dataProcessed} icon={Server} />
        <KpiCard title="HDFS Usage" value={`${data!.hdfsUsage}%`} icon={HardDrive} />
        <KpiCard title="Live DataNodes" value={data!.nodes} icon={Cpu} />
        <KpiCard title="HDFS Files" value={data!.fileCount ?? 0} icon={Activity} />
      </div>

      {data?.totalStorage && (
        <p className="text-sm text-muted">
          Cluster storage: {data.usedStorage} used of {data.totalStorage}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Hadoop Processing Throughput">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data!.processingSpeed}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="speed" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="HDFS Cluster Utilization">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data!.resourceUtilization}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data!.resourceUtilization.map((_, i) => <Cell key={i} fill={chartColors[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Storage Growth (TB)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data!.storageGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="tb" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" /> HDFS File Browser — /edupredict
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(data?.hdfsFiles ?? []).length === 0 ? (
            <p className="text-sm text-muted">No files in HDFS yet. Run the seeder or upload a dataset.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="pb-2 pr-4">File</th>
                  <th className="pb-2 pr-4">HDFS Path</th>
                  <th className="pb-2">Size</th>
                </tr>
              </thead>
              <tbody>
                {data!.hdfsFiles!.map((f) => (
                  <tr key={f.path} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-medium">{f.name}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-muted">{f.path}</td>
                    <td className="py-2">{f.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
