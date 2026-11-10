import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertCircle, UserCheck } from 'lucide-react'
import { driversApi } from '../../api/commerce.api'
import { useAuth } from '../../context/AuthContext'
import { formatApiErrorMessage } from '../../utils'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card'

export default function DriverCreatePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    transporter_id: user?.id || user?._id || 'transporter1',
    name: '',
    phone: '',
    email: '',
    license_number: '',
    license_expiry: new Date(Date.now() + 86400000 * 365 * 3).toISOString().split('T')[0],
    address: '',
    city: '',
    state: '',
    pincode: '',
    experience_years: '5',
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const exp = parseInt(form.experience_years, 10)
    if (isNaN(exp) || exp < 0) {
      setError('Experience years must be a valid non-negative number.')
      return
    }

    setLoading(true)

    try {
      const payload = {
        transporter_id: form.transporter_id.trim(),
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email ? form.email.trim() : null,
        license_number: form.license_number.trim().toUpperCase(),
        license_expiry: form.license_expiry,
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        experience_years: exp,
      }

      const res = await driversApi.create(payload)
      const newId = res.data.id || res.data._id || res.data.driver_id
      navigate(`/drivers/${newId}`)
    } catch (err) {
      console.error('Driver enrollment error:', err)
      setError(formatApiErrorMessage(err, 'Failed to enroll driver.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-4 space-y-6 animate-fade-in-up">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/drivers')}
        className="gap-2 text-xs font-mono text-[#526357] hover:text-[#26312A] -ml-2"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        DRIVERS_DIRECTORY
      </Button>

      <Card className="bg-white/95 border-[#E1DDD0] shadow-sm">
        <CardHeader className="border-b border-[#ECE7DA] pb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#244634]" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#244634]">
              Personnel Onboarding
            </span>
          </div>
          <CardTitle className="text-2xl font-serif font-bold text-[#1B2A20]">
            Enroll Commercial Driver
          </CardTitle>
          <CardDescription className="text-xs text-[#526357]">
            Register heavy vehicle operator credentials, mobile contact, and verified license validity.
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
                  Full Name *
                </label>
                <Input
                  type="text"
                  required
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Rajesh Kumar Shinde"
                  className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Phone Number *
                </label>
                <Input
                  type="text"
                  required
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+91 98230 11223"
                  className="bg-white border-[#E1DDD0] font-mono focus-visible:ring-[#244634]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Commercial Driving License No *
                </label>
                <Input
                  type="text"
                  required
                  name="license_number"
                  value={form.license_number}
                  onChange={handleChange}
                  placeholder="MH-15-20150012345"
                  className="bg-white border-[#E1DDD0] uppercase font-mono focus-visible:ring-[#244634]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  License Expiry Date *
                </label>
                <Input
                  type="date"
                  required
                  name="license_expiry"
                  value={form.license_expiry}
                  onChange={handleChange}
                  className="bg-white border-[#E1DDD0] font-mono focus-visible:ring-[#244634]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                Residential Address *
              </label>
              <Input
                type="text"
                required
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Flat 12, Shivneri Colony, Gangapur Road"
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
                  required
                  name="city"
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
                  required
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  placeholder="Maharashtra"
                  className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Pincode *
                </label>
                <Input
                  type="text"
                  required
                  pattern="^\d{6}$"
                  name="pincode"
                  value={form.pincode}
                  onChange={handleChange}
                  placeholder="422005"
                  className="bg-white border-[#E1DDD0] font-mono focus-visible:ring-[#244634]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Driving Experience (Years) *
                </label>
                <Input
                  type="number"
                  min="0"
                  required
                  name="experience_years"
                  value={form.experience_years}
                  onChange={handleChange}
                  placeholder="8"
                  className="bg-white border-[#E1DDD0] font-mono focus-visible:ring-[#244634]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[#526357] uppercase tracking-wider">
                  Email Address (Optional)
                </label>
                <Input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="rajesh.driver@agrichain.com"
                  className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-[#ECE7DA]">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/drivers')}
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
                {loading ? 'Enrolling Driver...' : 'Enroll Driver Profile'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
