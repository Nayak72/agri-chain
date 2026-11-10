import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Truck, AlertTriangle, Layers, Calendar, Thermometer, ShieldCheck } from 'lucide-react'
import { freightBookingsApi, ordersApi } from '../../api/commerce.api'
import { batchesApi } from '../../api/agriculture.api'
import { formatApiErrorMessage } from '../../utils'

export default function FreightBookingCreatePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Prefill if navigated from Purchase Order
  const poState = location.state || {}

  // Fetch accepted purchase orders
  const { data: poData } = useQuery({
    queryKey: ['accepted-purchase-orders'],
    queryFn: () => ordersApi.list({ status: 'ACCEPTED' }).then(res => res.data),
  })
  const acceptedOrders = Array.isArray(poData) ? poData : poData?.items || []

  // Fetch batches
  const { data: batchesData } = useQuery({
    queryKey: ['batches-for-booking'],
    queryFn: () => batchesApi.list().then(res => res.data),
  })
  const batches = Array.isArray(batchesData) ? batchesData : batchesData?.items || []

  const [form, setForm] = useState({
    purchase_order_id: poState.purchaseOrderId || '',
    batch_ids: poState.batchId ? [poState.batchId] : [],
    cargo_quantity_kg: poState.cargoWeightKg ? String(poState.cargoWeightKg) : '',
    total_cargo_weight_kg: poState.cargoWeightKg ? String(poState.cargoWeightKg) : '',
    package_count: '100',
    pickup_address: poState.pickupAddress || '',
    pickup_city: 'Nashik',
    pickup_state: 'Maharashtra',
    destination_address: poState.deliveryAddress || '',
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

  // Handle PO selection
  const handlePoSelect = (poId) => {
    if (!poId) {
      setForm(prev => ({ ...prev, purchase_order_id: '' }))
      return
    }
    const selectedPo = acceptedOrders.find(po => (po.id || po._id) === poId || po.order_id === poId)
    if (selectedPo) {
      const canonicalPoId = selectedPo.id || selectedPo._id
      const linkedBatchIds = selectedPo.batch_id ? [selectedPo.batch_id] : (batches[0] ? [batches[0].id || batches[0]._id] : [])
      setForm(prev => ({
        ...prev,
        purchase_order_id: canonicalPoId,
        batch_ids: linkedBatchIds,
        cargo_quantity_kg: String(selectedPo.requested_quantity_kg || prev.cargo_quantity_kg || 2000),
        total_cargo_weight_kg: String(selectedPo.requested_quantity_kg || prev.total_cargo_weight_kg || 2000),
        pickup_address: selectedPo.pickup_address || prev.pickup_address,
        destination_address: selectedPo.delivery_address || prev.destination_address,
      }))
    }
  }

  // Pre-select if initial PO state is provided
  useEffect(() => {
    if (poState.purchaseOrderId && acceptedOrders.length > 0) {
      handlePoSelect(poState.purchaseOrderId)
    }
  }, [poState.purchaseOrderId, acceptedOrders])

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [e.target.name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.purchase_order_id) {
      setError('Please select an accepted Purchase Order to book freight against.')
      return
    }

    if (!form.batch_ids || form.batch_ids.length === 0) {
      setError('Please assign at least one produce batch for custodial tracking.')
      return
    }

    const cargoQty = parseFloat(form.cargo_quantity_kg)
    if (isNaN(cargoQty) || cargoQty <= 0) {
      setError('Cargo quantity must be a positive number.')
      return
    }

    const totalWeight = parseFloat(form.total_cargo_weight_kg)
    if (isNaN(totalWeight) || totalWeight <= 0) {
      setError('Total cargo weight must be a positive number.')
      return
    }

    const pkgCount = parseInt(form.package_count, 10)
    if (isNaN(pkgCount) || pkgCount <= 0) {
      setError('Package count must be at least 1.')
      return
    }

    let tempMin = null
    let tempMax = null
    if (form.refrigeration_required) {
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
        purchase_order_id: form.purchase_order_id.trim(),
        batch_ids: Array.isArray(form.batch_ids) ? form.batch_ids : [form.batch_ids],
        cargo_quantity_kg: cargoQty,
        total_cargo_weight_kg: totalWeight,
        package_count: pkgCount,
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
        temperature_min: tempMin,
        temperature_max: tempMax,
        packaging_details: form.packaging_details ? form.packaging_details.trim() : null,
        special_handling_instructions: form.special_handling_instructions ? form.special_handling_instructions.trim() : null,
      }

      const res = await freightBookingsApi.create(payload)
      const newKey = res.data.id || res.data._id || res.data.booking_id
      navigate(`/freight-bookings/${newKey}`)
    } catch (err) {
      console.error('Freight booking creation error:', err)
      setError(formatApiErrorMessage(err, 'Failed to create freight booking.'))
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
        <ArrowLeft className="w-3.5 h-3.5" />
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
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Select Accepted Purchase Order *
              </label>
              <select
                required
                value={form.purchase_order_id}
                onChange={(e) => handlePoSelect(e.target.value)}
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              >
                <option value="">Select accepted order...</option>
                {acceptedOrders.map(po => (
                  <option key={po.id || po._id} value={po.id || po._id}>
                    {po.order_id} — {po.produce_type} ({po.requested_quantity_kg} kg)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Assigned Produce Batch *
              </label>
              <select
                required
                value={form.batch_ids[0] || ''}
                onChange={(e) => setForm({ ...form, batch_ids: [e.target.value] })}
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              >
                <option value="">Select produce batch...</option>
                {batches.map(b => (
                  <option key={b.id || b._id} value={b.id || b._id}>
                    {b.batch_id} — {b.produce_type} ({b.harvest_location || 'Field Origin'})
                  </option>
                ))}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Required Delivery Date *
              </label>
              <input
                type="date"
                required
                name="required_delivery_date"
                value={form.required_delivery_date}
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

          {/* Cold Chain Specs */}
          <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
                  Refrigerated Cargo Requirements
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="refrigeration_required"
                  checked={form.refrigeration_required}
                  onChange={handleChange}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span className="text-xs font-mono text-slate-300">Active Reefer Mandatory</span>
              </label>
            </div>

            {form.refrigeration_required && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Min Temperature (°C)</label>
                  <input
                    type="number"
                    step="0.5"
                    name="temperature_min"
                    value={form.temperature_min}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Max Temperature (°C)</label>
                  <input
                    type="number"
                    step="0.5"
                    name="temperature_max"
                    value={form.temperature_max}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
              Handling & Stacking Instructions
            </label>
            <textarea
              name="special_handling_instructions"
              rows={2}
              value={form.special_handling_instructions}
              onChange={handleChange}
              placeholder="e.g. Palletized crates only. Avoid direct midday sun during transshipment."
              className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono resize-none"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/freight-bookings')}
              className="px-6 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium text-sm transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Post Freight Booking Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
