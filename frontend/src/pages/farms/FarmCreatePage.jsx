import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { farmsApi } from '../../api/agriculture.api'
import { usersApi } from '../../api/users.api'
import { useAuth } from '../../context/AuthContext'
import { ROLES, isRoleAllowed } from '../../constants/roles'
import { getApiError } from '../../utils'
import PageHeader from '../../components/common/PageHeader'

export default function FarmCreatePage() {
  const navigate = useNavigate()
  const client = useQueryClient()
  const { user } = useAuth()
  const isAdmin = isRoleAllowed(user?.role, [ROLES.ADMIN])
  const [farmerId, setFarmerId] = useState('')
  const [form, setForm] = useState({ name: '', city: '', state: '', pincode: '', description: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const farmersQuery = useQuery({
    queryKey: ['farm-owners'], enabled: isAdmin,
    queryFn: async () => {
      const users = []
      for (let page = 1; ; page++) {
        const { data } = await usersApi.list({ role: ROLES.FARMER, is_active: true, page, page_size: 100 })
        users.push(...data.users)
        if (users.length >= data.total || !data.users.length) break
      }
      return users.filter(u => u.is_approved && u.is_active)
    },
  })
  const submit = async e => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]))
      if (isAdmin) payload.farmer_id = farmerId
      const { data } = await farmsApi.create(payload)
      await client.invalidateQueries({ queryKey: ['farms'] })
      navigate(`/farms/${data.id}`)
    } catch (err) { setError(getApiError(err, 'Farm creation failed').message) }
    finally { setLoading(false) }
  }
  return <div className="max-w-2xl mx-auto p-6 space-y-5"><PageHeader title="Register farm" />
    <form onSubmit={submit} className="rounded-xl border glass-panel p-5 space-y-4">
      {isAdmin && <label className="block">Farmer
        <select required value={farmerId} onChange={e => setFarmerId(e.target.value)} className="block w-full border glass-control rounded-xl p-2">
          <option value="">Select an active, approved farmer</option>
          {(farmersQuery.data || []).map(f => <option key={f.id} value={f.id}>{f.full_name} ({f.email})</option>)}
        </select>
      </label>}
      {farmersQuery.isError && <p role="alert">Unable to load farmers. <button type="button" onClick={() => farmersQuery.refetch()}>Retry</button></p>}
      {isAdmin && farmersQuery.isSuccess && !farmersQuery.data.length && <p>No eligible farmers. Register or activate a farmer account first.</p>}
      {[['name', 'Farm name'], ['city', 'City'], ['state', 'State'], ['pincode', 'Pincode'], ['description', 'Description']].map(([key, label]) => <label className="block" key={key}>{label}<input className="block w-full border glass-control rounded-xl p-2" name={key} value={form[key]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} required={key !== 'description'} /></label>)}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <button disabled={loading || (isAdmin && !farmerId)} className="glass-button rounded-xl bg-forest px-4 py-2 text-white disabled:opacity-50">Save farm</button>
    </form></div>
}
