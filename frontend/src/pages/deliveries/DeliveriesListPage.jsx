import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { deliveryApi } from '../../api/monitoring.api'
import { shipmentsApi } from '../../api/commerce.api'
import { useAuth } from '../../context/AuthContext'
import { formatWeight, formatDate, formatDateTime, getStatusColor, formatStatus, getApiError } from '../../utils'

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
  const { data: reportsData, isLoading, refetch } = useQuery({
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
    <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-10 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
            <span className="text-xs font-mono font-medium text-emerald-500 uppercase tracking-widest">
              Destination Custody
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Delivery <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Inspections</span>
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl">
            Inbound delivery verification, weight discrepancies, damaged claims, and proof-of-delivery signatures.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white transition-all text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync
          </button>
          <button
            onClick={() => {
              setFormError('')
              setShowCreateModal(true)
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-semibold text-sm shadow-lg shadow-cyan-900/20 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Record Inspection Report
          </button>
        </div>
      </div>

      {formSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-mono flex items-center gap-2">
          <span>✓</span> {formSuccess}
        </div>
      )}
      {formError && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-mono flex items-center gap-2">
          <span>✕</span> {formError}
        </div>
      )}

      {/* Reports Table */}
      <div className="bg-[#0b1121] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {isLoading ? (
          <div className="p-16 text-center text-slate-500 font-mono text-sm animate-pulse">
            Querying delivery inspections...
          </div>
        ) : reports.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-3">📋</div>
            <h3 className="text-base font-medium text-white mb-1">No Delivery Reports Recorded</h3>
            <p className="text-slate-500 text-xs max-w-sm mx-auto mb-4">
              When consignments reach destination terminals, inspection reports can be completed here.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300"
            >
              + Create First Delivery Report
            </button>
          </div>
        ) : (
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500 bg-slate-950/40">
                <th className="px-6 py-4">Report ID</th>
                <th className="px-6 py-4">Shipment Reference</th>
                <th className="px-6 py-4">Delivered Quantity</th>
                <th className="px-6 py-4">Damaged / Missing</th>
                <th className="px-6 py-4">Received By</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {reports.map((r) => {
                const rKey = r.id || r._id || r.report_id
                const statusColor = getStatusColor(r.status)
                return (
                  <tr key={rKey} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-cyan-400">{r.report_id || rKey}</td>
                    <td className="px-6 py-4 text-slate-300">{r.shipment_public_id || r.shipment_id}</td>
                    <td className="px-6 py-4 text-emerald-400 font-semibold">{formatWeight(r.delivered_quantity_kg)}</td>
                    <td className="px-6 py-4">
                      {r.damaged_quantity_kg > 0 || r.missing_quantity_kg > 0 ? (
                        <span className="text-red-400 font-semibold">
                          {r.damaged_quantity_kg > 0 && `${r.damaged_quantity_kg}kg dmg`}
                          {r.missing_quantity_kg > 0 && ` ${r.missing_quantity_kg}kg mis`}
                        </span>
                      ) : (
                        <span className="text-slate-500">None (100% OK)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-300">{r.received_by}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] uppercase tracking-wider ${statusColor}`}>
                        {formatStatus(r.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => confirmDeliveryMutation.mutate(r.shipment_id)}
                        disabled={confirmDeliveryMutation.isPending}
                        className="px-3 py-1 rounded-lg bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600 text-emerald-300 hover:text-white text-[10px] transition-all disabled:opacity-50"
                      >
                        Confirm Custody
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Inspection Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1121] border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Destination Inspection Report</h3>
            <p className="text-xs text-slate-400 font-mono mb-4">Record delivered weights, condition grades, and receiver sign-off.</p>

            <form onSubmit={handleSubmitReport} className="space-y-4 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase">Select Consignment Shipment *</label>
                <select
                  required
                  value={reportForm.shipment_id}
                  onChange={(e) => setReportForm({ ...reportForm, shipment_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                >
                  <option value="">Select active shipment...</option>
                  {shipments.map(s => (
                    <option key={s.id || s._id} value={s.id || s._id}>
                      {s.shipment_id || s.id || s._id} — {s.pickup_city} to {s.destination_city} ({s.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase">Delivered (KG) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={reportForm.delivered_quantity_kg}
                    onChange={(e) => setReportForm({ ...reportForm, delivered_quantity_kg: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase">Damaged (KG)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={reportForm.damaged_quantity_kg}
                    onChange={(e) => setReportForm({ ...reportForm, damaged_quantity_kg: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase">Missing (KG)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={reportForm.missing_quantity_kg}
                    onChange={(e) => setReportForm({ ...reportForm, missing_quantity_kg: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase">Received By (Inspector / Buyer) *</label>
                <input
                  type="text"
                  required
                  value={reportForm.received_by}
                  onChange={(e) => setReportForm({ ...reportForm, received_by: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase">Inspection Notes & Exceptions</label>
                <textarea
                  rows={2}
                  value={reportForm.notes}
                  onChange={(e) => setReportForm({ ...reportForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createReportMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 text-white font-bold disabled:opacity-50"
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

