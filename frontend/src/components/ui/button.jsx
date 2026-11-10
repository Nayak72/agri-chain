import * as React from 'react'
import { cva } from '@/lib/cva'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/30 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
  {
    variants: {
      variant: {
        primary:
          'bg-forest text-white shadow-sm hover:bg-forest-dark active:scale-[0.98]',
        secondary:
          'bg-surface text-ink-primary border border-border hover:bg-surface-muted hover:border-border/80 active:scale-[0.98]',
        outline:
          'border border-forest/80 text-forest hover:bg-forest/5 active:scale-[0.98]',
        ghost:
          'text-ink-primary hover:bg-surface-muted active:scale-[0.98]',
        destructive:
          'bg-red-600 text-white shadow-sm hover:bg-red-700 active:scale-[0.98]',
        subtle:
          'bg-forest/10 text-forest hover:bg-forest/15 active:scale-[0.98]',
        terracotta:
          'bg-terracotta text-white shadow-sm hover:bg-terracotta-dark active:scale-[0.98]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-11 rounded-xl px-6 text-base font-semibold',
        icon: 'h-9 w-9 p-0 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = 'Button'

export { Button, buttonVariants }
