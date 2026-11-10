import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertCircle, Warehouse, ThermometerSnowflake } from 'lucide-react'
import { warehousesApi } from '../../api/agriculture.api'
import { useAuth } from '../../context/AuthContext'
import { getApiError } from '../../utils'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card'

export default function WarehouseCreatePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    capacity_kg: '',
    cold_storage_capacity_kg: '0',
    has_refrigeration: false,
    temperature_range_min: '',
    temperature_range_max: '',
    certifications: '',
  })

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [e.target.name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const cap = Number(form.capacity_kg)
      if (isNaN(cap) || cap <= 0) {
        setError('Total capacity must be a valid positive number.')
        setLoading(false)
        return
      }

      const coldCap = form.cold_storage_capacity_kg ? Number(form.cold_storage_capacity_kg) : 0
      if (isNaN(coldCap) || coldCap < 0) {
        setError('Cold storage capacity must be a non-negative number.')
        setLoading(false)
        return
      }

      const tempMin = form.temperature_range_min ? Number(form.temperature_range_min) : null
      const tempMax = form.temperature_range_max ? Number(form.temperature_range_max) : null

      const payload = {
        name: form.name.trim(),
        manager_id: user?.id || user?._id || 'admin',
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        capacity_kg: cap,
        cold_storage_capacity_kg: coldCap,
        has_refrigeration: Boolean(form.has_refrigeration),
        temperature_range_min: tempMin,
        temperature_range_max: tempMax,
        certifications: form.certifications
          ? form.certifications.split(',').map(s => s.trim()).filter(Boolean)
          : [],
      }

      const res = await warehousesApi.create(payload)
      const newId = res.data.id || res.data._id
      navigate(`/warehouses/${newId}`)
    } catch (err) {
      console.error('Warehouse deployment error:', err)
      setError(getApiError(err, 'Failed to deploy storage node.').message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6 animate-fade-in-up">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/warehouses')}
        className="gap-2 text-xs font-mono text-[#526357] hover:text-[#26312A] -ml-2"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        STORAGE_NETWORK
      </Button>

      <Card className="bg-white/95 border-[#E1DDD0] shadow-sm">
        <CardHeader className="border-b border-[#ECE7DA] pb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#244634]" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#244634]">
              Infrastructure Commissioning
            </span>
          </div>
          <CardTitle className="text-2xl font-serif font-bold text-[#1B2A20]">
            Deploy Warehouse Node
          </CardTitle>
          <CardDescription className="text-xs text-[#526357]">
            Provision a new storage facility with verified volumetric capacity and climate control parameters.
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
                Warehouse Node Name *
              </label>
              <Input
                type="text"
                name="name"
                required
                minLength={2}
                maxLength={100}
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Nashik Central Cold Storage Facility"
                className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                Physical Location Address *
              </label>
              <Input
                type="text"
                name="address"
                required
                minLength={5}
                maxLength={200}
                value={form.address}
                onChange={handleChange}
                placeholder="Plot No. 104, MIDC Ambad Industrial Area"
                className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  City *
                </label>
                <Input
                  type="text"
                  name="city"
                  required
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Nashik"
                  className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  State *
                </label>
                <Input
                  type="text"
                  name="state"
                  required
                  value={form.state}
                  onChange={handleChange}
                  placeholder="Maharashtra"
                  className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Pincode (6 digits) *
                </label>
                <Input
                  type="text"
                  name="pincode"
                  required
                  pattern="^\d{6}$"
                  value={form.pincode}
                  onChange={handleChange}
                  placeholder="422010"
                  className="bg-white border-[#E1DDD0] font-mono focus-visible:ring-[#244634]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Total Storage Capacity (KG) *
                </label>
                <Input
                  type="number"
                  min="100"
                  required
                  name="capacity_kg"
                  value={form.capacity_kg}
                  onChange={handleChange}
                  placeholder="500000"
                  className="bg-white border-[#E1DDD0] font-mono focus-visible:ring-[#244634]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Cold Storage Sub-Capacity (KG)
                </label>
                <Input
                  type="number"
                  min="0"
                  name="cold_storage_capacity_kg"
                  value={form.cold_storage_capacity_kg}
                  onChange={handleChange}
                  placeholder="200000"
                  className="bg-white border-[#E1DDD0] font-mono focus-visible:ring-[#244634]"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#E8EFE9]/40 border border-[#C3D4C7] space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="has_refrigeration"
                  checked={form.has_refrigeration}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-[#C3D4C7] text-[#244634] focus:ring-0"
                />
                <span className="text-xs font-mono font-semibold text-[#1B2A20]">
                  Refrigeration & Active Cold-Chain Telemetry Enabled
                </span>
              </label>

              {form.has_refrigeration && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#C3D4C7]/50">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-[#526357] uppercase font-semibold">Min Temp (°C)</label>
                    <Input
                      type="number"
                      step="0.5"
                      name="temperature_range_min"
                      value={form.temperature_range_min}
                      onChange={handleChange}
                      placeholder="2.0"
                      className="bg-white border-[#E1DDD0] text-xs font-mono focus-visible:ring-[#244634]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-[#526357] uppercase font-semibold">Max Temp (°C)</label>
                    <Input
                      type="number"
                      step="0.5"
                      name="temperature_range_max"
                      value={form.temperature_range_max}
                      onChange={handleChange}
                      placeholder="8.0"
                      className="bg-white border-[#E1DDD0] text-xs font-mono focus-visible:ring-[#244634]"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                Facility Certifications (comma separated)
              </label>
              <Input
                type="text"
                name="certifications"
                value={form.certifications}
                onChange={handleChange}
                placeholder="ISO 22000, HACCP, FSSAI Cold Chain"
                className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
              />
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-[#ECE7DA]">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/warehouses')}
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
                {loading ? 'Commissioning Node...' : 'Deploy Storage Node'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
