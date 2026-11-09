import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { farmsApi } from '../../api/agriculture.api'
import { formatDate, formatDateTime } from '../../utils'

export default function FarmDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: farm, isLoading, error } = useQuery({
    queryKey: ['farm', id],
    queryFn: () => farmsApi.get(id).then(res => res.data),
  })

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
        <span className="text-slate-500 font-mono text-sm animate-pulse">Reading farm node telemetry...</span>
      </div>
    )
  }

  if (error || !farm) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-white mb-2">Farm Node Not Found</h2>
        <p className="text-slate-400 mb-6">Could not retrieve node records for identifier: {id}</p>
        <button
          onClick={() => navigate('/farms')}
          className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
        >
          Return to Farm Network
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-10 animate-fade-in-up">
      <button
        onClick={() => navigate('/farms')}
        className="text-xs font-mono text-cyan-400 hover:text-cyan-300 mb-6 flex items-center gap-2 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        FARM_NETWORK
      </button>

      {/* Top Identity Card */}
      <div className="bg-[#0b1121] border border-slate-800 rounded-3xl p-8 mb-6 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest">
                Cultivation Node
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${
                farm.is_active !== false
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}>
                {farm.is_active !== false ? 'Operational' : 'Inactive'}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">{farm.name}</h1>
            <p className="text-slate-400 text-sm mt-1">
              {farm.address}, {farm.city}, {farm.state} — {farm.pincode}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/batches/new', { state: { farmId: farm.id || farm._id } })}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-semibold text-xs shadow-lg shadow-cyan-900/20 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Harvest Batch
            </button>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Node Specifications */}
        <div className="bg-[#0b1121] border border-slate-800 rounded-2xl p-6">
          <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">
            Node Specifications
          </h3>
          <dl className="space-y-3 font-mono text-xs">
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <dt className="text-slate-500">Node ID</dt>
              <dd className="text-slate-200">{farm.id || farm._id}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <dt className="text-slate-500">Farmer Owner ID</dt>
              <dd className="text-slate-200">{farm.farmer_id}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <dt className="text-slate-500">Total Cultivation Area</dt>
              <dd className="text-cyan-400 font-semibold">{farm.area_hectares ? `${farm.area_hectares} Hectares` : 'Not specified'}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <dt className="text-slate-500">GPS Coordinates</dt>
              <dd className="text-slate-300">
                {farm.latitude && farm.longitude ? `${farm.latitude}, ${farm.longitude}` : 'Not mapped'}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-500">Registered At</dt>
              <dd className="text-slate-300">{formatDateTime(farm.created_at)}</dd>
            </div>
          </dl>
        </div>

        {/* Certifications & Notes */}
        <div className="bg-[#0b1121] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">
              Certifications & Standards
            </h3>
            {farm.certifications && farm.certifications.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-6">
                {farm.certifications.map((c, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                    ✓ {c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-xs font-mono mb-6">No compliance certificates attached.</p>
            )}

            <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">
              Node Description
            </h3>
            <p className="text-slate-300 text-xs leading-relaxed">
              {farm.description || 'No descriptive telemetry provided for this cultivation node.'}
            </p>
          </div>

          <div className="pt-6 border-t border-slate-800 mt-6">
            <span className="text-[10px] font-mono text-slate-600 uppercase">
              Hash Protocol Status: Cryptographically Linked
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

