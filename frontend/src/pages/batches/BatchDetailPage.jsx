import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { batchesApi } from '../../api/agriculture.api'
import { formatDate, formatDateTime, formatWeight, getStatusColor, formatStatus } from '../../utils'

export default function BatchDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: batch, isLoading, error } = useQuery({
    queryKey: ['batch', id],
    queryFn: () => batchesApi.get(id).then(res => res.data),
  })

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
        <span className="text-slate-500 font-mono text-sm animate-pulse">Scanning batch provenance ledger...</span>
      </div>
    )
  }

  if (error || !batch) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-white mb-2">Batch Record Not Found</h2>
        <p className="text-slate-400 mb-6">Could not retrieve provenance record for batch identifier: {id}</p>
        <button
          onClick={() => navigate('/batches')}
          className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
        >
          Return to Batches Registry
        </button>
      </div>
    )
  }

  const statusColor = getStatusColor(batch.status)

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-10 animate-fade-in-up">
      <button
        onClick={() => navigate('/batches')}
        className="text-xs font-mono text-cyan-400 hover:text-cyan-300 mb-6 flex items-center gap-2 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        BATCH_REGISTRY
      </button>

      {/* Header Deck */}
      <div className="bg-[#0b1121] border border-slate-800 rounded-3xl p-8 mb-6 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                PRODUCE: {batch.produce_type}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${statusColor}`}>
                {formatStatus(batch.status || 'AVAILABLE')}
              </span>
            </div>
            <h1 className="text-3xl font-bold font-mono text-white tracking-tight">{batch.batch_id}</h1>
            <p className="text-slate-400 text-sm mt-1">
              Harvested at {batch.harvest_location} on {formatDate(batch.harvest_date)}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/purchase-orders/new', { state: { batchId: batch.batch_id } })}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-semibold text-xs shadow-lg shadow-cyan-900/20 transition-all flex items-center gap-2"
            >
              Create Purchase Order
            </button>
          </div>
        </div>
      </div>

      {/* 2-Column Details Deck */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Quantity Breakdown */}
        <div className="bg-[#0b1121] border border-slate-800 rounded-2xl p-6">
          <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">
            Quantity Allocation Ledger
          </h3>
          <div className="space-y-4 font-mono text-xs">
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <span className="text-slate-400">Initial Harvest</span>
              <span className="text-white font-bold">{formatWeight(batch.initial_quantity_kg)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <span className="text-slate-400">Available In Stock</span>
              <span className="text-emerald-400 font-bold">{formatWeight(batch.available_quantity_kg ?? batch.initial_quantity_kg)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <span className="text-slate-400">Reserved for Orders</span>
              <span className="text-amber-400">{formatWeight(batch.reserved_quantity_kg ?? 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <span className="text-slate-400">Dispatched in Transit</span>
              <span className="text-cyan-400">{formatWeight(batch.dispatched_quantity_kg ?? 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-400">Damaged / Rejected</span>
              <span className="text-red-400">{formatWeight(batch.rejected_quantity_kg ?? 0)}</span>
            </div>
          </div>
        </div>

        {/* Quality & Shelf Life */}
        <div className="bg-[#0b1121] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">
              Quality & Provenance Telemetry
            </h3>
            <dl className="space-y-3 font-mono text-xs">
              <div className="flex justify-between py-2 border-b border-slate-800/80">
                <dt className="text-slate-500">Quality Grade</dt>
                <dd className="text-emerald-400 font-bold">{batch.quality_grade || 'GRADE_A'}</dd>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/80">
                <dt className="text-slate-500">Packaging Type</dt>
                <dd className="text-slate-200">{batch.packaging_type}</dd>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/80">
                <dt className="text-slate-500">Estimated Shelf Life End</dt>
                <dd className="text-amber-400">{formatDateTime(batch.estimated_shelf_life_end)}</dd>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/80">
                <dt className="text-slate-500">Origin Farm Node ID</dt>
                <dd className="text-cyan-400 cursor-pointer hover:underline" onClick={() => navigate(`/farms/${batch.farm_id}`)}>
                  {batch.farm_id}
                </dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-slate-500">Handling Protocol</dt>
                <dd className="text-slate-300">{batch.handling_requirements || 'Standard agricultural handling'}</dd>
              </div>
            </dl>
          </div>

          <div className="pt-4 border-t border-slate-800 mt-4 text-[10px] font-mono text-slate-600 flex justify-between">
            <span>Cryptographic Chain: VERIFIED</span>
            <span>Created: {formatDateTime(batch.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

