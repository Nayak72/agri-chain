import React from 'react'
import { cn } from '@/lib/utils'

export function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  alert = false,
  accent = 'forest',
  onClick,
  className,
}) {
  const accentStyles = {
    forest: 'bg-[#244634]/10 text-[#244634] border-[#244634]/20 group-hover:bg-[#244634]/15',
    terracotta: 'bg-orange-50 text-amber-800 border-amber-200 group-hover:bg-orange-100/50',
    harvest: 'bg-amber-50 text-amber-800 border-amber-200 group-hover:bg-amber-100/50',
    sage: 'bg-emerald-50 text-emerald-800 border-emerald-200 group-hover:bg-emerald-100/50',
    slate: 'bg-stone-100 text-stone-700 border-stone-200 group-hover:bg-stone-200/60',
    red: 'bg-rose-50 text-rose-700 border-rose-200 group-hover:bg-rose-100/50',
  }

  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      onClick={onClick}
      className={cn(
        'group relative flex flex-col justify-between p-5 rounded-2xl border border-stone-200 bg-white text-left shadow-xs transition-all duration-200',
        onClick && 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer',
        alert && 'border-rose-300 bg-rose-50/20 shadow-[0_0_15px_rgba(244,63,94,0.06)]',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3 w-full">
        {Icon && (
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl border transition-colors',
              alert ? accentStyles.red : accentStyles[accent] || accentStyles.forest
            )}
          >
            {React.isValidElement(Icon) ? Icon : <Icon className="h-5 w-5 stroke-[2]" />}
          </div>
        )}
        {alert && (
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
          </span>
        )}
      </div>

      <div>
        <div
          className={cn(
            'text-2xl lg:text-3xl font-bold tracking-tight text-stone-900 font-mono',
            alert && 'text-rose-600'
          )}
        >
          {value ?? '—'}
        </div>
        <div className="text-xs font-semibold text-stone-500 mt-1 uppercase tracking-wider font-mono">
          {label}
        </div>
        {sublabel && (
          <div className="text-xs text-stone-400 mt-0.5 font-sans">
            {sublabel}
          </div>
        )}
      </div>
    </Tag>
  )
}

export default StatCard
