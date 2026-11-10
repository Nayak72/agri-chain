import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertCircle, Truck, ThermometerSnowflake } from 'lucide-react'
import { fleetApi } from '../../api/commerce.api'
import { useAuth } from '../../context/AuthContext'
import { formatApiErrorMessage } from '../../utils'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card'

export default function VehicleCreatePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    transporter_id: user?.id || user?._id || 'transporter1',
    registration_number: '',
    category: 'REEFER_14FT',
    vehicle_type: 'Refrigerated Truck',
    max_payload_kg: '3500',
    refrigeration_available: true,
    temperature_min: '2.0',
    temperature_max: '8.0',
    registration_expiry: new Date(Date.now() + 86400000 * 365).toISOString().split('T')[0],
    insurance_expiry: new Date(Date.now() + 86400000 * 300).toISOString().split('T')[0],
    fitness_expiry: new Date(Date.now() + 86400000 * 180).toISOString().split('T')[0],
  })

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [e.target.name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const payloadKg = parseFloat(form.max_payload_kg)
    if (isNaN(payloadKg) || payloadKg <= 0) {
      setError('Max payload capacity must be greater than 0 kg.')
      return
    }

    let tempMin = null
    let tempMax = null
    if (form.refrigeration_available) {
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
        transporter_id: form.transporter_id.trim(),
        registration_number: form.registration_number.trim().toUpperCase(),
        category: form.category,
        vehicle_type: form.vehicle_type.trim(),
        max_payload_kg: payloadKg,
        refrigeration_available: Boolean(form.refrigeration_available),
        temperature_min: tempMin,
        temperature_max: tempMax,
        registration_expiry: form.registration_expiry,
        insurance_expiry: form.insurance_expiry,
        fitness_expiry: form.fitness_expiry,
      }

      await fleetApi.createVehicle(payload)
      navigate('/fleet')
    } catch (err) {
      console.error('Vehicle registration error:', err)
      setError(formatApiErrorMessage(err, 'Failed to register vehicle.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-4 space-y-6 animate-fade-in-up">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/fleet')}
        className="gap-2 text-xs font-mono text-[#526357] hover:text-[#26312A] -ml-2"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        FLEET_INVENTORY
      </Button>

      <Card className="bg-white/95 border-[#E1DDD0] shadow-sm">
        <CardHeader className="border-b border-[#ECE7DA] pb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#244634]" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#244634]">
              Fleet Asset Enrollment
            </span>
          </div>
          <CardTitle className="text-2xl font-serif font-bold text-[#1B2A20]">
            Register Fleet Vehicle
          </CardTitle>
          <CardDescription className="text-xs text-[#526357]">
            Enroll a commercial freight truck with vehicle registration and fitness credentials.
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
                  Vehicle Registration No *
                </label>
                <Input
                  type="text"
                  required
                  name="registration_number"
                  value={form.registration_number}
                  onChange={handleChange}
                  placeholder="MH-15-DC-4421"
                  className="bg-white border-[#E1DDD0] uppercase font-mono focus-visible:ring-[#244634]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Fleet Category *
                </label>
                <Select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
                >
                  <option value="REEFER_14FT">Refrigerated Truck (14ft)</option>
                  <option value="REEFER_20FT">Refrigerated Truck (20ft)</option>
                  <option value="REEFER_32FT">Refrigerated Trailer (32ft)</option>
                  <option value="OPEN_TRUCK">Open Truck (Tarpaulin)</option>
                  <option value="CLOSED_CONTAINER">Closed Container</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Vehicle Make / Body Type *
                </label>
                <Input
                  type="text"
                  required
                  name="vehicle_type"
                  value={form.vehicle_type}
                  onChange={handleChange}
                  placeholder="Tata Ultra T.7 Reefer"
                  className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Max Payload Capacity (KG) *
                </label>
                <Input
                  type="number"
                  min="500"
                  required
                  name="max_payload_kg"
                  value={form.max_payload_kg}
                  onChange={handleChange}
                  placeholder="3500"
                  className="bg-white border-[#E1DDD0] font-mono focus-visible:ring-[#244634]"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#E8EFE9]/40 border border-[#C3D4C7] space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="refrigeration_available"
                  checked={form.refrigeration_available}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-[#C3D4C7] text-[#244634] focus:ring-0"
                />
                <span className="text-xs font-mono font-semibold text-[#1B2A20]">
                  Vehicle Equipped with Active Refrigeration Unit
                </span>
              </label>

              {form.refrigeration_available && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#C3D4C7]/50">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-[#526357] uppercase font-semibold">Min Temp (°C)</label>
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
                    <label className="text-[10px] font-mono text-[#526357] uppercase font-semibold">Max Temp (°C)</label>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Registration Expiry *
                </label>
                <Input
                  type="date"
                  required
                  name="registration_expiry"
                  value={form.registration_expiry}
                  onChange={handleChange}
                  className="bg-white border-[#E1DDD0] font-mono focus-visible:ring-[#244634]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Insurance Expiry *
                </label>
                <Input
                  type="date"
                  required
                  name="insurance_expiry"
                  value={form.insurance_expiry}
                  onChange={handleChange}
                  className="bg-white border-[#E1DDD0] font-mono focus-visible:ring-[#244634]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Fitness Certificate *
                </label>
                <Input
                  type="date"
                  required
                  name="fitness_expiry"
                  value={form.fitness_expiry}
                  onChange={handleChange}
                  className="bg-white border-[#E1DDD0] font-mono focus-visible:ring-[#244634]"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-[#ECE7DA]">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/fleet')}
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
                {loading ? 'Enrolling Asset...' : 'Register Vehicle Asset'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
