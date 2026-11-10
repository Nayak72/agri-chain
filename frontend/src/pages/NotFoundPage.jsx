import { useNavigate } from 'react-router-dom'
import { FileQuestion, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-surface border border-border text-forest flex items-center justify-center mb-5 shadow-xs">
        <FileQuestion className="w-8 h-8 stroke-[1.8]" />
      </div>
      <div className="text-xs font-mono font-semibold uppercase tracking-wider text-forest mb-1">
        Error 404
      </div>
      <h1 className="text-3xl font-bold text-ink-primary font-serif mb-2">Page Not Found</h1>
      <p className="text-ink-secondary mb-6 max-w-sm text-sm leading-relaxed">
        The requested routing path does not exist in the AgriChain operational registry.
      </p>
      <Button
        onClick={() => navigate('/dashboard')}
        className="px-6 py-2.5"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Return to Dashboard
      </Button>
    </div>
  )
}
