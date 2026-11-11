import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { RefreshCw, CheckCircle, AlertCircle, DollarSign, Send } from 'lucide-react'
import { freightQuotesApi, freightBookingsApi } from '../../api/commerce.api'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency, formatDate, formatDateTime, formatStatus, getApiError } from '../../utils'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Textarea } from '../../components/ui/textarea'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card'
import { StatusBadge } from '../../components/common/StatusBadge'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table'

export default function FreightQuotesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const prefillBookingId = location.state?.bookingId || ''

  // Form state
  const [form, setForm] = useState({
    booking_id: prefillBookingId,
    proposed_vehicle_category: 'REFRIGERATED_TRUCK',
    freight_base_charge_inr: '12000',
    fuel_surcharge_inr: '2500',
    planned_distance_km: '280',
    estimated_transit_hours: '6.5',
  })

  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Query all quotes
  const { data: quotesData, isLoading, refetch, isFetching } = useQuery({
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
      setFormError(getApiError(err, 'Quotation submission failed.').message)
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

    const baseInr = Number(form.freight_base_charge_inr)
    if (isNaN(baseInr) || baseInr <= 0) {
      setFormError('Base freight charge must be a positive amount.')
      return
    }

    const fuelInr = form.fuel_surcharge_inr ? Number(form.fuel_surcharge_inr) : 0
    if (isNaN(fuelInr)) {
      setFormError('Additional charges must be valid numeric amounts.')
      return
    }

    const distanceKm = Number(form.planned_distance_km)
    if (isNaN(distanceKm) || distanceKm <= 0) {
      setFormError('Planned distance must be a positive number.')
      return
    }

    const transitHours = Number(form.estimated_transit_hours)
    if (isNaN(transitHours) || transitHours <= 0) {
      setFormError('Estimated transit hours must be a positive number.')
      return
    }

    const payload = {
      booking_id: form.booking_id.trim(),
      proposed_vehicle_category: form.proposed_vehicle_category,
      freight_base_charge_paise: Math.round(baseInr * 100),
      fuel_surcharge_paise: Math.round(fuelInr * 100),
      planned_distance_km: distanceKm,
      estimated_transit_hours: transitHours,
    }

    submitQuoteMutation.mutate(payload)
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <PageHeader
        eyebrow="Fleet Commercial Exchange"
        title="Freight Quotations"
        description="Submit pricing proposals for agricultural haulage, manage fuel surcharges, and review awarded bids."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2 bg-white/80 border-[#E1DDD0] hover:bg-[#F2EFE7] text-[#26312A]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Quotation Submission Form */}
        <Card className="lg:col-span-1 bg-white/95 border-[#E1DDD0] shadow-sm h-fit">
          <CardHeader className="border-b border-[#ECE7DA] pb-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#3F7C56]" />
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#3F7C56]">
                Carrier Bid
              </span>
            </div>
            <CardTitle className="text-xl font-serif font-bold text-[#1B2A20]">
              Submit Freight Quotation
            </CardTitle>
            <CardDescription className="text-xs text-[#526357]">
              Provide transit metrics and pricing breakdown in INR.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-5">
            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-mono flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{formError}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono flex items-start gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[#526357] uppercase font-semibold">Booking ID *</label>
                <Select
                  name="booking_id"
                  required
                  value={form.booking_id}
                  onChange={handleChange}
                  className="bg-white border-[#E1DDD0] text-xs font-mono focus-visible:ring-[#244634]"
                >
                  <option value="">Select dispatch booking...</option>
                  {bookings.map(b => (
                    <option key={b.booking_id || b.id} value={b.booking_id || b.id}>
                      {b.booking_id || b.id} — {b.pickup_city} to {b.destination_city}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[#526357] uppercase font-semibold">Vehicle Category *</label>
                <Select
                  name="proposed_vehicle_category"
                  value={form.proposed_vehicle_category}
                  onChange={handleChange}
                  className="bg-white border-[#E1DDD0] text-xs font-mono focus-visible:ring-[#244634]"
                >
                  <option value="REFRIGERATED_TRUCK">Refrigerated Truck (14ft)</option>
                  <option value="REEFER_20FT">Refrigerated Truck (20ft)</option>
                  <option value="REEFER_32FT">Refrigerated Trailer (32ft)</option>
                  <option value="OPEN_TRUCK">Open Tarpaulin Truck</option>
                  <option value="CLOSED_CONTAINER">Closed Container</option>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-[#526357] uppercase font-semibold">Base Freight (₹) *</label>
                  <Input
                    type="number"
                    required
                    name="freight_base_charge_inr"
                    value={form.freight_base_charge_inr}
                    onChange={handleChange}
                    className="bg-white border-[#E1DDD0] text-xs font-mono focus-visible:ring-[#244634]"
                  />
                </div>

              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-[#526357] uppercase font-semibold">Fuel Surcharge (₹)</label>
                  <Input
                    type="number"
                    name="fuel_surcharge_inr"
                    value={form.fuel_surcharge_inr}
                    onChange={handleChange}
                    className="bg-white border-[#E1DDD0] text-xs font-mono focus-visible:ring-[#244634]"
                  />
                </div>

              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-[#526357] uppercase font-semibold">Distance (KM) *</label>
                  <Input
                    type="number"
                    required
                    name="planned_distance_km"
                    value={form.planned_distance_km}
                    onChange={handleChange}
                    className="bg-white border-[#E1DDD0] text-xs font-mono focus-visible:ring-[#244634]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-[#526357] uppercase font-semibold">Transit Hours *</label>
                  <Input
                    type="number"
                    step="0.5"
                    required
                    name="estimated_transit_hours"
                    value={form.estimated_transit_hours}
                    onChange={handleChange}
                    className="bg-white border-[#E1DDD0] text-xs font-mono focus-visible:ring-[#244634]"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={submitQuoteMutation.isPending}
                className="w-full bg-[#244634] hover:bg-[#1A3326] text-white shadow-sm mt-3"
              >
                {submitQuoteMutation.isPending ? 'Publishing Quotation...' : 'Transmit Quotation Bid'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right Column: Quotes List */}
        <Card className="lg:col-span-2 bg-white/95 border-[#E1DDD0] overflow-hidden shadow-sm h-fit">
          <div className="p-6 border-b border-[#ECE7DA] bg-[#F2EFE7]/40">
            <h2 className="text-base font-serif font-bold text-[#1B2A20] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#244634]" />
              Exchange Quotations Ledger
            </h2>
            <p className="text-xs text-[#526357] mt-0.5">Live bids submitted across active logistics bookings</p>
          </div>

          {isLoading ? (
            <div className="p-16 text-center text-[#526357] font-mono text-xs animate-pulse">
              Querying quotation exchange...
            </div>
          ) : quotes.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 rounded-full bg-[#F2EFE7] text-[#7A887E] flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-[#1B2A20] mb-1">No Quotations on Record</h3>
              <p className="text-xs text-[#526357]">Use the submission form to post a carrier bid.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-[#F2EFE7]/60">
                <TableRow className="border-[#ECE7DA]">
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E] py-3.5">Quote ID</TableHead>
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Booking Ref</TableHead>
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Vehicle Category</TableHead>
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Distance & Transit</TableHead>
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Total Amount</TableHead>
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#ECE7DA] font-mono text-xs">
                {quotes.map((q) => {
                  const quoteKey = q.id || q._id || q.quotation_id
                  return (
                    <TableRow key={quoteKey} className="hover:bg-[#F2EFE7]/40 transition-colors border-[#ECE7DA]">
                      <TableCell className="font-bold text-[#244634] py-4">{q.quotation_id || quoteKey}</TableCell>
                      <TableCell className="text-[#26312A] cursor-pointer hover:underline font-semibold" onClick={() => navigate(`/freight-bookings/${q.booking_id}`)}>
                        {q.booking_id}
                      </TableCell>
                      <TableCell className="text-[#526357]">{q.proposed_vehicle_category}</TableCell>
                      <TableCell className="text-[#26312A]">
                        {q.planned_distance_km} km • <span className="text-[#B36B21]">{q.estimated_transit_hours} hrs</span>
                      </TableCell>
                      <TableCell className="text-[#244634] font-bold">
                        {formatCurrency(q.total_freight_charge_paise || q.freight_base_charge_paise)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={q.status || 'PENDING'} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  )
}
