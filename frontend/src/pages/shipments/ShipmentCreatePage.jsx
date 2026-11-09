import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { shipmentsApi, freightBookingsApi, fleetApi, driversApi, freightQuotesApi } from '../../api/commerce.api'

export default function ShipmentCreatePage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { data: bookingsData } = useQuery({
    queryKey: ['freight-bookings'],
    queryFn: () => freightBookingsApi.list().then(res => res.data),
  })

  const { data: vehiclesData } = useQuery({
    queryKey: ['fleet-vehicles'],
    queryFn: () => fleetApi.listVehicles().then(res => res.data),
  })

  const { data: driversData } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => driversApi.list().then(res => res.data),
  })

  const bookings = Array.isArray(bookingsData) ? bookingsData : bookingsData?.items || []
  const vehicles = Array.isArray(vehiclesData) ? vehiclesData : vehiclesData?.items || []
  const drivers = Array.isArray(driversData) ? driversData : driversData?.items || []

  const [form, setForm] = useState({
    booking_id: '',
    accepted_quotation_id: 'QUOTE-AUTO-ACCEPT-01',
    vehicle_id: '',
    driver_id: '',
    batch_ids: 'BATCH-HARVEST-01',
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const payload = {
        booking_id: form.booking_id.trim(),
        accepted_quotation_id: form.accepted_quotation_id.trim(),
        vehicle_id: form.vehicle_id.trim(),
        driver_id: form.driver_id.trim(),
        batch_ids: form.batch_ids.split(',').map(s => s.trim()).filter(Boolean),
      }

      const res = await shipmentsApi.create(payload)
      const newId = res.data.id || res.data._id
      navigate(`/shipments/${newId}`)
    } catch (err) {
      console.error('Shipment creation error:', err)
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to initialize shipment.'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-8 py-10 animate-fade-in-up">
      <button
        onClick={() => navigate('/shipments')}
        className="text-xs font-mono text-cyan-400 hover:text-cyan-300 mb-6 flex items-center gap-2 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        SHIPMENTS_CONSIGNMENTS
      </button>

      <div className="bg-[#0b1121] border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="mb-8">
          <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 mb-1 block">
            Consignment Dispatch
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight">Initialize Shipment Consignment</h1>
          <p className="text-slate-400 text-sm mt-1">
            Bind an approved freight booking with vehicle and driver assets for cold-chain haulage.
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
              Freight Booking Reference *
            </label>
            <select
              name="booking_id"
              required
              value={form.booking_id}
              onChange={handleChange}
              className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
            >
              <option value="">Select confirmed booking...</option>
              {bookings.map(b => (
                <option key={b.booking_id || b.id} value={b.booking_id || b.id}>
                  {b.booking_id || b.id} — {b.pickup_city} to {b.destination_city} ({b.preferred_vehicle_category})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
              Accepted Quotation ID *
            </label>
            <input
              type="text"
              required
              name="accepted_quotation_id"
              value={form.accepted_quotation_id}
              onChange={handleChange}
              placeholder="e.g. QUOT-2024-9988"
              className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Assign Fleet Vehicle *
              </label>
              <select
                name="vehicle_id"
                required
                value={form.vehicle_id}
                onChange={handleChange}
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              >
                <option value="">Select vehicle...</option>
                {vehicles.map(v => (
                  <option key={v.vehicle_id || v.id} value={v.vehicle_id || v.id}>
                    {v.registration_number} ({v.category}) — {v.max_payload_kg} kg
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Assign Commercial Driver *
              </label>
              <select
                name="driver_id"
                required
                value={form.driver_id}
                onChange={handleChange}
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              >
                <option value="">Select driver...</option>
                {drivers.map(d => (
                  <option key={d.driver_id || d.id} value={d.driver_id || d.id}>
                    {d.name} ({d.phone}) — {d.license_number}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
              Batch Identifiers (comma separated) *
            </label>
            <input
              type="text"
              required
              name="batch_ids"
              value={form.batch_ids}
              onChange={handleChange}
              placeholder="BATCH-MANGO-01, BATCH-MANGO-02"
              className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/shipments')}
              className="flex-1 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium text-sm transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-cyan-900/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Dispatching...' : 'Initialize Shipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

