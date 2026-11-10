import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ErrorState({
  title = 'Failed to load data',
  message = 'An unexpected error occurred while communicating with the service.',
  onRetry,
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-10 text-center rounded-2xl border border-red-200 bg-red-50/30',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600 mb-3.5">
        <AlertCircle className="h-6 w-6 stroke-[2]" />
      </div>
      <h3 className="text-base font-bold text-red-900 tracking-tight">
        {title}
      </h3>
      <p className="text-xs text-red-700/80 max-w-md mt-1 mb-4 font-mono">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="border-red-300 text-red-700 hover:bg-red-100/50"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-2" />
          Retry Request
        </Button>
      )}
    </div>
  )
}

