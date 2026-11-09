import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { freightBookingsApi, freightQuotesApi } from '../../api/commerce.api'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency, formatWeight, formatDate, formatDateTime, getStatusColor, formatStatus } from '../../utils'

export default function FreightBookingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [errorMsg, setErrorMsg] = useState('')

  // Booking query
  const { data: booking, isLoading: bookingLoading, error: bookingError } = useQuery({
    queryKey: ['freight-booking', id],
    queryFn: () => freightBookingsApi.get(id).then(res => res.data),
  })

  // Quotations query
  const { data: quotesData, isLoading: quotesLoading } = useQuery({
    queryKey: ['freight-quotes', id],
    queryFn: () => freightQuotesApi.list({ booking_id: id }).then(res => res.data),
    enabled: !!id,
  })

  const quotes = Array.isArray(quotesData) ? quotesData : quotesData?.items || []

  // Accept quote mutation
  const acceptQuoteMutation = useMutation({
    mutationFn: (quoteId) => freightQuotesApi.accept(quoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freight-booking', id] })
      queryClient.invalidateQueries({ queryKey: ['freight-quotes', id] })
      navigate('/shipments')
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Quotation acceptance failed.'
      setErrorMsg(typeof msg === 'string' ? msg : JSON.stringify(msg))
    },
  })

  if (bookingLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
        <span className="text-slate-500 font-mono text-sm animate-pulse">Reading freight dispatch telemetry...</span>
      </div>
    )
  }

  if (bookingError || !booking) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-white mb-2">Freight Booking Not Found</h2>
        <p className="text-slate-400 mb-6">Could not retrieve booking record for ID: {id}</p>
        <button
          onClick={() => navigate('/freight-bookings')}
          className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
        >
          Return to Bookings
        </button>
      </div>
    )
  }

  const bookingKey = booking.id || booking._id || booking.booking_id
  const statusColor = getStatusColor(booking.status)
  const isTransporter = user?.role === 'transporter' || user?.role === 'admin'
  const isBuyerOrFarmer = user?.role === 'buyer' || user?.role === 'farmer' || user?.role === 'admin'

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-10 animate-fade-in-up">
      <button
        onClick={() => navigate('/freight-bookings')}
        className="text-xs font-mono text-cyan-400 hover:text-cyan-300 mb-6 flex items-center gap-2 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        BOOKINGS_DISPATCH
      </button>

      {/* Header Deck */}
      <div className="bg-[#0b1121] border border-slate-800 rounded-3xl p-8 mb-6 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-mono text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                DISPATCH REQUEST
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${statusColor}`}>
                {formatStatus(booking.status)}
              </span>
            </div>
            <h1 className="text-3xl font-bold font-mono text-white tracking-tight">{booking.booking_id || bookingKey}</h1>
            <p className="text-slate-400 text-sm mt-1">
              PO Ref: <span className="text-cyan-400 font-mono">{booking.purchase_order_id}</span> • Pickup on {formatDate(booking.requested_pickup_date)}
            </p>
          </div>

          <div className="flex gap-3">
            {isTransporter && booking.status !== 'BOOKING_CONFIRMED' && (
              <button
                onClick={() => navigate('/freight-quotes', { state: { bookingId: booking.booking_id || bookingKey } })}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-mono text-xs font-bold shadow-lg shadow-cyan-900/20 transition-all flex items-center gap-2"
              >
                Submit Quotation for this Booking
              </button>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-mono">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Routing & Cargo Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#0b1121] border border-slate-800 rounded-2xl p-6">
          <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">Cargo & Fleet Criteria</h3>
          <dl className="space-y-3 font-mono text-xs">
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <dt className="text-slate-500">Total Cargo Weight</dt>
              <dd className="text-white font-bold">{formatWeight(booking.total_cargo_weight_kg || booking.cargo_quantity_kg)}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <dt className="text-slate-500">Package / Crate Count</dt>
              <dd className="text-slate-200">{booking.package_count} units</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <dt className="text-slate-500">Vehicle Category</dt>
              <dd className="text-cyan-400 font-semibold">{booking.preferred_vehicle_category}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <dt className="text-slate-500">Refrigeration</dt>
              <dd className="text-slate-200">
                {booking.refrigeration_required ? (
                  <span className="text-cyan-400 font-bold">YES ({booking.temperature_min}° to {booking.temperature_max}°C)</span>
                ) : 'Ambient'}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-500">Delivery Deadline</dt>
              <dd className="text-amber-400">{formatDate(booking.required_delivery_date)}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-[#0b1121] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">Route Trajectory</h3>
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-cyan-400 block font-bold uppercase mb-1">Origin Pickup</span>
                <div className="text-white font-semibold">{booking.pickup_city}, {booking.pickup_state}</div>
                <div className="text-slate-400 text-[11px] mt-0.5">{booking.pickup_address}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-emerald-400 block font-bold uppercase mb-1">Destination Hub</span>
                <div className="text-white font-semibold">{booking.destination_city}, {booking.destination_state}</div>
                <div className="text-slate-400 text-[11px] mt-0.5">{booking.destination_address}</div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 mt-4 text-[10px] font-mono text-slate-600">
            Special Instructions: {booking.special_handling_instructions || 'Standard freight handling'}
          </div>
        </div>
      </div>

      {/* Received Transporter Quotations Table */}
      <div className="bg-[#0b1121] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Transporter Bids & Quotations
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Competitive freight quotations submitted by verified fleet carriers</p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {quotes.length} quotation{quotes.length === 1 ? '' : 's'} received
          </span>
        </div>

        {quotesLoading ? (
          <div className="p-12 text-center text-slate-500 font-mono text-xs animate-pulse">
            Querying quotations ledger...
          </div>
        ) : quotes.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-3">💬</div>
            <h3 className="text-base font-medium text-white mb-1">No Quotations Yet</h3>
            <p className="text-slate-500 text-xs max-w-sm mx-auto mb-4">
              Transporters will review this dispatch request and submit pricing bids shortly.
            </p>
            {isTransporter && (
              <button
                onClick={() => navigate('/freight-quotes', { state: { bookingId: booking.booking_id || bookingKey } })}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300"
              >
                Submit First Quotation →
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500 bg-slate-950/40">
                <th className="px-6 py-4">Quote ID</th>
                <th className="px-6 py-4">Transporter</th>
                <th className="px-6 py-4">Vehicle Category</th>
                <th className="px-6 py-4">Estimated Transit</th>
                <th className="px-6 py-4">Total Freight Charge</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {quotes.map((q) => {
                const quoteKey = q.id || q._id || q.quotation_id
                const isAccepted = q.status === 'ACCEPTED'
                return (
                  <tr key={quoteKey} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-cyan-400">{q.quotation_id || quoteKey}</td>
                    <td className="px-6 py-4 text-slate-300">{q.transporter_id}</td>
                    <td className="px-6 py-4 text-slate-400">{q.proposed_vehicle_category}</td>
                    <td className="px-6 py-4 text-amber-400">{q.estimated_transit_hours} hrs</td>
                    <td className="px-6 py-4 text-emerald-400 font-bold text-sm">
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
                    <td className="px-6 py-4 text-right">
                      {isBuyerOrFarmer && !isAccepted && booking.status !== 'BOOKING_CONFIRMED' && (
                        <button
                          onClick={() => acceptQuoteMutation.mutate(quoteKey)}
                          disabled={acceptQuoteMutation.isPending}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold transition-all disabled:opacity-50"
                        >
                          {acceptQuoteMutation.isPending ? 'Accepting...' : 'Accept & Dispatch'}
                        </button>
                      )}
                      {isAccepted && (
                        <span className="text-emerald-400 text-xs font-bold">✓ Accepted</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

