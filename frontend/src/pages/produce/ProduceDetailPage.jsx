import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { produceApi } from '../../api/agriculture.api'
import { formatDateTime } from '../../utils'

export default function ProduceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: item, isLoading, error } = useQuery({
    queryKey: ['produce', id],
    queryFn: () => produceApi.get(id).then(res => res.data),
  })

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
        <span className="text-slate-500 font-mono text-sm animate-pulse">Loading produce specifications...</span>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-white mb-2">Produce Item Not Found</h2>
        <p className="text-slate-400 mb-6">Could not retrieve produce catalog record for identifier: {id}</p>
        <button
          onClick={() => navigate('/produce')}
          className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
        >
          Return to Produce Catalogue
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-10 animate-fade-in-up">
      <button
        onClick={() => navigate('/produce')}
        className="text-xs font-mono text-cyan-400 hover:text-cyan-300 mb-6 flex items-center gap-2 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        PRODUCE_CATALOG
      </button>

      {/* Identity Card */}
      <div className="bg-[#0b1121] border border-slate-800 rounded-3xl p-8 mb-6 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                {item.category}
              </span>
              <span className="text-xs font-mono text-slate-500">
                CODE: {item.produce_type}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">{item.name}</h1>
            <p className="text-slate-400 text-sm mt-1">
              Standard Packaging Unit: <span className="text-emerald-400 font-mono font-semibold">{item.unit}</span>
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/batches/new', { state: { produceType: item.produce_type } })}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-semibold text-xs shadow-lg shadow-cyan-900/20 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Batch for this Produce
            </button>
          </div>
        </div>
      </div>

      {/* Specifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0b1121] border border-slate-800 rounded-2xl p-6">
          <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">
            Catalog Specifications
          </h3>
          <dl className="space-y-3 font-mono text-xs">
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <dt className="text-slate-500">Produce Type Key</dt>
              <dd className="text-slate-200">{item.produce_type}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <dt className="text-slate-500">Category</dt>
              <dd className="text-cyan-400">{item.category}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <dt className="text-slate-500">Measurement Unit</dt>
              <dd className="text-slate-200">{item.unit}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <dt className="text-slate-500">Record Created</dt>
              <dd className="text-slate-300">{formatDateTime(item.created_at)}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-[#0b1121] border border-slate-800 rounded-2xl p-6">
          <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">
            Handling & Cold-Chain Parameters
          </h3>
          <p className="text-slate-300 text-xs leading-relaxed mb-6 font-mono">
            {item.description || 'Standard agricultural crop profile. Follow standard ambient or cold-chain procedures based on harvest batch specifications.'}
          </p>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="text-cyan-400 font-semibold mb-1">Cold-Chain Compliance Rule</div>
            <div>All batches of this commodity moving via refrigerated transit are continuously monitored via simulated sensor telemetry.</div>
          </div>
        </div>
      </div>
    </div>
  )
}

