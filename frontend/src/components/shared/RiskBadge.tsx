import { Badge } from '@/components/ui/badge'
import type { RiskLevel } from '@/types'

const map: Record<RiskLevel, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  low: { label: 'Low', variant: 'success' },
  medium: { label: 'Medium', variant: 'warning' },
  high: { label: 'High', variant: 'danger' },
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const { label, variant } = map[level]
  return <Badge variant={variant}>{label}</Badge>
}
