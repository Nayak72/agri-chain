import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-surface-muted/80', className)}
      {...props}
    />
  )
}

export { Skeleton }

