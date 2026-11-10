import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fleetApi } from '../../api/commerce.api'
import { useAuth } from '../../context/AuthContext'
import { formatApiErrorMessage } from '../../utils'

export default function VehicleCreatePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    transporter_id: user?.id || user?._id || 'transporter1',
    registration_number: '',
    category: 'REEFER_14FT',
    vehicle_type: 'Refrigerated Truck',
    max_payload_kg: '3500',
    refrigeration_available: true,
    temperature_min: '2.0',
    temperature_max: '8.0',
    registration_expiry: new Date(Date.now() + 86400000 * 365).toISOString().split('T')[0],
    insurance_expiry: new Date(Date.now() + 86400000 * 300).toISOString().split('T')[0],
    fitness_expiry: new Date(Date.now() + 86400000 * 180).toISOString().split('T')[0],
  })

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [e.target.name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const payloadKg = parseFloat(form.max_payload_kg)
    if (isNaN(payloadKg) || payloadKg <= 0) {
      setError('Max payload capacity must be greater than 0 kg.')
      return
    }

    let tempMin = null
    let tempMax = null
    if (form.refrigeration_available) {
      if (form.temperature_min !== '' && form.temperature_min !== null) {
        tempMin = parseFloat(form.temperature_min)
        if (isNaN(tempMin)) {
          setError('Minimum temperature must be a valid number.')
          return
        }
      }
      if (form.temperature_max !== '' && form.temperature_max !== null) {
        tempMax = parseFloat(form.temperature_max)
        if (isNaN(tempMax)) {
          setError('Maximum temperature must be a valid number.')
          return
        }
      }
      if (tempMin !== null && tempMax !== null && tempMin > tempMax) {
        setError('Minimum temperature cannot be greater than maximum temperature.')
        return
      }
    }

    setLoading(true)

    try {
      const payload = {
        transporter_id: form.transporter_id.trim(),
        registration_number: form.registration_number.trim().toUpperCase(),
        category: form.category,
        vehicle_type: form.vehicle_type.trim(),
        max_payload_kg: payloadKg,
        refrigeration_available: Boolean(form.refrigeration_available),
        temperature_min: tempMin,
        temperature_max: tempMax,
        registration_expiry: form.registration_expiry,
        insurance_expiry: form.insurance_expiry,
        fitness_expiry: form.fitness_expiry,
      }

      await fleetApi.createVehicle(payload)
      navigate('/fleet')
    } catch (err) {
      console.error('Vehicle registration error:', err)
      setError(formatApiErrorMessage(err, 'Failed to register vehicle.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-8 py-10 animate-fade-in-up">
      <button
        onClick={() => navigate('/fleet')}
        className="text-xs font-mono text-cyan-400 hover:text-cyan-300 mb-6 flex items-center gap-2 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        FLEET_INVENTORY
      </button>

      <div className="bg-[#0b1121] border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="mb-8">
          <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 mb-1 block">
            Fleet Asset Enrollment
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight">Register Fleet Vehicle</h1>
          <p className="text-slate-400 text-sm mt-1">
            Enroll a commercial freight truck with vehicle registration and fitness credentials.
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
                Vehicle Registration No *
              </label>
              <input
                type="text"
                required
                name="registration_number"
                value={form.registration_number}
                onChange={handleChange}
                placeholder="MH-15-DC-4421"
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono uppercase"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Fleet Category *
              </label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              >
                <option value="REEFER_14FT">Refrigerated Truck (14ft)</option>
                <option value="REEFER_20FT">Refrigerated Truck (20ft)</option>
                <option value="REEFER_32FT">Refrigerated Trailer (32ft)</option>
                <option value="OPEN_TRUCK">Open Truck (Tarpaulin)</option>
                <option value="CLOSED_CONTAINER">Closed Container</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Vehicle Make / Body Type *
              </label>
              <input
                type="text"
                required
                name="vehicle_type"
                value={form.vehicle_type}
                onChange={handleChange}
                placeholder="Tata Ultra T.7 Reefer"
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Max Payload Capacity (KG) *
              </label>
              <input
                type="number"
                min="500"
                required
                name="max_payload_kg"
                value={form.max_payload_kg}
                onChange={handleChange}
                placeholder="3500"
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="refrigeration_available"
                checked={form.refrigeration_available}
                onChange={handleChange}
                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span className="text-xs font-mono font-semibold text-slate-200">
                Vehicle Equipped with Active Refrigeration Unit
              </span>
            </label>

            {form.refrigeration_available && (
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Min Temp (°C)</label>
                  <input
                    type="number"
                    step="0.5"
                    name="temperature_min"
                    value={form.temperature_min}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Max Temp (°C)</label>
                  <input
                    type="number"
                    step="0.5"
                    name="temperature_max"
                    value={form.temperature_max}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Registration Expiry *
              </label>
              <input
                type="date"
                required
                name="registration_expiry"
                value={form.registration_expiry}
                onChange={handleChange}
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Insurance Expiry *
              </label>
              <input
                type="date"
                required
                name="insurance_expiry"
                value={form.insurance_expiry}
                onChange={handleChange}
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Fitness Certificate *
              </label>
              <input
                type="date"
                required
                name="fitness_expiry"
                value={form.fitness_expiry}
                onChange={handleChange}
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/fleet')}
              className="flex-1 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium text-sm transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-cyan-900/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Enrolling Asset...' : 'Register Vehicle Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

