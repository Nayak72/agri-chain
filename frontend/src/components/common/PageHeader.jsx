import React from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function PageHeader({
  badge,
  title,
  serif = false,
  description,
  actions,
  breadcrumbs,
  children,
  className,
}) {
  return (
    <div className={cn('mb-8 flex flex-col gap-4', className)}>
      {breadcrumbs && Array.isArray(breadcrumbs) && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-xs text-stone-500 font-mono">
          {breadcrumbs.map((b, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-stone-300">/</span>}
              {b.href ? (
                <Link to={b.href} className="hover:text-stone-900 transition-colors">
                  {b.label}
                </Link>
              ) : (
                <span className="text-stone-900 font-semibold">{b.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          {badge && (
            <div className="mb-2">
              {typeof badge === 'string' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold uppercase tracking-wider bg-[#244634]/10 text-[#244634] border border-[#244634]/15">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#244634]" />
                  {badge}
                </span>
              ) : (
                badge
              )}
            </div>
          )}
          <h1
            className={cn(
              'text-2xl md:text-3xl text-stone-900 tracking-tight font-bold',
              serif && 'font-serif'
            )}
          >
            {title}
          </h1>
          {description && (
            <p className="text-sm text-stone-600 mt-1.5 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2.5 flex-wrap">
            {actions}
          </div>
        )}
      </div>

      {children && <div className="mt-2">{children}</div>}
    </div>
  )
}

export default PageHeader
