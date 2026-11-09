// Generic placeholder page component for unimplemented modules
import { useNavigate } from 'react-router-dom'

export default function PlaceholderPage({ title, icon = '🔧', desc }) {
  const navigate = useNavigate()
  return (
    <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-16 flex flex-col items-center justify-center text-center">
      <div className="text-6xl mb-5">{icon}</div>
      <h1 className="text-2xl font-bold text-white mb-3">{title}</h1>
      <p className="text-slate-400 max-w-sm mb-2">{desc || 'This module is being implemented in the next milestone.'}</p>
      <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono uppercase tracking-wider">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Coming in next milestone
      </div>
      <button
        onClick={() => navigate('/dashboard')}
        className="mt-8 px-5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-medium transition-all"
      >
        ← Back to Dashboard
      </button>
    </div>
  )
}

