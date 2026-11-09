import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { produceApi } from '../../api/agriculture.api'
import { useAuth } from '../../context/AuthContext'

const CATEGORIES = ['ALL', 'FRUITS', 'VEGETABLES', 'GRAINS', 'PULSES', 'SPICES', 'DAIRY']

export default function ProduceListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')

  const { data: produce, isLoading, refetch } = useQuery({
    queryKey: ['produce'],
    queryFn: () => produceApi.list().then(res => res.data),
    staleTime: 30_000,
  })

  const produceList = Array.isArray(produce) ? produce : produce?.items || []
  const filtered = produceList.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.produce_type?.toLowerCase().includes(search.toLowerCase())
    const matchesCat = selectedCategory === 'ALL' || item.category?.toUpperCase() === selectedCategory
    return matchesSearch && matchesCat
  })

  const canCreate = user?.role === 'admin' || user?.role === 'farmer'

  return (
    <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-10 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-500"></span>
            <span className="text-xs font-mono font-medium text-cyan-500 uppercase tracking-widest">
              Agricultural Catalog
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Produce <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Catalogue</span>
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl">
            Certified crop commodities, handling specifications, and standardized packaging parameters.
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
              onClick={() => navigate('/produce/new')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-semibold text-sm shadow-lg shadow-cyan-900/20 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Produce Type
            </button>
          )}
        </div>
      </div>

      {/* Filter and Category Tabs */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                selectedCategory === cat
                  ? 'bg-cyan-500/10 border border-cyan-500 text-cyan-400'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Search produce..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0b1121] border border-slate-800 rounded-xl px-4 py-2 pl-9 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
          />
          <svg className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
          <span className="text-slate-500 font-mono text-sm animate-pulse">Loading produce catalog...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-[#0b1121]/40 p-16 text-center">
          <div className="text-4xl mb-4">🥬</div>
          <h3 className="text-xl font-medium text-white mb-2">No Produce Entries</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            {search ? 'No produce items match current filters.' : 'The produce catalog is currently empty.'}
          </p>
          {canCreate && !search && (
            <button
              onClick={() => navigate('/produce/new')}
              className="text-cyan-400 hover:text-cyan-300 font-medium text-sm"
            >
              + Define First Produce Type
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map((item) => {
            const itemId = item.id || item._id
            return (
              <div
                key={itemId}
                onClick={() => navigate(`/produce/${itemId}`)}
                className="group relative bg-[#0b1121] border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-900/20 cursor-pointer overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                      {item.category || 'COMMODITY'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      UNIT: {item.unit}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors truncate mb-1">
                    {item.name}
                  </h3>
                  <div className="text-xs font-mono text-slate-500 mb-3 truncate">
                    Type: {item.produce_type}
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                    {item.description || 'Standard agricultural commodity specifications.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 group-hover:text-cyan-400 transition-colors">
                  <span>View Specifications</span>
                  <span>→</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

