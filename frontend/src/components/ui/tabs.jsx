import * as React from 'react'
import { cn } from '@/lib/utils'

const TabsContext = React.createContext({
  value: '',
  onValueChange: () => {},
})

export function Tabs({ value, defaultValue, onValueChange, children, className }) {
  const id = React.useId()
  const [currentValue, setCurrentValue] = React.useState(defaultValue || '')
  const activeValue = value !== undefined ? value : currentValue
  const handleValueChange = onValueChange || setCurrentValue

  return (
    <TabsContext.Provider value={{ value: activeValue, onValueChange: handleValueChange, id }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, children, onKeyDown, ...props }) {
  return (
    <div
      role="tablist"
      onKeyDown={event => {
        onKeyDown?.(event)
        if (event.defaultPrevented || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
        const tabs = [...event.currentTarget.querySelectorAll('[role="tab"]:not(:disabled)')]
        const current = tabs.indexOf(document.activeElement)
        if (current < 0 || !tabs.length) return
        event.preventDefault()
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
          : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
        tabs[next].focus()
        tabs[next].click()
      }}
      className={cn(
        'inline-flex h-11 items-center justify-start rounded-xl glass-inset p-1 text-ink-secondary border border-border/60',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({ value, className, children, ...props }) {
  const { value: activeValue, onValueChange, id } = React.useContext(TabsContext)
  const isSelected = activeValue === value

  return (
    <button
      type="button"
      role="tab"
      id={`${id}-tab-${value}`}
      aria-controls={`${id}-panel-${value}`}
      tabIndex={isSelected ? 0 : -1}
      aria-selected={isSelected}
      onClick={() => onValueChange(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all cursor-pointer font-mono',
        isSelected
          ? 'glass-tab-active text-forest border border-forest/15'
          : 'text-ink-secondary hover:text-ink-primary hover:bg-surface/50',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, className, children, ...props }) {
  const { value: activeValue, id } = React.useContext(TabsContext)
  if (activeValue !== value) return null

  return (
    <div
      role="tabpanel"
      id={`${id}-panel-${value}`}
      aria-labelledby={`${id}-tab-${value}`}
      tabIndex={0}
      className={cn('mt-4 focus-visible:outline-none animate-fade-in-up', className)}
      {...props}
    >
      {children}
    </div>
  )
}

