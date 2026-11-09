import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Truck, AlertTriangle, UserCheck, ShieldAlert, CheckCircle2, MapPin } from 'lucide-react'
import { shipmentsApi, freightBookingsApi, fleetApi, driversApi } from '../../api/commerce.api'
import { useAuth } from '../../context/AuthContext'
import { ROLES, normalizeRole } from '../../constants/roles'
import { formatWeight } from '../../utils'

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
        planned_checkpoints: [],
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

  // RBAC guard check
  if (userRole !== ROLES.TRANSPORTER) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="p-8 rounded-2xl bg-slate-900 border border-red-500/30">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white">Transporter Authorization Required</h2>
          <p className="text-xs text-slate-400 mt-2 mb-6">
            Under AgriChain RBAC policy, shipment dispatching is restricted to registered carriers with vehicle and driver assets.
          </p>
          <button
            onClick={() => navigate('/shipments')}
            className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700"
          >
            Return to Shipments
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-8 py-10 animate-fade-in-up">
      <button
        onClick={() => navigate('/shipments')}
        className="text-xs font-mono text-cyan-400 hover:text-cyan-300 mb-6 flex items-center gap-2 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        SHIPMENTS_CONSIGNMENTS
      </button>

      <div className="bg-[#0b1121] border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="mb-8">
          <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 mb-1 block">
            Consignment Dispatch
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight">Initialize Shipment Consignment</h1>
          <p className="text-slate-400 text-sm mt-1">
            Bind an approved freight booking with transport vehicle and driver assets for cold-chain haulage.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Booking Selector */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
              Confirmed Freight Booking *
            </label>
            <select
              required
              name="booking_id"
              value={form.booking_id}
              onChange={(e) => handleBookingSelect(e.target.value)}
              className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
            >
              <option value="">Select confirmed freight booking...</option>
              {bookings.map(b => (
                <option key={b.id || b._id} value={b.id || b._id}>
                  {b.booking_id} — {b.pickup_city} to {b.destination_city} ({b.total_cargo_weight_kg} kg)
                </option>
              ))}
            </select>
          </div>

          {/* Selected booking preview banner */}
          {selectedBookingDetails && (
            <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 text-xs font-mono text-slate-300 space-y-2">
              <div className="flex justify-between font-bold text-cyan-300">
                <span>Route: {selectedBookingDetails.pickup_city} → {selectedBookingDetails.destination_city}</span>
                <span>{formatWeight(selectedBookingDetails.total_cargo_weight_kg)}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Pickup: {selectedBookingDetails.pickup_address}</span>
                <span>Destination: {selectedBookingDetails.destination_address}</span>
              </div>
              <div className="text-[11px] text-emerald-400">
                Linked Accepted Quote: {selectedBookingDetails.accepted_quotation_id}
              </div>
            </div>
          )}

          {/* Vehicle and Driver selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Assigned Haulage Vehicle *
              </label>
              <select
                required
                name="vehicle_id"
                value={form.vehicle_id}
                onChange={handleChange}
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
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
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Assigned Commercial Driver *
              </label>
              <select
                required
                name="driver_id"
                value={form.driver_id}
                onChange={handleChange}
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              >
                <option value="">Select available driver...</option>
                {drivers.map(d => (
                  <option key={d.id || d._id} value={d.id || d._id} disabled={d.status !== 'AVAILABLE'}>
                    {d.full_name || d.name} (Lic: {d.license_number}) — {d.status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 leading-relaxed">
            <span className="text-slate-300 font-semibold">State Machine Progression:</span> Shipment creation transitions status directly to <span className="text-cyan-400 font-mono font-bold">DRIVER_ASSIGNED</span>. Vehicle and driver status will be locked to <span className="text-amber-400 font-mono font-bold">ASSIGNED</span> until delivery finalization.
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/shipments')}
              className="px-6 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium text-sm transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
            >
              {loading ? 'Initializing Consignment...' : 'Confirm Shipment Dispatch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
