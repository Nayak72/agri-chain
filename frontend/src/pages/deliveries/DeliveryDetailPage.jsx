import { useState } from 'react'
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
  X,
  Truck
} from 'lucide-react'
import { deliveryApi } from '../../api/monitoring.api'
import { shipmentsApi } from '../../api/commerce.api'
import { useAuth } from '../../context/AuthContext'
import { ROLES, normalizeRole } from '../../constants/roles'
import { formatWeight, formatDateTime, formatStatus } from '../../utils'
import PageHeader from '../../components/common/PageHeader'
import StatusBadge from '../../components/common/StatusBadge'

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
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <div className="w-8 h-8 border-3 border-stone-200 border-t-[#244634] rounded-full animate-spin" />
        <p className="text-xs font-mono text-stone-500">Loading delivery consignment dossier...</p>
      </div>
    )
  }

  if (isError || !report) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="p-8 rounded-2xl bg-white border border-stone-200 shadow-sm">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-stone-900">Delivery Record Not Found</h3>
          <p className="text-xs text-stone-500 mt-1 mb-6">
            {error?.response?.data?.detail || 'The requested delivery report does not exist or you lack permission to view it.'}
          </p>
          <button
            onClick={() => navigate('/deliveries')}
            className="px-4 py-2 rounded-lg bg-[#244634] text-white text-xs font-semibold hover:bg-[#1b3527] transition-colors"
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
  const reportPublicId = report.report_id || `DR-${report.id?.slice(-8).toUpperCase()}`

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Deliveries', href: '/deliveries' },
          { label: reportPublicId }
        ]}
        title={reportPublicId}
        description={`Attested Receipt // Linked Shipment: ${report.shipment_public_id || shipment?.shipment_id || report.shipment_id}`}
        badge={<StatusBadge status={report.status} />}
        actions={
          <div className="flex items-center gap-3">
            <Link
              to="/deliveries"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 shadow-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4 text-stone-500" />
              <span>Back to Deliveries</span>
            </Link>
          </div>
        }
      />

      {/* Action feedback */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-sans flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-sans flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Cargo Breakdown & Attestation */}
        <div className="lg:col-span-2 space-y-6">
          {/* Integrity Metrics Card */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-stone-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-[#244634]" />
                <h2 className="text-base font-bold text-stone-900">Cargo Weight & Integrity Breakdown</h2>
              </div>
              <span className="text-xs font-mono text-stone-500">
                Dispatched: {formatWeight(dispatchedWeight)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                <div className="text-[11px] font-mono uppercase text-stone-500 font-semibold">Delivered Intact</div>
                <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                  {formatWeight(delivered)}
                </div>
                <div className="text-xs text-stone-500 mt-0.5">{integrityPct}% of cargo</div>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                <div className="text-[11px] font-mono uppercase text-stone-500 font-semibold">Damaged Weight</div>
                <div className="text-2xl font-bold font-mono text-amber-700 mt-1">
                  {formatWeight(damaged)}
                </div>
                <div className="text-xs text-stone-500 mt-0.5">{damagePct}% loss</div>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                <div className="text-[11px] font-mono uppercase text-stone-500 font-semibold">Missing Weight</div>
                <div className="text-2xl font-bold font-mono text-rose-700 mt-1">
                  {formatWeight(missing)}
                </div>
                <div className="text-xs text-stone-500 mt-0.5">{missingPct}% shortage</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs font-mono text-stone-600">
                <span>Cargo Quality Ratio</span>
                <span className="text-emerald-700 font-bold">{integrityPct}% intact</span>
              </div>
              <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden flex">
                <div style={{ width: `${integrityPct}%` }} className="bg-emerald-600 h-full" />
                <div style={{ width: `${damagePct}%` }} className="bg-amber-500 h-full" />
                <div style={{ width: `${missingPct}%` }} className="bg-rose-500 h-full" />
              </div>
            </div>
          </div>

          {/* Receiver Attestation Dossier */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-4 border-b border-stone-100">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              <h2 className="text-base font-bold text-stone-900">Receiver Attestation & Chain of Custody</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-stone-500 block mb-1 font-sans">Attested Receiver</span>
                <span className="text-stone-900 font-semibold text-sm">{report.received_by || 'Not Specified'}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-stone-500 block mb-1 font-sans">Receipt Timestamp</span>
                <span className="text-stone-900 font-semibold text-sm">
                  {report.received_at ? formatDateTime(report.received_at) : 'N/A'}
                </span>
              </div>
            </div>

            {report.receiver_signature && (
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-xs font-mono uppercase text-stone-500 font-semibold block mb-1">
                  Digital Verification Signature / Ref
                </span>
                <p className="font-mono text-xs text-stone-800 break-all bg-white p-2.5 rounded-lg border border-stone-200">
                  {report.receiver_signature}
                </p>
              </div>
            )}

            {report.notes && (
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-xs font-mono uppercase text-stone-500 font-semibold block mb-1">Delivery Notes</span>
                <p className="text-stone-700 text-xs leading-relaxed font-sans">{report.notes}</p>
              </div>
            )}

            {report.delivery_photos && report.delivery_photos.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-mono uppercase text-stone-500 font-semibold block">
                  Delivery Photo Evidence ({report.delivery_photos.length})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {report.delivery_photos.map((photo, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-center flex flex-col items-center justify-center gap-2"
                    >
                      <Camera className="w-5 h-5 text-stone-400" />
                      <span className="text-[11px] font-mono text-stone-600 truncate max-w-full">
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
            <div className="p-6 rounded-2xl bg-white border border-[#244634]/30 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#244634]" />
                <h3 className="text-base font-bold text-stone-900">Buyer Consignment Action</h3>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed font-sans">
                As the designated consignee, review the delivered weight and physical condition before closing this consignment.
              </p>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => confirmMutation.mutate()}
                  disabled={confirmMutation.isPending}
                  className="w-full py-2.5 rounded-lg bg-[#244634] hover:bg-[#1b3527] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>{confirmMutation.isPending ? 'Confirming...' : 'Confirm Delivery Acceptance'}</span>
                </button>

                <button
                  onClick={() => partialMutation.mutate()}
                  disabled={partialMutation.isPending}
                  className="w-full py-2.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>{partialMutation.isPending ? 'Recording...' : 'Accept Partial Delivery'}</span>
                </button>

                <button
                  onClick={() => rejectMutation.mutate()}
                  disabled={rejectMutation.isPending}
                  className="w-full py-2.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <X className="w-4 h-4 text-rose-600" />
                  <span>{rejectMutation.isPending ? 'Rejecting...' : 'Reject Consignment'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Linked Shipment Details */}
          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <span className="text-xs font-mono uppercase text-stone-500 font-semibold">Associated Shipment</span>
              <Link
                to={`/shipments/${report.shipment_id}`}
                className="text-xs font-mono text-[#244634] hover:underline flex items-center gap-1 font-semibold"
              >
                View Dossier <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-stone-500 font-sans">Shipment ID</span>
                <span className="text-stone-900 font-semibold">
                  {report.shipment_public_id || shipment?.shipment_id || report.shipment_id}
                </span>
              </div>

              {shipment && (
                <>
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-sans">Corridor</span>
                    <span className="text-stone-900 font-semibold">
                      {shipment.pickup_city} → {shipment.destination_city}
                    </span>
                  </div>
                  <div className="flex justify-between items-center font-sans">
                    <span className="text-stone-500">Shipment Status</span>
                    <StatusBadge status={shipment.status} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-sans">Cargo Weight</span>
                    <span className="text-stone-900 font-semibold">
                      {formatWeight(shipment.total_cargo_weight_kg)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Ledger audit trail stamp */}
          <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs space-y-1.5 font-sans">
            <div className="flex items-center gap-2 font-bold text-purple-950">
              <Lock className="w-4 h-4 text-purple-700" /> Cryptographic Ledger Record
            </div>
            <p className="leading-relaxed text-purple-800 text-[11px]">
              This delivery record has been permanently appended to the simulated SHA-256 hash-chained audit ledger. Any retroactive alteration will invalidate the integrity chain.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
