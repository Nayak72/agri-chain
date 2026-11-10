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

  return (
    <div className="min-h-screen bg-[#F6F4EC] text-[#26312A] flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-forest/20 selection:text-forest">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl px-4">
        
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <Link to={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-forest text-white flex items-center justify-center shadow-xs">
              <Leaf className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div className="text-left">
              <span className="font-bold text-xl tracking-tight text-ink-primary leading-none block">AgriChain</span>
              <span className="text-[10px] text-forest font-mono tracking-wider font-semibold">NATURE MEETS PRECISION</span>
            </div>
          </Link>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-primary font-serif">
            Create Your Platform Account
          </h2>
          <p className="text-xs sm:text-sm text-ink-secondary mt-1.5">
            Join the integrated agricultural supply chain network
          </p>
        </div>

        <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-sm">
          {formError && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-xs sm:text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
              <div className="font-medium leading-relaxed">{formError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-mono font-semibold uppercase text-ink-secondary mb-1.5">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-ink-primary text-sm placeholder:text-ink-tertiary focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/15 transition-all"
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-semibold uppercase text-ink-secondary mb-1.5">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-ink-primary text-sm placeholder:text-ink-tertiary focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/15 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold uppercase text-ink-secondary mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-ink-primary text-sm placeholder:text-ink-tertiary focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/15 transition-all font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Role Selector */}
            <div>
              <label className="block text-xs font-mono font-semibold uppercase text-ink-secondary mb-2">
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
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                        isSelected
                          ? 'border-forest bg-forest/5 shadow-xs'
                          : 'border-border bg-surface hover:bg-surface-muted/50'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          isSelected
                            ? 'bg-forest text-white'
                            : 'bg-surface-muted text-ink-secondary'
                        }`}
                      >
                        <Icon className="w-4 h-4 stroke-[2]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-bold ${isSelected ? 'text-forest' : 'text-ink-primary'}`}>
                            {opt.label}
                          </span>
                          <span
                            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border ${
                              opt.autoApprove
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {opt.autoApprove ? 'Auto-approved' : 'Admin approval required'}
                          </span>
                        </div>
                        <p className="text-xs text-ink-secondary mt-0.5 leading-relaxed">{opt.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-semibold uppercase text-ink-secondary mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-10 pr-10 py-2.5 bg-surface border border-border rounded-xl text-ink-primary text-sm placeholder:text-ink-tertiary focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/15 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink-secondary cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold uppercase text-ink-secondary mb-1.5">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.confirm_password}
                    onChange={(e) => handleChange('confirm_password', e.target.value)}
                    placeholder="Repeat password"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-ink-primary text-sm placeholder:text-ink-tertiary focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/15 transition-all font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-muted/70 border border-border text-xs text-ink-secondary leading-relaxed">
              <span className="text-ink-primary font-semibold">Security Note:</span> System administrator accounts cannot be created via public registration. Contact your platform administrator for administrative provisioning.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-forest hover:bg-forest-dark text-white font-semibold text-sm shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? 'Creating Account...' : 'Complete Registration'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <span className="text-xs text-ink-secondary">Already have an account? </span>
            <Link to="/login" className="text-xs font-semibold text-forest hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
