import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { deliveryApi } from '../../api/monitoring.api'
import { shipmentsApi } from '../../api/commerce.api'
import { useAuth } from '../../context/AuthContext'
import { ROLES, normalizeRole } from '../../constants/roles'
import { formatWeight, getApiError } from '../../utils'
import PageHeader from '../../components/common/PageHeader'

export default function DeliveriesListPage() {
  const client = useQueryClient()
  const { user } = useAuth()
  const buyer = normalizeRole(user?.role) === ROLES.BUYER
  const [selected, setSelected] = useState('')
  const [form, setForm] = useState({ delivered_quantity_kg: '', damaged_quantity_kg: '0', missing_quantity_kg: '0', received_by: user?.full_name || '' })
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const { data: reportData = [] } = useQuery({ queryKey: ['delivery-reports'], queryFn: () => deliveryApi.reports().then(r => r.data) })
  const { data: shipments = [] } = useQuery({ queryKey: ['shipments-for-delivery'], queryFn: () => shipmentsApi.list().then(r => r.data), enabled: buyer })
  const reports = Array.isArray(reportData) ? reportData : reportData.items || []
  const eligible = shipments.filter(s => s.status === 'OUT_FOR_DELIVERY')
  const shipment = eligible.find(s => s.id === selected)
  const sum = Number(form.delivered_quantity_kg) + Number(form.damaged_quantity_kg) + Number(form.missing_quantity_kg)
  const valid = shipment && Math.abs(sum - Number(shipment.loaded_weight_kg)) <= 0.01 && form.received_by.trim()
  const refresh = () => { client.invalidateQueries({ queryKey: ['delivery-reports'] }); client.invalidateQueries({ queryKey: ['shipments-for-delivery'] }); setError(''); setSelected('') }
  const confirm = useMutation({ mutationFn: () => deliveryApi.confirmDelivery(selected, { ...form, delivered_quantity_kg: Number(form.delivered_quantity_kg), damaged_quantity_kg: Number(form.damaged_quantity_kg), missing_quantity_kg: Number(form.missing_quantity_kg) }), onSuccess: refresh, onError: e => setError(getApiError(e, 'Delivery confirmation failed').message) })
  const reject = useMutation({ mutationFn: () => deliveryApi.rejectDelivery(selected, { reason, received_by: form.received_by }), onSuccess: refresh, onError: e => setError(getApiError(e, 'Delivery rejection failed').message) })
  return <div className="space-y-6 p-6"><PageHeader title="Deliveries" description="Buyer proof of delivery" />
    {buyer && <section className="rounded-xl border bg-white p-5 space-y-3"><h2 className="font-semibold">Record delivery</h2><select className="border rounded p-2" value={selected} onChange={e => { setSelected(e.target.value); const s = eligible.find(x => x.id === e.target.value); setForm(prev => ({ ...prev, delivered_quantity_kg: String(s?.loaded_weight_kg ?? '') })) }}><option value="">Choose shipment</option>{eligible.map(s => <option value={s.id} key={s.id}>{s.shipment_id}</option>)}</select>{shipment && <><p>Loaded weight: {formatWeight(shipment.loaded_weight_kg)}</p>{[['delivered_quantity_kg', 'Delivered kg'], ['damaged_quantity_kg', 'Damaged kg'], ['missing_quantity_kg', 'Missing kg']].map(([key, label]) => <label key={key} className="block">{label}<input className="ml-2 border rounded p-2" type="number" min="0" step="0.01" value={form[key]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} /></label>)}<p className={valid ? 'text-green-700' : 'text-red-700'}>Total {formatWeight(sum)} / {formatWeight(shipment.loaded_weight_kg)}</p><label className="block">Received by<input className="ml-2 border rounded p-2" value={form.received_by} onChange={e => setForm(prev => ({ ...prev, received_by: e.target.value }))} /></label><button className="rounded bg-green-800 px-4 py-2 text-white" disabled={!valid || confirm.isPending} onClick={() => confirm.mutate()}>Confirm delivery</button><label className="block">Rejection reason<input className="ml-2 border rounded p-2" value={reason} onChange={e => setReason(e.target.value)} /></label><button className="rounded bg-red-700 px-4 py-2 text-white" disabled={!reason.trim() || !form.received_by.trim() || reject.isPending} onClick={() => reject.mutate()}>Reject delivery</button></>}</section>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <section className="rounded-xl border bg-white p-5"><h2 className="font-semibold mb-3">Reports</h2>{reports.length === 0 && <p>No delivery reports yet.</p>}{reports.map(r => <div key={r.id} className="border-t py-3"><Link className="text-green-800 underline" to={`/deliveries/${r.id}`}>{r.report_id}</Link> · {r.status} · {formatWeight(r.delivered_quantity_kg)} delivered</div>)}</section>
  </div>
}
