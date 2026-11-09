import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { freightBookingsApi } from '../../api/commerce.api'
import { useAuth } from '../../context/AuthContext'
import { formatWeight, formatDate, getStatusColor, formatStatus } from '../../utils'

export default function FreightBookingsListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [search, setSearch] = useState('')

  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ['freight-bookings'],
    queryFn: () => freightBookingsApi.list().then(res => res.data),
    staleTime: 30_000,
  })

  const bookingList = Array.isArray(bookings) ? bookings : bookings?.items || []
  const filtered = bookingList.filter(b =>
    b.booking_id?.toLowerCase().includes(search.toLowerCase()) ||
    b.pickup_city?.toLowerCase().includes(search.toLowerCase()) ||
    b.destination_city?.toLowerCase().includes(search.toLowerCase()) ||
    b.preferred_vehicle_category?.toLowerCase().includes(search.toLowerCase())
  )

  const canCreate = user?.role === 'admin' || user?.role === 'buyer' || user?.role === 'farmer'

  return (
    <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-10 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-500"></span>
            <span className="text-xs font-mono font-medium text-amber-500 uppercase tracking-widest">
              Logistics Dispatch
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Freight <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Bookings</span>
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl">
            Transport dispatch requests, multi-transporter quotations, vehicle category matching, and cold-chain compliance.
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
              onClick={() => navigate('/freight-bookings/new')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-semibold text-sm shadow-lg shadow-cyan-900/20 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Freight Booking
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search booking ID, route, vehicle category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0b1121] border border-slate-800 rounded-xl px-4 py-2.5 pl-10 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
          />
          <svg className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <span className="text-xs font-mono text-slate-500">
          {filtered.length} booking{filtered.length === 1 ? '' : 's'} active
        </span>
      </div>

      {/* Bookings Table */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
          <span className="text-slate-500 font-mono text-sm animate-pulse">Scanning freight booking requests...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-[#0b1121]/40 p-16 text-center">
          <div className="text-4xl mb-4">🚛</div>
          <h3 className="text-xl font-medium text-white mb-2">No Freight Bookings</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            {search ? 'No bookings match your search query.' : 'No freight transportation requests have been posted yet.'}
          </p>
          {canCreate && !search && (
            <button
              onClick={() => navigate('/freight-bookings/new')}
              className="text-cyan-400 hover:text-cyan-300 font-medium text-sm"
            >
              + Create First Freight Booking
            </button>
          )}
        </div>
      ) : (
        <div className="bg-[#0b1121] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500 bg-slate-950/40">
                <th className="px-6 py-4">Booking ID</th>
                <th className="px-6 py-4">Route</th>
                <th className="px-6 py-4">Cargo Weight</th>
                <th className="px-6 py-4">Vehicle Category</th>
                <th className="px-6 py-4">Cold Chain</th>
                <th className="px-6 py-4">Pickup Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Quotes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((b) => {
                const bookingKey = b.id || b._id || b.booking_id
                const statusColor = getStatusColor(b.status)
                return (
                  <tr
                    key={bookingKey}
                    onClick={() => navigate(`/freight-bookings/${bookingKey}`)}
                    className="hover:bg-slate-800/30 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 font-bold text-cyan-400">{b.booking_id || bookingKey}</td>
                    <td className="px-6 py-4 text-slate-200">
                      <span className="text-slate-400">{b.pickup_city}</span>
                      <span className="text-cyan-500 mx-1.5">→</span>
                      <span className="text-white font-semibold">{b.destination_city}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-300 font-semibold">{formatWeight(b.total_cargo_weight_kg || b.cargo_quantity_kg)}</td>
                    <td className="px-6 py-4 text-slate-400">{b.preferred_vehicle_category}</td>
                    <td className="px-6 py-4">
                      {b.refrigeration_required ? (
                        <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px]">
                          Refrigerated ({b.temperature_min ?? 2}° to {b.temperature_max ?? 8}°C)
                        </span>
                      ) : (
                        <span className="text-slate-600 text-[10px]">Ambient</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-amber-400">{formatDate(b.requested_pickup_date)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] uppercase tracking-wider ${statusColor}`}>
                        {formatStatus(b.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-cyan-400 hover:text-cyan-300">
                      Inspect →
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

