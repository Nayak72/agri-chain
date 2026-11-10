import * as React from 'react'
import { cva } from '@/lib/cva'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-forest/20 select-none font-mono',
  {
    variants: {
      variant: {
        default:
          'border-forest/20 bg-forest/10 text-forest',
        secondary:
          'border-border bg-surface-muted text-ink-secondary',
        outline:
          'border-border text-ink-primary',
        success:
          'border-emerald-200 bg-emerald-50 text-emerald-800',
        warning:
          'border-amber-200 bg-amber-50 text-amber-800',
        destructive:
          'border-red-200 bg-red-50 text-red-700',
        critical:
          'border-red-200 bg-red-50 text-red-700',
        info:
          'border-sky-200 bg-sky-50 text-sky-800',
        terracotta:
          'border-terracotta/30 bg-orange-50/80 text-[#B06F4E]',
        harvest:
          'border-harvest/40 bg-amber-50/80 text-[#8C6D3B]',
        slate:
          'border-slate-200 bg-slate-100 text-slate-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
