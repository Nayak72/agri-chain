import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, AlertCircle, ShoppingBag } from 'lucide-react'
import { ordersApi } from '../../api/commerce.api'
import { produceApi, batchesApi } from '../../api/agriculture.api'
import { usersApi } from '../../api/users.api'
import { formatApiErrorMessage } from '../../utils'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card'

export default function OrderCreatePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const initialBatchId = location.state?.batchId || ''

  const { data: produceList } = useQuery({
    queryKey: ['produce'],
    queryFn: () => produceApi.list().then(res => res.data),
  })

  const { data: batchesList } = useQuery({
    queryKey: ['batches'],
    queryFn: () => batchesApi.list().then(res => res.data),
  })

  const { data: farmersData } = useQuery({
    queryKey: ['farmers-for-po'],
    queryFn: () => usersApi.list({ role: 'FARMER' }).then(res => res.data),
  })

  const produceItems = Array.isArray(produceList) ? produceList : produceList?.items || []
  const batches = Array.isArray(batchesList) ? batchesList : batchesList?.items || []
  const farmers = Array.isArray(farmersData) ? farmersData : farmersData?.items || []

  const [form, setForm] = useState({
    seller_id: '',
    produce_type: '',
    batch_id: '',
    requested_quantity_kg: '',
    unit_price_inr: '', // User enters in INR, converted to paise on submit
    preferred_delivery_date: '',
  })

  // When a batch is selected, autofill produce_type, seller_id, and default quantity
  const handleBatchSelect = (batchId) => {
    if (!batchId) {
      setForm(prev => ({ ...prev, batch_id: '' }))
      return
    }
    const selected = batches.find(b => (b.id || b._id) === batchId || b.batch_id === batchId)
    if (selected) {
      setForm(prev => ({
        ...prev,
        batch_id: selected.id || selected._id,
        produce_type: selected.produce_type,
        seller_id: selected.farmer_id || prev.seller_id,
        requested_quantity_kg: prev.requested_quantity_kg || String(selected.available_kg || ''),
      }))
    }
  }

  // Handle initial batch passed via location state
  useEffect(() => {
    if (initialBatchId && batches.length > 0) {
      handleBatchSelect(initialBatchId)
    }
  }, [initialBatchId, batches])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.batch_id) {
      setError('Please select a batch for this order.')
      return
    }
    if (!form.seller_id) {
      setError('Please select a verified seller/farmer.')
      return
    }

    const qty = parseFloat(form.requested_quantity_kg)
    if (isNaN(qty) || qty <= 0) {
      setError('Requested quantity must be greater than 0 kg.')
      return
    }

    const price = parseFloat(form.unit_price_inr)
    if (isNaN(price) || price <= 0) {
      setError('Unit price must be greater than 0 INR.')
      return
    }

    setLoading(true)

    try {
      const unitPricePaise = Math.round(price * 100)

      const payload = {
        seller_id: form.seller_id.trim(),
        produce_type: form.produce_type.trim(),
        batch_id: form.batch_id.trim(),
        requested_quantity_kg: qty,
        unit_price_paise: unitPricePaise,
        preferred_delivery_date: form.preferred_delivery_date,
      }

      const res = await ordersApi.create(payload)
      const newKey = res.data.id || res.data._id || res.data.order_id
      navigate(`/purchase-orders/${newKey}`)
    } catch (err) {
      console.error('Order creation error:', err)
      setError(formatApiErrorMessage(err, 'Failed to place purchase order.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6 animate-fade-in-up">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/purchase-orders')}
        className="gap-2 text-xs font-mono text-[#526357] hover:text-[#26312A] -ml-2"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        ORDERS_REGISTRY
      </Button>

      <Card className="bg-white/95 border-[#E1DDD0] shadow-sm">
        <CardHeader className="border-b border-[#ECE7DA] pb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#244634]" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#244634]">
              Procurement Contract
            </span>
          </div>
          <CardTitle className="text-2xl font-serif font-bold text-[#1B2A20]">
            Create Purchase Order
          </CardTitle>
          <CardDescription className="text-xs text-[#526357]">
            Initiate a trade commitment between buyer and seller with volume and pricing terms.
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
                  Select Provenance Batch *
                </label>
                <Select
                  value={form.batch_id}
                  required
                  onChange={(e) => handleBatchSelect(e.target.value)}
                  className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
                >
                  <option value="">Select a batch</option>
                  {batches.map(b => (
                    <option key={b.id || b._id || b.batch_id} value={b.id || b._id}>
                      {b.batch_id} — {b.produce_type} ({b.harvest_location || 'Field Origin'})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Produce Commodity Type *
                </label>
                <Select
                  name="produce_type"
                  required
                  value={form.produce_type}
                  onChange={handleChange}
                  className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
                >
                  <option value="">Select commodity...</option>
                  {produceItems.map(p => (
                    <option key={p.produce_type || p.id} value={p.produce_type}>
                      {p.name} ({p.produce_type})
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                Seller / Producer (Farmer) *
              </label>
              <Select
                name="seller_id"
                required
                value={form.seller_id}
                onChange={handleChange}
                className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
              >
                <option value="">Select verified farmer...</option>
                {farmers.map(f => (
                  <option key={f.id || f._id} value={f.id || f._id}>
                    {f.full_name} ({f.email})
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Requested Quantity (KG) *
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  name="requested_quantity_kg"
                  value={form.requested_quantity_kg}
                  onChange={handleChange}
                  placeholder="2500"
                  className="bg-white border-[#E1DDD0] font-mono focus-visible:ring-[#244634]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Agreed Unit Price (₹ / KG) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  name="unit_price_inr"
                  value={form.unit_price_inr}
                  onChange={handleChange}
                  placeholder="35.50"
                  className="bg-white border-[#E1DDD0] font-mono focus-visible:ring-[#244634]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                Preferred Delivery Date *
              </label>
              <Input
                type="date"
                required
                name="preferred_delivery_date"
                value={form.preferred_delivery_date}
                onChange={handleChange}
                className="bg-white border-[#E1DDD0] font-mono focus-visible:ring-[#244634]"
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#ECE7DA]">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/purchase-orders')}
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
                {loading ? 'Submitting Order...' : 'Generate Purchase Order'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
