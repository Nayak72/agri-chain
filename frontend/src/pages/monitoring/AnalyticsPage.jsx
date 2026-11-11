import React, { useState, useEffect } from 'react'
import {
  TrendingUp,
  Truck,
  DollarSign,
  ShieldCheck,
  Thermometer,
  Clock,
  AlertTriangle,
  CheckCircle2,
  PieChart as PieIcon,
  BarChart3,
  RefreshCw,
  Percent,
  Layers,
  ArrowUpRight
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'
import { analyticsApi } from '../../api/analytics.api'
import { formatCurrency } from '../../utils'
import PageHeader from '../../components/common/PageHeader'

const COLORS = ['#244634', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0284c7']

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'freight' | 'quality' | 'fleet'
  const [dashboardData, setDashboardData] = useState(null)
  const [freightData, setFreightData] = useState(null)
  const [fleetData, setFleetData] = useState(null)
  const [qualityData, setQualityData] = useState(null)
  const [coldChainData, setColdChainData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAllAnalytics = async () => {
    setLoading(true)
    setError(null)
    try {
      const [dashRes, freightRes, fleetRes, qualityRes, ccRes] = await Promise.all([
        analyticsApi.dashboard().catch(() => ({ data: null })),
        analyticsApi.freight().catch(() => ({ data: null })),
        analyticsApi.fleet().catch(() => ({ data: null })),
        analyticsApi.quality().catch(() => ({ data: null })),
        analyticsApi.coldChain().catch(() => ({ data: null })),
      ])

      setDashboardData(dashRes.data)
      setFreightData(freightRes.data)
      setFleetData(fleetRes.data)
      setQualityData(qualityRes.data)
      setColdChainData(ccRes.data)
    } catch (err) {
      console.error('Failed to load analytics:', err)
      setError('Failed to fetch analytics metrics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllAnalytics()
  }, [])

  // Prepare chart datasets
  const fleetDistribution = fleetData ? [
    { name: 'Assigned', value: fleetData.assigned_vehicles || 0, color: '#244634' },
    { name: 'Available', value: fleetData.available_vehicles || 0, color: '#10b981' },
    { name: 'Maintenance', value: fleetData.maintenance_vehicles || 0, color: '#f59e0b' },
  ] : []

  const coldChainDistribution = coldChainData ? [
    { name: 'Normal', value: coldChainData.normal_readings || 0, color: '#10b981' },
    { name: 'Critical', value: coldChainData.critical_readings || 0, color: '#ef4444' },
  ] : []

  const qualityCargoData = qualityData ? [
    { name: 'Accepted Cargo', kg: qualityData.accepted_quantity_kg || 0 },
    { name: 'Damaged Cargo', kg: qualityData.damaged_quantity_kg || 0 },
    { name: 'Rejected / Missing', kg: qualityData.rejected_quantity_kg || 0 },
  ] : []

  const transporterCostChartData = freightData?.transporter_wise_cost?.map((item, idx) => ({
    name: item.transporter_name || `Transporter #${idx + 1}`,
    cost: (item.total_cost_paise || item.cost || 0) / 100,
  })) || []

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Intelligence', href: '/analytics' },
          { label: 'Analytics' }
        ]}
        title="Supply Chain Analytics & Intelligence"
        description="Real-time multi-dimensional operational metrics across freight spend, vehicle fleet efficiency, cold-chain compliance, and cargo quality."
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            FASTAPI LIVE AGGREGATIONS
          </span>
        }
        actions={
          <button
            onClick={fetchAllAnalytics}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-mono rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 shadow-xs transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-stone-400' : 'text-stone-500'}`} />
            <span>Refresh Analytics</span>
          </button>
        }
      />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-3 overflow-x-auto text-xs font-mono">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-[#244634] text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Executive Overview
        </button>
        <button
          onClick={() => setActiveTab('freight')}
          className={`px-4 py-2 rounded-lg font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 ${
            activeTab === 'freight'
              ? 'bg-[#244634] text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80'
          }`}
        >
          <DollarSign className="h-4 w-4" />
          Freight & Financials
        </button>
        <button
          onClick={() => setActiveTab('quality')}
          className={`px-4 py-2 rounded-lg font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 ${
            activeTab === 'quality'
              ? 'bg-[#244634] text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80'
          }`}
        >
          <Thermometer className="h-4 w-4" />
          Cold-Chain Quality & SLA
        </button>
        <button
          onClick={() => setActiveTab('fleet')}
          className={`px-4 py-2 rounded-lg font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 ${
            activeTab === 'fleet'
              ? 'bg-[#244634] text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80'
          }`}
        >
          <Truck className="h-4 w-4" />
          Fleet & Capacity
        </button>
      </div>

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between text-stone-500 text-xs font-mono uppercase mb-2">
                <span>Total Shipments</span>
                <Truck className="h-4 w-4 text-[#244634]" />
              </div>
              <div className="text-3xl font-bold font-mono text-stone-900">
                {dashboardData?.total_shipments ?? 0}
              </div>
              <div className="text-xs text-stone-500 mt-1 font-sans">
                {dashboardData?.active_shipments ?? 0} active in transit
              </div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between text-stone-500 text-xs font-mono uppercase mb-2">
                <span>On-Time Delivery</span>
                <Percent className="h-4 w-4 text-emerald-700" />
              </div>
              <div className="text-3xl font-bold font-mono text-emerald-700">
                {dashboardData?.on_time_delivery_percentage ?? 0}%
              </div>
              <div className="text-xs text-stone-500 mt-1 font-sans">
                Completed: {dashboardData?.completed_shipments ?? 0} shipments
              </div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between text-stone-500 text-xs font-mono uppercase mb-2">
                <span>Avg Transit Duration</span>
                <Clock className="h-4 w-4 text-purple-700" />
              </div>
              <div className="text-3xl font-bold font-mono text-stone-900">
                {dashboardData?.average_transit_hours ?? 0} <span className="text-sm font-normal text-stone-500 font-sans">hrs</span>
              </div>
              <div className="text-xs text-stone-500 mt-1 font-sans">
                From dispatch to delivery
              </div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between text-stone-500 text-xs font-mono uppercase mb-2">
                <span>Delayed Rate</span>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-3xl font-bold font-mono text-amber-700">
                {dashboardData?.delayed_shipments ?? 0}
              </div>
              <div className="text-xs text-stone-500 mt-1 font-sans">
                {dashboardData?.cancelled_shipments ?? 0} cancelled
              </div>
            </div>
          </div>

          {/* Dual Charts in Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Shipment Pipeline Bar Chart */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-900 mb-4 flex items-center gap-2 font-mono">
                <BarChart3 className="h-4 w-4 text-[#244634]" />
                Shipment Status Distribution
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Active', count: dashboardData?.active_shipments ?? 0, fill: '#244634' },
                      { name: 'Delivered', count: dashboardData?.completed_shipments ?? 0, fill: '#10b981' },
                      { name: 'Delayed', count: dashboardData?.delayed_shipments ?? 0, fill: '#f59e0b' },
                      { name: 'Cancelled', count: dashboardData?.cancelled_shipments ?? 0, fill: '#ef4444' },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontFamily="monospace" />
                    <YAxis stroke="#94a3b8" fontSize={11} fontFamily="monospace" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '0.5rem',
                        fontFamily: 'monospace',
                        color: '#0f172a',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quality Compliance Pie Chart */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-900 mb-4 flex items-center gap-2 font-mono">
                <Thermometer className="h-4 w-4 text-emerald-700" />
                Cold-Chain Telemetry Health
              </h2>
              <div className="h-64 w-full flex items-center justify-center">
                {coldChainDistribution.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={coldChainDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {coldChainDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#e2e8f0',
                          borderRadius: '0.5rem',
                          fontFamily: 'monospace',
                          color: '#0f172a',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-xs font-mono text-stone-400 text-center">
                    No sensor readings recorded yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FREIGHT & FINANCIALS */}
      {activeTab === 'freight' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
              <div className="text-xs font-mono uppercase text-stone-500 mb-1">Total Freight Spend</div>
              <div className="text-2xl font-bold font-mono text-emerald-700">
                {formatCurrency(freightData?.total_freight_expenditure_paise ?? 0)}
              </div>
              <div className="text-xs text-stone-500 mt-1 font-sans">Aggregated expenditure</div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
              <div className="text-xs font-mono uppercase text-stone-500 mb-1">Avg Freight Cost</div>
              <div className="text-2xl font-bold font-mono text-stone-900">
                {formatCurrency(freightData?.average_freight_cost_paise ?? 0)}
              </div>
              <div className="text-xs text-stone-500 mt-1 font-sans">Per shipment booking</div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
              <div className="text-xs font-mono uppercase text-stone-500 mb-1">Cost Per Kilogram</div>
              <div className="text-2xl font-bold font-mono text-[#244634]">
                ₹{freightData?.freight_cost_per_kg ? freightData.freight_cost_per_kg.toFixed(2) : '0.00'} / kg
              </div>
              <div className="text-xs text-stone-500 mt-1 font-sans">Transport unit economic rate</div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
              <div className="text-xs font-mono uppercase text-stone-500 mb-1">Avg Quotation Value</div>
              <div className="text-2xl font-bold font-mono text-purple-700">
                {formatCurrency(freightData?.average_quotation_value_paise ?? 0)}
              </div>
              <div className="text-xs text-stone-500 mt-1 font-sans">Bidding marketplace mean</div>
            </div>
          </div>

          {/* Transporter wise spend */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-900 mb-4 font-mono">
              Carrier / Transporter Spend Distribution (INR)
            </h2>
            {transporterCostChartData.length === 0 ? (
              <div className="py-12 text-center text-xs font-mono text-stone-400 border border-dashed border-stone-200 rounded-xl">
                No carrier quotation transactions recorded
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={transporterCostChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontFamily="monospace" />
                    <YAxis stroke="#94a3b8" fontSize={11} fontFamily="monospace" tickFormatter={(v) => `₹${v}`} />
                    <Tooltip
                      formatter={(v) => [`₹${v.toLocaleString()}`, 'Total Spend']}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '0.5rem',
                        fontFamily: 'monospace',
                        color: '#0f172a',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <Bar dataKey="cost" fill="#244634" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: COLD-CHAIN & QUALITY */}
      {activeTab === 'quality' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
              <div className="text-xs font-mono uppercase text-stone-500 mb-1">Cold-Chain Compliance</div>
              <div className="text-2xl font-bold font-mono text-emerald-700">
                {qualityData?.cold_chain_compliance_percentage != null
                  ? `${qualityData.cold_chain_compliance_percentage}%`
                  : 'N/A — No readings'}
              </div>
              <div className="text-xs text-stone-500 mt-1 font-sans">Readings within safety limits</div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
              <div className="text-xs font-mono uppercase text-stone-500 mb-1">Damage Rate</div>
              <div className="text-2xl font-bold font-mono text-amber-700">
                {qualityData?.damage_rate_percentage ?? 0}%
              </div>
              <div className="text-xs text-stone-500 mt-1 font-sans">Transit loss percentage</div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
              <div className="text-xs font-mono uppercase text-stone-500 mb-1">Total Cargo Handled</div>
              <div className="text-2xl font-bold font-mono text-stone-900">
                {(qualityData?.total_dispatched_quantity_kg ?? 0).toLocaleString()} kg
              </div>
              <div className="text-xs text-stone-500 mt-1 font-sans">Dispatched volume</div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
              <div className="text-xs font-mono uppercase text-stone-500 mb-1">Temperature Excursions</div>
              <div className="text-2xl font-bold font-mono text-rose-700">
                {qualityData?.temperature_excursion_count ?? 0}
              </div>
              <div className="text-xs text-stone-500 mt-1 font-sans">Alerts logged to ledger</div>
            </div>
          </div>

          {/* Cargo Acceptance Breakdown */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-900 mb-4 font-mono">
              Cargo Delivery Acceptance vs Transit Damage (Kilograms)
            </h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={qualityCargoData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontFamily="monospace" />
                  <YAxis stroke="#94a3b8" fontSize={11} fontFamily="monospace" tickFormatter={(v) => `${v}kg`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '0.5rem',
                      fontFamily: 'monospace',
                      color: '#0f172a',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Bar dataKey="kg" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FLEET & CAPACITY */}
      {activeTab === 'fleet' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
              <div className="text-xs font-mono uppercase text-stone-500 mb-1">Fleet Utilization</div>
              <div className="text-2xl font-bold font-mono text-[#244634]">
                {fleetData?.vehicle_utilization_percentage ?? 0}%
              </div>
              <div className="text-xs text-stone-500 mt-1 font-sans">Vehicles assigned in missions</div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
              <div className="text-xs font-mono uppercase text-stone-500 mb-1">Total Fleet Size</div>
              <div className="text-2xl font-bold font-mono text-stone-900">
                {fleetData?.total_vehicles ?? 0}
              </div>
              <div className="text-xs text-stone-500 mt-1 font-sans">{fleetData?.available_vehicles ?? 0} available</div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
              <div className="text-xs font-mono uppercase text-stone-500 mb-1">Active Drivers</div>
              <div className="text-2xl font-bold font-mono text-purple-700">
                {fleetData?.total_drivers ?? 0}
              </div>
              <div className="text-xs text-stone-500 mt-1 font-sans">{fleetData?.available_drivers ?? 0} on duty / standby</div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
              <div className="text-xs font-mono uppercase text-stone-500 mb-1">Maintenance Fleet</div>
              <div className="text-2xl font-bold font-mono text-amber-700">
                {fleetData?.maintenance_vehicles ?? 0}
              </div>
              <div className="text-xs text-stone-500 mt-1 font-sans">Depot servicing required</div>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-900 mb-4 font-mono">
              Fleet Operational Availability Breakdown
            </h2>
            <div className="h-64 w-full flex items-center justify-center">
              {fleetDistribution.some(f => f.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={fleetDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {fleetDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '0.5rem',
                        fontFamily: 'monospace',
                        color: '#0f172a',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs font-mono text-stone-400">No vehicles enrolled in fleet registry</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
