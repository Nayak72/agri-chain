import * as React from 'react'
import { cn } from '@/lib/utils'

const TabsContext = React.createContext({
  value: '',
  onValueChange: () => {},
})

export function Tabs({ value, defaultValue, onValueChange, children, className }) {
  const [currentValue, setCurrentValue] = React.useState(defaultValue || '')
  const activeValue = value !== undefined ? value : currentValue
  const handleValueChange = onValueChange || setCurrentValue

  return (
    <TabsContext.Provider value={{ value: activeValue, onValueChange: handleValueChange }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'inline-flex h-11 items-center justify-start rounded-xl bg-surface-muted/70 p-1 text-ink-secondary border border-border/60',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({ value, className, children, ...props }) {
  const { value: activeValue, onValueChange } = React.useContext(TabsContext)
  const isSelected = activeValue === value

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      onClick={() => onValueChange(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all cursor-pointer font-mono',
        isSelected
          ? 'bg-surface text-ink-primary shadow-xs border border-border/80'
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
  const { value: activeValue } = React.useContext(TabsContext)
  if (activeValue !== value) return null

  return (
    <div
      role="tabpanel"
      className={cn('mt-4 focus-visible:outline-none animate-fade-in-up', className)}
      {...props}
    >
      {children}
    </div>
  )
}

