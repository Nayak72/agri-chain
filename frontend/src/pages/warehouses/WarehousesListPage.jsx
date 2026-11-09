import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { warehousesApi } from '../../api/agriculture.api'
import { useAuth } from '../../context/AuthContext'
import { formatWeight } from '../../utils'

export default function WarehousesListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [search, setSearch] = useState('')

  const { data: warehouses, isLoading, refetch } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.list().then(res => res.data),
    staleTime: 30_000,
  })

  const warehouseList = Array.isArray(warehouses) ? warehouses : warehouses?.items || []
  const filtered = warehouseList.filter(wh =>
    wh.name?.toLowerCase().includes(search.toLowerCase()) ||
    wh.city?.toLowerCase().includes(search.toLowerCase()) ||
    wh.state?.toLowerCase().includes(search.toLowerCase())
  )

  const canCreate = user?.role === 'admin' || user?.role === 'warehouse_manager'

  return (
    <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-10 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-500"></span>
            <span className="text-xs font-mono font-medium text-cyan-500 uppercase tracking-widest">
              Storage Infrastructure
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Warehouse <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Network</span>
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl">
            Controlled-atmosphere storage nodes, cold-chain hubs, and capacity utilization telemetry.
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
              onClick={() => navigate('/warehouses/new')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-semibold text-sm shadow-lg shadow-cyan-900/20 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Deploy Storage Node
            </button>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search warehouse name, city, state..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0b1121] border border-slate-800 rounded-xl px-4 py-2.5 pl-10 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
          />
          <svg className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <span className="text-xs font-mono text-slate-500">
          {filtered.length} storage node{filtered.length === 1 ? '' : 's'} active
        </span>
      </div>

      {/* Grid of Warehouses */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
          <span className="text-slate-500 font-mono text-sm animate-pulse">Reading warehouse telemetry...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-[#0b1121]/40 p-16 text-center">
          <div className="text-4xl mb-4">🏭</div>
          <h3 className="text-xl font-medium text-white mb-2">No Storage Nodes</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            {search ? 'No warehouses match your filter.' : 'No storage warehouses have been deployed yet.'}
          </p>
          {canCreate && !search && (
            <button
              onClick={() => navigate('/warehouses/new')}
              className="text-cyan-400 hover:text-cyan-300 font-medium text-sm"
            >
              + Deploy First Storage Node
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((wh) => {
            const whId = wh.id || wh._id
            return (
              <div
                key={whId}
                onClick={() => navigate(`/warehouses/${whId}`)}
                className="group relative bg-[#0b1121] border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-900/20 cursor-pointer overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1 block group-hover:text-cyan-400 transition-colors">
                        PIN: {wh.pincode}
                      </span>
                      <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors truncate max-w-[220px]">
                        {wh.name}
                      </h3>
                    </div>
                    {wh.has_refrigeration && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                        Cold-Chain
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                    {wh.address}, {wh.city}, {wh.state}
                  </p>

                  <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-800/80 mb-4 text-xs font-mono">
                    <div>
                      <span className="text-slate-600 block text-[10px]">TOTAL CAPACITY</span>
                      <span className="text-white font-semibold">{formatWeight(wh.capacity_kg)}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 block text-[10px]">COLD STORAGE</span>
                      <span className="text-cyan-400 font-semibold">{wh.cold_storage_capacity_kg ? formatWeight(wh.cold_storage_capacity_kg) : 'None'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-slate-500 group-hover:text-cyan-400 transition-colors">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Terminal Online
                  </span>
                  <span>Access Terminal →</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

