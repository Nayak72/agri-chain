import { Link } from 'react-router-dom'
import { Clock, ShieldAlert, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'
import AmbientBackground from '../../components/layout/AmbientBackground'

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-slate-200 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative selection:bg-cyan-500/30 selection:text-cyan-200">
      <AmbientBackground />

      <div className="max-w-md w-full mx-auto relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/10">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Account Pending Approval
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Administrator verification required for operational access
          </p>
        </div>

        <div className="bg-[#0b1121]/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300 text-xs leading-relaxed space-y-2">
            <div className="font-semibold flex items-center gap-2 text-sm text-amber-200">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Operational Security Policy
            </div>
            <p>
              Your account has been registered in the system. Because this role has custody over freight, inventory, or transport assets, an AgriChain system administrator must verify and approve your account before you can log in.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase text-slate-400">Next Steps</h4>
            <div className="flex items-start gap-3 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>An administrator reviews the application dossier.</span>
            </div>
            <div className="flex items-start gap-3 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>Upon approval, your login access is instantly granted.</span>
            </div>
            <div className="flex items-start gap-3 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>You can return to sign in once notification is received.</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <Link
              to="/login"
              className="w-full py-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-white font-medium text-sm transition-all flex items-center justify-center gap-2 hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

