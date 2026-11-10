import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, Search, Truck, ArrowRight, Activity, PackageCheck, AlertCircle } from 'lucide-react'
import { shipmentsApi } from '../../api/commerce.api'
import { useAuth } from '../../context/AuthContext'
import { formatWeight, formatDate, formatDateTime, formatStatus } from '../../utils'
import PageHeader from '../../components/common/PageHeader'
import StatusBadge from '../../components/common/StatusBadge'
import EmptyState from '../../components/common/EmptyState'

export default function ShipmentsListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const { data: shipmentsData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['shipments-list'],
    queryFn: () => shipmentsApi.list().then(res => res.data),
    staleTime: 30_000,
  })

  const shipments = Array.isArray(shipmentsData) ? shipmentsData : shipmentsData?.items || []
  const filtered = shipments.filter(s => {
    const matchesSearch = s.shipment_id?.toLowerCase().includes(search.toLowerCase()) ||
      s.pickup_city?.toLowerCase().includes(search.toLowerCase()) ||
      s.destination_city?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const canCreate = user?.role === 'admin' || user?.role === 'transporter'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Logistics', href: '/shipments' },
          { label: 'Consignments' }
        ]}
        title="Shipment Consignments"
        description="Active freight consignments, real-time stage transitions, sensor telemetry streams, and chain of custody tracking."
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
            Live Logistics Operations
          </span>
        }
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 hover:border-stone-300 shadow-sm transition-all disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 text-stone-500 ${isFetching ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
            {canCreate && (
              <button
                onClick={() => navigate('/shipments/new')}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[#244634] text-white hover:bg-[#1b3527] shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Initialize Shipment</span>
              </button>
            )}
          </div>
        }
      />

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search shipment ID, origin, destination..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 pl-10 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634] font-mono transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {['ALL', 'BOOKING_CONFIRMED', 'LOADING', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                statusFilter === st
                  ? 'bg-[#244634] text-white font-semibold shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80 border border-transparent'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Shipments Table Container */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-16 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-3 border-stone-200 border-t-[#244634] rounded-full animate-spin" />
          <span className="text-stone-500 font-mono text-xs tracking-wide">Scanning live shipments network...</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No Shipments Found"
          description={search ? 'No consignments match your search query.' : 'No active shipments have been dispatched yet.'}
          actionLabel={canCreate && !search ? 'Initialize First Shipment' : undefined}
          onAction={canCreate && !search ? () => navigate('/shipments/new') : undefined}
        />
      ) : (
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-[11px] uppercase tracking-wider text-stone-500 bg-stone-50/75">
                  <th className="px-6 py-3.5 font-semibold">Shipment ID</th>
                  <th className="px-6 py-3.5 font-semibold">Corridor Route</th>
                  <th className="px-6 py-3.5 font-semibold">Cargo Weight</th>
                  <th className="px-6 py-3.5 font-semibold">Vehicle & Driver</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 font-semibold">Timeline Stage</th>
                  <th className="px-6 py-3.5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-mono">
                {filtered.map((s) => {
                  const sId = s.id || s._id
                  return (
                    <tr
                      key={sId}
                      onClick={() => navigate(`/shipments/${sId}`)}
                      className="hover:bg-stone-50/80 cursor-pointer transition-colors group"
                    >
                      <td className="px-6 py-4 font-bold text-[#244634] group-hover:underline">
                        {s.shipment_id || sId?.slice(-8)}
                      </td>
                      <td className="px-6 py-4 text-stone-700">
                        <div className="flex items-center gap-1.5 font-sans">
                          <span className="text-stone-600">{s.pickup_city}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span className="font-semibold text-stone-900">{s.destination_city}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-stone-800 font-semibold">
                        {formatWeight(s.total_cargo_weight_kg || s.cargo_quantity_kg)}
                      </td>
                      <td className="px-6 py-4 text-stone-600 font-sans">
                        <div className="font-medium text-stone-800">{s.vehicle_id || 'Unassigned'}</div>
                        <div className="text-[11px] text-stone-400 font-mono">{s.driver_id || 'No driver'}</div>
                      </td>
                      <td className="px-6 py-4 font-sans">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="px-6 py-4 text-stone-600">
                        <span className="inline-flex items-center gap-1.5 text-xs font-sans">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {formatStatus(s.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-sans text-xs font-semibold text-[#244634] group-hover:text-emerald-700">
                        <span className="inline-flex items-center gap-1">
                          Timeline & Sensors <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-stone-100 bg-stone-50/50 text-[11px] font-mono text-stone-500 flex justify-between items-center">
            <span>Showing {filtered.length} of {shipments.length} consignments</span>
            <span>Refreshed live via operational freight dispatch</span>
          </div>
        </div>
      )}
    </div>
  )
}
