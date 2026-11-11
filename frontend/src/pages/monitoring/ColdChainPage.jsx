import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Thermometer,
  Droplets,
  Activity,
  FastForward,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Radio,
  Clock,
  MapPin,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts'
import { sensorsApi } from '../../api/monitoring.api'
import { shipmentsApi } from '../../api/commerce.api'
import { formatDate } from '../../utils'
import PageHeader from '../../components/common/PageHeader'
import StatusBadge from '../../components/common/StatusBadge'
import { useAuth } from '../../context/AuthContext'

const SCENARIOS = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'TEMP_EXCURSION', label: 'Temperature excursion' },
]

export default function ColdChainPage() {
  const { hasRole } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialShipmentId = searchParams.get('shipmentId') || ''

  const [shipments, setShipments] = useState([])
  const [selectedShipmentId, setSelectedShipmentId] = useState(initialShipmentId)
  const [readings, setReadings] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Simulation controls state
  const [scenario, setScenario] = useState('NORMAL')

  // Resolve alert modal
  const [activeAlertModal, setActiveAlertModal] = useState(null)
  const [correctiveAction, setCorrectiveAction] = useState('')

  // 1. Fetch available shipments on mount
  useEffect(() => {
    async function loadShipments() {
      try {
        const res = await shipmentsApi.list({ page_size: 50 })
        const list = res.data || []
        setShipments(list)
        if (!selectedShipmentId && list.length > 0) {
          setSelectedShipmentId(list[0].id || list[0]._id)
        }
      } catch (err) {
        console.error('Failed to fetch shipments:', err)
      }
    }
    loadShipments()
  }, [])

  // 2. Fetch readings and alerts when selected shipment changes
  const fetchTelemetry = async (silent = false) => {
    if (!selectedShipmentId) return
    if (!silent) setLoading(true)
    setError(null)
    try {
      const [readingsRes, alertsRes] = await Promise.all([
        sensorsApi.readings(selectedShipmentId, { page_size: 60 }),
        sensorsApi.alerts(selectedShipmentId, { page_size: 20 }),
      ])
      const rawReadings = readingsRes.data || []
      const chronological = [...rawReadings].reverse()
      setReadings(chronological)
      setAlerts(alertsRes.data || [])
    } catch (err) {
      if (!silent) {
        setError(err.response?.data?.detail || 'Failed to fetch sensor telemetry')
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedShipmentId) {
      setSearchParams({ shipmentId: selectedShipmentId })
      fetchTelemetry()
    }
  }, [selectedShipmentId])

  const handleNextReading = async () => {
    if (!selectedShipmentId) return
    setActionLoading(true)
    try {
      await sensorsApi.nextReading(selectedShipmentId, scenario)
      setSuccessMsg('Manual reading generated')
      setTimeout(() => setSuccessMsg(null), 2000)
      fetchTelemetry(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to trigger single reading')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Alert actions
  const handleAlertActionSubmit = async (e) => {
    e.preventDefault()
    if (!activeAlertModal) return
    const { alert } = activeAlertModal
    const alertId = alert.id || alert._id
    setActionLoading(true)
    try {
      await sensorsApi.resolveAlert(alertId, { corrective_action: correctiveAction })
      setSuccessMsg('Alert resolved and ledger entry logged')
      setActiveAlertModal(null)
      setCorrectiveAction('')
      setTimeout(() => setSuccessMsg(null), 3000)
      fetchTelemetry(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update alert')
    } finally {
      setActionLoading(false)
    }
  }

  const selectedShipment = shipments.find(s => (s.id || s._id) === selectedShipmentId)
  const canManageReadings = hasRole('ADMIN', 'DRIVER', 'TRANSPORTER')
  const latestReading = readings.length > 0 ? readings[readings.length - 1] : null

  // Format data for chart
  const chartData = readings.map((r, idx) => ({
    time: r.timestamp ? new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : `#${idx + 1}`,
    temperature: Number(r.temperature.toFixed(1)),
    humidity: Number(r.humidity.toFixed(1)),
    status: r.status,
  }))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Monitoring', href: '/cold-chain' },
          { label: 'Cold-Chain Telemetry' }
        ]}
        title="Cold-Chain Monitoring & Telemetry"
        description="On-demand simulated temperature and humidity readings with excursion alerts."
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-amber-50 text-amber-800 border border-amber-200">
            <Radio className="h-3 w-3 animate-pulse text-amber-600" />
            SIMULATED DATA
          </span>
        }
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchTelemetry()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-mono rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 shadow-xs transition-colors"
            >
              Refresh readings
            </button>
          </div>
        }
      />

      {/* Alerts / Error Messages */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Shipment Selector Banner */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="text-xs font-mono font-semibold uppercase text-stone-500 shrink-0">
              Select Active Shipment:
            </label>
            <select
              value={selectedShipmentId}
              onChange={(e) => setSelectedShipmentId(e.target.value)}
              className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634] w-full sm:w-80 font-mono"
            >
              {shipments.length === 0 ? (
                <option value="">No shipments found</option>
              ) : (
                shipments.map((s) => (
                  <option key={s.id || s._id} value={s.id || s._id}>
                    {s.tracking_number || s.shipment_number || (s.id || s._id).slice(-8)} — {s.status}
                  </option>
                ))
              )}
            </select>
          </div>

          {selectedShipment && (
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-stone-600">
              <span className="flex items-center gap-1.5 font-sans">
                <MapPin className="h-3.5 w-3.5 text-[#244634]" />
                {selectedShipment.origin_location || 'Origin'} &rarr; {selectedShipment.destination_location || 'Destination'}
              </span>
              <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                Status: {selectedShipment.status}
              </span>
              <Link
                to={`/shipments/${selectedShipment.id || selectedShipment._id}`}
                className="text-[#244634] hover:underline font-semibold"
              >
                View Dossier &rarr;
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Simulation Control Deck */}
      {canManageReadings && <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#244634]" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-900 font-mono">
              Simulated Telemetry Generator Controls
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Scenario Selector */}
          <div className="md:col-span-4">
            <label className="block text-xs font-mono uppercase text-stone-600 font-semibold mb-1.5">
              Simulation Scenario Profile
            </label>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634] font-mono"
            >
              {SCENARIOS.map((sc) => (
                <option key={sc.value} value={sc.value}>
                  {sc.label}
                </option>
              ))}
            </select>
          </div>


          {/* Action Buttons */}
          <div className="md:col-span-6 flex flex-wrap items-center gap-2">
            <button
              onClick={handleNextReading}
              disabled={actionLoading || !selectedShipmentId || selectedShipment?.status !== 'IN_TRANSIT'}
              title="Generate single reading"
              className="px-3 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-700 border border-stone-200 text-xs font-mono font-semibold uppercase flex items-center gap-1.5 transition-colors"
            >
              <FastForward className="h-3.5 w-3.5" />
              <span>Simulate reading</span>
            </button>
          </div>
        </div>
      </div>}

      {/* Telemetry Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Temperature Card */}
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-mono uppercase mb-2">
            <span className="flex items-center gap-1.5 font-semibold">
              <Thermometer className="h-4 w-4 text-[#244634]" />
              Temperature
            </span>
            {latestReading?.status && (
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  latestReading.status === 'NORMAL'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200 animate-pulse'
                }`}
              >
                {latestReading.status}
              </span>
            )}
          </div>
          <div className="text-2xl font-bold font-mono text-stone-900">
            {latestReading?.temperature != null
              ? `${Number(latestReading.temperature).toFixed(1)}°C`
              : '—'}
          </div>
          <div className="text-xs text-stone-500 mt-1 font-sans">
            Target range: {latestReading?.configured_temp_min ?? "—"}°C – {latestReading?.configured_temp_max ?? "—"}°C
          </div>
        </div>

        {/* Humidity Card */}
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-mono uppercase mb-2">
            <span className="flex items-center gap-1.5 font-semibold">
              <Droplets className="h-4 w-4 text-emerald-700" />
              Relative Humidity
            </span>
            <span className="text-[10px] text-stone-400">RH %</span>
          </div>
          <div className="text-2xl font-bold font-mono text-stone-900">
            {latestReading?.humidity != null
              ? `${Number(latestReading.humidity).toFixed(1)}%`
              : '—'}
          </div>
          <div className="text-xs text-stone-500 mt-1 font-sans">
            Target range: {latestReading?.configured_humidity_min ?? '—'}% – {latestReading?.configured_humidity_max ?? '—'}%
          </div>
        </div>

        {/* Total Readings */}
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-mono uppercase mb-2">
            <span className="flex items-center gap-1.5 font-semibold">
              <Activity className="h-4 w-4 text-purple-700" />
              Readings Logged
            </span>
            <span className="text-[10px] text-stone-400">Recent</span>
          </div>
          <div className="text-2xl font-bold font-mono text-stone-900">
            {readings.length}
          </div>
          <div className="text-xs text-stone-500 mt-1 font-sans">
            Latest: {latestReading?.timestamp ? new Date(latestReading.timestamp).toLocaleTimeString() : 'N/A'}
          </div>
        </div>

        {/* Active Alerts */}
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-mono uppercase mb-2">
            <span className="flex items-center gap-1.5 font-semibold">
              <ShieldAlert className="h-4 w-4 text-rose-600" />
              Active Excursions
            </span>
            <span className="text-[10px] text-stone-400 font-mono">Ledger-Backed</span>
          </div>
          <div className="text-2xl font-bold font-mono text-rose-700">
            {alerts.filter(a => a.status === 'ACTIVE').length}
          </div>
          <div className="text-xs text-stone-500 mt-1 font-sans">
            Total recorded: {alerts.length}
          </div>
        </div>
      </div>

      {/* Main Dual-Axis Recharts Telemetry Graph */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-stone-100">
          <div>
            <h2 className="text-base font-semibold text-stone-900 flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#244634]" />
              Simulated Sensor Readings (Temperature & Humidity)
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              On-demand readings against produce handling ranges
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-cyan-700 font-semibold">
              <span className="h-2 w-2 rounded-full bg-cyan-600 inline-block" /> Temp (°C)
            </span>
            <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-600 inline-block" /> Humidity (%)
            </span>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-stone-400 border border-dashed border-stone-200 rounded-xl">
            <Radio className="h-8 w-8 text-stone-300 mb-2" />
            <p className="text-sm font-mono text-stone-600">No telemetry readings recorded for this shipment</p>
            <p className="text-xs text-stone-400 mt-1 font-sans">
              Select a scenario and simulate a reading to begin generating sensor data.
            </p>
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="time"
                  stroke="#94a3b8"
                  fontSize={11}
                  fontFamily="monospace"
                  tickLine={false}
                />
                <YAxis
                  yAxisId="temp"
                  stroke="#0284c7"
                  fontSize={11}
                  fontFamily="monospace"
                  domain={[-5, 35]}
                  tickFormatter={(v) => `${v}°C`}
                />
                <YAxis
                  yAxisId="humidity"
                  orientation="right"
                  stroke="#16a34a"
                  fontSize={11}
                  fontFamily="monospace"
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '0.75rem',
                    color: '#0f172a',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Legend />
                {/* Cold-chain safety reference lines */}
                <ReferenceLine
                  yAxisId="temp"
                  y={8}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{ value: 'Upper Critical (8°C)', fill: '#ef4444', fontSize: 10, position: 'top' }}
                />
                <ReferenceLine
                  yAxisId="temp"
                  y={4}
                  stroke="#3b82f6"
                  strokeDasharray="4 4"
                  label={{ value: 'Lower Target (4°C)', fill: '#3b82f6', fontSize: 10, position: 'bottom' }}
                />
                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="temperature"
                  name="Temperature (°C)"
                  stroke="#0284c7"
                  strokeWidth={2}
                  dot={{ r: 2, fill: '#0284c7' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  yAxisId="humidity"
                  type="monotone"
                  dataKey="humidity"
                  name="Humidity (%)"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ r: 2, fill: '#16a34a' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Sensor SLA Excursion Alerts Section */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h2 className="text-base font-semibold text-stone-900">
              SLA Breach & Sensor Excursion Log
            </h2>
          </div>
          <span className="text-xs font-mono text-stone-500 font-medium">
            {alerts.length} incidents recorded
          </span>
        </div>

        {alerts.length === 0 ? (
          <div className="py-8 text-center text-stone-500 text-xs font-mono border border-dashed border-stone-200 rounded-xl">
            No temperature or humidity excursions detected for this shipment. All parameters within SLA envelopes.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 uppercase bg-stone-50/75">
                  <th className="py-2.5 px-3 font-semibold">Time</th>
                  <th className="py-2.5 px-3 font-semibold">Type</th>
                  <th className="py-2.5 px-3 font-semibold">Severity</th>
                  <th className="py-2.5 px-3 font-semibold">Message</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {alerts.map((alert) => {
                  const alertId = alert.id || alert._id
                  const isCritical = alert.severity === 'CRITICAL'
                  const isHigh = alert.severity === 'HIGH'
                  return (
                    <tr key={alertId} className="hover:bg-stone-50/75 transition-colors">
                      <td className="py-3 px-3 text-stone-500 whitespace-nowrap">
                        {formatDate(alert.created_at || alert.timestamp)}
                      </td>
                      <td className="py-3 px-3 font-semibold text-stone-900">
                        {alert.alert_type || 'EXCURSION'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isCritical
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : isHigh
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </td>
                      <td className="py-3 px-3 max-w-md truncate font-sans">
                        {alert.message || alert.description || 'Condition breach detected'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            alert.status === 'ACTIVE'
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {alert.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-2">

                        {canManageReadings && alert.status !== 'RESOLVED' && (
                          <button
                            onClick={() => {
                              setActiveAlertModal({ alert, mode: 'resolve' })
                              setCorrectiveAction('')
                            }}
                            className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors"
                          >
                            Resolve
                          </button>
                        )}
                        {alert.status === 'RESOLVED' && (
                          <span className="text-stone-400 text-[11px] font-sans">Resolved</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Acknowledge / Resolve Modal */}
      {activeAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl animate-fade-in-up">
            <h3 className="text-lg font-bold text-stone-900 mb-1">
              Resolve Sensor Excursion
            </h3>
            <p className="text-xs text-stone-500 mb-4 font-sans">
              {activeAlertModal.alert.message || 'SLA threshold breach detected.'}
            </p>

            <form onSubmit={handleAlertActionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-stone-600 font-semibold mb-1.5">
                  Corrective Action Taken / Notes:
                </label>
                <textarea
                  rows={3}
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                  placeholder="e.g. Reefer setpoint adjusted to 10°C and verified."
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634] font-sans"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setActiveAlertModal(null)}
                  className="px-4 py-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-mono uppercase transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-[#244634] hover:bg-[#1b3527] disabled:opacity-50 text-white text-xs font-mono font-semibold uppercase tracking-wider transition-all"
                >
                  {actionLoading ? 'Submitting...' : 'Confirm Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
