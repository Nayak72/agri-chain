import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  Truck,
  Warehouse,
  Thermometer,
  ShieldCheck,
  Package,
  MapPin,
  ArrowRight,
  Leaf,
  Users,
  CheckCircle2,
  Activity,
  Cpu,
  Lock,
  Menu,
  X,
  ExternalLink,
  ChevronRight
} from 'lucide-react'

const CAPABILITIES = [
  {
    icon: Leaf,
    title: 'Produce Batch Tracking',
    desc: 'Farm-to-fork batch traceability with harvest dates, field origins, and variety classification.',
    color: 'emerald',
  },
  {
    icon: Warehouse,
    title: 'Warehouse Intake & Grading',
    desc: 'Physical receipt logging with exact weight reconciliation and quality grading inspections.',
    color: 'indigo',
  },
  {
    icon: Truck,
    title: 'Competitive Freight Bidding',
    desc: 'Transparent multi-carrier quotations, vehicle dispatching, and driver route allocation.',
    color: 'cyan',
  },
  {
    icon: Thermometer,
    title: 'Cold-Chain Monitoring',
    desc: 'Simulated real-time sensor streams tracking temperature and humidity excursions across reefer transit.',
    color: 'amber',
  },
  {
    icon: Lock,
    title: 'SHA-256 Audit Ledger',
    desc: 'Cryptographic hash-chained immutable audit trail detecting unauthorized modifications.',
    color: 'purple',
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Access Control',
    desc: 'Strict authorization boundaries tailored for Farmers, Warehouses, Transporters, Drivers, and Buyers.',
    color: 'blue',
  },
]

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Harvest & Batching',
    role: 'Farmer',
    desc: 'Farmer registers field plots and logs harvest batches with quantity, grade, and shelf-life estimates.',
  },
  {
    step: '02',
    title: 'Warehouse Intake',
    role: 'Warehouse Manager',
    desc: 'Produce is weighed, reconciled (accepted + damaged + rejected = received), and graded at receiving dock.',
  },
  {
    step: '03',
    title: 'Purchase & Freight',
    role: 'Buyer & Transporter',
    desc: 'Commercial purchase order initiated; buyer requests freight quotes and accepts carrier bids.',
  },
  {
    step: '04',
    title: 'Dispatch & Checkpoints',
    role: 'Transporter & Driver',
    desc: 'Vehicle and driver assigned; corridor checkpoints logged along designated transport routes.',
  },
  {
    step: '05',
    title: 'Arrival & Attestation',
    role: 'Driver & Buyer',
    desc: 'Driver submits delivery weights and condition report; buyer attests acceptance or partial claim.',
  },
  {
    step: '06',
    title: 'Audit Finalization',
    role: 'Automated Ledger',
    desc: 'Cryptographic hash link sealed in simulated SHA-256 chain for auditability and compliance.',
  },
]

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 1. Header Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#030712]/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <span className="text-white font-bold text-lg font-mono">A</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-white leading-none">AgriChain</span>
              <span className="text-[10px] text-cyan-400 font-mono tracking-wider">SUPPLY CHAIN OS</span>
            </div>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
            <a href="#capabilities" className="hover:text-cyan-400 transition-colors">Capabilities</a>
            <a href="#workflow" className="hover:text-cyan-400 transition-colors">Workflows</a>
            <a href="#cold-chain" className="hover:text-cyan-400 transition-colors">Cold-Chain</a>
            <a href="#traceability" className="hover:text-cyan-400 transition-colors">Audit Ledger</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="text-sm font-medium text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 px-4 py-2 rounded-lg font-semibold shadow-md shadow-cyan-500/20 transition-all flex items-center gap-1.5"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-medium text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 px-4 py-2 rounded-lg font-semibold shadow-md shadow-cyan-500/20 transition-all flex items-center gap-1.5"
                >
                  Get Started <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-800 bg-[#070d1d] px-4 pt-3 pb-5 space-y-3">
            <a
              href="#capabilities"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-slate-300 hover:text-cyan-400 text-sm font-medium"
            >
              Capabilities
            </a>
            <a
              href="#workflow"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-slate-300 hover:text-cyan-400 text-sm font-medium"
            >
              Workflows
            </a>
            <a
              href="#cold-chain"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-slate-300 hover:text-cyan-400 text-sm font-medium"
            >
              Cold-Chain
            </a>
            <a
              href="#traceability"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-slate-300 hover:text-cyan-400 text-sm font-medium"
            >
              Audit Ledger
            </a>
            <div className="pt-3 border-t border-slate-800 flex gap-2">
              <Link
                to="/login"
                className="flex-1 text-center py-2 text-sm border border-slate-700 rounded-lg text-slate-200"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="flex-1 text-center py-2 text-sm font-semibold rounded-lg bg-cyan-400 text-slate-950"
              >
                Register
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* 2. Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-cyan-500/15 via-emerald-500/10 to-transparent blur-3xl rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono uppercase tracking-wider mb-6">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Agricultural Logistics Platform
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.1]">
            Smarter Supply Chain,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">
              Fresher Produce
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Connect farmers, warehouses, transporters, drivers, and buyers through a unified
            operating system with simulated cold-chain monitoring and SHA-256 hash-chained audit trails.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <Link
              to={isAuthenticated ? "/dashboard" : "/register"}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
            >
              {isAuthenticated ? "Enter Operations Dashboard" : "Start Managing Supply Chain"}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#capabilities"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white font-medium text-sm transition-all text-center"
            >
              Platform Overview
            </a>
          </div>

          {/* Key Platform Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 pt-10 border-t border-slate-800/80 max-w-4xl mx-auto">
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-cyan-400">6 Roles</div>
              <div className="text-xs text-slate-400 mt-1">Full Supply Chain RBAC</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">100%</div>
              <div className="text-xs text-slate-400 mt-1">Exact Weight Reconciliation</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-400">Telemetry</div>
              <div className="text-xs text-slate-400 mt-1">Simulated IoT Reefer Feeds</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-purple-400">SHA-256</div>
              <div className="text-xs text-slate-400 mt-1">Hash-Chained Audit Ledger</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Platform Capabilities */}
      <section id="capabilities" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-800/80 bg-[#070d1d]/60">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-mono uppercase tracking-widest text-cyan-400 mb-2">Core Architecture</h2>
            <h3 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Enterprise Agricultural Supply Chain Capabilities
            </h3>
            <p className="text-slate-400 mt-3 text-sm sm:text-base">
              Built ground-up to manage produce from regional harvest fields to urban retail fulfillment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CAPABILITIES.map((cap, i) => {
              const Icon = cap.icon
              return (
                <div
                  key={i}
                  className="p-6 rounded-2xl bg-[#0b1121] border border-slate-800 hover:border-slate-700 transition-all card-glow-cyan"
                >
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">{cap.title}</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">{cap.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 4. Supply Chain Workflow */}
      <section id="workflow" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-mono uppercase tracking-widest text-emerald-400 mb-2">Operational Pipeline</h2>
            <h3 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              6-Stage Supply Chain Lifecycle
            </h3>
            <p className="text-slate-400 mt-3 text-sm sm:text-base">
              Coordinated cross-role transactions ensure complete custodial clarity at every transition.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {WORKFLOW_STEPS.map((s, idx) => (
              <div
                key={idx}
                className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-cyan-400 font-bold text-lg">{s.step}</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {s.role}
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-base mb-1.5">{s.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Cold-Chain Monitoring Preview */}
      <section id="cold-chain" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-800 bg-[#070d1d]/60">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono uppercase tracking-wider mb-4">
                <Activity className="w-3.5 h-3.5" />
                Simulated Reefer Telematics
              </div>
              <h3 className="text-3xl font-bold text-white tracking-tight mb-4">
                Continuous Environmental Telemetry & Temperature Excursion Alerts
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Fresh produce requires tight thermal regulation. Our cold-chain simulator models active reefer conditions with customizable normal, warning, and critical deviation excursions across transit.
              </p>

              <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed mb-6">
                <strong>SIMULATED DATA:</strong> Temperature, humidity, and sensor excursion readings are generated by the simulation engine for demonstration and testing of alert thresholds without physical hardware requirements.
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-300">
                    <strong className="text-white">Configurable Presets:</strong> Test optimal transit, minor warning drifts, or severe reefer compressor breakdown scenarios.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-300">
                    <strong className="text-white">Real-Time Alert Resolution:</strong> Acknowledge and resolve temperature spikes with logged corrective actions.
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated telemetry card */}
            <div className="rounded-2xl border border-slate-800 bg-[#0b1121] p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-cyan-400" />
                  <span className="font-mono text-sm text-white font-bold">REEFER-SENS-084</span>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  NORMAL
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 my-6">
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[11px] font-mono text-slate-400 uppercase">Current Temp</div>
                  <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">4.2 °C</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Range: 2.0 °C - 6.0 °C</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[11px] font-mono text-slate-400 uppercase">Humidity</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">88.5 %</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Target: 85% - 92%</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Thermal Compliance</span>
                  <span className="text-emerald-400 font-bold">98.4%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: '98.4%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Cryptographic Audit Ledger Preview */}
      <section id="traceability" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-mono uppercase tracking-widest text-purple-400 mb-2">Cryptographic Verification</h2>
            <h3 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Tamper-Evident SHA-256 Audit Trail
            </h3>
            <p className="text-slate-400 mt-3 text-sm sm:text-base">
              Every critical lifecycle event links to its predecessor via SHA-256 cryptographic hashing.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0b1121] p-6 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-purple-400">Block #1</span>
                  <span className="text-[10px] font-mono bg-purple-500/10 text-purple-300 px-1.5 py-0.5 rounded">GENESIS</span>
                </div>
                <div className="text-xs font-mono text-slate-300 truncate">7a4b...91c0</div>
                <div className="text-[11px] text-slate-400 mt-1">PRODUCE_BATCH_CREATED</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-purple-400">Block #2</span>
                  <span className="text-[10px] font-mono bg-cyan-500/10 text-cyan-300 px-1.5 py-0.5 rounded">LINKED</span>
                </div>
                <div className="text-xs font-mono text-slate-300 truncate">e83c...f4a1</div>
                <div className="text-[11px] text-slate-400 mt-1">WAREHOUSE_RECEIVED</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-purple-400">Block #3</span>
                  <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 rounded">LOCKED</span>
                </div>
                <div className="text-xs font-mono text-slate-300 truncate">3b2d...19e8</div>
                <div className="text-[11px] text-slate-400 mt-1">DELIVERY_CONFIRMED</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 leading-relaxed">
              <strong>Simulated Cryptographic Architecture:</strong> The AgriChain audit ledger implements a deterministic SHA-256 hash-chain stored directly in MongoDB. It provides instant verification and tamper detection for enterprise compliance without external blockchain gas fees or latency.
            </div>
          </div>
        </div>
      </section>

      {/* 7. Final Call to Action */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-800 bg-gradient-to-b from-[#070d1d] to-[#030712] text-center">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Coordinate Your Agricultural Supply Chain?
          </h3>
          <p className="text-slate-400 text-sm sm:text-base mb-8 max-w-xl mx-auto">
            Experience role-based supply chain management across produce batching, warehouse grading, freight quotation, and cold-chain integrity.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all"
            >
              Create Your Account
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-200 font-medium text-sm transition-all"
            >
              Sign In to Platform
            </Link>
          </div>
        </div>
      </section>

      {/* 8. System Footer */}
      <footer className="border-t border-slate-800/80 py-12 px-4 sm:px-6 lg:px-8 bg-[#02050c]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-white font-bold font-mono text-sm">
              A
            </div>
            <span className="font-bold text-white text-base">AgriChain</span>
          </div>

          <p className="text-xs text-slate-400 text-center md:text-left max-w-md">
            Simulated agricultural logistics and freight operating system. Cold-chain sensor readings and cryptographic hash chain verification are simulated for demonstration.
          </p>

          <div className="flex items-center gap-5 text-xs text-slate-400">
            <Link to="/login" className="hover:text-cyan-400 transition-colors">Sign In</Link>
            <Link to="/register" className="hover:text-cyan-400 transition-colors">Register</Link>
            <a href="#capabilities" className="hover:text-cyan-400 transition-colors">Platform</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

