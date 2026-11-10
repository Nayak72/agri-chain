import React from 'react'
import { Badge } from '@/components/ui/badge'
import { formatStatus } from '@/utils'

export function StatusBadge({ status, className }) {
  if (!status) return <span className="text-stone-400 font-mono text-xs">—</span>

  const s = String(status).toLowerCase()

  let variant = 'secondary'

  if (['delivered', 'accepted', 'approved', 'active', 'fulfilled', 'ready', 'completed', 'verified', 'online'].includes(s)) {
    variant = 'success'
  } else if (['delayed', 'pending', 'booking_confirmed', 'driver_assigned', 'vehicle_assigned', 'loading', 'loaded', 'at_checkpoint', 'warning'].includes(s)) {
    variant = 'warning'
  } else if (['cancelled', 'rejected', 'failed', 'suspended', 'inactive', 'critical', 'damaged', 'offline'].includes(s)) {
    variant = 'destructive'
  } else if (['in_transit', 'dispatched', 'checkpoint_reached', 'out_for_delivery', 'submitted', 'info'].includes(s)) {
    variant = 'info'
  } else if (['draft'].includes(s)) {
    variant = 'secondary'
  }

  return (
    <Badge variant={variant} className={className}>
      {formatStatus(status)}
    </Badge>
  )
}

export default StatusBadge
