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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Settings className="h-6 w-6 text-cyan-400" />
              Platform Diagnostics & Architecture Settings
            </h1>
            <span className="px-2.5 py-1 text-xs font-mono font-semibold uppercase bg-slate-800 text-slate-300 border border-slate-700 rounded flex items-center gap-1.5">
              <Server className="h-3 w-3 text-cyan-400" />
              OPERATIONS CONSOLE
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Runtime environment inspection, backend health telemetry, security parameters, and cold-chain envelope profiles
          </p>
        </div>

        <button
          onClick={checkHealth}
          disabled={pingLoading}
          className="px-3 py-2 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${pingLoading ? 'animate-spin' : ''}`} />
          Run Health Diagnostic
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Backend Health Status Deck */}
        <div className="rounded-xl border border-slate-800 bg-[#0b1121] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
                FastAPI Gateway Status
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">Root /health/</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Liveness Probe (/health/live):</span>
              {healthStatus?.status === 'ok' ? (
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <CheckCircle2 className="h-4 w-4" /> HEALTHY (200 OK)
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-red-400 font-bold">
                  <XCircle className="h-4 w-4" /> UNREACHABLE
                </span>
              )}
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Readiness Probe (/health/ready):</span>
              {readyStatus?.status === 'ok' ? (
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <CheckCircle2 className="h-4 w-4" /> READY FOR TRAFFIC
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <Activity className="h-4 w-4 animate-spin" /> INITIALIZING
                </span>
              )}
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400">API Prefix & Route:</span>
              <span className="text-cyan-400">{import.meta.env.VITE_API_BASE_URL || '/api/v1'}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Runtime Mode:</span>
              <span className="text-slate-200 uppercase font-semibold">
                {import.meta.env.MODE || 'production'}
              </span>
            </div>
          </div>
        </div>

        {/* Current Authenticated Session & RBAC Identity */}
        <div className="rounded-xl border border-slate-800 bg-[#0b1121] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
                Active Session Dossier
              </h2>
            </div>
            <span className="text-xs font-mono text-emerald-400">Authenticated</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Identity Name:</span>
              <span className="text-white font-semibold">{user?.full_name || 'Anonymous User'}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400">User Email:</span>
              <span className="text-slate-200">{user?.email || 'N/A'}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Enforced RBAC Role:</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                {user?.role || 'N/A'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Subject Token ID:</span>
              <span className="text-slate-400 truncate max-w-[200px]">{user?.sub || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Security & Cryptography Parameters */}
        <div className="rounded-xl border border-slate-800 bg-[#0b1121] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-purple-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
                Security & Cryptography Standards
              </h2>
            </div>
            <span className="text-xs font-mono text-purple-400">FIPS 180-4</span>
          </div>

          <div className="space-y-2.5 font-mono text-xs text-slate-300">
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Ledger Block Hashing:</span>
              <span className="text-white font-bold">SHA-256 (Canonical JSON)</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Access Token Lifecycle:</span>
              <span className="text-white">30 Min (Proactive Refresh at 25 Min)</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Refresh Token Storage:</span>
              <span className="text-emerald-400">HttpOnly, SameSite=Lax Cookie</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">XSS Protection:</span>
              <span className="text-emerald-400">In-Memory Token Store</span>
            </div>
          </div>
        </div>

        {/* Cold-Chain Produce Handling Envelopes */}
        <div className="rounded-xl border border-slate-800 bg-[#0b1121] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
                Cold-Chain SLA Envelopes
              </h2>
            </div>
            <span className="text-xs font-mono text-amber-400">Produce Profiles</span>
          </div>

          <div className="space-y-2.5 font-mono text-xs text-slate-300">
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Tomatoes & Tropical:</span>
              <span className="text-cyan-400">4.0°C – 8.0°C (85%–90% RH)</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Apples & Pome Fruits:</span>
              <span className="text-cyan-400">0.0°C – 4.0°C (90%–95% RH)</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Leafy Greens & Brassica:</span>
              <span className="text-cyan-400">0.0°C – 2.0°C (95%–100% RH)</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">Potatoes & Root Veg:</span>
              <span className="text-cyan-400">8.0°C – 12.0°C (85%–90% RH)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

