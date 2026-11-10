import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const DialogContext = React.createContext({
  open: false,
  setOpen: () => {},
})

export function Dialog({ open, onOpenChange, children }) {
  return (
    <DialogContext.Provider value={{ open, setOpen: onOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

export function DialogTrigger({ children, asChild = false, ...props }) {
  const { setOpen } = React.useContext(DialogContext)
  return React.cloneElement(children, {
    onClick: (e) => {
      children.props.onClick?.(e)
      setOpen(true)
    },
    ...props,
  })
}

export function DialogContent({ className, children, ...props }) {
  const { open, setOpen } = React.useContext(DialogContext)

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, setOpen])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1b251e]/40 backdrop-blur-xs transition-opacity animate-fade-in-down"
        onClick={() => setOpen(false)}
      />

      {/* Modal Card */}
      <div
        className={cn(
          'relative z-50 w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl transition-all duration-200 animate-fade-in-up',
          className
        )}
        {...props}
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 rounded-lg p-1 text-ink-secondary hover:bg-surface-muted hover:text-ink-primary transition-colors cursor-pointer"
          title="Close"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        {children}
      </div>
    </div>,
    document.body
  )
}

export function DialogHeader({ className, ...props }) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 text-left mb-4', className)}
      {...props}
    />
  )
}

export function DialogTitle({ className, ...props }) {
  return (
    <h3
      className={cn('text-lg font-bold text-ink-primary tracking-tight', className)}
      {...props}
    />
  )
}

export function DialogDescription({ className, ...props }) {
  return (
    <p
      className={cn('text-sm text-ink-secondary leading-relaxed', className)}
      {...props}
    />
  )
}

export function DialogFooter({ className, ...props }) {
  return (
    <div
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6 pt-4 border-t border-border', className)}
      {...props}
    />
  )
}

