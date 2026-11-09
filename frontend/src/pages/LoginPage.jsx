import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AmbientBackground from '../components/layout/AmbientBackground'

const FEATURE_CARDS = [
  {
    icon: '🌾',
    title: 'Agricultural Traceability',
    desc: 'Farm-to-fork chain of custody with batch-level QR traceability',
    color: 'emerald',
  },
  {
    icon: '🚛',
    title: 'Freight Operations',
    desc: 'Multi-quote freight bookings, fleet management and shipment dispatch',
    color: 'cyan',
  },
  {
    icon: '🌡️',
    title: 'Cold-Chain Monitoring',
    desc: 'Real-time simulated sensor streams with configurable excursion scenarios',
    color: 'blue',
  },
  {
    icon: '🔗',
    title: 'Verified Audit Records',
    desc: 'Hash-chained cryptographic ledger with tamper detection',
    color: 'violet',
  },
]

const COLOR_MAP = {
  emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
}

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
    <div className="relative min-h-screen w-full bg-[#030712] text-slate-200 overflow-x-hidden font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      <AmbientBackground />

      {/* Navbar-height spacer */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left hero column */}
          <div className="hidden lg:flex flex-col space-y-10 animate-fade-in-left">
            <div className="relative">
              <div className="absolute -left-4 top-0 w-1 h-28 bg-gradient-to-b from-cyan-400 to-emerald-400 rounded-full" />
              <div className="pl-4">
                <h1 className="text-5xl xl:text-6xl font-bold tracking-tight text-white leading-[1.1]">
                  Agri<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                    Chain
                  </span>
                </h1>
                <p className="mt-4 text-base text-slate-400 max-w-sm leading-relaxed font-mono">
                  AGRICULTURAL LOGISTICS NETWORK
                </p>
              </div>
            </div>

            <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
              End-to-end agricultural supply chain management with cryptographic audit ledger traceability, cold-chain monitoring, and intelligent freight operations.
            </p>

            <div className="grid grid-cols-2 gap-4">
              {FEATURE_CARDS.map((card) => (
                <div
                  key={card.title}
                  className={`p-4 rounded-2xl bg-slate-900/50 border backdrop-blur-md ${COLOR_MAP[card.color]}`}
                >
                  <div className="text-2xl mb-2">{card.icon}</div>
                  <h3 className="font-semibold text-slate-200 text-sm">{card.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right auth card */}
          <div className="w-full max-w-md mx-auto animate-fade-in-up">
            <div className="relative group">
              {/* Card glow */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-[2rem] opacity-20 group-hover:opacity-40 blur transition duration-500" />

              <div className="relative bg-[#0b1121] rounded-[1.9rem] border border-slate-800/80 p-8 shadow-2xl backdrop-blur-xl">
                
                {/* Header */}
                <div className="mb-8 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/20 text-cyan-400 mb-4 shadow-inner">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-wide">Operations Access</h2>
                  <p className="text-slate-500 text-sm mt-1">Sign in to your AgriChain account</p>
                </div>

                {/* Error */}
                {formError && (
                  <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 animate-shake">
                    <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm text-red-300">{formError}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider ml-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => setTouched(t => ({ ...t, email: true }))}
                        className={`w-full bg-[rgba(2,6,23,0.5)] border ${
                          touched.email && !validateEmail(email)
                            ? 'border-red-500/50 focus:border-red-500'
                            : 'border-slate-700/50 focus:border-cyan-500'
                        } rounded-xl px-4 py-3.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono text-sm`}
                        placeholder="user@agrichain.com"
                      />
                      {touched.email && validateEmail(email) && (
                        <div className="absolute right-3 top-3.5 text-emerald-500">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider ml-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onBlur={() => setTouched(t => ({ ...t, password: true }))}
                        className={`w-full bg-[rgba(2,6,23,0.5)] border ${
                          touched.password && password.length < 6
                            ? 'border-red-500/50 focus:border-red-500'
                            : 'border-slate-700/50 focus:border-cyan-500'
                        } rounded-xl px-4 py-3.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono text-sm pr-12`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading || !isValid()}
                    className="w-full relative overflow-hidden h-12 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold tracking-wide shadow-lg shadow-cyan-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 group mt-2"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {loading ? (
                        <>
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Authenticating...
                        </>
                      ) : 'Sign In to AgriChain'}
                    </span>
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                  </button>

                  <div className="mt-4 text-center">
                    <span className="text-xs text-slate-500">Don't have an account? </span>
                    <Link to="/register" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                      Register now
                    </Link>
                  </div>
                </form>

                {/* Dev demo accounts (DEV only) */}
                {devAccounts.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-px flex-1 bg-slate-800" />
                      <button
                        onClick={() => setShowDevPanel(!showDevPanel)}
                        className="text-xs font-mono text-amber-500/70 hover:text-amber-400 uppercase tracking-wider border border-amber-500/20 px-2 py-0.5 rounded transition-colors"
                      >
                        DEV: Quick Select ({showDevPanel ? 'Hide' : 'Show'})
                      </button>
                      <div className="h-px flex-1 bg-slate-800" />
                    </div>

                    {showDevPanel && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          {devAccounts.map((acc) => (
                            <button
                              key={acc.email}
                              onClick={() => fillDemoAccount(acc)}
                              className="text-left p-2 rounded-lg bg-slate-900/80 border border-slate-700/50 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all group"
                            >
                              <div className="text-xs font-semibold text-slate-300 group-hover:text-amber-300">{acc.label}</div>
                              <div className="text-[10px] font-mono text-slate-600 mt-0.5 truncate">{acc.email}</div>
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] font-mono text-slate-500 text-center">
                          Seed passwords follow standard pattern: Role123! (e.g. Admin123!)
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <p className="mt-6 text-center text-xs text-slate-600 font-mono">
                  AGRICHAIN SECURE ACCESS // v1.0.0
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

