import { useNavigate } from 'react-router-dom'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="text-6xl mb-4">🔍</div>
      <h1 className="text-5xl font-bold text-white mb-2">404</h1>
      <p className="text-slate-400 mb-6">Page not found.</p>
      <button
        onClick={() => navigate('/dashboard')}
        className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-all"
      >
        Return to Dashboard
      </button>
    </div>
  )
}

