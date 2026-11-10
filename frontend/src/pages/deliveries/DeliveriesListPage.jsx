import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { Plus, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, FileCheck, Package, ExternalLink, ArrowRight } from 'lucide-react'
import { deliveryApi } from '../../api/monitoring.api'
import { shipmentsApi } from '../../api/commerce.api'
import { useAuth } from '../../context/AuthContext'
import { formatWeight, formatDate, formatDateTime, formatStatus, getApiError } from '../../utils'
import PageHeader from '../../components/common/PageHeader'
import StatusBadge from '../../components/common/StatusBadge'
import EmptyState from '../../components/common/EmptyState'

export default function DeliveriesListPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const prefillShipmentId = location.state?.shipmentId || ''

  // Form state for creating delivery report
  const [showCreateModal, setShowCreateModal] = useState(!!prefillShipmentId)
  const [reportForm, setReportForm] = useState({
    shipment_id: prefillShipmentId,
    delivered_quantity_kg: '2000',
    damaged_quantity_kg: '0',
    missing_quantity_kg: '0',
    received_by: user?.full_name || user?.email?.split('@')[0] || 'Receiver Agent',
    notes: 'Produce received in sound commercial condition with cold chain integrity.',
  })
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  // Query delivery reports
  const { data: reportsData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['delivery-reports'],
    queryFn: () => deliveryApi.reports().then(res => res.data),
    staleTime: 30_000,
  })

  // Query shipments to select from in modal
  const { data: shipmentsData } = useQuery({
    queryKey: ['shipments-for-delivery'],
    queryFn: () => shipmentsApi.list().then(res => res.data),
  })

  const reports = Array.isArray(reportsData) ? reportsData : reportsData?.items || []
  const shipments = Array.isArray(shipmentsData) ? shipmentsData : shipmentsData?.items || []

  // Create report mutation
  const createReportMutation = useMutation({
    mutationFn: (data) => deliveryApi.createReport(data.shipment_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-reports'] })
      setShowCreateModal(false)
      setFormSuccess('Delivery inspection report submitted successfully!')
      setFormError('')
    },
    onError: (err) => {
      setFormError(getApiError(err, 'Report creation failed.').message)
    },
  })

  // Confirm delivery mutation
  const confirmDeliveryMutation = useMutation({
    mutationFn: (shipmentId) => deliveryApi.confirmDelivery(shipmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-reports'] })
      setFormSuccess('Delivery confirmed and hash locked on cryptographic audit ledger!')
    },
    onError: (err) => {
      setFormError(getApiError(err, 'Confirmation failed.').message)
    },
  })

  const handleSubmitReport = (e) => {
    e.preventDefault()
    setFormError('')

    const parseNumber = (val) => {
      if (val === '' || val == null) return null
      const n = Number(val)
      return Number.isFinite(n) ? n : null
    }

    const deliveredQty = parseNumber(reportForm.delivered_quantity_kg)
    if (deliveredQty === null || deliveredQty < 0) {
      setFormError('Please enter a valid delivered quantity.')
      return
    }

    const damagedQty = parseNumber(reportForm.damaged_quantity_kg)
    if (damagedQty === null || damagedQty < 0) {
      setFormError('Please enter a valid damaged quantity (0 or greater).')
      return
    }

    const missingQty = parseNumber(reportForm.missing_quantity_kg)
    if (missingQty === null || missingQty < 0) {
      setFormError('Please enter a valid missing quantity (0 or greater).')
      return
    }

    if (!reportForm.received_by.trim()) {
      setFormError('Receiver name is required.')
      return
    }

    const payload = {
      shipment_id: reportForm.shipment_id.trim(),
      delivered_quantity_kg: deliveredQty,
      damaged_quantity_kg: damagedQty,
      missing_quantity_kg: missingQty,
      received_by: reportForm.received_by.trim(),
      received_at: new Date().toISOString(),
      notes: reportForm.notes ? reportForm.notes.trim() : null,
      status: (damagedQty > 0 || missingQty > 0) ? 'PARTIAL' : 'DELIVERED',
    }

    createReportMutation.mutate(payload)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Logistics', href: '/shipments' },
          { label: 'Deliveries' }
        ]}
        title="Delivery Inspections"
        description="Inbound delivery verification, weight discrepancies, damaged claims, and proof-of-delivery signatures."
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Destination Custody
          </span>
        }
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 hover:border-stone-300 shadow-sm transition-all disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 text-stone-500 ${isFetching ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
            <button
              onClick={() => {
                setFormError('')
                setShowCreateModal(true)
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[#244634] text-white hover:bg-[#1b3527] shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Record Inspection Report</span>
            </button>
          </div>
        }
      />

      {formSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-sans flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{formSuccess}</span>
        </div>
      )}
      {formError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-sans flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Reports Table Container */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-16 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-3 border-stone-200 border-t-[#244634] rounded-full animate-spin" />
          <span className="text-stone-500 font-mono text-xs tracking-wide">Querying delivery inspections...</span>
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          icon={FileCheck}
          title="No Delivery Reports Recorded"
          description="When consignments reach destination terminals, inspection reports can be completed here."
          actionLabel="Create First Delivery Report"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-[11px] uppercase tracking-wider text-stone-500 bg-stone-50/75">
                  <th className="px-6 py-3.5 font-semibold">Report ID</th>
                  <th className="px-6 py-3.5 font-semibold">Shipment Reference</th>
                  <th className="px-6 py-3.5 font-semibold">Delivered Quantity</th>
                  <th className="px-6 py-3.5 font-semibold">Damaged / Missing</th>
                  <th className="px-6 py-3.5 font-semibold">Received By</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-mono">
                {reports.map((r) => {
                  const rKey = r.id || r._id || r.report_id
                  return (
                    <tr
                      key={rKey}
                      className="hover:bg-stone-50/80 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/deliveries/${rKey}`)}
                    >
                      <td className="px-6 py-4 font-bold text-[#244634] group-hover:underline">
                        {r.report_id || rKey}
                      </td>
                      <td className="px-6 py-4 text-stone-700">
                        {r.shipment_public_id || r.shipment_id}
                      </td>
                      <td className="px-6 py-4 text-emerald-700 font-semibold">
                        {formatWeight(r.delivered_quantity_kg)}
                      </td>
                      <td className="px-6 py-4">
                        {r.damaged_quantity_kg > 0 || r.missing_quantity_kg > 0 ? (
                          <span className="text-amber-700 font-semibold">
                            {r.damaged_quantity_kg > 0 && `${r.damaged_quantity_kg}kg dmg`}
                            {r.missing_quantity_kg > 0 && ` ${r.missing_quantity_kg}kg mis`}
                          </span>
                        ) : (
                          <span className="text-stone-400 font-sans">None (100% OK)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-stone-700 font-sans">
                        {r.received_by}
                      </td>
                      <td className="px-6 py-4 font-sans">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => confirmDeliveryMutation.mutate(r.shipment_id)}
                            disabled={confirmDeliveryMutation.isPending}
                            className="px-3 py-1 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-medium font-sans transition-all disabled:opacity-50"
                          >
                            Confirm Custody
                          </button>
                          <Link
                            to={`/deliveries/${rKey}`}
                            className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-stone-100 bg-stone-50/50 text-[11px] font-mono text-stone-500 flex justify-between items-center">
            <span>Showing {reports.length} delivery reports</span>
            <span>Recorded destination inspection manifests</span>
          </div>
        </div>
      )}

      {/* Inspection Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 max-w-lg w-full shadow-xl animate-fade-in-up">
            <h3 className="text-lg font-bold text-stone-900 mb-1">Destination Inspection Report</h3>
            <p className="text-xs text-stone-500 mb-4 font-sans">Record delivered weights, condition grades, and receiver sign-off.</p>

            <form onSubmit={handleSubmitReport} className="space-y-4 text-xs font-mono">
              <div className="space-y-1">
                <label className="text-[10px] text-stone-600 uppercase font-semibold font-sans">Select Consignment Shipment *</label>
                <select
                  required
                  value={reportForm.shipment_id}
                  onChange={(e) => setReportForm({ ...reportForm, shipment_id: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634]"
                >
                  <option value="">Select active shipment...</option>
                  {shipments.map(s => (
                    <option key={s.id || s._id} value={s.id || s._id}>
                      {s.shipment_id || s.id || s._id} — {s.pickup_city} to {s.destination_city} ({s.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-stone-600 uppercase font-semibold font-sans">Delivered (KG) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={reportForm.delivered_quantity_kg}
                    onChange={(e) => setReportForm({ ...reportForm, delivered_quantity_kg: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-stone-600 uppercase font-semibold font-sans">Damaged (KG)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={reportForm.damaged_quantity_kg}
                    onChange={(e) => setReportForm({ ...reportForm, damaged_quantity_kg: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-stone-600 uppercase font-semibold font-sans">Missing (KG)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={reportForm.missing_quantity_kg}
                    onChange={(e) => setReportForm({ ...reportForm, missing_quantity_kg: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-stone-600 uppercase font-semibold font-sans">Received By (Inspector / Buyer) *</label>
                <input
                  type="text"
                  required
                  value={reportForm.received_by}
                  onChange={(e) => setReportForm({ ...reportForm, received_by: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-stone-600 uppercase font-semibold font-sans">Inspection Notes & Exceptions</label>
                <textarea
                  rows={2}
                  value={reportForm.notes}
                  onChange={(e) => setReportForm({ ...reportForm, notes: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634] resize-none font-sans"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 font-medium font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createReportMutation.isPending}
                  className="flex-1 py-2.5 rounded-lg bg-[#244634] hover:bg-[#1b3527] text-white font-bold font-sans disabled:opacity-50"
                >
                  {createReportMutation.isPending ? 'Logging...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
