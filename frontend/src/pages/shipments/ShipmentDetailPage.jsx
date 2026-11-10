import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Truck,
  MapPin,
  Calendar,
  Clock,
  Thermometer,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Scale,
  Package,
  Layers,
  Lock,
  ChevronRight
} from 'lucide-react'
import { shipmentsApi, checkpointsApi } from '../../api/commerce.api'
import { useAuth } from '../../context/AuthContext'
import { ROLES, normalizeRole } from '../../constants/roles'
import { formatWeight, formatDate, formatDateTime, getStatusColor, formatStatus, getApiError } from '../../utils'

const TIMELINE_STAGES = [
  { key: 'BOOKING_CONFIRMED', label: 'Booking Confirmed', desc: 'Freight quotation accepted and dispatch authorized' },
  { key: 'DRIVER_ASSIGNED', label: 'Driver & Fleet Bound', desc: 'Commercial fleet asset and driver assigned' },
  { key: 'LOADING', label: 'Cargo Loading', desc: 'Batch payload verified and loaded at origin' },
  { key: 'LOADED', label: 'Cargo Loaded', desc: 'Scale weight verified and manifests signed' },
  { key: 'DISPATCHED', label: 'Dispatched', desc: 'Outbound departure logged on cryptographic audit ledger' },
  { key: 'IN_TRANSIT', label: 'In Transit', desc: 'Active cold-chain telemetry and corridor checkpoint tracking active' },
  { key: 'ARRIVED_AT_DESTINATION', label: 'Arrived at Destination', desc: 'Consignment arrived at destination facility' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'Local delivery transit and receiver inspection' },
  { key: 'DELIVERED', label: 'Delivered', desc: 'Destination delivery inspection and sign-off' },
]

export default function ShipmentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userRole = normalizeRole(user?.role)

  const [actionError, setActionError] = useState('')
  const [showLoadModal, setShowLoadModal] = useState(false)
  const [actualWeight, setActualWeight] = useState('')
  const [actualPackageCount, setActualPackageCount] = useState('100')

  // Checkpoint Modal
  const [showCheckpointModal, setShowCheckpointModal] = useState(false)
  const [checkpointForm, setCheckpointForm] = useState({
    name: '',
    city: '',
    state: '',
    notes: '',
  })

  const { data: shipment, isLoading, error } = useQuery({
    queryKey: ['shipment', id],
    queryFn: () => shipmentsApi.get(id).then(res => res.data),
  })

  const sId = shipment?.id || shipment?._id || id

  // Checkpoints query
  const { data: checkpointsData, isLoading: checkpointsLoading } = useQuery({
    queryKey: ['shipment-checkpoints', sId],
    queryFn: () => checkpointsApi.list({ shipment_id: sId }).then(res => res.data),
    enabled: !!sId,
  })
  const checkpoints = Array.isArray(checkpointsData) ? checkpointsData : checkpointsData?.items || []

  // Dispatch mutation
  const dispatchMutation = useMutation({
    mutationFn: () => shipmentsApi.dispatch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment', id] })
      setActionError('')
    },
    onError: (err) => {
      setActionError(getApiError(err, 'Dispatch failed.').message)
    },
  })

  // Start Transit mutation
  const startTransitMutation = useMutation({
    mutationFn: () => shipmentsApi.startTransit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment', id] })
      setActionError('')
    },
    onError: (err) => {
      setActionError(getApiError(err, 'Failed to start transit.').message)
    },
  })

  // Arrive mutation
  const arriveMutation = useMutation({
    mutationFn: () => shipmentsApi.arrive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment', id] })
      setActionError('')
    },
    onError: (err) => {
      setActionError(getApiError(err, 'Failed to record arrival.').message)
    },
  })

  // Out for Delivery mutation
  const outForDeliveryMutation = useMutation({
    mutationFn: () => shipmentsApi.outForDelivery(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment', id] })
      setActionError('')
    },
    onError: (err) => {
      setActionError(getApiError(err, 'Failed to transition to out for delivery.').message)
    },
  })

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: (reason) => shipmentsApi.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment', id] })
      setActionError('')
    },
    onError: (err) => {
      setActionError(getApiError(err, 'Failed to cancel shipment.').message)
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
      setActionError(getApiError(err, 'Loading failed.').message)
    },
  })

  // Create Checkpoint mutation
  const createCheckpointMutation = useMutation({
    mutationFn: (data) => checkpointsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment-checkpoints', sId] })
      setShowCheckpointModal(false)
      setCheckpointForm({ name: '', city: '', state: '', notes: '' })
      setActionError('')
    },
    onError: (err) => {
      setActionError(getApiError(err, 'Checkpoint creation failed.').message)
    },
  })

  // Update Checkpoint mutation (e.g. Arrived or Departed)
  const updateCheckpointMutation = useMutation({
    mutationFn: ({ cpId, data }) => checkpointsApi.update(cpId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment-checkpoints', sId] })
    },
  })

  const handleLoadSubmit = (e) => {
    e.preventDefault()
    loadMutation.mutate({
      actual_weight_kg: parseFloat(actualWeight),
      actual_package_count: parseInt(actualPackageCount, 10),
      batch_quantities: [],
    })
  }

  const handleCheckpointSubmit = (e) => {
    e.preventDefault()
    if (!checkpointForm.name.trim() || !checkpointForm.city.trim() || !checkpointForm.state.trim()) {
      setActionError('Please provide milestone name, city, and state.')
      return
    }

    createCheckpointMutation.mutate({
      shipment_id: sId,
      name: checkpointForm.name.trim(),
      city: checkpointForm.city.trim(),
      state: checkpointForm.state.trim(),
      sequence: checkpoints.length + 1,
      notes: checkpointForm.notes ? checkpointForm.notes.trim() : undefined,
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

  const statusColor = getStatusColor(shipment.status)

  // Determine timeline progress
  const currentStatusIndex = TIMELINE_STAGES.findIndex(s => s.key === shipment.status)
  const activeIdx = currentStatusIndex !== -1 ? currentStatusIndex : 1

  const isOperator = [ROLES.DRIVER, ROLES.TRANSPORTER, ROLES.ADMIN, ROLES.WAREHOUSE_MANAGER].includes(userRole)

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-10 animate-fade-in-up space-y-6">
      <button
        onClick={() => navigate('/shipments')}
        className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        SHIPMENTS_CONSIGNMENTS
      </button>

      {/* Header Deck */}
      <div className="bg-[#0b1121] border border-slate-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
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
              Corridor Route: <span className="text-white font-semibold">{shipment.pickup_city}</span> ({shipment.pickup_state}) → <span className="text-white font-semibold">{shipment.destination_city}</span> ({shipment.destination_state})
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Simulation Shortcut */}
            <button
              onClick={() => navigate('/cold-chain', { state: { shipmentId: sId } })}
              className="px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold transition-all flex items-center gap-2"
            >
              <Thermometer className="w-4 h-4" />
              Cold-Chain Telemetry
            </button>

            {/* Loading Action */}
            {['DRIVER_ASSIGNED', 'LOADING'].includes(shipment.status) && (
              <button
                onClick={() => {
                  setActualWeight(String(shipment.total_cargo_weight_kg || 2000))
                  setActualPackageCount(String(shipment.package_count || 100))
                  setShowLoadModal(true)
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-bold transition-all"
              >
                Log Cargo Loading
              </button>
            )}

            {/* Dispatch Action */}
            {['LOADED'].includes(shipment.status) && (
              <button
                onClick={() => dispatchMutation.mutate()}
                disabled={dispatchMutation.isPending}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-mono text-xs font-bold transition-all disabled:opacity-50"
              >
                {dispatchMutation.isPending ? 'Dispatching...' : 'Dispatch Shipment Consignment'}
              </button>
            )}

            {/* Start Transit Action */}
            {['DISPATCHED'].includes(shipment.status) && (
              <button
                onClick={() => startTransitMutation.mutate()}
                disabled={startTransitMutation.isPending}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition-all disabled:opacity-50"
              >
                {startTransitMutation.isPending ? 'Starting Transit...' : 'Start Transit'}
              </button>
            )}

            {/* Arrive at Destination Action */}
            {['IN_TRANSIT', 'CHECKPOINT_REACHED', 'AT_CHECKPOINT'].includes(shipment.status) && (
              <button
                onClick={() => arriveMutation.mutate()}
                disabled={arriveMutation.isPending}
                className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-mono text-xs font-bold transition-all disabled:opacity-50"
              >
                {arriveMutation.isPending ? 'Recording Arrival...' : 'Mark Arrived at Destination'}
              </button>
            )}

            {/* Out for Delivery Action */}
            {['ARRIVED_AT_DESTINATION'].includes(shipment.status) && (
              <button
                onClick={() => outForDeliveryMutation.mutate()}
                disabled={outForDeliveryMutation.isPending}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-bold transition-all disabled:opacity-50"
              >
                {outForDeliveryMutation.isPending ? 'Updating...' : 'Set Out for Delivery'}
              </button>
            )}

            {/* Delivery Action */}
            {['OUT_FOR_DELIVERY'].includes(shipment.status) && (
              <button
                onClick={() => navigate('/deliveries', { state: { shipmentId: sId } })}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all"
              >
                Record Delivery Inspection
              </button>
            )}

            {/* Cancel Action */}
            {['BOOKING_CONFIRMED', 'DRIVER_ASSIGNED', 'LOADING', 'LOADED'].includes(shipment.status) && (
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to cancel this shipment consignment?')) {
                    cancelMutation.mutate('Cancelled via management console')
                  }
                }}
                disabled={cancelMutation.isPending}
                className="px-4 py-2.5 rounded-xl bg-red-600/20 border border-red-500/40 hover:bg-red-600/30 text-red-300 font-mono text-xs font-bold transition-all disabled:opacity-50"
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Shipment'}
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
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0b1121] border border-slate-800 rounded-3xl p-8 shadow-2xl">
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

                return (
                  <div key={stage.key} className="relative flex items-start gap-4">
                    {/* Indicator Dot */}
                    <div className={`absolute -left-6 top-1 w-6 h-6 rounded-full flex items-center justify-center border text-xs transition-all ${
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

          {/* Corridor Route Checkpoints Card */}
          <div className="bg-[#0b1121] border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Corridor Milestones & Checkpoints</h3>
              </div>

              {isOperator && (
                <button
                  onClick={() => setShowCheckpointModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Log Checkpoint
                </button>
              )}
            </div>

            {checkpointsLoading ? (
              <div className="py-6 text-center text-xs font-mono text-slate-500 animate-pulse">
                Querying corridor milestones...
              </div>
            ) : checkpoints.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-slate-500">
                No checkpoints logged along this corridor yet. Drivers and operators log checkpoints at tollways and transit hubs.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60 font-mono text-xs">
                {checkpoints.map((cp) => (
                  <div key={cp.id || cp._id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">#{cp.sequence} {cp.name}</span>
                        <span className="text-[10px] text-cyan-400">({cp.city}, {cp.state})</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                          cp.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {cp.status}
                        </span>
                      </div>
                      {cp.notes && <p className="text-[11px] text-slate-400 mt-0.5">{cp.notes}</p>}
                    </div>

                    <div className="flex items-center gap-2">
                      {isOperator && cp.status !== 'COMPLETED' && (
                        <button
                          onClick={() => updateCheckpointMutation.mutate({
                            cpId: cp.id || cp._id,
                            data: { actual_arrival: new Date().toISOString(), status: 'COMPLETED' }
                          })}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-cyan-300"
                        >
                          Mark Arrived
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              Enter verified gross scale weight and package count at loading bay origin.
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

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase">Actual Package Count *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={actualPackageCount}
                  onChange={(e) => setActualPackageCount(e.target.value)}
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

      {/* Corridor Checkpoint Modal */}
      {showCheckpointModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1121] border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Log Route Checkpoint</h3>
            <p className="text-xs text-slate-400 font-mono mb-4">
              Record physical milestone transit along corridor route.
            </p>

            <form onSubmit={handleCheckpointSubmit} className="space-y-4 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase">Checkpoint / Tollway Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Igatpuri Ghath Checkpoint"
                  value={checkpointForm.name}
                  onChange={(e) => setCheckpointForm({ ...checkpointForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Igatpuri"
                    value={checkpointForm.city}
                    onChange={(e) => setCheckpointForm({ ...checkpointForm, city: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase">State *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maharashtra"
                    value={checkpointForm.state}
                    onChange={(e) => setCheckpointForm({ ...checkpointForm, state: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase">Notes</label>
                <input
                  type="text"
                  placeholder="Vehicle inspected, seals intact"
                  value={checkpointForm.notes}
                  onChange={(e) => setCheckpointForm({ ...checkpointForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCheckpointModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCheckpointMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold disabled:opacity-50"
                >
                  {createCheckpointMutation.isPending ? 'Logging...' : 'Save Checkpoint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
