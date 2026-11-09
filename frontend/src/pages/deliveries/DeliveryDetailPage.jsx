import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Package,
  ShieldCheck,
  Scale,
  Calendar,
  User,
  FileText,
  Clock,
  ExternalLink,
  Lock,
  Camera,
  Check,
  X
} from 'lucide-react'
import { deliveryApi } from '../../api/monitoring.api'
import { shipmentsApi } from '../../api/commerce.api'
import { useAuth } from '../../context/AuthContext'
import { ROLES, normalizeRole } from '../../constants/roles'
import { formatWeight, formatDateTime, getStatusColor, formatStatus } from '../../utils'

export default function DeliveryDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userRole = normalizeRole(user?.role)

  const [actionSuccess, setActionSuccess] = useState('')
  const [actionError, setActionError] = useState('')

  // Fetch delivery report: try getReportById first, fallback to getReport (by shipment ID)
  const { data: report, isLoading, isError, error } = useQuery({
    queryKey: ['delivery-report', id],
    queryFn: async () => {
      try {
        const res = await deliveryApi.getReportById(id)
        return res.data
      } catch (err) {
        // If not found by report ID, check if id is a shipment ID
        const fallbackRes = await deliveryApi.getReport(id)
        return fallbackRes.data
      }
    },
    staleTime: 30_000,
  })

  // Fetch associated shipment once report is known
  const shipmentId = report?.shipment_id
  const { data: shipment } = useQuery({
    queryKey: ['shipment-for-report', shipmentId],
    queryFn: () => shipmentsApi.get(shipmentId).then(res => res.data),
    enabled: !!shipmentId,
  })

  // Buyer Action Mutations
  const confirmMutation = useMutation({
    mutationFn: () => deliveryApi.confirmDelivery(report.shipment_id),
    onSuccess: () => {
      setActionSuccess('Delivery confirmed successfully by consignee!')
      queryClient.invalidateQueries({ queryKey: ['delivery-report', id] })
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
    },
    onError: (err) => {
      setActionError(err.response?.data?.detail || 'Failed to confirm delivery')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: () => deliveryApi.rejectDelivery(report.shipment_id),
    onSuccess: () => {
      setActionSuccess('Delivery rejected and discrepancy recorded.')
      queryClient.invalidateQueries({ queryKey: ['delivery-report', id] })
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
    },
    onError: (err) => {
      setActionError(err.response?.data?.detail || 'Failed to reject delivery')
    },
  })

  const partialMutation = useMutation({
    mutationFn: () => deliveryApi.partialDelivery(report.shipment_id),
    onSuccess: () => {
      setActionSuccess('Partial delivery recorded.')
      queryClient.invalidateQueries({ queryKey: ['delivery-report', id] })
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
    },
    onError: (err) => {
      setActionError(err.response?.data?.detail || 'Failed to confirm partial delivery')
    },
  })

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-mono text-slate-400">Loading delivery consignment dossier...</p>
      </div>
    )
  }

  if (isError || !report) {
    return (
      <div className="space-y-6">
        <Link
          to="/deliveries"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Deliveries
        </Link>
        <div className="p-8 rounded-2xl bg-slate-900/80 border border-red-500/30 text-center max-w-lg mx-auto">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">Delivery Record Not Found</h3>
          <p className="text-xs text-slate-400 mt-1 mb-6">
            {error?.response?.data?.detail || 'The requested delivery report does not exist or you lack permission to view it.'}
          </p>
          <button
            onClick={() => navigate('/deliveries')}
            className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700"
          >
            Return to Deliveries
          </button>
        </div>
      </div>
    )
  }

  const delivered = Number(report.delivered_quantity_kg) || 0
  const damaged = Number(report.damaged_quantity_kg) || 0
  const missing = Number(report.missing_quantity_kg) || 0
  const totalReceived = delivered + damaged + missing
  const dispatchedWeight = Number(shipment?.total_cargo_weight_kg) || totalReceived
  const integrityPct = dispatchedWeight > 0 ? Math.round((delivered / dispatchedWeight) * 100) : 100
  const damagePct = dispatchedWeight > 0 ? Math.round((damaged / dispatchedWeight) * 100) : 0
  const missingPct = dispatchedWeight > 0 ? Math.round((missing / dispatchedWeight) * 100) : 0

  const isBuyerOrAdmin = userRole === ROLES.BUYER || userRole === ROLES.ADMIN
  const canPerformBuyerAction = isBuyerOrAdmin && shipment?.status !== 'DELIVERED'

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/deliveries"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold font-mono text-white">
                {report.report_id || `DR-${report.id?.slice(-8).toUpperCase()}`}
              </h1>
              <span className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full ${getStatusColor(report.status)}`}>
                {formatStatus(report.status)}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Attested Receipt // Linked Shipment: {report.shipment_public_id || shipment?.shipment_id || report.shipment_id}
            </p>
          </div>
        </div>

        {/* Action feedback */}
        {actionSuccess && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
            {actionSuccess}
          </div>
        )}
        {actionError && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs font-mono">
            {actionError}
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Cargo Breakdown & Attestation */}
        <div className="lg:col-span-2 space-y-6">
          {/* Integrity Metrics Card */}
          <div className="p-6 rounded-2xl bg-[#0b1121] border border-slate-800 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-bold text-white">Cargo Weight & Integrity Breakdown</h2>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Dispatched: {formatWeight(dispatchedWeight)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-[11px] font-mono uppercase text-slate-400">Delivered Intact</div>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                  {formatWeight(delivered)}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{integrityPct}% of cargo</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-[11px] font-mono uppercase text-slate-400">Damaged Weight</div>
                <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                  {formatWeight(damaged)}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{damagePct}% loss</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-[11px] font-mono uppercase text-slate-400">Missing Weight</div>
                <div className="text-2xl font-bold font-mono text-red-400 mt-1">
                  {formatWeight(missing)}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{missingPct}% shortage</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs font-mono text-slate-400">
                <span>Cargo Quality Ratio</span>
                <span className="text-emerald-400 font-bold">{integrityPct}% intact</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
                <div style={{ width: `${integrityPct}%` }} className="bg-emerald-500 h-full" />
                <div style={{ width: `${damagePct}%` }} className="bg-amber-500 h-full" />
                <div style={{ width: `${missingPct}%` }} className="bg-red-500 h-full" />
              </div>
            </div>
          </div>

          {/* Receiver Attestation Dossier */}
          <div className="p-6 rounded-2xl bg-[#0b1121] border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white">Receiver Attestation & Chain of Custody</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 block mb-1">Attested Receiver</span>
                <span className="text-white font-semibold text-sm">{report.received_by || 'Not Specified'}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 block mb-1">Receipt Timestamp</span>
                <span className="text-white font-semibold text-sm">
                  {report.received_at ? formatDateTime(report.received_at) : 'N/A'}
                </span>
              </div>
            </div>

            {report.receiver_signature && (
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-xs font-mono uppercase text-slate-400 block mb-1">
                  Digital Verification Signature / Ref
                </span>
                <p className="font-mono text-xs text-cyan-400 break-all bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  {report.receiver_signature}
                </p>
              </div>
            )}

            {report.notes && (
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-xs font-mono uppercase text-slate-400 block mb-1">Delivery Notes</span>
                <p className="text-slate-300 text-xs leading-relaxed">{report.notes}</p>
              </div>
            )}

            {report.delivery_photos && report.delivery_photos.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-mono uppercase text-slate-400 block">
                  Delivery Photo Evidence ({report.delivery_photos.length})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {report.delivery_photos.map((photo, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center flex flex-col items-center justify-center gap-2"
                    >
                      <Camera className="w-5 h-5 text-slate-400" />
                      <span className="text-[11px] font-mono text-slate-400 truncate max-w-full">
                        {photo}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Linked Shipment & Buyer Confirmations */}
        <div className="space-y-6">
          {/* Buyer Actions Card */}
          {canPerformBuyerAction && (
            <div className="p-6 rounded-2xl bg-[#0b1121] border border-cyan-500/30 space-y-4 shadow-lg shadow-cyan-500/5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Buyer Consignment Action</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                As the designated consignee, review the delivered weight and physical condition before closing this consignment.
              </p>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => confirmMutation.mutate()}
                  disabled={confirmMutation.isPending}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {confirmMutation.isPending ? 'Confirming...' : 'Confirm Delivery Acceptance'}
                </button>

                <button
                  onClick={() => partialMutation.mutate()}
                  disabled={partialMutation.isPending}
                  className="w-full py-2.5 rounded-xl bg-slate-900 border border-amber-500/40 text-amber-300 hover:bg-amber-950/20 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  {partialMutation.isPending ? 'Recording...' : 'Accept Partial Delivery'}
                </button>

                <button
                  onClick={() => rejectMutation.mutate()}
                  disabled={rejectMutation.isPending}
                  className="w-full py-2.5 rounded-xl bg-slate-900 border border-red-500/40 text-red-300 hover:bg-red-950/20 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <X className="w-4 h-4 text-red-400" />
                  {rejectMutation.isPending ? 'Rejecting...' : 'Reject Consignment'}
                </button>
              </div>
            </div>
          )}

          {/* Linked Shipment Details */}
          <div className="p-6 rounded-2xl bg-[#0b1121] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-mono uppercase text-slate-400">Associated Shipment</span>
              <Link
                to={`/shipments/${report.shipment_id}`}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                View Dossier <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Shipment ID</span>
                <span className="text-white font-semibold">
                  {report.shipment_public_id || shipment?.shipment_id || report.shipment_id}
                </span>
              </div>

              {shipment && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Corridor</span>
                    <span className="text-white font-semibold">
                      {shipment.pickup_city} → {shipment.destination_city}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Shipment Status</span>
                    <span className={`px-2 py-0.5 rounded ${getStatusColor(shipment.status)}`}>
                      {formatStatus(shipment.status)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cargo Weight</span>
                    <span className="text-white font-semibold">
                      {formatWeight(shipment.total_cargo_weight_kg)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Ledger audit trail stamp */}
          <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 text-purple-300 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-purple-200">
              <Lock className="w-4 h-4" /> Cryptographic Ledger Record
            </div>
            <p className="leading-relaxed">
              This delivery record has been permanently appended to the simulated SHA-256 hash-chained audit ledger. Any retroactive alteration will invalidate the integrity chain.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

