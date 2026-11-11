import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { warehousesApi } from '../../api/agriculture.api'
import { getApiError } from '../../utils'
import PageHeader from '../../components/common/PageHeader'

export default function WarehouseCreatePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', city: '', state: '', capacity_kg: '', cold_storage_capacity_kg: '0', has_refrigeration: false, temperature_range_min: '', temperature_range_max: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async e => { e.preventDefault(); setLoading(true); setError(''); try { const payload = { ...form, capacity_kg: Number(form.capacity_kg), cold_storage_capacity_kg: Number(form.cold_storage_capacity_kg), temperature_range_min: form.temperature_range_min === '' ? null : Number(form.temperature_range_min), temperature_range_max: form.temperature_range_max === '' ? null : Number(form.temperature_range_max) }; const { data } = await warehousesApi.create(payload); navigate(`/warehouses/${data.id}`) } catch (err) { setError(getApiError(err, 'Warehouse creation failed').message) } finally { setLoading(false) } }
  return <div className="max-w-2xl mx-auto p-6 space-y-5"><PageHeader title="Register warehouse" /><form onSubmit={submit} className="rounded-xl border bg-white p-5 space-y-4">{[['name', 'Name'], ['city', 'City'], ['state', 'State'], ['capacity_kg', 'Capacity kg'], ['cold_storage_capacity_kg', 'Cold storage capacity kg'], ['temperature_range_min', 'Minimum °C'], ['temperature_range_max', 'Maximum °C']].map(([key, label]) => <label className="block" key={key}>{label}<input className="block w-full border rounded p-2" type={key.includes('kg') || key.includes('temperature') ? 'number' : 'text'} step="any" name={key} value={form[key]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} required={['name', 'city', 'state', 'capacity_kg'].includes(key)} /></label>)}<label className="block"><input type="checkbox" checked={form.has_refrigeration} onChange={e => setForm(prev => ({ ...prev, has_refrigeration: e.target.checked }))} /> Refrigeration available</label>{error && <p role="alert" className="text-red-700">{error}</p>}<button disabled={loading} className="rounded bg-green-800 px-4 py-2 text-white">Save warehouse</button></form></div>
}
