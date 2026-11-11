import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi, warehousesApi, batchesApi } from '../../api/agriculture.api'
import { useAuth } from '../../context/AuthContext'
import { ROLES, normalizeRole } from '../../constants/roles'
import { formatWeight, formatDate, getApiError } from '../../utils'
import PageHeader from '../../components/common/PageHeader'

export default function InventoryPage() {
  const client = useQueryClient()
  const { user } = useAuth()
  const canReceive = [ROLES.WAREHOUSE_MANAGER, ROLES.ADMIN].includes(normalizeRole(user?.role))
  const [tab, setTab] = useState('stock')
  const [error, setError] = useState('')
  const [form, setForm] = useState({ warehouse_id: '', batch_id: '', received_weight_kg: '', accepted_weight_kg: '', damaged_weight_kg: '0', rejected_weight_kg: '0', inspection_result: 'PASSED', packaging_condition: 'GOOD', storage_location: '' })
  const { data: stock = [] } = useQuery({ queryKey: ['inventory'], queryFn: () => inventoryApi.list().then(r => r.data) })
  const { data: receipts = [] } = useQuery({ queryKey: ['receipts'], queryFn: () => inventoryApi.receipts().then(r => r.data), enabled: tab === 'receipts' })
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: () => warehousesApi.list().then(r => r.data), enabled: canReceive })
  const { data: batches = [] } = useQuery({ queryKey: ['batches'], queryFn: () => batchesApi.list().then(r => r.data), enabled: canReceive })
  const mutation = useMutation({
    mutationFn: () => inventoryApi.createReceipt(form.warehouse_id, {
      ...form,
      received_weight_kg: Number(form.received_weight_kg), accepted_weight_kg: Number(form.accepted_weight_kg),
      damaged_weight_kg: Number(form.damaged_weight_kg), rejected_weight_kg: Number(form.rejected_weight_kg),
    }),
    onSuccess: () => { setError(''); client.invalidateQueries({ queryKey: ['inventory'] }); client.invalidateQueries({ queryKey: ['receipts'] }); setTab('stock') },
    onError: e => setError(getApiError(e, 'Receipt failed').message),
  })
  const update = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  const total = Number(form.accepted_weight_kg) + Number(form.damaged_weight_kg) + Number(form.rejected_weight_kg)
  return <div className="space-y-6 p-6">
    <PageHeader title="Inventory" description="Accepted stock, available stock and warehouse receipts" />
    <div className="flex gap-3"><button onClick={() => setTab('stock')}>Stock</button><button onClick={() => setTab('receipts')}>Receipts</button></div>
    {tab === 'stock' && <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left"><thead><tr>{['Batch', 'Warehouse', 'Produce', 'Accepted', 'Available', 'Storage', 'Shelf life end'].map(h => <th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{stock.map(item => <tr className="border-t" key={item.id}><td className="p-3">{item.batch_id}</td><td className="p-3">{item.warehouse_id}</td><td className="p-3">{item.produce_type}</td><td className="p-3">{formatWeight(item.accepted_kg)}</td><td className="p-3">{formatWeight(item.available_kg)}</td><td className="p-3">{item.storage_location}</td><td className="p-3">{formatDate(item.estimated_shelf_life_end)}</td></tr>)}</tbody></table></div>}
    {tab === 'receipts' && <div className="space-y-5">{canReceive && <form onSubmit={e => { e.preventDefault(); if (Math.abs(Number(form.received_weight_kg) - total) > 0.01) { setError('Received weight must equal accepted + damaged + rejected'); return } mutation.mutate() }} className="rounded-xl border bg-white p-5 space-y-3"><h2 className="font-semibold">Record warehouse receipt</h2><select required name="warehouse_id" value={form.warehouse_id} onChange={update}><option value="">Choose warehouse</option>{warehouses.map(w => <option value={w.id} key={w.id}>{w.name}</option>)}</select><select required name="batch_id" value={form.batch_id} onChange={update}><option value="">Choose batch</option>{batches.filter(b => ['CREATED', 'HARVESTED'].includes(b.status)).map(b => <option value={b.id} key={b.id}>{b.batch_id}</option>)}</select>{[['received_weight_kg', 'Received kg'], ['accepted_weight_kg', 'Accepted kg'], ['damaged_weight_kg', 'Damaged kg'], ['rejected_weight_kg', 'Rejected kg']].map(([key, label]) => <label className="block" key={key}>{label}<input className="ml-2 border rounded p-2" type="number" step="0.01" min="0" required name={key} value={form[key]} onChange={update} /></label>)}<select name="inspection_result" value={form.inspection_result} onChange={update}><option value="PASSED">Passed</option><option value="FAILED">Failed</option></select><input className="border rounded p-2" name="packaging_condition" value={form.packaging_condition} onChange={update} placeholder="Packaging condition" /><input className="border rounded p-2" name="storage_location" value={form.storage_location} onChange={update} placeholder="Storage location" required />{error && <p role="alert" className="text-red-700">{error}</p>}<button className="rounded bg-green-800 px-4 py-2 text-white" disabled={mutation.isPending}>Save receipt</button></form>}<div className="rounded-xl border bg-white p-4">{receipts.map(r => <div key={r.id} className="border-b py-2">{r.receipt_id} · {r.batch_id} · {formatWeight(r.accepted_weight_kg)} accepted · {r.inspection_result}</div>)}</div></div>}
  </div>
}
