import { useQuery } from '@tanstack/react-query'
import { Brain, TrendingDown, BookOpen, ShieldAlert } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { fetchPredictions } from '@/services/dataService'
import { PageHeader } from '@/components/shared/PageHeader'
import { KpiCard } from '@/components/shared/KpiCard'
import { ChartCard } from '@/components/shared/ChartCard'
import { Skeleton } from '@/components/ui/skeleton'

export function PredictionsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['predictions'], queryFn: fetchPredictions })

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div></div>

  const gauges = data?.gauges ?? []

  return (
    <div className="space-y-6">
      <PageHeader title="ML Predictions" description="AI-powered educational outcome predictions" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Performance Prediction" value={`${data!.performance}%`} icon={Brain} trend="up" />
        <KpiCard title="Dropout Prediction" value={`${data!.dropout}%`} icon={TrendingDown} trend="down" />
        <KpiCard title="Course Demand" value={`${data!.courseDemand}%`} icon={BookOpen} trend="up" />
        <KpiCard title="Risk Detection" value={data!.riskDetection} icon={ShieldAlert} trend="neutral" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Prediction Trends">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data!.trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="performance" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.2} />
              <Area type="monotone" dataKey="dropout" stroke="#EF4444" fill="#EF4444" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Probability Distribution">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data!.probabilities}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#7C3AED" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {gauges.map((g) => (
          <div key={g.label} className="glass-card rounded-xl p-6 text-center">
            <div className="relative mx-auto h-24 w-24">
              <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-border)" strokeWidth="8" />
                <circle cx="50" cy="50" r="40" fill="none" stroke={g.color} strokeWidth="8" strokeDasharray={`${Math.min(100, g.value) * 2.51} 251`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xl font-bold">
                {g.label === 'At-Risk Students' ? g.value : `${g.value}%`}
              </span>
            </div>
            <p className="mt-2 text-sm font-medium">{g.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
