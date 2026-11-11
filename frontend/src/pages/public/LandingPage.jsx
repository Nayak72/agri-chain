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
  ChevronRight,
  Boxes,
  Compass,
} from 'lucide-react'

const CAPABILITIES = [
  {
    icon: Leaf,
    title: 'Produce Batch Tracking',
    desc: 'Farm-to-fork batch traceability with harvest dates, field origins, and variety classification.',
    accent: 'forest',
  },
  {
    icon: Warehouse,
    title: 'Warehouse Intake & Grading',
    desc: 'Physical receipt logging with exact weight reconciliation.',
    accent: 'slate',
  },
  {
    icon: Truck,
    title: 'Competitive Freight Bidding',
    desc: 'Transparent multi-carrier quotations, vehicle dispatching, and driver route allocation.',
    accent: 'terracotta',
  },
  {
    icon: Thermometer,
    title: 'Cold-Chain Monitoring',
    desc: 'On-demand simulated readings track temperature and humidity excursions during reefer transit.',
    accent: 'harvest',
  },
  {
    icon: Lock,
    title: 'SHA-256 Audit Ledger',
    desc: 'Cryptographic hash-chained immutable audit trail detecting unauthorized modifications.',
    accent: 'sage',
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Access Control',
    desc: 'Strict authorization boundaries tailored for Farmers, Warehouses, Transporters, Drivers, and Buyers.',
    accent: 'forest',
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
    <div className="min-h-screen bg-[#F6F4EC] text-[#26312A] font-sans selection:bg-[#244634]/20 selection:text-[#244634]">
      {/* 1. Header Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#F6F4EC]/90 backdrop-blur-md border-b border-[#E5E3D9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-forest text-white flex items-center justify-center shadow-xs">
              <Leaf className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-ink-primary leading-none">AgriChain</span>
              <span className="text-[10px] text-forest font-mono tracking-wider font-semibold">NATURE MEETS PRECISION</span>
            </div>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-ink-secondary">
            <a href="#capabilities" className="hover:text-forest transition-colors">Capabilities</a>
            <a href="#workflow" className="hover:text-forest transition-colors">Workflows</a>
            <a href="#cold-chain" className="hover:text-forest transition-colors">Cold-Chain</a>
            <a href="#traceability" className="hover:text-forest transition-colors">Audit Ledger</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="text-sm font-semibold text-white bg-forest hover:bg-forest-dark px-4 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-ink-primary hover:text-forest px-3 py-1.5 rounded-lg hover:bg-surface-muted transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-semibold text-white bg-forest hover:bg-forest-dark px-4 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  Get Started <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-ink-secondary hover:text-ink-primary hover:bg-surface-muted"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-surface px-4 pt-3 pb-5 space-y-3 shadow-lg">
            <a
              href="#capabilities"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-ink-primary hover:text-forest text-sm font-medium py-1"
            >
              Capabilities
            </a>
            <a
              href="#workflow"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-ink-primary hover:text-forest text-sm font-medium py-1"
            >
              Workflows
            </a>
            <a
              href="#cold-chain"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-ink-primary hover:text-forest text-sm font-medium py-1"
            >
              Cold-Chain
            </a>
            <a
              href="#traceability"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-ink-primary hover:text-forest text-sm font-medium py-1"
            >
              Audit Ledger
            </a>
            <div className="pt-3 border-t border-border flex gap-2">
              <Link
                to="/login"
                className="flex-1 text-center py-2 text-sm border border-border rounded-xl text-ink-primary bg-surface-muted font-medium"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="flex-1 text-center py-2 text-sm font-semibold rounded-xl bg-forest text-white"
              >
                Register
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* 2. Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-forest/5 via-terracotta/5 to-transparent blur-3xl rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-forest/10 border border-forest/20 text-forest text-xs font-mono uppercase tracking-wider mb-6 font-semibold">
            <span className="w-2 h-2 rounded-full bg-forest animate-pulse" />
            Agricultural Logistics Platform
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-ink-primary mb-6 leading-[1.1] font-serif">
            Smarter Supply Chain,<br />
            <span className="text-forest italic">
              Fresher Produce
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-ink-secondary max-w-2xl mx-auto mb-10 leading-relaxed font-sans">
            Connect farmers, warehouses, transporters, drivers, and buyers through a unified
            operating system with simulated cold-chain monitoring and SHA-256 hash-chained audit trails.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <Link
              to={isAuthenticated ? "/dashboard" : "/register"}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-forest hover:bg-forest-dark text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              {isAuthenticated ? "Enter Operations Dashboard" : "Start Managing Supply Chain"}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#capabilities"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-surface border border-border hover:bg-surface-muted text-ink-primary font-medium text-sm transition-all text-center shadow-2xs"
            >
              Platform Overview
            </a>
          </div>

          {/* Key Platform Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 pt-10 border-t border-border max-w-4xl mx-auto">
            <div className="p-5 rounded-2xl bg-surface border border-border text-center shadow-2xs">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-forest">6 Roles</div>
              <div className="text-xs text-ink-secondary mt-1 font-medium">Full Supply Chain RBAC</div>
            </div>
            <div className="p-5 rounded-2xl bg-surface border border-border text-center shadow-2xs">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-forest">100%</div>
              <div className="text-xs text-ink-secondary mt-1 font-medium">Exact Weight Reconciliation</div>
            </div>
            <div className="p-5 rounded-2xl bg-surface border border-border text-center shadow-2xs">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-terracotta">Telemetry</div>
              <div className="text-xs text-ink-secondary mt-1 font-medium">Simulated IoT Reefer Feeds</div>
            </div>
            <div className="p-5 rounded-2xl bg-surface border border-border text-center shadow-2xs">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-sage-dark">SHA-256</div>
              <div className="text-xs text-ink-secondary mt-1 font-medium">Hash-Chained Audit Ledger</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Platform Capabilities */}
      <section id="capabilities" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border bg-surface-muted/40">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-mono uppercase tracking-widest text-forest font-semibold mb-2">Core Architecture</h2>
            <h3 className="text-3xl sm:text-4xl font-bold text-ink-primary tracking-tight font-serif">
              Enterprise Agricultural Supply Chain Capabilities
            </h3>
            <p className="text-ink-secondary mt-3 text-sm sm:text-base leading-relaxed">
              Built ground-up to manage produce from regional harvest fields to urban retail fulfillment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CAPABILITIES.map((cap, i) => {
              const Icon = cap.icon
              return (
                <div
                  key={i}
                  className="p-6 rounded-2xl bg-surface border border-border shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-forest/10 border border-forest/20 text-forest flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 stroke-[1.8]" />
                  </div>
                  <h4 className="text-lg font-bold text-ink-primary mb-2 tracking-tight">{cap.title}</h4>
                  <p className="text-ink-secondary text-sm leading-relaxed">{cap.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 4. Supply Chain Workflow */}
      <section id="workflow" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-mono uppercase tracking-widest text-forest font-semibold mb-2">Operational Pipeline</h2>
            <h3 className="text-3xl sm:text-4xl font-bold text-ink-primary tracking-tight font-serif">
              6-Stage Supply Chain Lifecycle
            </h3>
            <p className="text-ink-secondary mt-3 text-sm sm:text-base leading-relaxed">
              Coordinated cross-role transactions ensure complete custodial clarity at every transition.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {WORKFLOW_STEPS.map((s, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-surface border border-border shadow-2xs relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-forest font-bold text-lg">{s.step}</span>
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-lg bg-surface-muted text-ink-primary border border-border font-semibold">
                      {s.role}
                    </span>
                  </div>
                  <h4 className="font-bold text-ink-primary text-base mb-1.5">{s.title}</h4>
                  <p className="text-xs text-ink-secondary leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Cold-Chain Monitoring Preview */}
      <section id="cold-chain" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border bg-surface-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono uppercase tracking-wider mb-4 font-semibold">
                <Activity className="w-3.5 h-3.5" />
                Simulated Reefer Telematics
              </div>
              <h3 className="text-3xl font-bold text-ink-primary tracking-tight mb-4 font-serif">
                Continuous Environmental Telemetry & Temperature Excursion Alerts
              </h3>
              <p className="text-ink-secondary text-sm leading-relaxed mb-6">
                Fresh produce requires tight thermal regulation. Our cold-chain simulator models active reefer conditions with customizable normal, warning, and critical deviation excursions across transit.
              </p>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed mb-6">
                <strong>SIMULATED DATA:</strong> Temperature, humidity, and sensor excursion readings are generated by the simulation engine for demonstration and testing of alert thresholds without physical hardware requirements.
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-forest shrink-0 mt-0.5" />
                  <div className="text-xs text-ink-secondary leading-relaxed">
                    <strong className="text-ink-primary">Configurable Presets:</strong> Test optimal transit, minor warning drifts, or severe reefer compressor breakdown scenarios.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-forest shrink-0 mt-0.5" />
                  <div className="text-xs text-ink-secondary leading-relaxed">
                    <strong className="text-ink-primary">Real-Time Alert Resolution:</strong> Acknowledge and resolve temperature spikes with logged corrective actions.
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated telemetry card */}
            <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-forest" />
                  <span className="font-mono text-sm text-ink-primary font-bold">REEFER-SENS-084</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  NORMAL
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 my-6">
                <div className="p-4 rounded-xl bg-surface-muted/60 border border-border">
                  <div className="text-[11px] font-mono text-ink-secondary uppercase">Current Temp</div>
                  <div className="text-2xl font-bold font-mono text-forest mt-1">4.2 °C</div>
                  <div className="text-[10px] text-ink-tertiary mt-0.5">Range: 2.0 °C - 6.0 °C</div>
                </div>
                <div className="p-4 rounded-xl bg-surface-muted/60 border border-border">
                  <div className="text-[11px] font-mono text-ink-secondary uppercase">Humidity</div>
                  <div className="text-2xl font-bold font-mono text-ink-primary mt-1">88.5 %</div>
                  <div className="text-[10px] text-ink-tertiary mt-0.5">Target: 85% - 92%</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-ink-secondary">Thermal Compliance</span>
                  <span className="text-forest font-bold">98.4%</span>
                </div>
                <div className="w-full bg-surface-muted rounded-full h-2 overflow-hidden border border-border/40">
                  <div className="bg-forest h-2 rounded-full" style={{ width: '98.4%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Cryptographic Audit Ledger Preview */}
      <section id="traceability" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-mono uppercase tracking-widest text-forest font-semibold mb-2">Cryptographic Verification</h2>
            <h3 className="text-3xl sm:text-4xl font-bold text-ink-primary tracking-tight font-serif">
              Tamper-Evident SHA-256 Audit Trail
            </h3>
            <p className="text-ink-secondary mt-3 text-sm sm:text-base leading-relaxed">
              Every critical lifecycle event links to its predecessor via SHA-256 cryptographic hashing.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-surface-muted/60 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-forest font-bold">Block #1</span>
                  <span className="text-[10px] font-mono bg-forest/10 text-forest px-2 py-0.5 rounded font-semibold">GENESIS</span>
                </div>
                <div className="text-xs font-mono text-ink-primary truncate font-semibold">7a4b...91c0</div>
                <div className="text-[11px] text-ink-secondary mt-1 font-mono">PRODUCE_BATCH_CREATED</div>
              </div>

              <div className="p-4 rounded-xl bg-surface-muted/60 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-forest font-bold">Block #2</span>
                  <span className="text-[10px] font-mono bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded font-semibold">LINKED</span>
                </div>
                <div className="text-xs font-mono text-ink-primary truncate font-semibold">e83c...f4a1</div>
                <div className="text-[11px] text-ink-secondary mt-1 font-mono">WAREHOUSE_RECEIVED</div>
              </div>

              <div className="p-4 rounded-xl bg-surface-muted/60 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-forest font-bold">Block #3</span>
                  <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-semibold">LOCKED</span>
                </div>
                <div className="text-xs font-mono text-ink-primary truncate font-semibold">3b2d...19e8</div>
                <div className="text-[11px] text-ink-secondary mt-1 font-mono">DELIVERY_CONFIRMED</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-forest/5 border border-forest/15 text-xs text-ink-secondary leading-relaxed">
              <strong className="text-forest">Simulated Cryptographic Architecture:</strong> The AgriChain audit ledger implements a deterministic SHA-256 hash-chain stored directly in MongoDB. It provides instant verification and tamper detection for enterprise compliance without external blockchain gas fees or latency.
            </div>
          </div>
        </div>
      </section>

      {/* 7. Final Call to Action */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border bg-gradient-to-b from-surface-muted/40 to-[#F6F4EC] text-center">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-3xl sm:text-4xl font-bold text-ink-primary mb-4 font-serif">
            Ready to Coordinate Your Agricultural Supply Chain?
          </h3>
          <p className="text-ink-secondary text-sm sm:text-base mb-8 max-w-xl mx-auto leading-relaxed">
            Experience role-based supply chain management across produce batching, warehouse grading, freight quotation, and cold-chain integrity.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-forest hover:bg-forest-dark text-white font-bold text-sm shadow-md transition-all"
            >
              Create Your Account
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-surface border border-border hover:bg-surface-muted text-ink-primary font-medium text-sm transition-all"
            >
              Sign In to Platform
            </Link>
          </div>
        </div>
      </section>

      {/* 8. System Footer */}
      <footer className="border-t border-border py-12 px-4 sm:px-6 lg:px-8 bg-surface">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-forest text-white flex items-center justify-center font-bold font-mono text-sm">
              <Leaf className="h-4 w-4" />
            </div>
            <span className="font-bold text-ink-primary text-base">AgriChain</span>
          </div>

          <p className="text-xs text-ink-secondary text-center md:text-left max-w-md">
            Simulated agricultural logistics and freight operating system. Cold-chain sensor readings and cryptographic hash chain verification are simulated for demonstration.
          </p>

          <div className="flex items-center gap-6 text-xs text-ink-secondary font-medium">
            <Link to="/login" className="hover:text-forest transition-colors">Sign In</Link>
            <Link to="/register" className="hover:text-forest transition-colors">Register</Link>
            <a href="#capabilities" className="hover:text-forest transition-colors">Capabilities</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
