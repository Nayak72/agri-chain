import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ForbiddenPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mb-5 shadow-xs">
        <ShieldAlert className="w-8 h-8 stroke-[2]" />
      </div>
      <h1 className="text-3xl font-bold text-ink-primary font-serif mb-2">Access Restricted</h1>
      <p className="text-ink-secondary mb-6 max-w-sm text-sm leading-relaxed">
        Your role <span className="font-mono font-semibold text-forest">({user?.role || 'UNKNOWN'})</span> does not have authorized permissions to access this operational sector.
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
