import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ForbiddenPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="text-6xl mb-4">🚫</div>
      <h1 className="text-3xl font-bold text-white mb-2">Access Restricted</h1>
      <p className="text-slate-400 mb-6 max-w-sm">
        Your role ({user?.role || 'unknown'}) does not have permission to view this page.
      </p>
      <button
        onClick={() => navigate('/dashboard')}
        className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-all"
      >
        Return to Dashboard
      </button>
    </div>
  )
}

