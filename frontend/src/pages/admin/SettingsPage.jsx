import React, { useState, useEffect } from 'react'
import {
  Settings,
  Server,
  Shield,
  Activity,
  CheckCircle2,
  XCircle,
  Database,
  Lock,
  Cpu,
  RefreshCw,
  Terminal,
  Radio
} from 'lucide-react'
import { systemApi } from '../../api/system.api'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/common/PageHeader'

export default function SettingsPage() {
  const { user } = useAuth()
  const [healthStatus, setHealthStatus] = useState(null)
  const [readyStatus, setReadyStatus] = useState(null)
  const [pingLoading, setPingLoading] = useState(false)

  const checkHealth = async () => {
    setPingLoading(true)
    try {
      const [liveRes, readyRes] = await Promise.all([
        systemApi.healthLive().catch(err => ({ data: { status: 'down', error: err.message } })),
        systemApi.healthReady().catch(err => ({ data: { status: 'down', error: err.message } })),
      ])
      setHealthStatus(liveRes.data)
      setReadyStatus(readyRes.data)
    } finally {
      setPingLoading(false)
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Administration', href: '/settings' },
          { label: 'Platform Diagnostics' }
        ]}
        title="Platform Diagnostics & Architecture Settings"
        description="Runtime environment inspection, backend health telemetry, security parameters, and cold-chain envelope profiles."
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-stone-100 text-stone-700 border border-stone-200">
            <Server className="h-3.5 w-3.5 text-[#244634]" />
            OPERATIONS CONSOLE
          </span>
        }
        actions={
          <button
            onClick={checkHealth}
            disabled={pingLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-mono rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 shadow-xs transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${pingLoading ? 'animate-spin text-stone-400' : 'text-stone-500'}`} />
            <span>Run Health Diagnostic</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Backend Health Status Deck */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#244634]" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-900 font-mono">
                FastAPI Gateway Status
              </h2>
            </div>
            <span className="text-xs font-mono text-stone-500">Root /health/</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-stone-600 font-sans">Liveness Probe (/health/live):</span>
              {healthStatus?.status === 'ok' ? (
                <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> HEALTHY (200 OK)
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-rose-700 font-bold">
                  <XCircle className="h-4 w-4 text-rose-600" /> UNREACHABLE
                </span>
              )}
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-stone-600 font-sans">Readiness Probe (/health/ready):</span>
              {readyStatus?.status === 'ok' ? (
                <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> READY FOR TRAFFIC
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-700 font-bold">
                  <Activity className="h-4 w-4 animate-spin text-amber-600" /> INITIALIZING
                </span>
              )}
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-stone-600 font-sans">API Prefix & Route:</span>
              <span className="text-[#244634] font-bold">{import.meta.env.VITE_API_BASE_URL || '/api/v1'}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-stone-600 font-sans">Runtime Mode:</span>
              <span className="text-stone-900 uppercase font-semibold">
                {import.meta.env.MODE || 'production'}
              </span>
            </div>
          </div>
        </div>

        {/* Current Authenticated Session & RBAC Identity */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-700" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-900 font-mono">
                Active Session Dossier
              </h2>
            </div>
            <span className="text-xs font-mono text-emerald-700 font-semibold">Authenticated</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-stone-600 font-sans">Identity Name:</span>
              <span className="text-stone-900 font-semibold font-sans">{user?.full_name || 'Anonymous User'}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-stone-600 font-sans">User Email:</span>
              <span className="text-stone-800">{user?.email || 'N/A'}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-stone-600 font-sans">Enforced RBAC Role:</span>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                {user?.role || 'N/A'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-stone-600 font-sans">Subject Token ID:</span>
              <span className="text-stone-500 truncate max-w-[200px]">{user?.sub || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Security & Cryptography Parameters */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-purple-700" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-900 font-mono">
                Security & Cryptography Standards
              </h2>
            </div>
            <span className="text-xs font-mono text-purple-700 font-semibold">FIPS 180-4</span>
          </div>

          <div className="space-y-2.5 font-mono text-xs text-stone-700">
            <div className="flex items-center justify-between py-2 border-b border-stone-100">
              <span className="text-stone-500 font-sans">Ledger Block Hashing:</span>
              <span className="text-stone-900 font-bold">SHA-256 (Canonical JSON)</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-stone-100">
              <span className="text-stone-500 font-sans">Access Token Lifecycle:</span>
              <span className="text-stone-900 font-medium">30 Min (Proactive Refresh at 25 Min)</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-stone-100">
              <span className="text-stone-500 font-sans">Refresh Token Storage:</span>
              <span className="text-emerald-700 font-semibold">HttpOnly, SameSite=Lax Cookie</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-stone-500 font-sans">XSS Protection:</span>
              <span className="text-emerald-700 font-semibold">In-Memory Token Store</span>
            </div>
          </div>
        </div>

        {/* Cold-Chain Produce Handling Envelopes */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-900 font-mono">
                Cold-Chain SLA Envelopes
              </h2>
            </div>
            <span className="text-xs font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">Produce Profiles</span>
          </div>

          <div className="space-y-2.5 font-mono text-xs text-stone-700">
            <div className="flex items-center justify-between py-2 border-b border-stone-100">
              <span className="text-stone-500 font-sans">Tomatoes & Tropical:</span>
              <span className="text-[#244634] font-semibold">4.0°C – 8.0°C (85%–90% RH)</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-stone-100">
              <span className="text-stone-500 font-sans">Apples & Pome Fruits:</span>
              <span className="text-[#244634] font-semibold">0.0°C – 4.0°C (90%–95% RH)</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-stone-100">
              <span className="text-stone-500 font-sans">Leafy Greens & Brassica:</span>
              <span className="text-[#244634] font-semibold">0.0°C – 2.0°C (95%–100% RH)</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-stone-500 font-sans">Potatoes & Root Veg:</span>
              <span className="text-[#244634] font-semibold">8.0°C – 12.0°C (85%–90% RH)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
