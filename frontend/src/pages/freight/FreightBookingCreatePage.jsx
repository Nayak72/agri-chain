import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, AlertCircle, Truck, ThermometerSnowflake } from 'lucide-react'
import { freightBookingsApi, ordersApi } from '../../api/commerce.api'
import { batchesApi } from '../../api/agriculture.api'
import { formatApiErrorMessage } from '../../utils'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Textarea } from '../../components/ui/textarea'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card'

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
    <div className="max-w-4xl mx-auto py-4 space-y-6 animate-fade-in-up">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/freight-bookings')}
        className="gap-2 text-xs font-mono text-[#526357] hover:text-[#26312A] -ml-2"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        BOOKINGS_DISPATCH
      </Button>

      <Card className="bg-white/95 border-[#E1DDD0] shadow-sm">
        <CardHeader className="border-b border-[#ECE7DA] pb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#B36B21]" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#B36B21]">
              Dispatch Request
            </span>
          </div>
          <CardTitle className="text-2xl font-serif font-bold text-[#1B2A20]">
            Request Freight Transportation
          </CardTitle>
          <CardDescription className="text-xs text-[#526357]">
            Publish agricultural freight cargo specifications to the transporter quotation exchange.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Select Accepted Purchase Order *
                </label>
                <Select
                  required
                  value={form.purchase_order_id}
                  onChange={(e) => handlePoSelect(e.target.value)}
                  className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
                >
                  <option value="">Select accepted order...</option>
                  {acceptedOrders.map(po => (
                    <option key={po.id || po._id} value={po.id || po._id}>
                      {po.order_id} — {po.produce_type} ({po.requested_quantity_kg} kg)
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Assigned Produce Batch *
                </label>
                <Select
                  required
                  value={form.batch_ids[0] || ''}
                  onChange={(e) => setForm({ ...form, batch_ids: [e.target.value] })}
                  className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
                >
                  <option value="">Select produce batch...</option>
                  {batches.map(b => (
                    <option key={b.id || b._id} value={b.id || b._id}>
                      {b.batch_id} — {b.produce_type} ({b.harvest_location || 'Field Origin'})
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Cargo Weight (KG) *
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  name="total_cargo_weight_kg"
                  value={form.total_cargo_weight_kg}
                  onChange={(e) => setForm({ ...form, total_cargo_weight_kg: e.target.value, cargo_quantity_kg: e.target.value })}
                  className="bg-white border-[#E1DDD0] font-mono focus-visible:ring-[#244634]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Package / Crate Count *
                </label>
                <Input
                  type="number"
                  min="1"
                  required
                  name="package_count"
                  value={form.package_count}
                  onChange={handleChange}
                  className="bg-white border-[#E1DDD0] font-mono focus-visible:ring-[#244634]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Preferred Vehicle Category *
                </label>
                <Select
                  name="preferred_vehicle_category"
                  value={form.preferred_vehicle_category}
                  onChange={handleChange}
                  className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
                >
                  <option value="REEFER_14FT">Refrigerated Truck (14ft / 3.5 Ton)</option>
                  <option value="REEFER_20FT">Refrigerated Truck (20ft / 7 Ton)</option>
                  <option value="REEFER_32FT">Refrigerated Trailer (32ft / 15 Ton)</option>
                  <option value="OPEN_TRUCK">Open Tarpaulin Truck (General Cargo)</option>
                  <option value="CLOSED_CONTAINER">Closed Metal Container</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Pickup Date *
                </label>
                <Input
                  type="date"
                  required
                  name="requested_pickup_date"
                  value={form.requested_pickup_date}
                  onChange={handleChange}
                  className="bg-white border-[#E1DDD0] font-mono focus-visible:ring-[#244634]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Required Delivery Date *
                </label>
                <Input
                  type="date"
                  required
                  name="required_delivery_date"
                  value={form.required_delivery_date}
                  onChange={handleChange}
                  className="bg-white border-[#E1DDD0] font-mono focus-visible:ring-[#244634]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-2xl bg-[#F2EFE7]/50 border border-[#ECE7DA]">
              {/* Pickup */}
              <div className="space-y-2.5">
                <div className="text-xs font-mono font-bold text-[#244634] uppercase flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#244634]"></span>
                  Pickup Node Origin
                </div>
                <Input
                  type="text"
                  placeholder="Street Address"
                  name="pickup_address"
                  required
                  value={form.pickup_address}
                  onChange={handleChange}
                  className="bg-white border-[#E1DDD0] text-xs font-sans focus-visible:ring-[#244634]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="text"
                    placeholder="City (e.g. Nashik)"
                    name="pickup_city"
                    required
                    value={form.pickup_city}
                    onChange={handleChange}
                    className="bg-white border-[#E1DDD0] text-xs font-sans focus-visible:ring-[#244634]"
                  />
                  <Input
                    type="text"
                    placeholder="State (e.g. Maharashtra)"
                    name="pickup_state"
                    required
                    value={form.pickup_state}
                    onChange={handleChange}
                    className="bg-white border-[#E1DDD0] text-xs font-sans focus-visible:ring-[#244634]"
                  />
                </div>
              </div>

              {/* Destination */}
              <div className="space-y-2.5">
                <div className="text-xs font-mono font-bold text-[#3F7C56] uppercase flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#3F7C56]"></span>
                  Destination Delivery Hub
                </div>
                <Input
                  type="text"
                  placeholder="Street Address"
                  name="destination_address"
                  required
                  value={form.destination_address}
                  onChange={handleChange}
                  className="bg-white border-[#E1DDD0] text-xs font-sans focus-visible:ring-[#244634]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="text"
                    placeholder="City (e.g. Navi Mumbai)"
                    name="destination_city"
                    required
                    value={form.destination_city}
                    onChange={handleChange}
                    className="bg-white border-[#E1DDD0] text-xs font-sans focus-visible:ring-[#244634]"
                  />
                  <Input
                    type="text"
                    placeholder="State (e.g. Maharashtra)"
                    name="destination_state"
                    required
                    value={form.destination_state}
                    onChange={handleChange}
                    className="bg-white border-[#E1DDD0] text-xs font-sans focus-visible:ring-[#244634]"
                  />
                </div>
              </div>
            </div>

            {/* Cold Chain Specs */}
            <div className="p-4 rounded-2xl bg-[#E8EFE9]/40 border border-[#C3D4C7] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ThermometerSnowflake className="w-4 h-4 text-[#3F7C56]" />
                  <span className="text-xs font-mono font-bold text-[#244634] uppercase">
                    Refrigerated Cargo Requirements
                  </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="refrigeration_required"
                    checked={form.refrigeration_required}
                    onChange={handleChange}
                    className="rounded border-[#C3D4C7] text-[#244634] focus:ring-0"
                  />
                  <span className="text-xs font-mono text-[#26312A] font-medium">Active Reefer Mandatory</span>
                </label>
              </div>

              {form.refrigeration_required && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-[#526357] uppercase font-semibold">Min Temperature (°C)</label>
                    <Input
                      type="number"
                      step="0.5"
                      name="temperature_min"
                      value={form.temperature_min}
                      onChange={handleChange}
                      className="bg-white border-[#E1DDD0] text-xs font-mono focus-visible:ring-[#244634]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-[#526357] uppercase font-semibold">Max Temperature (°C)</label>
                    <Input
                      type="number"
                      step="0.5"
                      name="temperature_max"
                      value={form.temperature_max}
                      onChange={handleChange}
                      className="bg-white border-[#E1DDD0] text-xs font-mono focus-visible:ring-[#244634]"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                Handling & Stacking Instructions
              </label>
              <Textarea
                name="special_handling_instructions"
                rows={2}
                value={form.special_handling_instructions}
                onChange={handleChange}
                placeholder="e.g. Palletized crates only. Avoid direct midday sun during transshipment."
                className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#ECE7DA]">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/freight-bookings')}
                className="bg-white border-[#E1DDD0] text-[#26312A] hover:bg-[#F2EFE7]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="bg-[#244634] hover:bg-[#1A3326] text-white shadow-sm"
              >
                {loading ? 'Submitting...' : 'Post Freight Booking Request'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
