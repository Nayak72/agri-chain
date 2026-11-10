import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { analyticsApi } from '../api/analytics.api'
import { shipmentsApi } from '../api/commerce.api'
import { ledgerApi } from '../api/monitoring.api'
import { useAuth } from '../context/AuthContext'
import { formatDateTime, formatStatus, getRoleLabel } from '../utils'
import { ROLES, normalizeRole } from '../constants/roles'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  RefreshCw,
  Plus,
  ArrowRight,
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Timer,
  Award,
  XCircle,
  Hash,
  Sprout,
  Boxes,
  Truck,
  ShieldCheck,
  BadgeDollarSign,
  Users,
  Navigation,
  ClipboardCheck,
  Warehouse,
  PackageSearch,
  ShoppingCart,
  Apple,
  UserCog,
  Settings,
  ThermometerSnowflake,
} from 'lucide-react'

// Existing Role Quick Actions mapping exactly as implemented in legacy code
const ROLE_QUICK_ACTIONS = {
  [ROLES.FARMER]: [
    { icon: Sprout, label: 'Register Farm', desc: 'Add new farmland acreage', path: '/farms/new', accent: 'forest' },
    { icon: Boxes, label: 'Log Produce Batch', desc: 'Register harvested lot', path: '/batches/new', accent: 'terracotta' },
    { icon: Truck, label: 'Book Freight', desc: 'Request carrier pickup', path: '/freight-bookings/new', accent: 'harvest' },
    { icon: ShieldCheck, label: 'Explore Ledger', desc: 'Verify produce provenance', path: '/ledger', accent: 'slate' },
  ],
  [ROLES.TRANSPORTER]: [
    { icon: BadgeDollarSign, label: 'Submit Freight Quote', desc: 'Bid on open freight tenders', path: '/freight-quotes', accent: 'forest' },
    { icon: Truck, label: 'Add Fleet Vehicle', desc: 'Enroll reefer or container', path: '/fleet/new', accent: 'terracotta' },
    { icon: Users, label: 'Register Driver', desc: 'Onboard licensed driver', path: '/drivers/new', accent: 'harvest' },
    { icon: Navigation, label: 'Create Shipment', desc: 'Dispatch confirmed booking', path: '/shipments/new', accent: 'slate' },
  ],
  [ROLES.DRIVER]: [
    { icon: Navigation, label: 'My Active Shipments', desc: 'Assigned transport runs', path: '/shipments', accent: 'forest' },
    { icon: ThermometerSnowflake, label: 'Cold-Chain Telemetry', desc: 'Cargo temp & SLA status', path: '/cold-chain', accent: 'terracotta' },
    { icon: ClipboardCheck, label: 'Deliveries', desc: 'Record delivery handover', path: '/deliveries', accent: 'harvest' },
    { icon: ShieldCheck, label: 'Ledger Audit', desc: 'Tamper-evident logs', path: '/ledger', accent: 'slate' },
  ],
  [ROLES.WAREHOUSE_MANAGER]: [
    { icon: Warehouse, label: 'Warehouse Terminals', desc: 'Review facility occupancy', path: '/warehouses', accent: 'forest' },
    { icon: PackageSearch, label: 'Inventory & Receiving', desc: 'Intake batches & FEFO rotation', path: '/inventory', accent: 'terracotta' },
    { icon: ThermometerSnowflake, label: 'Cold-Chain Telemetry', desc: 'Storage environmental sensors', path: '/cold-chain', accent: 'harvest' },
    { icon: ShieldCheck, label: 'Ledger Audit', desc: 'Verify incoming batches', path: '/ledger', accent: 'slate' },
  ],
  [ROLES.BUYER]: [
    { icon: ShoppingCart, label: 'New Purchase Order', desc: 'Procure agricultural lots', path: '/purchase-orders/new', accent: 'forest' },
    { icon: Truck, label: 'Book Freight', desc: 'Arrange shipment transport', path: '/freight-bookings/new', accent: 'harvest' },
    { icon: Package, label: 'Inbound Shipments', desc: 'Track incoming consignments', path: '/shipments', accent: 'terracotta' },
    { icon: ShieldCheck, label: 'Verify Provenance', desc: 'Inspect audit ledger', path: '/ledger', accent: 'slate' },
  ],
  [ROLES.ADMIN]: [
    { icon: Apple, label: 'Produce Catalogue', desc: 'Manage system specifications', path: '/produce', accent: 'forest' },
    { icon: Warehouse, label: 'Warehouses', desc: 'Manage terminal facilities', path: '/warehouses', accent: 'terracotta' },
    { icon: UserCog, label: 'Manage Users', desc: 'RBAC approvals and accounts', path: '/users', accent: 'harvest' },
    { icon: Settings, label: 'System Settings', desc: 'Infrastructure telemetry', path: '/settings', accent: 'slate' },
  ],
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const userRole = normalizeRole(user?.role)

  // 1. Dashboard metrics from existing endpoint
  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => analyticsApi.dashboard().then(r => r.data),
    staleTime: 60_000,
    retry: 2,
  })

  // 2. Recent shipments from existing endpoint
  const { data: shipmentsData, isLoading: shipmentsLoading, refetch: refetchShipments } = useQuery({
    queryKey: ['shipments', 'recent'],
    queryFn: () => shipmentsApi.list({ page: 1, page_size: 8 }).then(r => r.data),
    staleTime: 30_000,
    retry: 2,
  })

  // 3. Ledger statistics from existing endpoint
  const { data: ledgerStats } = useQuery({
    queryKey: ['ledger', 'statistics'],
    queryFn: () => ledgerApi.statistics().then(r => r.data),
    staleTime: 120_000,
    retry: 2,
  })

  const isLoading = analyticsLoading || shipmentsLoading
  const stats = analytics || {}
  const shipments = Array.isArray(shipmentsData)
    ? shipmentsData
    : shipmentsData?.items || shipmentsData?.shipments || []

  const handleRefresh = () => {
    refetchAnalytics()
    refetchShipments()
  }

  const actions = ROLE_QUICK_ACTIONS[userRole] || ROLE_QUICK_ACTIONS[ROLES.ADMIN]

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Page Header */}
      <PageHeader
        badge="Live Telemetry"
        title="Supply Chain Overview"
        serif={false}
        description={
          user ? (
            <span>
              Real-time agricultural logistics monitoring across active operations. Signed in as{' '}
              <strong className="text-ink-primary font-medium">{user.full_name || user.email}</strong>{' '}
              <span className="font-mono text-xs text-forest">({getRoleLabel(user.role)})</span>
            </span>
          ) : (
            'Real-time agricultural logistics monitoring across active operations.'
          )
        }
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Syncing...' : 'Sync'}</span>
            </Button>

            {userRole === ROLES.TRANSPORTER && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/shipments/new')}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>New Shipment</span>
              </Button>
            )}
          </>
        }
      />

      {/* KPI Cards: strictly matching backend DashboardMetrics & ledgerApi.statistics schema */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="Total Shipments"
          value={isLoading ? '—' : stats.total_shipments ?? 0}
          accent="forest"
          onClick={() => navigate('/shipments')}
        />
        <StatCard
          icon={Clock}
          label="Active Shipments"
          value={isLoading ? '—' : stats.active_shipments ?? 0}
          accent="forest"
          onClick={() => navigate('/shipments')}
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={isLoading ? '—' : (stats.completed_shipments ?? stats.delivered_shipments ?? 0)}
          sublabel="Delivered cargo"
          accent="sage"
          onClick={() => navigate('/deliveries')}
        />
        <StatCard
          icon={AlertTriangle}
          label="Delayed"
          value={isLoading ? '—' : stats.delayed_shipments ?? 0}
          alert={Boolean(stats.delayed_shipments && stats.delayed_shipments > 0)}
          accent="red"
          onClick={() => navigate('/shipments')}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Timer}
          label="Avg Transit Hours"
          value={isLoading ? '—' : `${stats.average_transit_hours ?? 0}h`}
          sublabel="Transit duration"
          accent="slate"
        />
        <StatCard
          icon={Award}
          label="On-Time Delivery"
          value={isLoading ? '—' : `${stats.on_time_delivery_percentage ?? 0}%`}
          sublabel="Fulfillment SLA"
          accent="sage"
        />
        <StatCard
          icon={XCircle}
          label="Cancelled"
          value={isLoading ? '—' : stats.cancelled_shipments ?? 0}
          accent="terracotta"
          onClick={() => navigate('/shipments')}
        />
        <StatCard
          icon={Hash}
          label="Ledger Blocks"
          value={isLoading ? '—' : ledgerStats?.total_blocks ?? 0}
          sublabel="Audit chain sealed"
          accent="slate"
          onClick={() => navigate('/ledger')}
        />
      </div>

      {/* Main Content Grid: Recent Shipments & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Shipments (2 Cols) */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-border">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-forest" />
                Recent Shipments
              </CardTitle>
              <button
                onClick={() => navigate('/shipments')}
                className="text-xs font-mono font-semibold text-forest hover:underline flex items-center gap-1 cursor-pointer"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </CardHeader>

            <CardContent className="p-0 flex-1">
              {shipmentsLoading ? (
                <div className="flex flex-col items-center justify-center h-48 space-y-3">
                  <div className="w-8 h-8 border-3 border-forest/20 border-t-forest rounded-full animate-spin" />
                  <span className="text-xs font-mono text-ink-secondary">Loading shipment register...</span>
                </div>
              ) : shipments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center p-6">
                  <div className="w-12 h-12 rounded-xl bg-surface-muted flex items-center justify-center text-ink-tertiary mb-3">
                    <Package className="h-6 w-6 stroke-[1.5]" />
                  </div>
                  <p className="text-ink-secondary text-sm font-medium">No shipments recorded yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/shipments/new')}
                    className="mt-3"
                  >
                    Create first shipment
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/70 bg-surface-muted/40">
                        <th className="px-5 py-3 text-left text-xs font-mono font-semibold text-ink-secondary uppercase tracking-wider">
                          Shipment ID
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-mono font-semibold text-ink-secondary uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-mono font-semibold text-ink-secondary uppercase tracking-wider hidden sm:table-cell">
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {shipments.map((s) => {
                        const sId = s.id || s._id
                        const displayId = s.shipment_id || s.shipment_number || sId
                        return (
                          <tr
                            key={sId}
                            onClick={() => navigate(`/shipments/${sId}`)}
                            className="hover:bg-surface-muted/50 cursor-pointer transition-colors"
                          >
                            <td className="px-5 py-3.5 font-mono text-xs font-semibold text-ink-primary">
                              {displayId}
                            </td>
                            <td className="px-5 py-3.5">
                              <StatusBadge status={s.status} />
                            </td>
                            <td className="px-5 py-3.5 text-xs text-ink-secondary font-mono hidden sm:table-cell">
                              {formatDateTime(s.created_at)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions (1 Col) strictly matching existing 4 links */}
        <div>
          <Card className="h-full">
            <CardHeader className="py-4 border-b border-border">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-terracotta" />
                Quick Actions ({getRoleLabel(userRole)})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {actions.map((act) => {
                const Icon = act.icon
                return (
                  <button
                    key={act.label}
                    onClick={() => navigate(act.path)}
                    className="w-full text-left p-3.5 rounded-xl border border-border bg-surface hover:border-forest/40 hover:bg-forest/5 hover:shadow-xs transition-all duration-150 cursor-pointer group flex items-start gap-3.5"
                  >
                    <div className="w-9 h-9 rounded-lg bg-surface-muted border border-border flex items-center justify-center text-forest group-hover:bg-forest group-hover:text-white transition-colors shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 stroke-[2]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-ink-primary group-hover:text-forest transition-colors flex items-center justify-between">
                        <span>{act.label}</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-forest" />
                      </div>
                      <div className="text-[11px] text-ink-secondary mt-0.5 leading-tight">
                        {act.desc}
                      </div>
                    </div>
                  </button>
                )
              })}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
