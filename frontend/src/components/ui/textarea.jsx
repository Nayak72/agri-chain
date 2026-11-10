import * as React from 'react'
import { cn } from '@/lib/utils'

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-sm text-ink-primary shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors placeholder:text-ink-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/20 focus-visible:border-forest disabled:cursor-not-allowed disabled:bg-surface-muted/50 disabled:opacity-60',
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = 'Textarea'

export { Textarea }

