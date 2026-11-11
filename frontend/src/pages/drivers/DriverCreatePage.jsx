import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { driversApi } from '../../api/commerce.api'
import { getApiError } from '../../utils'
import PageHeader from '../../components/common/PageHeader'

export default function DriverCreatePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', phone: '', city: '', state: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async e => { e.preventDefault(); setLoading(true); setError(''); try { const { data } = await driversApi.create(form); navigate(`/drivers/${data.id}`) } catch (err) { setError(getApiError(err, 'Driver creation failed').message) } finally { setLoading(false) } }
  return <div className="max-w-2xl mx-auto p-6 space-y-5"><PageHeader title="Add driver" /><form onSubmit={submit} className="rounded-xl border bg-white p-5 space-y-4">{[['name', 'Name'], ['phone', 'Phone'], ['city', 'City'], ['state', 'State']].map(([key, label]) => <label className="block" key={key}>{label}<input className="block w-full border rounded p-2" value={form[key]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} required /></label>)}{error && <p role="alert" className="text-red-700">{error}</p>}<button disabled={loading} className="rounded bg-green-800 px-4 py-2 text-white">Save driver</button></form></div>
}
