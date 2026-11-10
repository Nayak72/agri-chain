import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { produceApi } from '../../api/agriculture.api'
import { formatApiErrorMessage } from '../../utils'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Textarea } from '../../components/ui/textarea'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card'

export default function ProduceCreatePage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    produce_type: '',
    category: 'VEGETABLES',
    unit: 'KG',
    description: '',
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const payload = {
        name: form.name.trim(),
        produce_type: form.produce_type.trim().toUpperCase(),
        category: form.category.trim(),
        unit: form.unit.trim().toUpperCase(),
        description: form.description ? form.description.trim() : null,
      }

      const res = await produceApi.create(payload)
      const newId = res.data.id || res.data._id
      navigate(`/produce/${newId}`)
    } catch (err) {
      console.error('Produce creation error:', err)
      setError(formatApiErrorMessage(err, 'Failed to create produce item.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-4 space-y-6 animate-fade-in-up">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/produce')}
        className="gap-2 text-xs font-mono text-[#526357] hover:text-[#26312A] -ml-2"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        PRODUCE_CATALOG
      </Button>

      <Card className="bg-white/95 border-[#E1DDD0] shadow-sm">
        <CardHeader className="border-b border-[#ECE7DA] pb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#244634]" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#244634]">
              Catalog Definition
            </span>
          </div>
          <CardTitle className="text-2xl font-serif font-bold text-[#1B2A20]">
            Add Produce Commodity
          </CardTitle>
          <CardDescription className="text-xs text-[#526357]">
            Standardize a crop commodity for traceability batches and marketplace orders.
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
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                Produce Name *
              </label>
              <Input
                type="text"
                name="name"
                required
                minLength={2}
                maxLength={100}
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Alphonso Mangoes (Ratnagiri)"
                className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  System Produce Code (Key) *
                </label>
                <Input
                  type="text"
                  name="produce_type"
                  required
                  value={form.produce_type}
                  onChange={handleChange}
                  placeholder="e.g. MANGO_ALPHONSO"
                  className="bg-white border-[#E1DDD0] uppercase font-mono focus-visible:ring-[#244634]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Category *
                </label>
                <Select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
                >
                  <option value="FRUITS">FRUITS</option>
                  <option value="VEGETABLES">VEGETABLES</option>
                  <option value="GRAINS">GRAINS</option>
                  <option value="PULSES">PULSES</option>
                  <option value="SPICES">SPICES</option>
                  <option value="DAIRY">DAIRY</option>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                Standard Measurement Unit *
              </label>
              <Input
                type="text"
                name="unit"
                required
                minLength={1}
                maxLength={20}
                value={form.unit}
                onChange={handleChange}
                placeholder="e.g. KG, CRATE, TON"
                className="bg-white border-[#E1DDD0] uppercase font-mono focus-visible:ring-[#244634]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                Handling & Storage Description
              </label>
              <Textarea
                name="description"
                rows={3}
                value={form.description}
                onChange={handleChange}
                placeholder="Optimal temperature range, humidity requirements, ventilation..."
                className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
              />
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-[#ECE7DA]">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/produce')}
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
                {loading ? 'Adding to Catalog...' : 'Save Produce'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
