import { useEffect, useState } from 'react'
import type { Alert } from '@/types'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

export function useAlertsSocket(initialAlerts: Alert[] = []) {
  const [liveAlerts, setLiveAlerts] = useState<Alert[]>(initialAlerts)

  useEffect(() => {
    setLiveAlerts(initialAlerts)
  }, [initialAlerts])

  useEffect(() => {
    const socket = new WebSocket(`${WS_URL}/ws/alerts`)

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { event?: string; data?: Record<string, unknown> }
        if (payload.event !== 'alert' || !payload.data) return
        const raw = payload.data
        const type = String(raw.type ?? 'System Alert').toLowerCase()
        const category: Alert['category'] = type.includes('attendance')
          ? 'attendance'
          : type.includes('academic')
            ? 'academic'
            : type.includes('dropout') || type.includes('risk')
              ? 'risk'
              : 'system'

        const alert: Alert = {
          id: String(raw._id ?? Date.now()),
          title: String(raw.type ?? 'Alert'),
          message: String(raw.message ?? ''),
          category,
          read: false,
          createdAt: String(raw.created_at ?? new Date().toISOString()),
          severity: String(raw.severity ?? 'warning').toLowerCase() === 'high' ? 'danger' : 'warning',
        }
        setLiveAlerts((prev) => [alert, ...prev])
      } catch {
        // ignore malformed websocket payloads
      }
    }

    return () => socket.close()
  }, [])

  return liveAlerts
}
