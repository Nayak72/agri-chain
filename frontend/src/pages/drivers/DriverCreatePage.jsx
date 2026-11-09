import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { driversApi } from '../../api/commerce.api'
import { useAuth } from '../../context/AuthContext'

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
        experience_years: parseInt(form.experience_years, 10),
      }

      const res = await driversApi.create(payload)
      const newId = res.data.id || res.data._id || res.data.driver_id
      navigate(`/drivers/${newId}`)
    } catch (err) {
      console.error('Driver enrollment error:', err)
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to enroll driver.'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-8 py-10 animate-fade-in-up">
      <button
        onClick={() => navigate('/drivers')}
        className="text-xs font-mono text-cyan-400 hover:text-cyan-300 mb-6 flex items-center gap-2 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        DRIVERS_DIRECTORY
      </button>

      <div className="bg-[#0b1121] border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="mb-8">
          <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 mb-1 block">
            Personnel Onboarding
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight">Enroll Commercial Driver</h1>
          <p className="text-slate-400 text-sm mt-1">
            Register heavy vehicle operator credentials, mobile contact, and verified license validity.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-start gap-3">
            <svg className="w-5 h-5 shrink-0 mt-0.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Full Name *
              </label>
              <input
                type="text"
                required
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Rajesh Kumar Shinde"
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Phone Number *
              </label>
              <input
                type="text"
                required
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+91 98230 11223"
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Commercial Driving License No *
              </label>
              <input
                type="text"
                required
                name="license_number"
                value={form.license_number}
                onChange={handleChange}
                placeholder="MH-15-20150012345"
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono uppercase"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                License Expiry Date *
              </label>
              <input
                type="date"
                required
                name="license_expiry"
                value={form.license_expiry}
                onChange={handleChange}
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
              Residential Address *
            </label>
            <input
              type="text"
              required
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Flat 12, Shivneri Colony, Gangapur Road"
              className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                City *
              </label>
              <input
                type="text"
                required
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="Nashik"
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                State *
              </label>
              <input
                type="text"
                required
                name="state"
                value={form.state}
                onChange={handleChange}
                placeholder="Maharashtra"
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Pincode *
              </label>
              <input
                type="text"
                required
                pattern="^\d{6}$"
                name="pincode"
                value={form.pincode}
                onChange={handleChange}
                placeholder="422005"
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Driving Experience (Years) *
              </label>
              <input
                type="number"
                min="0"
                required
                name="experience_years"
                value={form.experience_years}
                onChange={handleChange}
                placeholder="8"
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                Email Address (Optional)
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="rajesh.driver@agrichain.com"
                className="w-full bg-[rgba(2,6,23,0.5)] border border-slate-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-sm font-mono"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/drivers')}
              className="flex-1 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium text-sm transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-cyan-900/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Enrolling Driver...' : 'Enroll Driver Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

