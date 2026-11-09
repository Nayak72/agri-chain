import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { batchesApi } from '../../api/agriculture.api'
import { useAuth } from '../../context/AuthContext'
import { formatDate, formatWeight, getStatusColor, formatStatus } from '../../utils'

export default function BatchesListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [search, setSearch] = useState('')

  const { data: batches, isLoading, refetch } = useQuery({
    queryKey: ['batches'],
    queryFn: () => batchesApi.list().then(res => res.data),
    staleTime: 30_000,
  })

  const batchList = Array.isArray(batches) ? batches : batches?.items || []
  const filtered = batchList.filter(b =>
    b.batch_id?.toLowerCase().includes(search.toLowerCase()) ||
    b.produce_type?.toLowerCase().includes(search.toLowerCase()) ||
    b.harvest_location?.toLowerCase().includes(search.toLowerCase())
  )

  const canCreate = user?.role === 'admin' || user?.role === 'farmer'

  return (
    <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-10 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
            <span className="text-xs font-mono font-medium text-emerald-500 uppercase tracking-widest">
              Traceability Ledger
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Produce <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Batches</span>
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl">
            Harvest lots, verifiable provenance identifiers, quality grades, and inventory availability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white transition-all text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync
          </button>
          {canCreate && (
            <button
              onClick={() => navigate('/batches/new')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-semibold text-sm shadow-lg shadow-cyan-900/20 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Register Harvest Batch
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by Batch ID, Produce Type, Location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0b1121] border border-slate-800 rounded-xl px-4 py-2.5 pl-10 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
          />
          <svg className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <span className="text-xs font-mono text-slate-500">
          {filtered.length} batch{filtered.length === 1 ? '' : 'es'} tracked
        </span>
      </div>

      {/* Batches Table */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
          <span className="text-slate-500 font-mono text-sm animate-pulse">Reading batch registries...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-[#0b1121]/40 p-16 text-center">
          <div className="text-4xl mb-4">📦</div>
          <h3 className="text-xl font-medium text-white mb-2">No Harvest Batches</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            {search ? 'No batches match your search filter.' : 'No harvest batches have been created in the network yet.'}
          </p>
          {canCreate && !search && (
            <button
              onClick={() => navigate('/batches/new')}
              className="text-cyan-400 hover:text-cyan-300 font-medium text-sm"
            >
              + Register First Batch
            </button>
          )}
        </div>
      ) : (
        <div className="bg-[#0b1121] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-mono uppercase tracking-wider text-slate-500 bg-slate-950/50">
                <th className="px-6 py-4">Batch ID</th>
                <th className="px-6 py-4">Commodity</th>
                <th className="px-6 py-4">Harvest Date</th>
                <th className="px-6 py-4">Grade</th>
                <th className="px-6 py-4">Initial / Available</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {filtered.map((b) => {
                const batchKey = b.batch_id || b.id || b._id
                const statusColor = getStatusColor(b.status)
                return (
                  <tr
                    key={batchKey}
                    onClick={() => navigate(`/batches/${batchKey}`)}
                    className="hover:bg-slate-800/30 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 font-bold text-cyan-400">{b.batch_id}</td>
                    <td className="px-6 py-4 text-slate-200">{b.produce_type}</td>
                    <td className="px-6 py-4 text-slate-400">{formatDate(b.harvest_date)}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-400">
                        {b.quality_grade || 'GRADE_A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      <span>{formatWeight(b.initial_quantity_kg)}</span>
                      <span className="text-slate-500 mx-1">/</span>
                      <span className="text-emerald-400 font-semibold">{formatWeight(b.available_quantity_kg ?? b.initial_quantity_kg)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] uppercase tracking-wider ${statusColor}`}>
                        {formatStatus(b.status || 'AVAILABLE')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-cyan-400 hover:text-cyan-300">Inspect →</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

