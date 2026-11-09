import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { warehousesApi } from '../../api/agriculture.api'
import { useAuth } from '../../context/AuthContext'

export default function WarehouseCreatePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    capacity_kg: '',
    cold_storage_capacity_kg: '0',
    has_refrigeration: false,
    temperature_range_min: '',
    temperature_range_max: '',
    certifications: '',
  })

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [e.target.name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const payload = {
        name: form.name.trim(),
        manager_id: user?.id || user?._id || 'admin',
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        capacity_kg: parseFloat(form.capacity_kg),
        cold_storage_capacity_kg: parseFloat(form.cold_storage_capacity_kg || 0),
        has_refrigeration: Boolean(form.has_refrigeration),
        temperature_range_min: form.temperature_range_min ? parseFloat(form.temperature_range_min) : null,
        temperature_range_max: form.temperature_range_max ? parseFloat(form.temperature_range_max) : null,
        certifications: form.certifications
          ? form.certifications.split(',').map(s => s.trim()).filter(Boolean)
          : [],
      }

      const res = await warehousesApi.create(payload)
      const newId = res.data.id || res.data._id
      navigate(`/warehouses/${newId}`)
    } catch (err) {
      console.error('Warehouse deployment error:', err)
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to deploy storage node.'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-8 py-10 animate-fade-in-up">
      <button
        onClick={() => navigate('/warehouses')}
        className="text-xs font-mono text-cyan-400 hover:text-cyan-300 mb-6 flex items-center gap-2 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        STORAGE_NETWORK
      </button>

      <div className="bg-[#0b1121] border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="mb-8">
          <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 mb-1 block">
            Infrastructure Commissioning
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight">Deploy Warehouse Node</h1>
          <p className="text-slate-400 text-sm mt-1">
            Provision a new storage facility with verified volumetric capacity and climate control parameters.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-start gap-3">
            <svg className="w-5 h-5 shrink-0 mt-0.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
              Warehouse Node Name *
            </label>
            <input
              type="text"
              name="name"
              required
              minLength={2}
              maxLength={100}
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Nashik Central Cold Storage Facility"
              className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
              Physical Location Address *
            </label>
            <input
              type="text"
              name="address"
              required
              minLength={5}
              maxLength={200}
              value={form.address}
              onChange={handleChange}
              placeholder="Plot No. 104, MIDC Ambad Industrial Area"
              className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                City *
              </label>
              <input
                type="text"
                name="city"
                required
                value={form.city}
                onChange={handleChange}
                placeholder="Nashik"
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                State *
              </label>
              <input
                type="text"
                name="state"
                required
                value={form.state}
                onChange={handleChange}
                placeholder="Maharashtra"
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Pincode (6 digits) *
              </label>
              <input
                type="text"
                name="pincode"
                required
                pattern="^\d{6}$"
                value={form.pincode}
                onChange={handleChange}
                placeholder="422010"
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Total Storage Capacity (KG) *
              </label>
              <input
                type="number"
                min="100"
                required
                name="capacity_kg"
                value={form.capacity_kg}
                onChange={handleChange}
                placeholder="500000"
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Cold Storage Sub-Capacity (KG)
              </label>
              <input
                type="number"
                min="0"
                name="cold_storage_capacity_kg"
                value={form.cold_storage_capacity_kg}
                onChange={handleChange}
                placeholder="200000"
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="has_refrigeration"
                checked={form.has_refrigeration}
                onChange={handleChange}
                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span className="text-xs font-mono font-semibold text-slate-200">
                Refrigeration & Active Cold-Chain Telemetry Enabled
              </span>
            </label>

            {form.has_refrigeration && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Min Temp (°C)</label>
                  <input
                    type="number"
                    step="0.5"
                    name="temperature_range_min"
                    value={form.temperature_range_min}
                    onChange={handleChange}
                    placeholder="2.0"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Max Temp (°C)</label>
                  <input
                    type="number"
                    step="0.5"
                    name="temperature_range_max"
                    value={form.temperature_range_max}
                    onChange={handleChange}
                    placeholder="8.0"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
              Facility Certifications (comma separated)
            </label>
            <input
              type="text"
              name="certifications"
              value={form.certifications}
              onChange={handleChange}
              placeholder="ISO 22000, HACCP, FSSAI Cold Chain"
              className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/warehouses')}
              className="flex-1 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium text-sm transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-cyan-900/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Commissioning Node...' : 'Deploy Storage Node'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

