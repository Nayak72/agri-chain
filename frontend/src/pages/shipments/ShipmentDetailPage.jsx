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
  ChevronRight,
  ExternalLink,
  XCircle,
  FileText
} from 'lucide-react'
import { shipmentsApi, checkpointsApi } from '../../api/commerce.api'
import { useAuth } from '../../context/AuthContext'
import { ROLES, normalizeRole } from '../../constants/roles'
import { formatWeight, formatDate, formatDateTime, formatStatus, getApiError } from '../../utils'
import PageHeader from '../../components/common/PageHeader'
import StatusBadge from '../../components/common/StatusBadge'

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
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-stone-200 border-t-[#244634] rounded-full animate-spin" />
        <span className="text-stone-500 font-mono text-xs tracking-wide">Reading consignment timeline...</span>
      </div>
    )
  }

  if (error || !shipment) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <div className="p-8 rounded-2xl bg-white border border-stone-200 shadow-sm">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-stone-900 mb-1">Shipment Not Found</h2>
          <p className="text-stone-500 text-sm mb-6">Could not retrieve shipment record for ID: {id}</p>
          <button
            onClick={() => navigate('/shipments')}
            className="px-5 py-2.5 rounded-lg bg-[#244634] hover:bg-[#1b3527] text-white text-sm font-semibold transition-all"
          >
            Return to Shipments List
          </button>
        </div>
      </div>
    )
  }

  // Determine timeline progress
  const currentStatusIndex = TIMELINE_STAGES.findIndex(s => s.key === shipment.status)
  const activeIdx = currentStatusIndex !== -1 ? currentStatusIndex : 1

  const isOperator = [ROLES.DRIVER, ROLES.TRANSPORTER, ROLES.ADMIN, ROLES.WAREHOUSE_MANAGER].includes(userRole)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Shipments', href: '/shipments' },
          { label: shipment.shipment_id || sId }
        ]}
        title={shipment.shipment_id || sId}
        description={`Corridor Route: ${shipment.pickup_city} (${shipment.pickup_state}) → ${shipment.destination_city} (${shipment.destination_state})`}
        badge={<StatusBadge status={shipment.status} />}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Simulation Shortcut */}
            <button
              onClick={() => navigate('/cold-chain', { state: { shipmentId: sId } })}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-mono font-semibold rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 shadow-xs transition-all"
            >
              <Thermometer className="w-4 h-4 text-cyan-700" />
              <span>Cold-Chain Telemetry</span>
            </button>

            {/* Loading Action */}
            {['DRIVER_ASSIGNED', 'LOADING'].includes(shipment.status) && (
              <button
                onClick={() => {
                  setActualWeight(String(shipment.total_cargo_weight_kg || 2000))
                  setActualPackageCount(String(shipment.package_count || 100))
                  setShowLoadModal(true)
                }}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-mono font-bold shadow-xs transition-all"
              >
                Log Cargo Loading
              </button>
            )}

            {/* Dispatch Action */}
            {['LOADED'].includes(shipment.status) && (
              <button
                onClick={() => dispatchMutation.mutate()}
                disabled={dispatchMutation.isPending}
                className="px-4 py-2 rounded-lg bg-[#244634] hover:bg-[#1b3527] text-white text-xs font-mono font-bold shadow-xs transition-all disabled:opacity-50"
              >
                {dispatchMutation.isPending ? 'Dispatching...' : 'Dispatch Consignment'}
              </button>
            )}

            {/* Start Transit Action */}
            {['DISPATCHED'].includes(shipment.status) && (
              <button
                onClick={() => startTransitMutation.mutate()}
                disabled={startTransitMutation.isPending}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-mono font-bold shadow-xs transition-all disabled:opacity-50"
              >
                {startTransitMutation.isPending ? 'Starting Transit...' : 'Start Transit'}
              </button>
            )}

            {/* Arrive at Destination Action */}
            {['IN_TRANSIT', 'CHECKPOINT_REACHED', 'AT_CHECKPOINT'].includes(shipment.status) && (
              <button
                onClick={() => arriveMutation.mutate()}
                disabled={arriveMutation.isPending}
                className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-mono font-bold shadow-xs transition-all disabled:opacity-50"
              >
                {arriveMutation.isPending ? 'Recording Arrival...' : 'Mark Arrived at Destination'}
              </button>
            )}

            {/* Out for Delivery Action */}
            {['ARRIVED_AT_DESTINATION'].includes(shipment.status) && (
              <button
                onClick={() => outForDeliveryMutation.mutate()}
                disabled={outForDeliveryMutation.isPending}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-mono font-bold shadow-xs transition-all disabled:opacity-50"
              >
                {outForDeliveryMutation.isPending ? 'Updating...' : 'Set Out for Delivery'}
              </button>
            )}

            {/* Delivery Action */}
            {['OUT_FOR_DELIVERY'].includes(shipment.status) && (
              <button
                onClick={() => navigate('/deliveries', { state: { shipmentId: sId } })}
                className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-mono font-bold shadow-xs transition-all"
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
                className="px-3.5 py-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-mono font-semibold transition-all disabled:opacity-50"
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}
              </button>
            )}
          </div>
        }
      />

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Main Grid: Timeline + Checkpoints (Left 2 cols) & Assets / Telemetry (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connected Vertical Timeline & Corridor Checkpoints */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vertical Progress Timeline */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="mb-6 flex justify-between items-center pb-4 border-b border-stone-100">
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#244634]" />
                Connected Consignment Timeline
              </h2>
              <span className="text-xs font-mono text-stone-500 font-medium">Stage {activeIdx + 1} of {TIMELINE_STAGES.length}</span>
            </div>

            <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
              {TIMELINE_STAGES.map((stage, idx) => {
                const isPast = idx < activeIdx
                const isCurrent = idx === activeIdx

                return (
                  <div key={stage.key} className="relative flex items-start gap-4">
                    {/* Indicator Dot */}
                    <div className={`absolute -left-6 top-1 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
                      isPast
                        ? 'bg-[#244634] text-white font-bold ring-4 ring-[#244634]/10'
                        : isCurrent
                        ? 'bg-amber-500 text-white font-bold ring-4 ring-amber-500/20 shadow-xs'
                        : 'bg-white border-2 border-stone-300 text-stone-400 font-mono'
                    }`}>
                      {isPast ? '✓' : idx + 1}
                    </div>

                    <div className="pl-4">
                      <div className="flex items-center gap-2.5">
                        <h3 className={`text-sm font-mono font-bold ${
                          isCurrent ? 'text-amber-800' : isPast ? 'text-stone-900' : 'text-stone-400'
                        }`}>
                          {stage.label}
                        </h3>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-100 text-amber-900 font-semibold border border-amber-200 animate-pulse">
                            Active Stage
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5 font-sans leading-relaxed">{stage.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Corridor Route Checkpoints Card */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#244634]" />
                <h3 className="text-base font-bold text-stone-900">Corridor Milestones & Checkpoints</h3>
              </div>

              {isOperator && (
                <button
                  onClick={() => setShowCheckpointModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-stone-100 border border-stone-200 hover:bg-stone-200/80 text-stone-700 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Log Checkpoint
                </button>
              )}
            </div>

            {checkpointsLoading ? (
              <div className="py-6 text-center text-xs font-mono text-stone-400 animate-pulse">
                Querying corridor milestones...
              </div>
            ) : checkpoints.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-stone-500">
                No checkpoints logged along this corridor yet. Drivers and operators log checkpoints at tollways and transit hubs.
              </div>
            ) : (
              <div className="divide-y divide-stone-100 font-mono text-xs">
                {checkpoints.map((cp) => (
                  <div key={cp.id || cp._id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 font-sans">
                        <span className="text-xs font-bold text-stone-900 font-mono">#{cp.sequence} {cp.name}</span>
                        <span className="text-[11px] text-stone-500 font-sans">({cp.city}, {cp.state})</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          cp.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-stone-100 text-stone-600'
                        }`}>
                          {cp.status}
                        </span>
                      </div>
                      {cp.notes && <p className="text-[11px] text-stone-500 mt-0.5 font-sans">{cp.notes}</p>}
                    </div>

                    <div className="flex items-center gap-2">
                      {isOperator && cp.status !== 'COMPLETED' && (
                        <button
                          onClick={() => updateCheckpointMutation.mutate({
                            cpId: cp.id || cp._id,
                            data: { actual_arrival: new Date().toISOString(), status: 'COMPLETED' }
                          })}
                          className="px-2.5 py-1 rounded bg-[#244634] hover:bg-[#1b3527] text-[10px] text-white font-mono font-medium transition-colors"
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
          {/* Asset Assignments Card */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-mono text-stone-500 uppercase tracking-widest font-semibold">
              Assigned Assets
            </h3>
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-[10px] text-stone-500 uppercase block font-sans">Fleet Vehicle</span>
                <span className="text-stone-900 font-bold text-sm">{shipment.vehicle_id || 'Not assigned'}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-[10px] text-stone-500 uppercase block font-sans">Commercial Driver</span>
                <span className="text-stone-900 font-bold text-sm">{shipment.driver_id || 'Not assigned'}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-[10px] text-stone-500 uppercase block font-sans">Cargo Weight</span>
                <span className="text-emerald-700 font-bold text-sm">
                  {formatWeight(shipment.total_cargo_weight_kg || shipment.cargo_quantity_kg)}
                </span>
              </div>
            </div>
          </div>

          {/* Sensor Telematics Quick Link Card */}
          <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-sm relative overflow-hidden space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 uppercase tracking-wider font-bold">
                TELEMETRY ACTIVE
              </span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-600 animate-ping" />
            </div>
            <h3 className="text-sm font-bold text-stone-900 font-sans">Cold-Chain Datalogger</h3>
            <p className="text-xs text-stone-500 leading-relaxed font-sans">
              Continuous temperature & humidity sensors streaming live telematics for this consignment corridor.
            </p>
            <button
              onClick={() => navigate('/cold-chain', { state: { shipmentId: sId } })}
              className="w-full py-2.5 rounded-lg bg-[#244634] hover:bg-[#1b3527] text-white font-mono text-xs font-bold transition-all text-center flex items-center justify-center gap-2"
            >
              <Thermometer className="w-4 h-4 text-emerald-300" />
              <span>Launch Telemetry Monitor →</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cargo Loading Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 max-w-md w-full shadow-xl animate-fade-in-up">
            <h3 className="text-lg font-bold text-stone-900 mb-1">Verify Cargo Loading</h3>
            <p className="text-xs text-stone-500 mb-4 font-sans">
              Enter verified gross scale weight and package count at loading bay origin.
            </p>

            <form onSubmit={handleLoadSubmit} className="space-y-4 text-xs font-mono">
              <div className="space-y-1">
                <label className="text-[10px] text-stone-600 uppercase font-semibold">Actual Loaded Weight (KG) *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={actualWeight}
                  onChange={(e) => setActualWeight(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-stone-600 uppercase font-semibold">Actual Package Count *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={actualPackageCount}
                  onChange={(e) => setActualPackageCount(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634]"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowLoadModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadMutation.isPending}
                  className="flex-1 py-2.5 rounded-lg bg-[#244634] hover:bg-[#1b3527] text-white font-bold disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 max-w-md w-full shadow-xl animate-fade-in-up">
            <h3 className="text-lg font-bold text-stone-900 mb-1">Log Route Checkpoint</h3>
            <p className="text-xs text-stone-500 mb-4 font-sans">
              Record physical milestone transit along corridor route.
            </p>

            <form onSubmit={handleCheckpointSubmit} className="space-y-4 text-xs font-mono">
              <div className="space-y-1">
                <label className="text-[10px] text-stone-600 uppercase font-semibold">Checkpoint / Tollway Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Igatpuri Ghath Checkpoint"
                  value={checkpointForm.name}
                  onChange={(e) => setCheckpointForm({ ...checkpointForm, name: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-stone-600 uppercase font-semibold">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Igatpuri"
                    value={checkpointForm.city}
                    onChange={(e) => setCheckpointForm({ ...checkpointForm, city: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-stone-600 uppercase font-semibold">State *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maharashtra"
                    value={checkpointForm.state}
                    onChange={(e) => setCheckpointForm({ ...checkpointForm, state: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-stone-600 uppercase font-semibold">Notes</label>
                <input
                  type="text"
                  placeholder="Vehicle inspected, seals intact"
                  value={checkpointForm.notes}
                  onChange={(e) => setCheckpointForm({ ...checkpointForm, notes: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634]"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowCheckpointModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCheckpointMutation.isPending}
                  className="flex-1 py-2.5 rounded-lg bg-[#244634] hover:bg-[#1b3527] text-white font-bold disabled:opacity-50"
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
