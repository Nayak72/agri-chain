import { Dialog, DialogContent } from '@/components/ui/dialog'
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
import { shipmentsApi, checkpointsApi, freightBookingsApi } from '../../api/commerce.api'
import { useAuth } from '../../context/AuthContext'
import { ROLES, normalizeRole } from '../../constants/roles'
import { formatWeight, formatDate, formatDateTime, formatStatus, getApiError } from '../../utils'
import PageHeader from '../../components/common/PageHeader'
import StatusBadge from '../../components/common/StatusBadge'

const TIMELINE_STAGES = [
  { key: 'DRIVER_ASSIGNED', label: 'Driver & Fleet Bound', desc: 'Commercial fleet asset and driver assigned' },
  { key: 'LOADED', label: 'Cargo Loaded', desc: 'Scale weight verified and manifests signed' },
  { key: 'DISPATCHED', label: 'Dispatched', desc: 'Outbound departure logged on cryptographic audit ledger' },
  { key: 'IN_TRANSIT', label: 'In Transit', desc: 'Active cold-chain telemetry and corridor checkpoint tracking active' },
  { key: 'ARRIVED_AT_DESTINATION', label: 'Arrived at Destination', desc: 'Consignment arrived at destination facility' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'Local delivery transit and buyer proof of delivery' },
  { key: 'DELIVERED', label: 'Delivered', desc: 'Buyer proof of delivery recorded' },
]

export default function ShipmentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, can } = useAuth()
  const userRole = normalizeRole(user?.role)

  const [actionError, setActionError] = useState('')
  const [showLoadModal, setShowLoadModal] = useState(false)
  const [actualWeight, setActualWeight] = useState('')
  const [actualPackageCount, setActualPackageCount] = useState('100')
  const [returnCondition, setReturnCondition] = useState('')
  const [returnInspected, setReturnInspected] = useState(false)
  const [returnMode, setReturnMode] = useState('full')
  const [partialUsable, setPartialUsable] = useState('')
  const [partialDamaged, setPartialDamaged] = useState('0')
  const [partialRejected, setPartialRejected] = useState('0')
  const [partialDisposition, setPartialDisposition] = useState('')
  const [returnReceivedBy, setReturnReceivedBy] = useState(user?.full_name || '')

  // Checkpoint Modal
  const [showCheckpointModal, setShowCheckpointModal] = useState(false)
  const [checkpointForm, setCheckpointForm] = useState({
    name: '',
    city: '',
  })

  const { data: shipment, isLoading, error } = useQuery({
    queryKey: ['shipment', id],
    queryFn: () => shipmentsApi.get(id).then(res => res.data),
  })

  const sId = shipment?.id || shipment?._id || id
  const { data: booking } = useQuery({
    queryKey: ['shipment-booking', shipment?.booking_id],
    queryFn: () => freightBookingsApi.get(shipment.booking_id).then(r => r.data),
    enabled: !!shipment?.booking_id,
  })

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

  const returnMutation = useMutation({
    mutationFn: () => shipmentsApi.receiveReturn(id, {
      returned_quantity_kg: shipment.loaded_weight_kg,
      condition: returnCondition.trim(),
      inspected_usable: returnInspected,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment', id] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setActionError('')
    },
    onError: err => setActionError(getApiError(err, 'Failed to record return.').message),
  })

  const partialReturnMutation = useMutation({
    mutationFn: () => shipmentsApi.receivePartialReturn(id, {
      usable_quantity_kg: parseFloat(partialUsable) || 0,
      damaged_quantity_kg: parseFloat(partialDamaged) || 0,
      rejected_quantity_kg: parseFloat(partialRejected) || 0,
      condition: returnCondition.trim(),
      disposition_notes: partialDisposition.trim() || undefined,
      received_by: returnReceivedBy.trim() || (user?.full_name || 'Warehouse Operator'),
      inspected_usable: returnInspected,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment', id] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setActionError('')
    },
    onError: err => setActionError(getApiError(err, 'Failed to record partial return.').message),
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
      setCheckpointForm({ name: '', city: '' })
      setActionError('')
    },
    onError: (err) => {
      setActionError(getApiError(err, 'Checkpoint creation failed.').message)
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
    if (!checkpointForm.name.trim() || !checkpointForm.city.trim()) {
      setActionError('Please provide milestone name and city.')
      return
    }

    createCheckpointMutation.mutate({
      shipment_id: sId,
      name: checkpointForm.name.trim(),
      city: checkpointForm.city.trim(),
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
        <div className="p-8 rounded-2xl glass-panel border border-stone-200 shadow-sm">
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
        description={booking ? `Corridor Route: ${booking.pickup_city} (${booking.pickup_state}) → ${booking.destination_city} (${booking.destination_state})` : "Loading route"}
        badge={<><StatusBadge status={shipment.status} />{shipment.is_delayed && <span className="ml-2 rounded bg-amber-100 px-2 py-1 text-amber-800">Delayed</span>}</> }
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
            {['DRIVER_ASSIGNED'].includes(shipment.status) && (
              <button
                onClick={() => {
                  setActualWeight(String(shipment.cargo_quantity_kg || 2000))
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
            {['IN_TRANSIT'].includes(shipment.status) && (
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
            {['DRIVER_ASSIGNED', 'LOADED', 'DISPATCHED', 'IN_TRANSIT'].includes(shipment.status) && (
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

      {((shipment.status === 'CANCELLED' && shipment.actual_dispatch_time) || shipment.status === 'DELIVERY_REJECTED' || shipment.status === 'PARTIALLY_DELIVERED') && (
        <section className="glass-panel-strong rounded-2xl border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-stone-900 text-base">Warehouse Stock Return & Reconciliation</h2>
            {shipment.return_received_at && (
              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-medium">Return Completed</span>
            )}
          </div>
          {shipment.return_received_at ? (
            <div className="space-y-2 text-sm text-stone-700 bg-stone-50/80 p-4 rounded-xl border border-stone-200">
              <p className="font-medium text-stone-900">Total Returned: {formatWeight(shipment.returned_quantity_kg)} received on {formatDateTime(shipment.return_received_at)}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs font-mono">
                <div className="p-2 rounded bg-white border border-stone-200">Usable (Stocked): <strong>{formatWeight(shipment.returned_usable_quantity_kg ?? shipment.returned_quantity_kg)}</strong></div>
                <div className="p-2 rounded bg-white border border-stone-200">Damaged: <strong>{formatWeight(shipment.returned_damaged_quantity_kg ?? 0)}</strong></div>
                <div className="p-2 rounded bg-white border border-stone-200">Rejected (Disposed): <strong>{formatWeight(shipment.returned_rejected_quantity_kg ?? 0)}</strong></div>
              </div>
              <p className="text-xs pt-1">Condition: <span className="font-mono">{shipment.return_condition}</span></p>
              {shipment.return_disposition && <p className="text-xs">Disposition: <span className="font-mono">{shipment.return_disposition}</span></p>}
              <p className="text-xs text-stone-500">Receiver: {shipment.return_received_by}</p>
            </div>
          ) : can('returns:receive') ? (
            <div className="space-y-4">
              <div className="flex gap-2 border-b border-stone-200 pb-2">
                <button
                  type="button"
                  onClick={() => setReturnMode('full')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${returnMode === 'full' ? 'bg-forest text-white' : 'glass-control text-stone-600'}`}
                >
                  Full Usable Return
                </button>
                <button
                  type="button"
                  onClick={() => setReturnMode('partial')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${returnMode === 'partial' ? 'bg-forest text-white' : 'glass-control text-stone-600'}`}
                >
                  Partial / Graded Return
                </button>
              </div>

              {returnMode === 'full' ? (
                <form className="space-y-3" onSubmit={event => { event.preventDefault(); returnMutation.mutate() }}>
                  <p className="text-sm text-stone-600">Record full return of {formatWeight(shipment.loaded_weight_kg)} as usable stock after inspection.</p>
                  <label className="block text-sm">Condition description
                    <input className="glass-control border rounded-xl p-2 w-full mt-1" value={returnCondition} onChange={event => setReturnCondition(event.target.value)} maxLength={500} required placeholder="e.g. Intact packaging, temperature maintained" />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={returnInspected} onChange={event => setReturnInspected(event.target.checked)} />
                    I inspected all returned goods and confirm they are usable.
                  </label>
                  <button className="glass-button rounded-xl bg-forest px-4 py-2 text-white disabled:opacity-50 text-sm font-medium" disabled={!returnInspected || !returnCondition.trim() || returnMutation.isPending}>
                    {returnMutation.isPending ? 'Recording…' : 'Record Full Return'}
                  </button>
                </form>
              ) : (
                <form className="space-y-3" onSubmit={event => {
                  event.preventDefault()
                  const usable = parseFloat(partialUsable) || 0
                  const damaged = parseFloat(partialDamaged) || 0
                  const rejected = parseFloat(partialRejected) || 0
                  if (usable + damaged + rejected <= 0) {
                    setActionError('Total return weight must be greater than zero')
                    return
                  }
                  if (usable > 0 && !returnInspected) {
                    setActionError('Confirm physical inspection for usable portion')
                    return
                  }
                  partialReturnMutation.mutate()
                }}>
                  <p className="text-sm text-stone-600">Grade returned goods into usable (resellable), damaged, and rejected (disposal) lots.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="block text-xs font-mono uppercase text-stone-600">Usable (kg)
                      <input className="glass-control border rounded-xl p-2 w-full mt-1 text-sm font-sans" type="number" step="0.001" min="0" value={partialUsable} onChange={e => setPartialUsable(e.target.value)} placeholder="0.000" />
                    </label>
                    <label className="block text-xs font-mono uppercase text-stone-600">Damaged (kg)
                      <input className="glass-control border rounded-xl p-2 w-full mt-1 text-sm font-sans" type="number" step="0.001" min="0" value={partialDamaged} onChange={e => setPartialDamaged(e.target.value)} placeholder="0.000" />
                    </label>
                    <label className="block text-xs font-mono uppercase text-stone-600">Rejected (kg)
                      <input className="glass-control border rounded-xl p-2 w-full mt-1 text-sm font-sans" type="number" step="0.001" min="0" value={partialRejected} onChange={e => setPartialRejected(e.target.value)} placeholder="0.000" />
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block text-sm">Condition description
                      <input className="glass-control border rounded-xl p-2 w-full mt-1" value={returnCondition} onChange={event => setReturnCondition(event.target.value)} maxLength={500} required placeholder="Physical inspection findings" />
                    </label>
                    <label className="block text-sm">Disposition notes
                      <input className="glass-control border rounded-xl p-2 w-full mt-1" value={partialDisposition} onChange={event => setPartialDisposition(event.target.value)} maxLength={500} placeholder="e.g. Restock usable, scrap damaged" />
                    </label>
                  </div>
                  <label className="block text-sm">Received by
                    <input className="glass-control border rounded-xl p-2 w-full mt-1" value={returnReceivedBy} onChange={event => setReturnReceivedBy(event.target.value)} required placeholder="Inspector / receiver name" />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={returnInspected} onChange={event => setReturnInspected(event.target.checked)} />
                    I physically inspected these returned goods and verified the graded quantities.
                  </label>
                  <button className="glass-button rounded-xl bg-forest px-4 py-2 text-white disabled:opacity-50 text-sm font-medium" disabled={!returnCondition.trim() || partialReturnMutation.isPending}>
                    {partialReturnMutation.isPending ? 'Recording…' : 'Record Graded Return'}
                  </button>
                </form>
              )}
            </div>
          ) : <p className="text-sm text-stone-600">Awaiting warehouse physical intake and inspection.</p>}
        </section>
      )}

      {/* Main Grid: Timeline + Checkpoints (Left 2 cols) & Assets / Telemetry (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connected Vertical Timeline & Corridor Checkpoints */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vertical Progress Timeline */}
          <div className="glass-panel border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-sm">
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
          <div className="glass-panel border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#244634]" />
                <h3 className="text-base font-bold text-stone-900">Corridor Milestones & Checkpoints</h3>
              </div>

              {userRole === ROLES.DRIVER && shipment.status === 'IN_TRANSIT' && (
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
                        <span className="text-xs font-bold text-stone-900 font-mono">{cp.name}</span>
                        <span className="text-[11px] text-stone-500 font-sans">({cp.city})</span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5 font-sans">{cp.recorded_at ? new Date(cp.recorded_at).toLocaleString() : ''}</p>
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
          <div className="glass-panel border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-mono text-stone-500 uppercase tracking-widest font-semibold">
              Assigned Assets
            </h3>
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3.5 rounded-xl glass-inset border border-stone-200">
                <span className="text-[10px] text-stone-500 uppercase block font-sans">Fleet Vehicle</span>
                <span className="text-stone-900 font-bold text-sm">{shipment.vehicle_id || 'Not assigned'}</span>
              </div>
              <div className="p-3.5 rounded-xl glass-inset border border-stone-200">
                <span className="text-[10px] text-stone-500 uppercase block font-sans">Commercial Driver</span>
                <span className="text-stone-900 font-bold text-sm">{shipment.driver_id || 'Not assigned'}</span>
              </div>
              <div className="p-3.5 rounded-xl glass-inset border border-stone-200">
                <span className="text-[10px] text-stone-500 uppercase block font-sans">Planned cargo weight</span>
                <span className="text-emerald-700 font-bold text-sm">
                  {formatWeight(shipment.cargo_quantity_kg)}
                </span>
              </div>
              {shipment.loaded_weight_kg != null && (
                <div className="p-3.5 rounded-xl glass-inset border border-stone-200">
                  <span className="text-[10px] text-stone-500 uppercase block font-sans">Loaded weight</span>
                  <span className="text-emerald-700 font-bold text-sm">{formatWeight(shipment.loaded_weight_kg)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Sensor Telematics Quick Link Card */}
          <div className="glass-panel-strong border border-emerald-200 rounded-2xl p-6 shadow-sm relative overflow-hidden space-y-3">
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
      <Dialog open={showLoadModal} onOpenChange={setShowLoadModal}>
          <DialogContent showCloseButton={false} aria-label="Verify Cargo Loading" className="glass-dialog border border-stone-200 rounded-2xl p-6 max-w-md w-full shadow-xl">
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
                  className="w-full glass-control border border-stone-200 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634]"
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
                  className="w-full glass-control border border-stone-200 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634]"
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
          </DialogContent>
      </Dialog>

      {/* Corridor Checkpoint Modal */}
      <Dialog open={showCheckpointModal} onOpenChange={setShowCheckpointModal}>
          <DialogContent showCloseButton={false} aria-label="Log Route Checkpoint" className="glass-dialog border border-stone-200 rounded-2xl p-6 max-w-md w-full shadow-xl">
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
                  className="w-full glass-control border border-stone-200 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634]"
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
                    className="w-full glass-control border border-stone-200 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634]"
                  />
                </div>
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
          </DialogContent>
      </Dialog>
    </div>
  )
}
