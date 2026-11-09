import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { freightBookingsApi } from '../../api/commerce.api'

export default function FreightBookingCreatePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Prefill if navigated from Purchase Order
  const poState = location.state || {}

  const [form, setForm] = useState({
    purchase_order_id: poState.purchaseOrderId || 'PO-DEMO-001',
    batch_ids: poState.batchId ? [poState.batchId] : ['BATCH-DEMO-01'],
    cargo_quantity_kg: poState.cargoWeightKg ? String(poState.cargoWeightKg) : '2000',
    total_cargo_weight_kg: poState.cargoWeightKg ? String(poState.cargoWeightKg) : '2000',
    package_count: '100',
    pickup_address: poState.pickupAddress || 'Farm Gate Central, Sector 4, Nashik',
    pickup_city: 'Nashik',
    pickup_state: 'Maharashtra',
    destination_address: poState.deliveryAddress || 'APMC Terminal Market, Vashi, Navi Mumbai',
    destination_city: 'Navi Mumbai',
    destination_state: 'Maharashtra',
    requested_pickup_date: new Date().toISOString().split('T')[0],
    required_delivery_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    preferred_vehicle_category: 'REEFER_14FT',
    refrigeration_required: true,
    temperature_min: '2.0',
    temperature_max: '8.0',
    packaging_details: 'Standard ventilated agricultural crates on plastic pallets',
    special_handling_instructions: 'Strict cold-chain compliance. No exposure to direct sunlight during loading.',
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
        purchase_order_id: form.purchase_order_id.trim(),
        batch_ids: Array.isArray(form.batch_ids) ? form.batch_ids : [form.batch_ids],
        cargo_quantity_kg: parseFloat(form.cargo_quantity_kg),
        total_cargo_weight_kg: parseFloat(form.total_cargo_weight_kg),
        package_count: parseInt(form.package_count, 10),
        pickup_address: form.pickup_address.trim(),
        pickup_city: form.pickup_city.trim(),
        pickup_state: form.pickup_state.trim(),
        destination_address: form.destination_address.trim(),
        destination_city: form.destination_city.trim(),
        destination_state: form.destination_state.trim(),
        requested_pickup_date: form.requested_pickup_date,
        required_delivery_date: form.required_delivery_date,
        preferred_vehicle_category: form.preferred_vehicle_category,
        refrigeration_required: Boolean(form.refrigeration_required),
        temperature_min: form.refrigeration_required && form.temperature_min ? parseFloat(form.temperature_min) : null,
        temperature_max: form.refrigeration_required && form.temperature_max ? parseFloat(form.temperature_max) : null,
        packaging_details: form.packaging_details ? form.packaging_details.trim() : null,
        special_handling_instructions: form.special_handling_instructions ? form.special_handling_instructions.trim() : null,
      }

      const res = await freightBookingsApi.create(payload)
      const newKey = res.data.id || res.data._id || res.data.booking_id
      navigate(`/freight-bookings/${newKey}`)
    } catch (err) {
      console.error('Freight booking creation error:', err)
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to create freight booking.'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-10 animate-fade-in-up">
      <button
        onClick={() => navigate('/freight-bookings')}
        className="text-xs font-mono text-cyan-400 hover:text-cyan-300 mb-6 flex items-center gap-2 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        BOOKINGS_DISPATCH
      </button>

      <div className="bg-[#0b1121] border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="mb-8">
          <span className="text-xs font-mono uppercase tracking-widest text-amber-400 mb-1 block">
            Dispatch Request
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight">Request Freight Transportation</h1>
          <p className="text-slate-400 text-sm mt-1">
            Publish agricultural freight cargo specifications to the transporter quotation exchange.
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
                Purchase Order Reference ID *
              </label>
              <input
                type="text"
                name="purchase_order_id"
                required
                value={form.purchase_order_id}
                onChange={handleChange}
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Preferred Vehicle Category *
              </label>
              <select
                name="preferred_vehicle_category"
                value={form.preferred_vehicle_category}
                onChange={handleChange}
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              >
                <option value="REEFER_14FT">Refrigerated Truck (14ft / 3.5 Ton)</option>
                <option value="REEFER_20FT">Refrigerated Truck (20ft / 7 Ton)</option>
                <option value="REEFER_32FT">Refrigerated Trailer (32ft / 15 Ton)</option>
                <option value="OPEN_TRUCK">Open Tarpaulin Truck (General Cargo)</option>
                <option value="CLOSED_CONTAINER">Closed Metal Container</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Cargo Weight (KG) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                name="total_cargo_weight_kg"
                value={form.total_cargo_weight_kg}
                onChange={(e) => setForm({ ...form, total_cargo_weight_kg: e.target.value, cargo_quantity_kg: e.target.value })}
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Package / Crate Count *
              </label>
              <input
                type="number"
                min="1"
                required
                name="package_count"
                value={form.package_count}
                onChange={handleChange}
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Pickup Date *
              </label>
              <input
                type="date"
                required
                name="requested_pickup_date"
                value={form.requested_pickup_date}
                onChange={handleChange}
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            {/* Pickup */}
            <div className="space-y-3">
              <div className="text-xs font-mono font-bold text-cyan-400 uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                Pickup Node Origin
              </div>
              <input
                type="text"
                placeholder="Street Address"
                name="pickup_address"
                required
                value={form.pickup_address}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="City (e.g. Nashik)"
                  name="pickup_city"
                  required
                  value={form.pickup_city}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                />
                <input
                  type="text"
                  placeholder="State (e.g. Maharashtra)"
                  name="pickup_state"
                  required
                  value={form.pickup_state}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                />
              </div>
            </div>

            {/* Destination */}
            <div className="space-y-3">
              <div className="text-xs font-mono font-bold text-emerald-400 uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Destination Delivery Hub
              </div>
              <input
                type="text"
                placeholder="Street Address"
                name="destination_address"
                required
                value={form.destination_address}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="City (e.g. Navi Mumbai)"
                  name="destination_city"
                  required
                  value={form.destination_city}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                />
                <input
                  type="text"
                  placeholder="State (e.g. Maharashtra)"
                  name="destination_state"
                  required
                  value={form.destination_state}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="refrigeration_required"
                checked={form.refrigeration_required}
                onChange={handleChange}
                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span className="text-xs font-mono font-semibold text-slate-200">
                Active Cold-Chain Refrigeration Required During Transit
              </span>
            </label>

            {form.refrigeration_required && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Min Temp Threshold (°C)</label>
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
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Max Temp Threshold (°C)</label>
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

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/freight-bookings')}
              className="flex-1 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium text-sm transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-cyan-900/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Publishing Dispatch...' : 'Post Freight Booking Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

