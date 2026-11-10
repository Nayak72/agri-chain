import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, AlertCircle, Layers } from 'lucide-react'
import { batchesApi, farmsApi, produceApi } from '../../api/agriculture.api'
import { formatApiErrorMessage } from '../../utils'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card'

export default function BatchCreatePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { data: farms } = useQuery({
    queryKey: ['farms'],
    queryFn: () => farmsApi.list().then(res => res.data),
  })

  const { data: produceList } = useQuery({
    queryKey: ['produce'],
    queryFn: () => produceApi.list().then(res => res.data),
  })

  const farmItems = Array.isArray(farms) ? farms : farms?.items || []
  const produceItems = Array.isArray(produceList) ? produceList : produceList?.items || []

  const initialFarmId = location.state?.farmId || ''
  const initialProduceType = location.state?.produceType || ''

  const [form, setForm] = useState({
    farm_id: initialFarmId,
    produce_type: initialProduceType,
    harvest_date: new Date().toISOString().split('T')[0],
    harvest_location: '',
    initial_quantity_kg: '',
    quality_grade: 'GRADE_A',
    packaging_type: 'CRATE',
    estimated_shelf_life_days: '14',
    handling_requirements: '',
  })

  // Autofill farm location if selected
  useEffect(() => {
    if (form.farm_id && farmItems.length > 0) {
      const selected = farmItems.find(f => (f.id || f._id) === form.farm_id)
      if (selected && !form.harvest_location) {
        setForm(f => ({ ...f, harvest_location: `${selected.name}, ${selected.city}, ${selected.state}` }))
      }
    }
  }, [form.farm_id, farmItems])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const qty = parseFloat(form.initial_quantity_kg)
    if (isNaN(qty) || qty <= 0) {
      setError('Initial quantity must be greater than 0 kg.')
      return
    }

    const days = parseInt(form.estimated_shelf_life_days, 10)
    if (isNaN(days) || days <= 0) {
      setError('Estimated shelf life must be at least 1 day.')
      return
    }

    setLoading(true)

    try {
      const payload = {
        farm_id: form.farm_id,
        produce_type: form.produce_type,
        harvest_date: form.harvest_date,
        harvest_location: form.harvest_location.trim(),
        initial_quantity_kg: qty,
        quality_grade: form.quality_grade,
        packaging_type: form.packaging_type,
        estimated_shelf_life_days: days,
        handling_requirements: form.handling_requirements ? form.handling_requirements.trim() : null,
      }

      const res = await batchesApi.create(payload)
      const newKey = res.data.batch_id || res.data.id || res.data._id
      navigate(`/batches/${newKey}`)
    } catch (err) {
      console.error('Batch creation error:', err)
      setError(formatApiErrorMessage(err, 'Failed to create harvest batch.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6 animate-fade-in-up">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/batches')}
        className="gap-2 text-xs font-mono text-[#526357] hover:text-[#26312A] -ml-2"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        BATCH_REGISTRY
      </Button>

      <Card className="bg-white/95 border-[#E1DDD0] shadow-sm">
        <CardHeader className="border-b border-[#ECE7DA] pb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#3F7C56]" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#3F7C56]">
              Provenance Genesis
            </span>
          </div>
          <CardTitle className="text-2xl font-serif font-bold text-[#1B2A20]">
            Register Harvest Batch
          </CardTitle>
          <CardDescription className="text-xs text-[#526357]">
            Initialize a verifiable crop harvest lot linked cryptographically to its farm origin.
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
                  Source Farm Node *
                </label>
                <Select
                  name="farm_id"
                  required
                  value={form.farm_id}
                  onChange={handleChange}
                  className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
                >
                  <option value="">Select origin farm...</option>
                  {farmItems.map(f => (
                    <option key={f.id || f._id} value={f.id || f._id}>
                      {f.name} ({f.city}, {f.state})
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
                  <option value="">Select commodity type...</option>
                  {produceItems.map(p => (
                    <option key={p.produce_type || p.id} value={p.produce_type}>
                      {p.name} ({p.produce_type})
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Harvest Date *
                </label>
                <Input
                  type="date"
                  name="harvest_date"
                  required
                  value={form.harvest_date}
                  onChange={handleChange}
                  className="bg-white border-[#E1DDD0] font-mono focus-visible:ring-[#244634]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Harvest Location Description *
                </label>
                <Input
                  type="text"
                  name="harvest_location"
                  required
                  value={form.harvest_location}
                  onChange={handleChange}
                  placeholder="Field Plot B-12, Nashik East"
                  className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Harvest Quantity (KG) *
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  name="initial_quantity_kg"
                  value={form.initial_quantity_kg}
                  onChange={handleChange}
                  placeholder="5000"
                  className="bg-white border-[#E1DDD0] font-mono focus-visible:ring-[#244634]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Quality Grade *
                </label>
                <Select
                  name="quality_grade"
                  value={form.quality_grade}
                  onChange={handleChange}
                  className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
                >
                  <option value="GRADE_A">GRADE_A (Export Quality)</option>
                  <option value="GRADE_B">GRADE_B (Domestic Standard)</option>
                  <option value="GRADE_C">GRADE_C (Processing Only)</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Packaging Type *
                </label>
                <Select
                  name="packaging_type"
                  value={form.packaging_type}
                  onChange={handleChange}
                  className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
                >
                  <option value="CRATE">CRATE</option>
                  <option value="BAG">BAG / SACK</option>
                  <option value="PALLET">PALLET</option>
                  <option value="BIN">BULK BIN</option>
                  <option value="CARTON">CORRUGATED CARTON</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Estimated Shelf Life (Days) *
                </label>
                <Input
                  type="number"
                  min="1"
                  required
                  name="estimated_shelf_life_days"
                  value={form.estimated_shelf_life_days}
                  onChange={handleChange}
                  placeholder="14"
                  className="bg-white border-[#E1DDD0] font-mono focus-visible:ring-[#244634]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Special Handling Requirements
                </label>
                <Input
                  type="text"
                  name="handling_requirements"
                  value={form.handling_requirements}
                  onChange={handleChange}
                  placeholder="Keep at 4°C - 8°C, Relative Humidity 85%"
                  className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-[#ECE7DA]">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/batches')}
                className="flex-1 bg-white border-[#E1DDD0] text-[#26312A] hover:bg-[#F2EFE7]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="flex-1 bg-[#244634] hover:bg-[#1A3326] text-white shadow-sm"
              >
                {loading ? 'Minting Batch...' : 'Generate Batch Record'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
