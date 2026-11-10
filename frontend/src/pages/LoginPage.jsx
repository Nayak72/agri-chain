import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Leaf,
  Truck,
  Warehouse,
  ThermometerSnowflake,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight
} from 'lucide-react'

const FEATURE_CARDS = [
  {
    icon: Leaf,
    title: 'Agricultural Traceability',
    desc: 'Farm-to-fork chain of custody with batch-level crop origin records',
    accent: 'forest',
  },
  {
    icon: Truck,
    title: 'Freight Operations',
    desc: 'Multi-quote freight bookings, fleet readiness and shipment dispatch',
    accent: 'terracotta',
  },
  {
    icon: ThermometerSnowflake,
    title: 'Cold-Chain Monitoring',
    desc: 'Real-time simulated sensor streams with excursion detection',
    accent: 'harvest',
  },
  {
    icon: ShieldCheck,
    title: 'Verified Audit Records',
    desc: 'Hash-chained cryptographic ledger with deterministic verification',
    accent: 'sage',
  },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, devAccounts, isAuthenticated } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [touched, setTouched] = useState({ email: false, password: false })
  const [showDevPanel, setShowDevPanel] = useState(false)

  const validateEmail = (v) => /\S+@\S+\.\S+/.test(v)
  const isValid = () => validateEmail(email) && password.length >= 6

  const from = location.state?.from?.pathname || '/dashboard'

  // If already authenticated, redirect to destination
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, from])

  const handleSubmit = async (e) => {
    e?.preventDefault()
    setTouched({ email: true, password: true })
    setFormError('')

    if (!isValid()) {
      setFormError('Please provide a valid email and password (min 6 characters).')
      return
    }

    setLoading(true)
    const result = await login(email, password)
    setLoading(false)

    if (result.success) {
      navigate(from, { replace: true })
    } else {
      setFormError(result.error || 'Authentication failed.')
      setPassword('')
    }
  }

  const fillDemoAccount = (account) => {
    setEmail(account.email)
    setPassword('')
    setFormError('')
    setTouched({ email: false, password: false })
  }

  return (
    <div className="relative min-h-screen w-full bg-[#F6F4EC] text-[#26312A] font-sans flex items-center justify-center p-4 lg:p-8">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        
        {/* Left hero column */}
        <div className="hidden lg:flex flex-col space-y-8 animate-fade-in-left">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest/10 border border-forest/20 text-forest text-xs font-mono font-semibold uppercase tracking-wider">
              <span className="h-2 w-2 rounded-full bg-forest" />
              Unified Supply Chain OS
            </div>
            
            <h1 className="text-4xl xl:text-5xl font-bold tracking-tight text-ink-primary font-serif leading-[1.15]">
              AgriChain<br />
              <span className="text-forest italic">Nature Meets Precision</span>
            </h1>

            <p className="text-base text-ink-secondary max-w-md leading-relaxed">
              End-to-end agricultural supply chain management with cryptographic audit ledger traceability, simulated cold-chain telemetry, and freight quotation operations.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {FEATURE_CARDS.map((card) => {
              const Icon = card.icon
              return (
                <div
                  key={card.title}
                  className="p-5 rounded-2xl bg-surface border border-border shadow-2xs hover:shadow-xs transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-forest/10 border border-forest/15 text-forest flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 stroke-[2]" />
                  </div>
                  <h3 className="font-bold text-ink-primary text-sm tracking-tight">{card.title}</h3>
                  <p className="text-xs text-ink-secondary mt-1 leading-relaxed">{card.desc}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right auth card */}
        <div className="w-full max-w-md mx-auto animate-fade-in-up">
          <div className="bg-surface rounded-3xl border border-border p-8 sm:p-10 shadow-sm">
            
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-forest text-white mb-4 shadow-xs">
                <Leaf className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h2 className="text-2xl font-bold text-ink-primary tracking-tight font-serif">Operations Access</h2>
              <p className="text-ink-secondary text-sm mt-1">Sign in to your AgriChain workspace</p>
            </div>

            {/* Error banner */}
            {formError && (
              <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-medium leading-relaxed">{formError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-ink-secondary uppercase tracking-wider ml-0.5">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched(t => ({ ...t, email: true }))}
                    className={`w-full rounded-xl border ${
                      touched.email && !validateEmail(email)
                        ? 'border-red-400 focus:border-red-500 ring-red-100'
                        : 'border-border focus:border-forest'
                    } bg-surface px-3.5 py-2.5 text-sm text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-forest/15 transition-all font-mono`}
                    placeholder="user@agrichain.com"
                  />
                  {touched.email && validateEmail(email) && (
                    <div className="absolute right-3.5 top-3 text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-ink-secondary uppercase tracking-wider ml-0.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setTouched(t => ({ ...t, password: true }))}
                    className={`w-full rounded-xl border ${
                      touched.password && password.length < 6
                        ? 'border-red-400 focus:border-red-500 ring-red-100'
                        : 'border-border focus:border-forest'
                    } bg-surface px-3.5 py-2.5 text-sm text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-forest/15 transition-all font-mono pr-11`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-ink-secondary hover:text-ink-primary transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !isValid()}
                className="w-full mt-2 h-11 rounded-xl bg-forest hover:bg-forest-dark text-white font-semibold text-sm shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <span>Sign In to AgriChain</span>
                )}
              </button>

              <div className="pt-2 text-center">
                <span className="text-xs text-ink-secondary">Don't have an account? </span>
                <Link to="/register" className="text-xs font-semibold text-forest hover:underline">
                  Register now
                </Link>
              </div>
            </form>

            {/* Dev demo accounts (DEV only) */}
            {devAccounts && devAccounts.length > 0 && (
              <div className="mt-6 pt-5 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-mono text-ink-secondary uppercase tracking-wider font-semibold">
                    Dev Preset Accounts
                  </span>
                  <button
                    onClick={() => setShowDevPanel(!showDevPanel)}
                    className="text-[11px] font-mono text-forest hover:underline cursor-pointer"
                  >
                    {showDevPanel ? 'Hide Presets' : 'Quick Fill'}
                  </button>
                </div>

                {showDevPanel && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {devAccounts.map((acc) => (
                        <button
                          key={acc.email}
                          type="button"
                          onClick={() => fillDemoAccount(acc)}
                          className="text-left p-2.5 rounded-xl bg-surface-muted/60 border border-border hover:border-forest/40 hover:bg-forest/5 transition-all cursor-pointer group"
                        >
                          <div className="text-xs font-semibold text-ink-primary group-hover:text-forest">{acc.label}</div>
                          <div className="text-[10px] font-mono text-ink-secondary truncate mt-0.5">{acc.email}</div>
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] font-mono text-ink-tertiary text-center pt-1">
                      Seed password pattern: Role123! (e.g. Admin123!)
                    </p>
                  </div>
                )}
              </div>
            )}

            <p className="mt-6 text-center text-[10px] text-ink-tertiary font-mono uppercase tracking-wider">
              AGRICHAIN SECURE PLATFORM // v1.0.0
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
