import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { analyticsApi } from '../api/analytics.api'
import { shipmentsApi } from '../api/commerce.api'
import { ledgerApi } from '../api/monitoring.api'
import { useAuth } from '../context/AuthContext'
import { formatDateTime, formatStatus, getStatusColor, cn } from '../utils'
import { ROLES, normalizeRole } from '../constants/roles'

function KpiCard({ icon, label, value, sublabel, color = 'cyan', onClick, alert }) {
  const colorMap = {
    cyan: 'text-cyan-400 bg-cyan-500/10 group-hover:bg-cyan-500/20 hover:border-cyan-500/30',
    emerald: 'text-emerald-400 bg-emerald-500/10 group-hover:bg-emerald-500/20 hover:border-emerald-500/30',
    amber: 'text-amber-400 bg-amber-500/10 group-hover:bg-amber-500/20 hover:border-amber-500/30',
    red: 'text-red-400 bg-red-500/10 group-hover:bg-red-500/20 hover:border-red-500/30',
    blue: 'text-blue-400 bg-blue-500/10 group-hover:bg-blue-500/20 hover:border-blue-500/30',
    violet: 'text-violet-400 bg-violet-500/10 group-hover:bg-violet-500/20 hover:border-violet-500/30',
  }

  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      onClick={onClick}
      className={cn(
        'group relative bg-[#0b1121] border border-slate-800 rounded-2xl p-5 text-left transition-all duration-300',
        onClick && 'hover:-translate-y-1 cursor-pointer',
        alert && 'border-red-900/50 shadow-[0_0_20px_rgba(239,68,68,0.08)]',
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={cn('p-2 rounded-lg transition-colors', colorMap[color])}>
          {icon}
        </div>
        {alert && <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
      </div>
      <div className={cn('text-3xl font-bold mb-1', alert ? 'text-red-400' : 'text-white')}>
        {value ?? '—'}
      </div>
      <div className="text-sm text-slate-400">{label}</div>
      {sublabel && <div className="text-xs text-slate-600 mt-1">{sublabel}</div>}
    </Tag>
  )
}

function ShipmentRow({ shipment }) {
  const navigate = useNavigate()
  const sId = shipment.id || shipment._id
  const displayId = shipment.shipment_id || shipment.shipment_number || sId
  const { status, created_at } = shipment
  const statusClass = getStatusColor(status)

  return (
    <tr
      onClick={() => navigate(`/shipments/${sId}`)}
      className="border-b border-slate-800/50 hover:bg-slate-800/20 cursor-pointer transition-colors"
    >
      <td className="px-4 py-3 font-mono text-xs text-slate-400">{displayId}</td>
      <td className="px-4 py-3">
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded border text-xs font-mono uppercase tracking-wider', statusClass)}>
          {formatStatus(status)}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-slate-500 hidden sm:table-cell">{formatDateTime(created_at)}</td>
    </tr>
  )
}

function QuickAction({ icon, label, desc, path, color = 'cyan' }) {
  const navigate = useNavigate()
  const colorMap = {
    cyan: 'border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/5',
    emerald: 'border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/5',
    amber: 'border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/5',
    violet: 'border-violet-500/20 hover:border-violet-500/40 hover:bg-violet-500/5',
  }
  const textColor = {
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    violet: 'text-violet-400',
  }

  return (
    <button
      onClick={() => navigate(path)}
      className={cn(
        'w-full text-left p-4 rounded-xl border bg-[#0b1121] transition-all group',
        colorMap[color]
      )}
    >
      <div className={cn('text-xl mb-2', textColor[color])}>{icon}</div>
      <div className="text-sm font-semibold text-slate-200 group-hover:text-white">{label}</div>
      <div className="text-xs text-slate-500 mt-1">{desc}</div>
    </button>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => analyticsApi.dashboard().then(r => r.data),
    staleTime: 60_000,
    retry: 2,
  })

  const { data: shipmentsData, isLoading: shipmentsLoading, refetch: refetchShipments } = useQuery({
    queryKey: ['shipments', 'recent'],
    queryFn: () => shipmentsApi.list({ page: 1, page_size: 8 }).then(r => r.data),
    staleTime: 30_000,
    retry: 2,
  })

  const { data: ledgerStats } = useQuery({
    queryKey: ['ledger', 'statistics'],
    queryFn: () => ledgerApi.statistics().then(r => r.data),
    staleTime: 120_000,
    retry: 2,
  })

  const isLoading = analyticsLoading || shipmentsLoading
  const stats = analytics || {}
  const shipments = Array.isArray(shipmentsData) ? shipmentsData : shipmentsData?.items || shipmentsData?.shipments || []
  const userRole = normalizeRole(user?.role)

  const handleRefresh = () => {
    refetchAnalytics()
    refetchShipments()
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-10">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 animate-fade-in-down">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500">
              <span className="animate-ping absolute h-2 w-2 rounded-full bg-emerald-400 opacity-75" />
            </span>
            <span className="text-xs font-mono font-medium text-emerald-500 uppercase tracking-widest">
              Live Telemetry
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            Supply Chain{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
              Overview
            </span>
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl">
            Real-time agricultural logistics monitoring across all active operations.
            {user && (
              <span className="ml-2 text-slate-600">
                Signed in as <span className="text-slate-400">{user.full_name || user.email}</span> ({userRole})
              </span>
            )}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white transition-all text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <svg className={cn('w-4 h-4', isLoading && 'animate-spin')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isLoading ? 'Syncing...' : 'Sync'}
          </button>
          {userRole === ROLES.TRANSPORTER && (
            <button
              onClick={() => navigate('/shipments/new')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-semibold text-sm shadow-lg shadow-cyan-900/20 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Shipment
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fade-in-up">
        <KpiCard
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
          label="Total Shipments"
          value={isLoading ? '—' : (stats.total_shipments ?? '0')}
          color="cyan"
          onClick={() => navigate('/shipments')}
        />
        <KpiCard
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
          label="Active Shipments"
          value={isLoading ? '—' : (stats.active_shipments ?? stats.in_transit_shipments ?? '0')}
          color="emerald"
          onClick={() => navigate('/shipments')}
        />
        <KpiCard
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          label="Delivered"
          value={isLoading ? '—' : (stats.delivered_shipments ?? '0')}
          sublabel="This period"
          color="emerald"
          onClick={() => navigate('/deliveries')}
        />
        <KpiCard
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
          label="Delayed"
          value={isLoading ? '—' : (stats.delayed_shipments ?? '0')}
          color="red"
          alert={(stats.delayed_shipments ?? 0) > 0}
          onClick={() => navigate('/shipments')}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <KpiCard
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
          label="Active Farmers"
          value={isLoading ? '—' : (stats.active_farmers ?? stats.total_farmers ?? '0')}
          color="blue"
          onClick={() => navigate('/farms')}
        />
        <KpiCard
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>}
          label="Transporters"
          value={isLoading ? '—' : (stats.active_transporters ?? stats.total_transporters ?? '0')}
          color="amber"
          onClick={() => navigate('/transporters')}
        />
        <KpiCard
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
          label="Active Alerts"
          value={isLoading ? '—' : (stats.active_alerts ?? stats.pending_alerts ?? '0')}
          color="red"
          alert={(stats.active_alerts ?? 0) > 0}
          onClick={() => navigate('/cold-chain')}
        />
        <KpiCard
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
          label="Ledger Blocks"
          value={isLoading ? '—' : (ledgerStats?.total_blocks ?? stats.ledger_blocks ?? '0')}
          color="violet"
          onClick={() => navigate('/ledger')}
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Shipments */}
        <div className="lg:col-span-2 bg-[#0b1121] border border-slate-800 rounded-2xl overflow-hidden animate-fade-in-up">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
              Recent Shipments
            </h2>
            <button
              onClick={() => navigate('/shipments')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-mono transition-colors"
            >
              View all →
            </button>
          </div>

          {shipmentsLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
            </div>
          ) : shipments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <div className="text-4xl mb-3">📦</div>
              <p className="text-slate-500 text-sm">No shipments yet</p>
              <button onClick={() => navigate('/shipments/new')} className="mt-3 text-cyan-400 hover:text-cyan-300 text-sm font-medium">
                Create first shipment →
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800/50">
                  <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase tracking-wider hidden sm:table-cell">Created</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((s) => (
                  <ShipmentRow key={s._id} shipment={s} />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4 animate-fade-in-up">
          <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Quick Actions ({user?.role ? user.role.replace('_', ' ') : 'Operations'})
          </h2>
          {(() => {
            const actions = (() => {
              switch (userRole) {
                case ROLES.FARMER:
                  return [
                    { icon: '🌾', label: 'Register Farm', desc: 'Add new farmland acreage', path: '/farms/new', color: 'emerald' },
                    { icon: '📦', label: 'Log Produce Batch', desc: 'Register harvested lot', path: '/batches/new', color: 'cyan' },
                    { icon: '🚛', label: 'Book Freight', desc: 'Request carrier pickup', path: '/freight-bookings/new', color: 'amber' },
                    { icon: '🔗', label: 'Explore Ledger', desc: 'Verify produce provenance', path: '/ledger', color: 'violet' },
                  ]
                case ROLES.TRANSPORTER:
                  return [
                    { icon: '💰', label: 'Submit Freight Quote', desc: 'Bid on open freight tenders', path: '/freight-quotes', color: 'emerald' },
                    { icon: '🚛', label: 'Add Fleet Vehicle', desc: 'Enroll reefer or container', path: '/fleet/new', color: 'cyan' },
                    { icon: '👤', label: 'Register Driver', desc: 'Onboard licensed driver', path: '/drivers/new', color: 'amber' },
                    { icon: '📦', label: 'Create Shipment', desc: 'Dispatch confirmed booking', path: '/shipments/new', color: 'cyan' },
                  ]
                case ROLES.DRIVER:
                  return [
                    { icon: '📦', label: 'My Active Shipments', desc: 'Assigned transport runs', path: '/shipments', color: 'cyan' },
                    { icon: '🌡️', label: 'Cold-Chain Telemetry', desc: 'Cargo temp & SLA status', path: '/cold-chain', color: 'emerald' },
                    { icon: '📋', label: 'Deliveries', desc: 'Record delivery handover', path: '/deliveries', color: 'amber' },
                    { icon: '🔗', label: 'Ledger Audit', desc: 'Tamper-evident logs', path: '/ledger', color: 'violet' },
                  ]
                case ROLES.WAREHOUSE_MANAGER:
                  return [
                    { icon: '🏢', label: 'Warehouse Terminals', desc: 'Review facility occupancy', path: '/warehouses', color: 'emerald' },
                    { icon: '📦', label: 'Inventory & Receiving', desc: 'Intake batches & FEFO rotation', path: '/inventory', color: 'cyan' },
                    { icon: '🌡️', label: 'Cold-Chain Telemetry', desc: 'Storage environmental sensors', path: '/cold-chain', color: 'amber' },
                    { icon: '🔗', label: 'Ledger Audit', desc: 'Verify incoming batches', path: '/ledger', color: 'violet' },
                  ]
                case ROLES.BUYER:
                  return [
                    { icon: '📋', label: 'New Purchase Order', desc: 'Procure agricultural lots', path: '/purchase-orders/new', color: 'cyan' },
                    { icon: '🚛', label: 'Book Freight', desc: 'Arrange shipment transport', path: '/freight-bookings/new', color: 'amber' },
                    { icon: '📦', label: 'Inbound Shipments', desc: 'Track incoming consignments', path: '/shipments', color: 'emerald' },
                    { icon: '🔗', label: 'Verify Provenance', desc: 'Inspect audit ledger', path: '/ledger', color: 'violet' },
                  ]
                default: // ADMIN
                  return [
                    { icon: '🌾', label: 'Produce Catalogue', desc: 'Manage system specifications', path: '/produce', color: 'emerald' },
                    { icon: '🏢', label: 'Warehouses', desc: 'Manage terminal facilities', path: '/warehouses', color: 'cyan' },
                    { icon: '👥', label: 'Manage Users', desc: 'RBAC approvals and accounts', path: '/users', color: 'violet' },
                    { icon: '⚙️', label: 'System Settings', desc: 'Infrastructure telemetry', path: '/settings', color: 'amber' },
                  ]
              }
            })()
            return actions.map((act) => (
              <QuickAction
                key={act.label}
                icon={act.icon}
                label={act.label}
                desc={act.desc}
                path={act.path}
                color={act.color}
              />
            ))
          })()}
        </div>
      </div>
    </div>
  )
}

