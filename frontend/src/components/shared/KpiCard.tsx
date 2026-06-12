import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

interface KpiCardProps {
  title: string
  value: string | number
  change?: string
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}

export function KpiCard({ title, value, change, icon: Icon, trend = 'neutral', className }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted">{title}</p>
              <p className="mt-1 text-2xl font-bold">{value}</p>
              {change && (
                <p
                  className={cn(
                    'mt-1 text-xs font-medium',
                    trend === 'up' && 'text-success',
                    trend === 'down' && 'text-danger',
                    trend === 'neutral' && 'text-muted'
                  )}
                >
                  {change}
                </p>
              )}
            </div>
            <div className="rounded-xl bg-primary/10 p-3">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
