import { Link } from 'react-router-dom'
import { Clock, ShieldAlert, ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen bg-[#F6F4EC] text-[#26312A] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-forest/20 selection:text-forest">
      <div className="max-w-md w-full mx-auto">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto mb-4 shadow-xs">
            <Clock className="w-7 h-7 stroke-[2]" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-primary font-serif">
            Account Pending Approval
          </h2>
          <p className="text-xs sm:text-sm text-ink-secondary mt-1.5">
            Administrator verification required for operational access
          </p>
        </div>

        <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-2">
            <div className="font-bold flex items-center gap-2 text-sm text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-700" />
              Operational Security Policy
            </div>
            <p>
              Your account has been registered in the system. Because this role has custody over freight, inventory, or transport assets, an AgriChain system administrator must verify and approve your account before you can log in.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-mono font-semibold uppercase text-ink-secondary">Verification Process</h4>
            <div className="flex items-start gap-3 text-xs text-ink-secondary">
              <CheckCircle2 className="w-4 h-4 text-forest shrink-0 mt-0.5" />
              <span>An administrator reviews the registered carrier or facility record.</span>
            </div>
            <div className="flex items-start gap-3 text-xs text-ink-secondary">
              <CheckCircle2 className="w-4 h-4 text-forest shrink-0 mt-0.5" />
              <span>Upon approval, your login access is instantly granted.</span>
            </div>
            <div className="flex items-start gap-3 text-xs text-ink-secondary">
              <CheckCircle2 className="w-4 h-4 text-forest shrink-0 mt-0.5" />
              <span>You can return to sign in once verification is confirmed.</span>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <Link
              to="/login"
              className="w-full py-3 rounded-xl bg-forest hover:bg-forest-dark text-white font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2"
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
