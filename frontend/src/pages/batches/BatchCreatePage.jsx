import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { batchesApi, farmsApi, produceApi } from '../../api/agriculture.api'

export default function BatchCreatePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { data: farms } = useQuery({
    queryKey: ['farms'],
    queryFn: () => farmsApi.list().then(res => res.data),
  })

  const { data: produceList } = useQuery({
    queryKey: ['produce'],
    queryFn: () => produceApi.list().then(res => res.data),
  })

  const farmItems = Array.isArray(farms) ? farms : farms?.items || []
  const produceItems = Array.isArray(produceList) ? produceList : produceList?.items || []

  const initialFarmId = location.state?.farmId || ''
  const initialProduceType = location.state?.produceType || ''

  const [form, setForm] = useState({
    farm_id: initialFarmId,
    produce_type: initialProduceType,
    harvest_date: new Date().toISOString().split('T')[0],
    harvest_location: '',
    initial_quantity_kg: '',
    quality_grade: 'GRADE_A',
    packaging_type: 'CRATE',
    estimated_shelf_life_days: '14',
    handling_requirements: '',
  })

  // Autofill farm location if selected
  useEffect(() => {
    if (form.farm_id && farmItems.length > 0) {
      const selected = farmItems.find(f => (f.id || f._id) === form.farm_id)
      if (selected && !form.harvest_location) {
        setForm(f => ({ ...f, harvest_location: `${selected.name}, ${selected.city}, ${selected.state}` }))
      }
    }
  }, [form.farm_id, farmItems])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const payload = {
        farm_id: form.farm_id,
        produce_type: form.produce_type,
        harvest_date: form.harvest_date,
        harvest_location: form.harvest_location.trim(),
        initial_quantity_kg: parseFloat(form.initial_quantity_kg),
        quality_grade: form.quality_grade,
        packaging_type: form.packaging_type,
        estimated_shelf_life_days: parseInt(form.estimated_shelf_life_days, 10),
        handling_requirements: form.handling_requirements ? form.handling_requirements.trim() : null,
      }

      const res = await batchesApi.create(payload)
      const newKey = res.data.batch_id || res.data.id || res.data._id
      navigate(`/batches/${newKey}`)
    } catch (err) {
      console.error('Batch creation error:', err)
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to create harvest batch.'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-8 py-10 animate-fade-in-up">
      <button
        onClick={() => navigate('/batches')}
        className="text-xs font-mono text-cyan-400 hover:text-cyan-300 mb-6 flex items-center gap-2 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        BATCH_REGISTRY
      </button>

      <div className="bg-[#0b1121] border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="mb-8">
          <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 mb-1 block">
            Provenance Genesis
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight">Register Harvest Batch</h1>
          <p className="text-slate-400 text-sm mt-1">
            Initialize a verifiable crop harvest lot linked cryptographically to its farm origin.
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Source Farm Node *
              </label>
              <select
                name="farm_id"
                required
                value={form.farm_id}
                onChange={handleChange}
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              >
                <option value="">Select origin farm...</option>
                {farmItems.map(f => (
                  <option key={f.id || f._id} value={f.id || f._id}>
                    {f.name} ({f.city}, {f.state})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Produce Commodity Type *
              </label>
              <select
                name="produce_type"
                required
                value={form.produce_type}
                onChange={handleChange}
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              >
                <option value="">Select commodity type...</option>
                {produceItems.map(p => (
                  <option key={p.produce_type || p.id} value={p.produce_type}>
                    {p.name} ({p.produce_type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Harvest Date *
              </label>
              <input
                type="date"
                name="harvest_date"
                required
                value={form.harvest_date}
                onChange={handleChange}
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Harvest Location Description *
              </label>
              <input
                type="text"
                name="harvest_location"
                required
                value={form.harvest_location}
                onChange={handleChange}
                placeholder="Field Plot B-12, Nashik East"
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Harvest Quantity (KG) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                name="initial_quantity_kg"
                value={form.initial_quantity_kg}
                onChange={handleChange}
                placeholder="5000"
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Quality Grade *
              </label>
              <select
                name="quality_grade"
                value={form.quality_grade}
                onChange={handleChange}
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              >
                <option value="GRADE_A">GRADE_A (Export Quality)</option>
                <option value="GRADE_B">GRADE_B (Domestic Standard)</option>
                <option value="GRADE_C">GRADE_C (Processing Only)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Packaging Type *
              </label>
              <select
                name="packaging_type"
                value={form.packaging_type}
                onChange={handleChange}
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              >
                <option value="CRATE">CRATE</option>
                <option value="BAG">BAG / SACK</option>
                <option value="PALLET">PALLET</option>
                <option value="BIN">BULK BIN</option>
                <option value="CARTON">CORRUGATED CARTON</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Estimated Shelf Life (Days) *
              </label>
              <input
                type="number"
                min="1"
                required
                name="estimated_shelf_life_days"
                value={form.estimated_shelf_life_days}
                onChange={handleChange}
                placeholder="14"
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Special Handling Requirements
              </label>
              <input
                type="text"
                name="handling_requirements"
                value={form.handling_requirements}
                onChange={handleChange}
                placeholder="Keep at 4°C - 8°C, Relative Humidity 85%"
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/batches')}
              className="flex-1 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium text-sm transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-cyan-900/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Minting Batch...' : 'Generate Batch Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

