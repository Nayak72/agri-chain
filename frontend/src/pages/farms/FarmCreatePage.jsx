import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertCircle, Sprout, Save } from 'lucide-react'
import { farmsApi } from '../../api/agriculture.api'
import { formatApiErrorMessage } from '../../utils'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card'

export default function FarmCreatePage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    latitude: '',
    longitude: '',
    area_hectares: '',
    certifications: '',
    description: '',
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    let lat = null
    if (form.latitude && form.latitude.trim()) {
      lat = parseFloat(form.latitude)
      if (isNaN(lat) || lat < -90 || lat > 90) {
        setError('Latitude must be a valid number between -90 and 90.')
        return
      }
    }

    let lon = null
    if (form.longitude && form.longitude.trim()) {
      lon = parseFloat(form.longitude)
      if (isNaN(lon) || lon < -180 || lon > 180) {
        setError('Longitude must be a valid number between -180 and 180.')
        return
      }
    }

    let area = null
    if (form.area_hectares && form.area_hectares.trim()) {
      area = parseFloat(form.area_hectares)
      if (isNaN(area) || area <= 0) {
        setError('Area in hectares must be a positive number.')
        return
      }
    }

    setLoading(true)

    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        latitude: lat,
        longitude: lon,
        area_hectares: area,
        certifications: form.certifications
          ? form.certifications.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        description: form.description ? form.description.trim() : null,
      }

      const res = await farmsApi.create(payload)
      const newId = res.data.id || res.data._id
      navigate(`/farms/${newId}`)
    } catch (err) {
      console.error('Farm creation error:', err)
      setError(formatApiErrorMessage(err, 'Failed to register farm node.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6 animate-fade-in-up">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/farms')}
        className="gap-2 text-xs font-mono text-[#526357] hover:text-[#26312A] -ml-2"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        FARM_NETWORK
      </Button>

      <Card className="bg-white/95 border-[#E1DDD0] shadow-sm">
        <CardHeader className="border-b border-[#ECE7DA] pb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#3F7C56]" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#3F7C56]">
              Node Onboarding
            </span>
          </div>
          <CardTitle className="text-2xl font-serif font-bold text-[#1B2A20]">
            Register Agricultural Farm
          </CardTitle>
          <CardDescription className="text-xs text-[#526357]">
            Initialize an agricultural production node with verified location and capability metadata.
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
                Farm Name *
              </label>
              <Input
                type="text"
                name="name"
                required
                minLength={2}
                maxLength={100}
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Green Acres Organic Orchards"
                className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                Physical Street Address *
              </label>
              <Input
                type="text"
                name="address"
                required
                minLength={5}
                maxLength={200}
                value={form.address}
                onChange={handleChange}
                placeholder="e.g. Survey No. 42, NH-44 Sector 9"
                className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  City / District *
                </label>
                <Input
                  type="text"
                  name="city"
                  required
                  value={form.city}
                  onChange={handleChange}
                  placeholder="e.g. Nashik"
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
                  placeholder="e.g. Maharashtra"
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
                  placeholder="422001"
                  className="bg-white border-[#E1DDD0] font-mono focus-visible:ring-[#244634]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Area (Hectares)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.1"
                  name="area_hectares"
                  value={form.area_hectares}
                  onChange={handleChange}
                  placeholder="15.5"
                  className="bg-white border-[#E1DDD0] font-mono focus-visible:ring-[#244634]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Latitude
                </label>
                <Input
                  type="number"
                  step="0.000001"
                  name="latitude"
                  value={form.latitude}
                  onChange={handleChange}
                  placeholder="19.9975"
                  className="bg-white border-[#E1DDD0] font-mono focus-visible:ring-[#244634]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Longitude
                </label>
                <Input
                  type="number"
                  step="0.000001"
                  name="longitude"
                  value={form.longitude}
                  onChange={handleChange}
                  placeholder="73.7898"
                  className="bg-white border-[#E1DDD0] font-mono focus-visible:ring-[#244634]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                Certifications (comma separated)
              </label>
              <Input
                type="text"
                name="certifications"
                value={form.certifications}
                onChange={handleChange}
                placeholder="GLOBALG.A.P., India Organic, Rainforest Alliance"
                className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                Description / Notes
              </label>
              <Textarea
                name="description"
                rows={3}
                value={form.description}
                onChange={handleChange}
                placeholder="Soil type, primary crops, irrigation facilities..."
                className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
              />
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-[#ECE7DA]">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/farms')}
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
                {loading ? 'Initializing Node...' : 'Register Farm Node'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
