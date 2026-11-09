import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { shipmentsApi } from '../../api/commerce.api'
import { useAuth } from '../../context/AuthContext'
import { formatWeight, formatDate, formatDateTime, getStatusColor, formatStatus } from '../../utils'

const TIMELINE_STAGES = [
  { key: 'BOOKING_CONFIRMED', label: 'Booking Confirmed', desc: 'Freight quotation accepted and dispatch authorized' },
  { key: 'VEHICLE_ASSIGNED', label: 'Vehicle Assigned', desc: 'Refrigerated or commercial fleet asset bound' },
  { key: 'DRIVER_ASSIGNED', label: 'Driver Assigned', desc: 'Certified commercial operator allocated' },
  { key: 'LOADING', label: 'Cargo Loading', desc: 'Batch payload verified and loaded at origin' },
  { key: 'DISPATCHED', label: 'Dispatched', desc: 'Outbound departure logged on blockchain ledger' },
  { key: 'IN_TRANSIT', label: 'In Transit', desc: 'Active cold-chain telemetry and GPS tracking active' },
  { key: 'CHECKPOINT_REACHED', label: 'Checkpoint Logged', desc: 'En route corridor checkpoint verification' },
  { key: 'DELIVERED', label: 'Delivered Hub', desc: 'Destination delivery inspection and sign-off' },
]

export default function ShipmentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [actionError, setActionError] = useState('')
  const [showLoadModal, setShowLoadModal] = useState(false)
  const [actualWeight, setActualWeight] = useState('')

  const { data: shipment, isLoading, error } = useQuery({
    queryKey: ['shipment', id],
    queryFn: () => shipmentsApi.get(id).then(res => res.data),
  })

  // Dispatch mutation
  const dispatchMutation = useMutation({
    mutationFn: () => shipmentsApi.dispatch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment', id] })
      setActionError('')
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Dispatch failed.'
      setActionError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    },
  })

  // Load mutation
  const loadMutation = useMutation({
    mutationFn: (data) => shipmentsApi.load(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment', id] })
      setShowLoadModal(false)
      setActionError('')
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Loading failed.'
      setActionError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    },
  })

  const handleLoadSubmit = (e) => {
    e.preventDefault()
    loadMutation.mutate({
      actual_weight_kg: parseFloat(actualWeight),
      batch_quantities: {},
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
        <span className="text-slate-500 font-mono text-sm animate-pulse">Reading consignment timeline...</span>
      </div>
    )
  }

  if (error || !shipment) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-white mb-2">Shipment Not Found</h2>
        <p className="text-slate-400 mb-6">Could not retrieve shipment record for ID: {id}</p>
        <button
          onClick={() => navigate('/shipments')}
          className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
        >
          Return to Shipments List
        </button>
      </div>
    )
  }

  const sId = shipment.id || shipment._id || id
  const statusColor = getStatusColor(shipment.status)

  // Determine timeline progress
  const currentStatusIndex = TIMELINE_STAGES.findIndex(s => s.key === shipment.status)
  const activeIdx = currentStatusIndex !== -1 ? currentStatusIndex : 0

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-10 animate-fade-in-up">
      <button
        onClick={() => navigate('/shipments')}
        className="text-xs font-mono text-cyan-400 hover:text-cyan-300 mb-6 flex items-center gap-2 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        SHIPMENTS_CONSIGNMENTS
      </button>

      {/* Header Deck */}
      <div className="bg-[#0b1121] border border-slate-800 rounded-3xl p-8 mb-6 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                ACTIVE SHIPMENT
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${statusColor}`}>
                {formatStatus(shipment.status)}
              </span>
            </div>
            <h1 className="text-3xl font-bold font-mono text-white tracking-tight">{shipment.shipment_id || sId}</h1>
            <p className="text-slate-400 text-sm mt-1">
              Route: <span className="text-white font-semibold">{shipment.pickup_city}</span> → <span className="text-white font-semibold">{shipment.destination_city}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Simulation Shortcut */}
            <button
              onClick={() => navigate('/cold-chain', { state: { shipmentId: sId } })}
              className="px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Cold-Chain Telemetry
            </button>

            {/* Loading Action */}
            {['DRIVER_ASSIGNED', 'BOOKING_CONFIRMED', 'VEHICLE_ASSIGNED'].includes(shipment.status) && (
              <button
                onClick={() => {
                  setActualWeight(String(shipment.total_cargo_weight_kg || 2000))
                  setShowLoadModal(true)
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-bold transition-all"
              >
                Log Cargo Loading
              </button>
            )}

            {/* Dispatch Action */}
            {['LOADING', 'LOADED'].includes(shipment.status) && (
              <button
                onClick={() => dispatchMutation.mutate()}
                disabled={dispatchMutation.isPending}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-mono text-xs font-bold transition-all disabled:opacity-50"
              >
                {dispatchMutation.isPending ? 'Dispatching...' : 'Dispatch Shipment Consignment'}
              </button>
            )}

            {/* Delivery Action */}
            {['DISPATCHED', 'IN_TRANSIT', 'CHECKPOINT_REACHED'].includes(shipment.status) && (
              <button
                onClick={() => navigate('/deliveries', { state: { shipmentId: sId } })}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all"
              >
                Record Delivery Inspection
              </button>
            )}
          </div>
        </div>

        {actionError && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-mono">
            {actionError}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Connected Vertical Timeline */}
        <div className="lg:col-span-2 bg-[#0b1121] border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              Connected Consignment Timeline
            </h2>
            <span className="text-xs font-mono text-slate-500">Stage {activeIdx + 1} of {TIMELINE_STAGES.length}</span>
          </div>

          <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {TIMELINE_STAGES.map((stage, idx) => {
              const isPast = idx < activeIdx
              const isCurrent = idx === activeIdx
              const isFuture = idx > activeIdx

              return (
                <div key={stage.key} className="relative flex items-start gap-4">
                  {/* Indicator Dot */}
                  <div className={`absolute -left-6 top-1 w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                    isPast
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold'
                      : isCurrent
                      ? 'bg-cyan-500 border-cyan-300 text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.8)]'
                      : 'bg-slate-900 border-slate-700 text-slate-600'
                  }`}>
                    {isPast ? '✓' : idx + 1}
                  </div>

                  <div className="pl-4">
                    <div className="flex items-center gap-3">
                      <h3 className={`text-sm font-mono font-bold ${
                        isCurrent ? 'text-cyan-400' : isPast ? 'text-white' : 'text-slate-600'
                      }`}>
                        {stage.label}
                      </h3>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse">
                          Active Stage
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{stage.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Assets & Telematics Sidebar */}
        <div className="space-y-6">
          {/* Asset Assignments */}
          <div className="bg-[#0b1121] border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">
              Assigned Assets
            </h3>
            <div className="space-y-4 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Fleet Vehicle</span>
                <span className="text-white font-bold">{shipment.vehicle_id || 'Not assigned'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Commercial Driver</span>
                <span className="text-white font-bold">{shipment.driver_id || 'Not assigned'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Cargo Weight</span>
                <span className="text-emerald-400 font-bold">{formatWeight(shipment.total_cargo_weight_kg || shipment.cargo_quantity_kg)}</span>
              </div>
            </div>
          </div>

          {/* Sensor Quick Badge */}
          <div className="bg-[#0b1121] border border-cyan-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded border border-cyan-500/40 uppercase tracking-wider font-bold">
                SIMULATED DATA
              </span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Cold-Chain Datalogger</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4 font-mono">
              Simulated temperature & humidity sensors streaming active telematics for this consignment.
            </p>
            <button
              onClick={() => navigate('/cold-chain', { state: { shipmentId: sId } })}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition-all text-center"
            >
              Launch Telemetry Monitor →
            </button>
          </div>
        </div>
      </div>

      {/* Cargo Loading Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1121] border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Verify Cargo Loading</h3>
            <p className="text-xs text-slate-400 font-mono mb-4">
              Enter verified gross scale weight at loading bay origin.
            </p>

            <form onSubmit={handleLoadSubmit} className="space-y-4 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase">Actual Loaded Weight (KG) *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={actualWeight}
                  onChange={(e) => setActualWeight(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLoadModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 text-white font-bold disabled:opacity-50"
                >
                  {loadMutation.isPending ? 'Logging...' : 'Confirm Loaded'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

