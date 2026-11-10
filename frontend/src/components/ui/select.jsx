import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Select = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div className="relative w-full">
      <select
        ref={ref}
        className={cn(
          'flex h-10 w-full appearance-none rounded-xl border border-border bg-surface px-3.5 py-2 pr-9 text-sm text-ink-primary shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/20 focus-visible:border-forest disabled:cursor-not-allowed disabled:bg-surface-muted/50 disabled:opacity-60 cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-ink-secondary" />
    </div>
  )
})
Select.displayName = 'Select'

