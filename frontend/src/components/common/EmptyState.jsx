import React from 'react'
import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon = Inbox,
  title = 'No records found',
  description = 'There are no items to display at this time.',
  action,
  actionLabel,
  onAction,
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/50',
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white border border-stone-200 shadow-xs text-stone-500 mb-4">
        <Icon className="h-7 w-7 text-stone-500 stroke-[1.5]" />
      </div>
      <h3 className="text-base font-bold text-stone-900 tracking-tight">
        {title}
      </h3>
      <p className="text-sm text-stone-500 max-w-sm mt-1 leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
      {!action && actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#244634] text-white hover:bg-[#1b3527] shadow-xs transition-all"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export default EmptyState
