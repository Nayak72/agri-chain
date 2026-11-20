import { useQueryClient } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { transportersApi } from '../../api/commerce.api'
import { ROLES, isRoleAllowed } from '../../constants/roles'
import { useAuth } from '../../context/AuthContext'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { driversApi } from '../../api/commerce.api'
import { getApiError } from '../../utils'
import PageHeader from '../../components/common/PageHeader'

export default function DriverCreatePage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', phone: '', city: '', state: '' })
  const [error, setError] = useState('')
  const isAdmin = isRoleAllowed(user?.role, [ROLES.ADMIN])
  const { data: carriers = [], isError: carrierError } = useQuery({ queryKey: ['transporters'], enabled: isAdmin, queryFn: () => transportersApi.list({ page_size: 100 }).then(r => r.data) })
  const [loading, setLoading] = useState(false)
  const submit = async e => { e.preventDefault(); setLoading(true); setError(''); try { const { data } = await driversApi.create(form); queryClient.invalidateQueries(); navigate(`/drivers/${data.id}`) } catch (err) { setError(getApiError(err, 'Driver creation failed').message) } finally { setLoading(false) } }
  return <div className="max-w-2xl mx-auto p-6 space-y-5"><PageHeader title="Add driver" /><form onSubmit={submit} className="rounded-xl border glass-panel p-5 space-y-4">{isAdmin && <label className="block">Transporter<select required className="block w-full border glass-control rounded-xl p-2" value={form.transporter_id || ''} onChange={e => setForm(prev => ({ ...prev, transporter_id: e.target.value }))}><option value="">Select transporter</option>{carriers.map(t => <option key={t.id} value={t.id}>{t.company_name}</option>)}</select></label>}{carrierError && <p role="alert">Unable to load transporters.</p>}{[['name', 'Name'], ['phone', 'Phone'], ['city', 'City'], ['state', 'State']].map(([key, label]) => <label className="block" key={key}>{label}<input className="block w-full border glass-control rounded-xl p-2" value={form[key]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} required /></label>)}{error && <p role="alert" className="text-red-700">{error}</p>}<button disabled={loading} className="glass-button rounded-xl bg-forest px-4 py-2 text-white disabled:opacity-50">Save driver</button></form></div>
}
