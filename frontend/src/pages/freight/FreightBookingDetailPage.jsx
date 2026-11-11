import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Truck, AlertCircle, FileText, CheckCircle, Navigation } from 'lucide-react'
import { freightBookingsApi, freightQuotesApi } from '../../api/commerce.api'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency, formatWeight, formatDate, formatDateTime, getStatusColor, formatStatus } from '../../utils'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'
import { StatusBadge } from '../../components/common/StatusBadge'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table'

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
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-3 border-[#244634]/20 border-t-[#244634] rounded-full animate-spin" />
        <span className="text-xs font-mono text-[#526357] animate-pulse">Reading freight dispatch telemetry...</span>
      </div>
    )
  }

  if (bookingError || !booking) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-[#1B2A20] mb-2">Freight Booking Not Found</h2>
        <p className="text-sm text-[#526357] mb-6">Could not retrieve booking record for ID: {id}</p>
        <Button
          variant="primary"
          onClick={() => navigate('/freight-bookings')}
          className="bg-[#244634] hover:bg-[#1A3326] text-white"
        >
          Return to Bookings
        </Button>
      </div>
    )
  }

  const bookingKey = booking.id || booking._id || booking.booking_id
  const isTransporter = user?.role === 'transporter' || user?.role === 'admin'
  const isBuyerOrFarmer = user?.role === 'buyer' || user?.role === 'farmer' || user?.role === 'admin'

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in-up">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/freight-bookings')}
        className="gap-2 text-xs font-mono text-[#526357] hover:text-[#26312A] -ml-2"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        BOOKINGS_DISPATCH
      </Button>

      {/* Header Deck */}
      <Card className="bg-white/95 border-[#E1DDD0] shadow-sm">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="warning" size="sm" className="font-mono uppercase tracking-widest text-[10px]">
                  DISPATCH REQUEST
                </Badge>
                <StatusBadge status={booking.status} />
              </div>
              <h1 className="text-3xl font-mono font-bold text-[#1B2A20] tracking-tight">{booking.booking_id || bookingKey}</h1>
              <p className="text-[#526357] text-sm mt-1.5">
                PO Ref: <span className="text-[#244634] font-mono font-semibold">{booking.purchase_order_id}</span> • Pickup on {formatDate(booking.requested_pickup_date)}
              </p>
            </div>

            <div className="flex gap-3">
              {isTransporter && booking.status !== 'CONFIRMED' && (
                <Button
                  variant="primary"
                  onClick={() => navigate('/freight-quotes', { state: { bookingId: booking.booking_id || bookingKey } })}
                  className="gap-2 bg-[#244634] hover:bg-[#1A3326] text-white shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  <span>Submit Quotation for this Booking</span>
                </Button>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-mono">
              {errorMsg}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Routing & Cargo Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white/90 border-[#E1DDD0]">
          <CardContent className="p-6">
            <h3 className="text-xs font-mono text-[#526357] uppercase tracking-widest font-semibold mb-4">
              Cargo & Fleet Criteria
            </h3>
            <dl className="space-y-3 font-mono text-xs">
              <div className="flex justify-between py-2 border-b border-[#ECE7DA]">
                <dt className="text-[#7A887E]">Total Cargo Weight</dt>
                <dd className="text-[#1B2A20] font-bold">{formatWeight(booking.cargo_quantity_kg)}</dd>
              </div>
              <div className="flex justify-between py-2 border-b border-[#ECE7DA]">
                <dt className="text-[#7A887E]">Package / Crate Count</dt>
                <dd className="text-[#26312A]">{booking.package_count} units</dd>
              </div>
              <div className="flex justify-between py-2 border-b border-[#ECE7DA]">
                <dt className="text-[#7A887E]">Vehicle Category</dt>
                <dd className="text-[#244634] font-semibold">{booking.preferred_vehicle_category}</dd>
              </div>
              <div className="flex justify-between py-2 border-b border-[#ECE7DA]">
                <dt className="text-[#7A887E]">Refrigeration</dt>
                <dd className="text-[#26312A]">
                  {booking.refrigeration_required ? (
                    <span className="text-[#244634] font-bold">YES ({booking.temperature_min}° to {booking.temperature_max}°C)</span>
                  ) : 'Ambient'}
                </dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-[#7A887E]">Delivery Deadline</dt>
                <dd className="text-[#B36B21] font-semibold">{formatDate(booking.required_delivery_date)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="bg-white/90 border-[#E1DDD0] flex flex-col justify-between">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-xs font-mono text-[#526357] uppercase tracking-widest font-semibold mb-4">
                Route Trajectory
              </h3>
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3.5 rounded-xl bg-[#F2EFE7]/60 border border-[#ECE7DA]">
                  <span className="text-[10px] text-[#244634] block font-bold uppercase mb-1">Origin Pickup</span>
                  <div className="text-[#1B2A20] font-semibold font-sans">{booking.pickup_city}, {booking.pickup_state}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F2EFE7]/60 border border-[#ECE7DA]">
                  <span className="text-[10px] text-[#3F7C56] block font-bold uppercase mb-1">Destination Hub</span>
                  <div className="text-[#1B2A20] font-semibold font-sans">{booking.destination_city}, {booking.destination_state}</div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#ECE7DA] mt-4 text-[11px] font-mono text-[#526357]">
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Received Transporter Quotations Table */}
      <Card className="bg-white/95 border-[#E1DDD0] overflow-hidden">
        <div className="p-6 border-b border-[#ECE7DA] flex justify-between items-center bg-[#F2EFE7]/40">
          <div>
            <h2 className="text-base font-serif font-bold text-[#1B2A20] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#3F7C56]" />
              Transporter Bids & Quotations
            </h2>
            <p className="text-xs text-[#526357] mt-0.5">Competitive freight quotations submitted by verified fleet carriers</p>
          </div>
          <span className="text-xs font-mono text-[#526357]">
            {quotes.length} quotation{quotes.length === 1 ? '' : 's'} received
          </span>
        </div>

        {quotesLoading ? (
          <div className="p-12 text-center text-[#526357] font-mono text-xs animate-pulse">
            Querying quotations ledger...
          </div>
        ) : quotes.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-full bg-[#F2EFE7] text-[#7A887E] flex items-center justify-center mx-auto mb-3">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-[#1B2A20] mb-1">No Quotations Yet</h3>
            <p className="text-xs text-[#526357] max-w-sm mx-auto mb-4">
              Transporters will review this dispatch request and submit pricing bids shortly.
            </p>
            {isTransporter && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/freight-quotes', { state: { bookingId: booking.booking_id || bookingKey } })}
                className="text-xs font-mono text-[#244634] border-[#C3D4C7] hover:bg-[#E8EFE9]"
              >
                Submit First Quotation →
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-[#F2EFE7]/60">
              <TableRow className="border-[#ECE7DA]">
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E] py-3.5">Quote ID</TableHead>
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Transporter</TableHead>
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Vehicle Category</TableHead>
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Estimated Transit</TableHead>
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Total Freight Charge</TableHead>
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Status</TableHead>
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#ECE7DA] font-mono text-xs">
              {quotes.map((q) => {
                const quoteKey = q.id || q._id || q.quotation_id
                const isAccepted = q.status === 'ACCEPTED'
                return (
                  <TableRow key={quoteKey} className="hover:bg-[#F2EFE7]/40 transition-colors border-[#ECE7DA]">
                    <TableCell className="font-bold text-[#244634] py-4">{q.quotation_id || quoteKey}</TableCell>
                    <TableCell className="text-[#26312A]">{q.transporter_id}</TableCell>
                    <TableCell className="text-[#526357]">{q.proposed_vehicle_category}</TableCell>
                    <TableCell className="text-[#B36B21]">{q.estimated_transit_hours} hrs</TableCell>
                    <TableCell className="text-[#244634] font-bold text-sm">
                      {formatCurrency(q.total_freight_charge_paise || q.freight_base_charge_paise)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={q.status || 'PENDING'} />
                    </TableCell>
                    <TableCell className="text-right">
                      {isBuyerOrFarmer && !isAccepted && booking.status !== 'CONFIRMED' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => acceptQuoteMutation.mutate(quoteKey)}
                          disabled={acceptQuoteMutation.isPending}
                          className="bg-[#244634] hover:bg-[#1A3326] text-white text-[11px] h-7"
                        >
                          {acceptQuoteMutation.isPending ? 'Accepting...' : 'Accept & Dispatch'}
                        </Button>
                      )}
                      {isAccepted && (
                        <span className="text-[#3F7C56] text-xs font-bold flex items-center justify-end gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Accepted
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
