import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Truck, AlertTriangle, ShieldAlert, CheckCircle2, MapPin, User, ShieldCheck } from 'lucide-react'
import { shipmentsApi, freightBookingsApi, fleetApi, driversApi } from '../../api/commerce.api'
import { useAuth } from '../../context/AuthContext'
import { ROLES, normalizeRole } from '../../constants/roles'
import { formatWeight, formatApiErrorMessage } from '../../utils'
import PageHeader from '../../components/common/PageHeader'

export default function ShipmentCreatePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const userRole = normalizeRole(user?.role)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Prefill booking from navigation state if available
  const initialBookingId = location.state?.bookingId || ''

  // Query confirmed freight bookings for this transporter
  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['confirmed-freight-bookings'],
    queryFn: () => freightBookingsApi.list({ status: 'CONFIRMED' }).then(res => res.data),
  })

  // Query fleet vehicles
  const { data: vehiclesData, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['fleet-vehicles-available'],
    queryFn: () => fleetApi.listVehicles().then(res => res.data),
  })

  // Query drivers
  const { data: driversData, isLoading: driversLoading } = useQuery({
    queryKey: ['drivers-available'],
    queryFn: () => driversApi.list().then(res => res.data),
  })

  const bookings = Array.isArray(bookingsData) ? bookingsData : bookingsData?.items || []
  const vehicles = Array.isArray(vehiclesData) ? vehiclesData : vehiclesData?.items || []
  const drivers = Array.isArray(driversData) ? driversData : driversData?.items || []

  // Available filters
  const availableVehicles = vehicles.filter(v => v.status === 'AVAILABLE')
  const availableDrivers = drivers.filter(d => d.status === 'AVAILABLE')

  const [form, setForm] = useState({
    booking_id: '',
    accepted_quotation_id: '',
    vehicle_id: '',
    driver_id: '',
  })

  const [selectedBookingDetails, setSelectedBookingDetails] = useState(null)

  const handleBookingSelect = (bId) => {
    if (!bId) {
      setForm(prev => ({ ...prev, booking_id: '', accepted_quotation_id: '' }))
      setSelectedBookingDetails(null)
      return
    }
    const b = bookings.find(item => (item.id || item._id) === bId || item.booking_id === bId)
    if (b) {
      const canonicalBookingId = b.id || b._id
      setForm(prev => ({
        ...prev,
        booking_id: canonicalBookingId,
        accepted_quotation_id: b.accepted_quotation_id || '',
      }))
      setSelectedBookingDetails(b)
    }
  }

  useEffect(() => {
    if (initialBookingId && bookings.length > 0) {
      handleBookingSelect(initialBookingId)
    }
  }, [initialBookingId, bookings])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (userRole !== ROLES.TRANSPORTER) {
      setError('Access Denied: Only certified transporters can initialize shipment consignments.')
      return
    }

    if (!form.booking_id) {
      setError('Please select a confirmed freight booking.')
      return
    }

    if (!form.accepted_quotation_id) {
      setError('Selected booking does not have a linked accepted quotation.')
      return
    }

    if (!form.vehicle_id) {
      setError('Please select an available haulage vehicle.')
      return
    }

    if (!form.driver_id) {
      setError('Please assign an available commercial driver.')
      return
    }

    setLoading(true)

    try {
      const payload = {
        booking_id: form.booking_id.trim(),
        accepted_quotation_id: form.accepted_quotation_id.trim(),
        vehicle_id: form.vehicle_id.trim(),
        driver_id: form.driver_id.trim(),
      }

      const res = await shipmentsApi.create(payload)
      const newId = res.data.id || res.data._id
      navigate(`/shipments/${newId}`)
    } catch (err) {
      console.error('Shipment creation error:', err)
      setError(formatApiErrorMessage(err, 'Failed to initialize shipment.'))
    } finally {
      setLoading(false)
    }
  }

  // RBAC guard check
  if (userRole !== ROLES.TRANSPORTER) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="p-8 rounded-2xl bg-white border border-rose-200 shadow-sm">
          <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-stone-900">Transporter Authorization Required</h2>
          <p className="text-xs text-stone-500 mt-2 mb-6 leading-relaxed">
            Under AgriChain RBAC policy, shipment dispatching is restricted to registered carriers with vehicle and driver assets.
          </p>
          <button
            onClick={() => navigate('/shipments')}
            className="px-4 py-2 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-colors"
          >
            Return to Shipments
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Shipments', href: '/shipments' },
          { label: 'Initialize Consignment' }
        ]}
        title="Initialize Shipment Consignment"
        description="Bind an approved freight booking with transport vehicle and driver assets for cold-chain haulage."
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
            <Truck className="w-3.5 h-3.5 text-amber-600" />
            Consignment Dispatch
          </span>
        }
      />

      <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Booking Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-mono font-semibold text-stone-600 uppercase tracking-wider">
              Confirmed Freight Booking <span className="text-rose-500">*</span>
            </label>
            <select
              required
              name="booking_id"
              value={form.booking_id}
              onChange={(e) => handleBookingSelect(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2.5 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634] font-mono transition-colors"
            >
              <option value="">Select confirmed freight booking...</option>
              {bookings.map(b => (
                <option key={b.id || b._id} value={b.id || b._id}>
                  {b.booking_id} — {b.pickup_city} to {b.destination_city} ({b.cargo_quantity_kg} kg)
                </option>
              ))}
            </select>
          </div>

          {/* Selected booking preview banner */}
          {selectedBookingDetails && (
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs font-mono text-stone-700 space-y-2">
              <div className="flex justify-between font-bold text-[#244634]">
                <span>Route: {selectedBookingDetails.pickup_city} → {selectedBookingDetails.destination_city}</span>
                <span>{formatWeight(selectedBookingDetails.cargo_quantity_kg)}</span>
              </div>
              <div className="flex justify-between text-stone-600 text-[11px] font-sans">
                <span>Pickup: {selectedBookingDetails.pickup_city}</span>
                <span>Destination: {selectedBookingDetails.destination_city}</span>
              </div>
              <div className="text-[11px] text-emerald-800 font-semibold font-mono">
                Linked Accepted Quote: {selectedBookingDetails.accepted_quotation_id}
              </div>
            </div>
          )}

          {/* Vehicle and Driver selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-mono font-semibold text-stone-600 uppercase tracking-wider">
                Assigned Haulage Vehicle <span className="text-rose-500">*</span>
              </label>
              <select
                required
                name="vehicle_id"
                value={form.vehicle_id}
                onChange={handleChange}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2.5 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634] font-mono transition-colors"
              >
                <option value="">Select available vehicle...</option>
                {vehicles.map(v => (
                  <option key={v.id || v._id} value={v.id || v._id} disabled={v.status !== 'AVAILABLE'}>
                    {v.license_plate} ({v.vehicle_category}) — {v.status}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono font-semibold text-stone-600 uppercase tracking-wider">
                Assigned Commercial Driver <span className="text-rose-500">*</span>
              </label>
              <select
                required
                name="driver_id"
                value={form.driver_id}
                onChange={handleChange}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2.5 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634] font-mono transition-colors"
              >
                <option value="">Select available driver...</option>
                {drivers.map(d => (
                  <option key={d.id || d._id} value={d.id || d._id} disabled={d.status !== 'AVAILABLE'}>
                    {d.full_name || d.name} — {d.status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600 leading-relaxed font-sans">
            <span className="text-stone-900 font-semibold">State Machine Progression:</span> Shipment creation transitions status directly to <span className="text-[#244634] font-mono font-bold">DRIVER_ASSIGNED</span>. Vehicle and driver status will be locked to <span className="text-amber-700 font-mono font-bold">ASSIGNED</span> until delivery finalization.
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-100">
            <button
              type="button"
              onClick={() => navigate('/shipments')}
              className="px-5 py-2.5 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 font-medium text-sm transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-[#244634] hover:bg-[#1b3527] text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50"
            >
              {loading ? 'Initializing Consignment...' : 'Confirm Shipment Dispatch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
