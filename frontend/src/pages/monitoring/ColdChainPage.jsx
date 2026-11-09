import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Thermometer,
  Droplets,
  Activity,
  Play,
  Pause,
  RotateCcw,
  Square,
  FastForward,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Radio,
  Clock,
  Battery,
  MapPin,
  RefreshCw,
  Info
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

const SCENARIOS = [
  { value: 'NORMAL', label: 'Normal (Optimal 4°C - 8°C)' },
  { value: 'TEMP_EXCURSION', label: 'Temp Spike (Cooling Failure)' },
  { value: 'HUMIDITY_EXCURSION', label: 'Humidity Breach (>90%)' },
  { value: 'BOTH_EXCURSION', label: 'Compound Excursion (Temp + Humidity)' },
  { value: 'FLUCTUATION', label: 'Sensor Fluctuation (Volatile)' },
  { value: 'RECOVERY', label: 'Recovery (Cooling Restored)' },
]

export default function ColdChainPage() {
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
  const [intervalSec, setIntervalSec] = useState(10)
  const [simStatus, setSimStatus] = useState('IDLE') // IDLE, RUNNING, PAUSED, STOPPED
  const [autoPoll, setAutoPoll] = useState(true)

  // Acknowledge / Resolve Modal
  const [activeAlertModal, setActiveAlertModal] = useState(null) // { alert, mode: 'ack' | 'resolve' }
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
      // Backend returns readings sorted descending (newest first). Reverse for chronological chart
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

  // 3. Auto-polling interval
  useEffect(() => {
    if (!autoPoll || !selectedShipmentId) return
    const timer = setInterval(() => {
      fetchTelemetry(true)
    }, 4000)
    return () => clearInterval(timer)
  }, [autoPoll, selectedShipmentId])

  // Simulation actions
  const handleStart = async () => {
    if (!selectedShipmentId) return
    setActionLoading(true)
    setError(null)
    try {
      await sensorsApi.startSimulation(selectedShipmentId, {
        scenario,
        interval_seconds: Number(intervalSec),
      })
      setSimStatus('RUNNING')
      setSuccessMsg(`Simulation started with scenario: ${scenario}`)
      setTimeout(() => setSuccessMsg(null), 3000)
      fetchTelemetry(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start simulation')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePause = async () => {
    if (!selectedShipmentId) return
    setActionLoading(true)
    try {
      await sensorsApi.pauseSimulation(selectedShipmentId)
      setSimStatus('PAUSED')
      setSuccessMsg('Simulation paused')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to pause simulation')
    } finally {
      setActionLoading(false)
    }
  }

  const handleResume = async () => {
    if (!selectedShipmentId) return
    setActionLoading(true)
    try {
      await sensorsApi.resumeSimulation(selectedShipmentId)
      setSimStatus('RUNNING')
      setSuccessMsg('Simulation resumed')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resume simulation')
    } finally {
      setActionLoading(false)
    }
  }

  const handleStop = async () => {
    if (!selectedShipmentId) return
    setActionLoading(true)
    try {
      await sensorsApi.stopSimulation(selectedShipmentId)
      setSimStatus('STOPPED')
      setSuccessMsg('Simulation stopped')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to stop simulation')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReset = async () => {
    if (!selectedShipmentId) return
    if (!window.confirm('Reset all simulated sensor readings and alerts for this shipment?')) return
    setActionLoading(true)
    try {
      await sensorsApi.resetSimulation(selectedShipmentId)
      setSimStatus('IDLE')
      setSuccessMsg('Simulation reset. History cleared.')
      setTimeout(() => setSuccessMsg(null), 3000)
      fetchTelemetry()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset simulation')
    } finally {
      setActionLoading(false)
    }
  }

  const handleNextReading = async () => {
    if (!selectedShipmentId) return
    setActionLoading(true)
    try {
      await sensorsApi.nextReading(selectedShipmentId)
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
    const { alert, mode } = activeAlertModal
    const alertId = alert.id || alert._id
    setActionLoading(true)
    try {
      if (mode === 'ack') {
        await sensorsApi.acknowledgeAlert(alertId, { corrective_action: correctiveAction })
        setSuccessMsg('Alert acknowledged')
      } else {
        await sensorsApi.resolveAlert(alertId, { corrective_action: correctiveAction })
        setSuccessMsg('Alert resolved and ledger entry logged')
      }
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
  const latestReading = readings.length > 0 ? readings[readings.length - 1] : null

  // Format data for chart
  const chartData = readings.map((r, idx) => ({
    time: r.timestamp ? new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : `#${idx + 1}`,
    temperature: typeof r.temperature === 'number' ? Number(r.temperature.toFixed(1)) : (r.temperature_celsius ? Number(r.temperature_celsius.toFixed(1)) : 0),
    humidity: typeof r.humidity === 'number' ? Number(r.humidity.toFixed(1)) : (r.humidity_percentage ? Number(r.humidity_percentage.toFixed(1)) : 0),
    status: r.status,
  }))

  return (
    <div className="space-y-6">
      {/* Header with Title and Prominent Simulated Data Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Thermometer className="h-6 w-6 text-cyan-400" />
              Cold-Chain Monitoring & Telemetry
            </h1>
            <span className="px-2.5 py-1 text-xs font-mono font-semibold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
              <Radio className="h-3 w-3 animate-pulse text-amber-400" />
              SIMULATED DATA
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Real-time cold-chain condition telemetry, automated SLA excursion detection, and simulated IoT sensor controls
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoPoll(!autoPoll)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors flex items-center gap-2 ${
              autoPoll
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${autoPoll ? 'animate-spin' : ''}`} />
            {autoPoll ? 'Live Polling (4s)' : 'Polling Paused'}
          </button>
          <button
            onClick={() => fetchTelemetry()}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            Manual Sync
          </button>
        </div>
      </div>

      {/* Alerts / Error Messages */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-300 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-sm text-emerald-300 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Shipment Selector Banner */}
      <div className="rounded-xl border border-slate-800 bg-[#0b1121]/80 backdrop-blur-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="text-xs font-mono uppercase text-slate-400 shrink-0">
              Select Active Shipment:
            </label>
            <select
              value={selectedShipmentId}
              onChange={(e) => setSelectedShipmentId(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 w-full sm:w-80"
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
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-300">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                {selectedShipment.origin_location || 'Origin'} &rarr; {selectedShipment.destination_location || 'Destination'}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                Status: {selectedShipment.status}
              </span>
              <Link
                to={`/shipments/${selectedShipment.id || selectedShipment._id}`}
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                View Shipment Dossier &rarr;
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Simulation Control Deck (WarehouseOS Dark Console Styling) */}
      <div className="rounded-xl border border-cyan-500/20 bg-[#0b1121] p-5 shadow-[0_0_20px_rgba(6,182,212,0.05)]">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
              Simulated Telemetry Generator Controls
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Engine State:{' '}
            <span
              className={`font-semibold ${
                simStatus === 'RUNNING'
                  ? 'text-emerald-400'
                  : simStatus === 'PAUSED'
                  ? 'text-amber-400'
                  : 'text-slate-400'
              }`}
            >
              {simStatus}
            </span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Scenario Selector */}
          <div className="md:col-span-4">
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
              Simulation Scenario Profile
            </label>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {SCENARIOS.map((sc) => (
                <option key={sc.value} value={sc.value}>
                  {sc.label}
                </option>
              ))}
            </select>
          </div>

          {/* Interval Selector */}
          <div className="md:col-span-2">
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
              Interval (Sec)
            </label>
            <select
              value={intervalSec}
              onChange={(e) => setIntervalSec(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value={5}>5 seconds</option>
              <option value={10}>10 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>60 seconds</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="md:col-span-6 flex flex-wrap items-center gap-2">
            <button
              onClick={handleStart}
              disabled={actionLoading || !selectedShipmentId}
              className="flex-1 min-w-[120px] px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-mono font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Start
            </button>
            <button
              onClick={handlePause}
              disabled={actionLoading || !selectedShipmentId}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-amber-300 border border-amber-500/30 text-xs font-mono font-semibold uppercase flex items-center gap-1.5 transition-colors"
            >
              <Pause className="h-3.5 w-3.5" />
              Pause
            </button>
            <button
              onClick={handleResume}
              disabled={actionLoading || !selectedShipmentId}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-semibold uppercase flex items-center gap-1.5 transition-colors"
            >
              <Play className="h-3.5 w-3.5" />
              Resume
            </button>
            <button
              onClick={handleStop}
              disabled={actionLoading || !selectedShipmentId}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-red-300 border border-red-500/30 text-xs font-mono font-semibold uppercase flex items-center gap-1.5 transition-colors"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              Stop
            </button>
            <button
              onClick={handleNextReading}
              disabled={actionLoading || !selectedShipmentId}
              title="Generate single reading"
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-semibold uppercase flex items-center gap-1.5 transition-colors"
            >
              <FastForward className="h-3.5 w-3.5" />
              Tick
            </button>
            <button
              onClick={handleReset}
              disabled={actionLoading || !selectedShipmentId}
              title="Reset simulation readings"
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 border border-slate-700 text-xs font-mono font-semibold uppercase flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Telemetry Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Temperature Card */}
        <div className="rounded-xl border border-slate-800 bg-[#0b1121]/90 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase mb-2">
            <span className="flex items-center gap-1.5">
              <Thermometer className="h-4 w-4 text-cyan-400" />
              Temperature
            </span>
            {latestReading?.status && (
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  latestReading.status === 'NORMAL'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : latestReading.status === 'WARNING'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-red-500/20 text-red-400 animate-pulse'
                }`}
              >
                {latestReading.status}
              </span>
            )}
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {latestReading?.temperature != null
              ? `${Number(latestReading.temperature).toFixed(1)}°C`
              : latestReading?.temperature_celsius != null
              ? `${Number(latestReading.temperature_celsius).toFixed(1)}°C`
              : '—'}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Target SLA: 4.0°C – 8.0°C
          </div>
        </div>

        {/* Humidity Card */}
        <div className="rounded-xl border border-slate-800 bg-[#0b1121]/90 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase mb-2">
            <span className="flex items-center gap-1.5">
              <Droplets className="h-4 w-4 text-emerald-400" />
              Relative Humidity
            </span>
            <span className="text-[10px] text-slate-400">RH %</span>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {latestReading?.humidity != null
              ? `${Number(latestReading.humidity).toFixed(1)}%`
              : latestReading?.humidity_percentage != null
              ? `${Number(latestReading.humidity_percentage).toFixed(1)}%`
              : '—'}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Target Envelope: 85% – 95%
          </div>
        </div>

        {/* Total Readings */}
        <div className="rounded-xl border border-slate-800 bg-[#0b1121]/90 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase mb-2">
            <span className="flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-purple-400" />
              Readings Logged
            </span>
            <span className="text-[10px] text-slate-400">Total</span>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {readings.length}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Latest: {latestReading?.timestamp ? new Date(latestReading.timestamp).toLocaleTimeString() : 'N/A'}
          </div>
        </div>

        {/* Active Alerts */}
        <div className="rounded-xl border border-slate-800 bg-[#0b1121]/90 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase mb-2">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-red-400" />
              Active Excursions
            </span>
            <span className="text-[10px] text-slate-400">Ledger-Backed</span>
          </div>
          <div className="text-2xl font-bold font-mono text-red-400">
            {alerts.filter(a => a.status === 'ACTIVE').length}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Total recorded: {alerts.length}
          </div>
        </div>
      </div>

      {/* Main Dual-Axis Recharts Telemetry Graph */}
      <div className="rounded-xl border border-slate-800 bg-[#0b1121]/90 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              Live Sensor Telemetry Stream (Temperature & Humidity)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Continuous time-series tracking against cold-chain boundary thresholds
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1 text-cyan-400">
              <span className="h-2 w-2 rounded-full bg-cyan-400 inline-block" /> Temp (°C)
            </span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" /> Humidity (%)
            </span>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-800 rounded-lg">
            <Radio className="h-8 w-8 text-slate-400 mb-2" />
            <p className="text-sm font-mono">No telemetry readings recorded for this shipment</p>
            <p className="text-xs text-slate-400 mt-1">
              Select a scenario above and click &quot;Start&quot; or &quot;Tick&quot; to begin generating simulated sensor data
            </p>
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  fontSize={11}
                  fontFamily="monospace"
                  tickLine={false}
                />
                <YAxis
                  yAxisId="temp"
                  stroke="#06b6d4"
                  fontSize={11}
                  fontFamily="monospace"
                  domain={[-5, 35]}
                  tickFormatter={(v) => `${v}°C`}
                />
                <YAxis
                  yAxisId="humidity"
                  orientation="right"
                  stroke="#10b981"
                  fontSize={11}
                  fontFamily="monospace"
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#030712',
                    borderColor: '#334155',
                    borderRadius: '0.5rem',
                    color: '#f8fafc',
                    fontFamily: 'monospace',
                    fontSize: '12px',
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
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={{ r: 2, fill: '#06b6d4' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  yAxisId="humidity"
                  type="monotone"
                  dataKey="humidity"
                  name="Humidity (%)"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 2, fill: '#10b981' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Sensor SLA Excursion Alerts Section */}
      <div className="rounded-xl border border-slate-800 bg-[#0b1121]/90 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <h2 className="text-base font-semibold text-white">
              SLA Breach & Sensor Excursion Log
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {alerts.length} incidents recorded
          </span>
        </div>

        {alerts.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm font-mono border border-dashed border-slate-800 rounded-lg">
            No temperature or humidity excursions detected for this shipment. All parameters within SLA envelopes.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase">
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Message</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {alerts.map((alert) => {
                  const alertId = alert.id || alert._id
                  const isCritical = alert.severity === 'CRITICAL'
                  const isHigh = alert.severity === 'HIGH'
                  return (
                    <tr key={alertId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                        {formatDate(alert.created_at || alert.timestamp)}
                      </td>
                      <td className="py-3 px-3 font-semibold text-white">
                        {alert.alert_type || 'EXCURSION'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isCritical
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : isHigh
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </td>
                      <td className="py-3 px-3 max-w-md truncate">
                        {alert.message || alert.description || 'Condition breach detected'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            alert.status === 'ACTIVE'
                              ? 'bg-red-500/20 text-red-300'
                              : alert.status === 'ACKNOWLEDGED'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {alert.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-2">
                        {alert.status === 'ACTIVE' && (
                          <button
                            onClick={() => {
                              setActiveAlertModal({ alert, mode: 'ack' })
                              setCorrectiveAction('')
                            }}
                            className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-colors"
                          >
                            Acknowledge
                          </button>
                        )}
                        {alert.status !== 'RESOLVED' && (
                          <button
                            onClick={() => {
                              setActiveAlertModal({ alert, mode: 'resolve' })
                              setCorrectiveAction('')
                            }}
                            className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
                          >
                            Resolve
                          </button>
                        )}
                        {alert.status === 'RESOLVED' && (
                          <span className="text-slate-400 text-[11px]">Resolved</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#0b1121] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">
              {activeAlertModal.mode === 'ack' ? 'Acknowledge Sensor Alert' : 'Resolve Sensor Excursion'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {activeAlertModal.alert.message || 'SLA threshold breach detected.'}
            </p>

            <form onSubmit={handleAlertActionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                  Corrective Action Taken / Notes:
                </label>
                <textarea
                  rows={3}
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                  placeholder="e.g. Reefer temperature setpoint adjusted to 4°C, compressor reset verified."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveAlertModal(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono uppercase transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-mono font-semibold uppercase tracking-wider transition-all"
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
