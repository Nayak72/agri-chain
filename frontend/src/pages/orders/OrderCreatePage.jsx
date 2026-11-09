import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ShoppingBag, AlertTriangle, Layers, Calendar, DollarSign, MapPin } from 'lucide-react'
import { ordersApi } from '../../api/commerce.api'
import { produceApi, batchesApi } from '../../api/agriculture.api'
import { usersApi } from '../../api/users.api'

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
    pickup_address: '',
    delivery_address: '',
    handling_requirements: '',
  })

  // When a batch is selected, autofill produce_type, pickup address, seller_id, and default quantity
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
        pickup_address: selected.harvest_location || prev.pickup_address,
        seller_id: selected.farmer_id || prev.seller_id,
        requested_quantity_kg: prev.requested_quantity_kg || String(selected.available_quantity_kg || selected.harvested_quantity_kg || ''),
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

    if (!form.seller_id) {
      setError('Please select a verified seller/farmer.')
      return
    }

    setLoading(true)

    try {
      const unitPricePaise = Math.round(parseFloat(form.unit_price_inr) * 100)

      const payload = {
        seller_id: form.seller_id.trim(),
        produce_type: form.produce_type.trim(),
        batch_id: form.batch_id ? form.batch_id.trim() : null,
        requested_quantity_kg: parseFloat(form.requested_quantity_kg),
        unit_price_paise: unitPricePaise,
        preferred_delivery_date: form.preferred_delivery_date,
        pickup_address: form.pickup_address.trim(),
        delivery_address: form.delivery_address.trim(),
        handling_requirements: form.handling_requirements ? form.handling_requirements.trim() : null,
      }

      const res = await ordersApi.create(payload)
      const newKey = res.data.id || res.data._id || res.data.order_id
      navigate(`/purchase-orders/${newKey}`)
    } catch (err) {
      console.error('Order creation error:', err)
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to place purchase order.'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-8 py-10 animate-fade-in-up">
      <button
        onClick={() => navigate('/purchase-orders')}
        className="text-xs font-mono text-cyan-400 hover:text-cyan-300 mb-6 flex items-center gap-2 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        ORDERS_REGISTRY
      </button>

      <div className="bg-[#0b1121] border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="mb-8">
          <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 mb-1 block">
            Procurement Contract
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create Purchase Order</h1>
          <p className="text-slate-400 text-sm mt-1">
            Initiate a trade commitment between buyer and seller with volume and pricing terms.
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
                Select Provenance Batch (Optional)
              </label>
              <select
                value={form.batch_id}
                onChange={(e) => handleBatchSelect(e.target.value)}
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              >
                <option value="">No specific batch (Open market)</option>
                {batches.map(b => (
                  <option key={b.id || b._id || b.batch_id} value={b.id || b._id}>
                    {b.batch_id} — {b.produce_type} ({b.harvest_location || 'Field Origin'})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Produce Commodity Type *
              </label>
              <select
                name="produce_type"
                required
                value={form.produce_type}
                onChange={handleChange}
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              >
                <option value="">Select commodity...</option>
                {produceItems.map(p => (
                  <option key={p.produce_type || p.id} value={p.produce_type}>
                    {p.name} ({p.produce_type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
              Seller / Producer (Farmer) *
            </label>
            <select
              name="seller_id"
              required
              value={form.seller_id}
              onChange={handleChange}
              className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
            >
              <option value="">Select verified farmer...</option>
              {farmers.map(f => (
                <option key={f.id || f._id} value={f.id || f._id}>
                  {f.full_name} ({f.email})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Requested Quantity (KG) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                name="requested_quantity_kg"
                value={form.requested_quantity_kg}
                onChange={handleChange}
                placeholder="2500"
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Agreed Unit Price (₹ / KG) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                name="unit_price_inr"
                value={form.unit_price_inr}
                onChange={handleChange}
                placeholder="35.50"
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
              Preferred Delivery Date *
            </label>
            <input
              type="date"
              required
              name="preferred_delivery_date"
              value={form.preferred_delivery_date}
              onChange={handleChange}
              className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
              Farm / Warehouse Pickup Address *
            </label>
            <input
              type="text"
              required
              name="pickup_address"
              value={form.pickup_address}
              onChange={handleChange}
              placeholder="e.g. Green Valley Farms, Sector 4, Nashik, MH"
              className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
              Buyer Destination Address *
            </label>
            <input
              type="text"
              required
              name="delivery_address"
              value={form.delivery_address}
              onChange={handleChange}
              placeholder="e.g. Central Produce Terminal, APMC Market, Vashi, Navi Mumbai"
              className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
              Cold Chain & Handling Requirements
            </label>
            <textarea
              name="handling_requirements"
              rows={3}
              value={form.handling_requirements}
              onChange={handleChange}
              placeholder="Reefer transit between 2°C - 4°C, ventilated plastic crates, max stack height 6 units"
              className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono resize-none"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/purchase-orders')}
              className="px-6 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium text-sm transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
            >
              {loading ? 'Submitting Order...' : 'Generate Purchase Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
