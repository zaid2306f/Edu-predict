import { useQuery } from '@tanstack/react-query'
import { Server, HardDrive, Cpu, Activity } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { fetchHadoopMetrics } from '@/services/dataService'
import { PageHeader } from '@/components/shared/PageHeader'
import { KpiCard } from '@/components/shared/KpiCard'
import { ChartCard } from '@/components/shared/ChartCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { chartColors } from '@/theme/colors'

export function AnalyticsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['hadoop'], queryFn: fetchHadoopMetrics })

  if (isLoading) return <Skeleton className="h-96" />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Big Data Analytics"
        description="Hadoop cluster monitoring and HDFS metrics"
        actions={<Badge variant={data!.clusterStatus === 'healthy' ? 'success' : 'danger'}>Cluster {data!.clusterStatus}</Badge>}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Data Processed" value={data!.dataProcessed} icon={Server} />
        <KpiCard title="HDFS Usage" value={`${data!.hdfsUsage}%`} icon={HardDrive} />
        <KpiCard title="Hadoop Nodes" value={data!.nodes} icon={Cpu} />
        <KpiCard title="Cluster Status" value={data!.clusterStatus} icon={Activity} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Processing Speed (MB/s)">
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
        <ChartCard title="Resource Utilization">
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
    </div>
  )
}
