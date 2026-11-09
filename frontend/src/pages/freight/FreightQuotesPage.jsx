import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { freightQuotesApi, freightBookingsApi } from '../../api/commerce.api'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency, formatDate, formatDateTime, formatStatus } from '../../utils'

export default function FreightQuotesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const prefillBookingId = location.state?.bookingId || ''

  // Form state
  const [form, setForm] = useState({
    booking_id: prefillBookingId,
    proposed_vehicle_category: 'REEFER_14FT',
    freight_base_charge_inr: '12000',
    handling_charge_inr: '1500',
    fuel_surcharge_inr: '2500',
    other_charges_inr: '500',
    planned_distance_km: '280',
    estimated_transit_hours: '6.5',
    expected_pickup_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    validity_days: '7',
    additional_terms: 'Reefer temperature maintained at +4°C continuous datalogging.',
  })

  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Query all quotes
  const { data: quotesData, isLoading, refetch } = useQuery({
    queryKey: ['freight-quotes-all'],
    queryFn: () => freightQuotesApi.list().then(res => res.data),
    staleTime: 30_000,
  })

  // Query open bookings to select from
  const { data: bookingsData } = useQuery({
    queryKey: ['freight-bookings'],
    queryFn: () => freightBookingsApi.list().then(res => res.data),
  })

  const quotes = Array.isArray(quotesData) ? quotesData : quotesData?.items || []
  const bookings = Array.isArray(bookingsData) ? bookingsData : bookingsData?.items || []

  const submitQuoteMutation = useMutation({
    mutationFn: (data) => freightQuotesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freight-quotes-all'] })
      setSuccessMsg('Quotation submitted successfully to the freight exchange!')
      setFormError('')
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Quotation submission failed.'
      setFormError(typeof msg === 'string' ? msg : JSON.stringify(msg))
      setSuccessMsg('')
    },
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setFormError('')
    setSuccessMsg('')

    const basePaise = Math.round(parseFloat(form.freight_base_charge_inr || 0) * 100)
    const handlingPaise = Math.round(parseFloat(form.handling_charge_inr || 0) * 100)
    const fuelPaise = Math.round(parseFloat(form.fuel_surcharge_inr || 0) * 100)
    const otherPaise = Math.round(parseFloat(form.other_charges_inr || 0) * 100)

    const payload = {
      booking_id: form.booking_id.trim(),
      proposed_vehicle_category: form.proposed_vehicle_category,
      freight_base_charge_paise: basePaise,
      handling_charge_paise: handlingPaise,
      fuel_surcharge_paise: fuelPaise,
      other_charges_paise: otherPaise,
      planned_distance_km: parseFloat(form.planned_distance_km),
      estimated_transit_hours: parseFloat(form.estimated_transit_hours),
      expected_pickup_date: form.expected_pickup_date,
      expected_delivery_date: form.expected_delivery_date,
      validity_days: parseInt(form.validity_days, 10),
      additional_terms: form.additional_terms ? form.additional_terms.trim() : null,
    }

    submitQuoteMutation.mutate(payload)
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-10 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-500"></span>
            <span className="text-xs font-mono font-medium text-cyan-500 uppercase tracking-widest">
              Fleet Commercial Exchange
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Freight <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Quotations</span>
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl">
            Submit pricing proposals for agricultural haulage, manage fuel surcharges, and review awarded bids.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white transition-all text-sm font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Sync
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Quotation Submission Form */}
        <div className="lg:col-span-1 bg-[#0b1121] border border-slate-800 rounded-3xl p-6 shadow-2xl h-fit">
          <div className="mb-6">
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 mb-1 block">
              Carrier Bid
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">Submit Freight Quotation</h2>
            <p className="text-slate-400 text-xs mt-1">
              Provide transit metrics and pricing breakdown in INR.
            </p>
          </div>

          {formError && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-mono">
              {formError}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Booking ID *</label>
              <select
                name="booking_id"
                required
                value={form.booking_id}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
              >
                <option value="">Select dispatch booking...</option>
                {bookings.map(b => (
                  <option key={b.booking_id || b.id} value={b.booking_id || b.id}>
                    {b.booking_id || b.id} — {b.pickup_city} to {b.destination_city}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Vehicle Category *</label>
              <select
                name="proposed_vehicle_category"
                value={form.proposed_vehicle_category}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
              >
                <option value="REEFER_14FT">Refrigerated Truck (14ft)</option>
                <option value="REEFER_20FT">Refrigerated Truck (20ft)</option>
                <option value="REEFER_32FT">Refrigerated Trailer (32ft)</option>
                <option value="OPEN_TRUCK">Open Tarpaulin Truck</option>
                <option value="CLOSED_CONTAINER">Closed Container</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Base Freight (₹) *</label>
                <input
                  type="number"
                  required
                  name="freight_base_charge_inr"
                  value={form.freight_base_charge_inr}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Handling (₹)</label>
                <input
                  type="number"
                  name="handling_charge_inr"
                  value={form.handling_charge_inr}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Fuel Surcharge (₹)</label>
                <input
                  type="number"
                  name="fuel_surcharge_inr"
                  value={form.fuel_surcharge_inr}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Other Charges (₹)</label>
                <input
                  type="number"
                  name="other_charges_inr"
                  value={form.other_charges_inr}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Distance (KM) *</label>
                <input
                  type="number"
                  required
                  name="planned_distance_km"
                  value={form.planned_distance_km}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Transit Hours *</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  name="estimated_transit_hours"
                  value={form.estimated_transit_hours}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitQuoteMutation.isPending}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-mono text-xs font-bold shadow-lg shadow-cyan-900/20 disabled:opacity-50 transition-all mt-4"
            >
              {submitQuoteMutation.isPending ? 'Publishing Quotation...' : 'Transmit Quotation Bid'}
            </button>
          </form>
        </div>

        {/* Right Column: Quotes List */}
        <div className="lg:col-span-2 bg-[#0b1121] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl h-fit">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
              Exchange Quotations Ledger
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Live bids submitted across active logistics bookings</p>
          </div>

          {isLoading ? (
            <div className="p-16 text-center text-slate-500 font-mono text-xs animate-pulse">
              Querying quotation exchange...
            </div>
          ) : quotes.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-4xl mb-3">💰</div>
              <h3 className="text-base font-medium text-white mb-1">No Quotations on Record</h3>
              <p className="text-slate-500 text-xs">Use the submission form to post a carrier bid.</p>
            </div>
          ) : (
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500 bg-slate-950/40">
                  <th className="px-6 py-4">Quote ID</th>
                  <th className="px-6 py-4">Booking Ref</th>
                  <th className="px-6 py-4">Vehicle Category</th>
                  <th className="px-6 py-4">Distance & Transit</th>
                  <th className="px-6 py-4">Total Amount</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {quotes.map((q) => {
                  const quoteKey = q.id || q._id || q.quotation_id
                  const isAccepted = q.status === 'ACCEPTED'
                  return (
                    <tr key={quoteKey} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-cyan-400">{q.quotation_id || quoteKey}</td>
                      <td className="px-6 py-4 text-slate-300 cursor-pointer hover:underline" onClick={() => navigate(`/freight-bookings/${q.booking_id}`)}>
                        {q.booking_id}
                      </td>
                      <td className="px-6 py-4 text-slate-400">{q.proposed_vehicle_category}</td>
                      <td className="px-6 py-4 text-slate-300">
                        {q.planned_distance_km} km • {q.estimated_transit_hours} hrs
                      </td>
                      <td className="px-6 py-4 text-emerald-400 font-bold">
                        {formatCurrency(q.total_freight_charge_paise || q.freight_base_charge_paise)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase border ${
                          isAccepted
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}>
                          {q.status || 'PENDING'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

