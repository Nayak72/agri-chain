import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Leaf,
  Warehouse,
  Truck,
  MapPin,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../constants/roles'
import AmbientBackground from '../../components/layout/AmbientBackground'

const ROLE_OPTIONS = [
  {
    role: ROLES.FARMER,
    label: 'Farmer / Producer',
    icon: Leaf,
    desc: 'Register farms, harvest produce, and manage batches (Auto-approved)',
    autoApprove: true,
  },
  {
    role: ROLES.BUYER,
    label: 'Buyer / Commercial Ag',
    icon: ShoppingBag,
    desc: 'Place purchase orders and arrange freight shipments (Auto-approved)',
    autoApprove: true,
  },
  {
    role: ROLES.WAREHOUSE_MANAGER,
    label: 'Warehouse Manager',
    icon: Warehouse,
    desc: 'Receive harvests, reconcile cargo weights, and log inspections (Admin approval)',
    autoApprove: false,
  },
  {
    role: ROLES.TRANSPORTER,
    label: 'Transporter / Carrier',
    icon: Truck,
    desc: 'Submit quotes, manage fleet vehicles, and dispatch shipments (Admin approval)',
    autoApprove: false,
  },
  {
    role: ROLES.DRIVER,
    label: 'Driver',
    icon: MapPin,
    desc: 'Transit checkpoints, update cargo telemetry, and file delivery reports (Admin approval)',
    autoApprove: false,
  },
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, isAuthenticated } = useAuth()

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: ROLES.FARMER,
    password: '',
    confirm_password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setFormError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!formData.full_name.trim()) {
      setFormError('Please enter your full name')
      return
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setFormError('Please provide a valid email address')
      return
    }
    if (formData.password.length < 6) {
      setFormError('Password must be at least 6 characters long')
      return
    }
    if (formData.password !== formData.confirm_password) {
      setFormError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const res = await register({
        full_name: formData.full_name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || undefined,
        role: formData.role,
        password: formData.password,
      })

      const status = res?.data?.status || res?.status
      if (status === 'PENDING_APPROVAL') {
        navigate('/pending-approval')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      const detail = err.response?.data?.detail
      if (typeof detail === 'string') {
        setFormError(detail)
      } else if (Array.isArray(detail)) {
        setFormError(detail.map(d => d.msg).join(', '))
      } else {
        setFormError(err.message || 'Failed to register account')
      }
    } finally {
      setLoading(false)
    }
  }

  const selectedRoleMeta = ROLE_OPTIONS.find(r => r.role === formData.role)

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative selection:bg-cyan-500/30 selection:text-cyan-200">
      <AmbientBackground />

      <div className="sm:mx-auto sm:w-full sm:max-w-xl px-4 relative z-10">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Link to={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <span className="text-white font-bold text-xl font-mono">A</span>
            </div>
            <div className="text-left">
              <div className="font-bold text-xl tracking-tight text-white leading-none">AgriChain</div>
              <div className="text-[10px] text-cyan-400 font-mono tracking-wider mt-0.5">SUPPLY CHAIN OS</div>
            </div>
          </Link>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Create Your Platform Account
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Join the integrated agricultural supply chain network
          </p>
        </div>

        <div className="bg-[#0b1121]/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          {formError && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start gap-3 text-red-300 text-xs sm:text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
              <div>{formError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Role Selector */}
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-2">
                Operational Role *
              </label>
              <div className="space-y-2">
                {ROLE_OPTIONS.map((opt) => {
                  const Icon = opt.icon
                  const isSelected = formData.role === opt.role
                  return (
                    <div
                      key={opt.role}
                      onClick={() => handleChange('role', opt.role)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'border-cyan-500/60 bg-cyan-950/20 shadow-md shadow-cyan-500/10'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                            {opt.label}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                              opt.autoApprove
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {opt.autoApprove ? 'Auto-approved' : 'Admin approval required'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.confirm_password}
                    onChange={(e) => handleChange('confirm_password', e.target.value)}
                    placeholder="Repeat password"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 leading-relaxed">
              <span className="text-slate-300 font-semibold">Security Note:</span> System administrator accounts cannot be created via public registration. Contact your platform administrator for administrative provisioning.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? 'Creating Account...' : 'Complete Registration'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800 text-center">
            <span className="text-xs text-slate-400">Already have an account? </span>
            <Link to="/login" className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

