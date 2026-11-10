import { useNavigate } from 'react-router-dom'
import { Compass, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PlaceholderPage({ title, desc }) {
  const navigate = useNavigate()

  return (
    <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-16 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface border border-border text-forest flex items-center justify-center mb-5 shadow-xs">
        <Compass className="w-8 h-8 stroke-[1.8]" />
      </div>
      <h1 className="text-2xl font-bold text-ink-primary font-serif mb-2">{title || 'Operational Module'}</h1>
      <p className="text-ink-secondary max-w-sm mb-6 text-sm leading-relaxed">
        {desc || 'This sector is being finalized in the current operational milestone.'}
      </p>
      <div className="mb-8 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest/10 border border-forest/20 text-forest text-xs font-mono font-semibold uppercase tracking-wider">
        <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulse" />
        Operational Milestone
      </div>
      <Button
        variant="secondary"
        onClick={() => navigate('/dashboard')}
        className="px-5 py-2.5"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Return to Dashboard
      </Button>
    </div>
  )
}
