import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { farmsApi } from '../../api/agriculture.api'
import { getApiError } from '../../utils'
import PageHeader from '../../components/common/PageHeader'

export default function FarmCreatePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', city: '', state: '', pincode: '', description: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async e => { e.preventDefault(); setLoading(true); setError(''); try { const { data } = await farmsApi.create(form); navigate(`/farms/${data.id}`) } catch (err) { setError(getApiError(err, 'Farm creation failed').message) } finally { setLoading(false) } }
  return <div className="max-w-2xl mx-auto p-6 space-y-5"><PageHeader title="Register farm" /><form onSubmit={submit} className="rounded-xl border bg-white p-5 space-y-4">{[['name', 'Farm name'], ['city', 'City'], ['state', 'State'], ['pincode', 'Pincode'], ['description', 'Description']].map(([key, label]) => <label className="block" key={key}>{label}<input className="block w-full border rounded p-2" name={key} value={form[key]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} required={key !== 'description'} /></label>)}{error && <p role="alert" className="text-red-700">{error}</p>}<button disabled={loading} className="rounded bg-green-800 px-4 py-2 text-white">Save farm</button></form></div>
}
