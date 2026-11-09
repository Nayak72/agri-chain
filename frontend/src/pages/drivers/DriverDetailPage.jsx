import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { driversApi } from '../../api/commerce.api'
import { formatDate, formatDateTime } from '../../utils'

export default function DriverDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: driver, isLoading, error } = useQuery({
    queryKey: ['driver', id],
    queryFn: () => driversApi.get(id).then(res => res.data),
  })

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
        <span className="text-slate-500 font-mono text-sm animate-pulse">Retrieving driver profile...</span>
      </div>
    )
  }

  if (error || !driver) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-white mb-2">Driver Dossier Not Found</h2>
        <p className="text-slate-400 mb-6">Could not retrieve personnel record for driver ID: {id}</p>
        <button
          onClick={() => navigate('/drivers')}
          className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
        >
          Return to Drivers Directory
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-10 animate-fade-in-up">
      <button
        onClick={() => navigate('/drivers')}
        className="text-xs font-mono text-cyan-400 hover:text-cyan-300 mb-6 flex items-center gap-2 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        DRIVERS_DIRECTORY
      </button>

      {/* Identity Card */}
      <div className="bg-[#0b1121] border border-slate-800 rounded-3xl p-8 mb-6 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                COMMERCIAL OPERATOR
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${
                driver.status === 'AVAILABLE'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                {driver.status || 'AVAILABLE'}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">{driver.name}</h1>
            <p className="text-slate-400 text-sm mt-1">
              License: <span className="text-cyan-400 font-mono font-bold">{driver.license_number}</span> • Valid until {formatDate(driver.license_expiry)}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/shipments')}
              className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-mono"
            >
              View Active Shipments
            </button>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0b1121] border border-slate-800 rounded-2xl p-6">
          <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">
            Professional Credentials
          </h3>
          <dl className="space-y-3 font-mono text-xs">
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <dt className="text-slate-500">Driver Identifier</dt>
              <dd className="text-slate-200">{driver.driver_id || driver.id || driver._id}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <dt className="text-slate-500">Carrier Transporter ID</dt>
              <dd className="text-slate-200">{driver.transporter_id}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <dt className="text-slate-500">Commercial Experience</dt>
              <dd className="text-emerald-400 font-bold">{driver.experience_years} Years</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <dt className="text-slate-500">Current Assignment</dt>
              <dd className="text-cyan-400">{driver.current_assignment || 'None (Standby)'}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-500">Enrolled In Network</dt>
              <dd className="text-slate-300">{formatDateTime(driver.created_at)}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-[#0b1121] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">
              Contact & Residential Address
            </h3>
            <div className="space-y-3 font-mono text-xs">
              <div>
                <span className="text-slate-600 block text-[10px] uppercase">Mobile Phone</span>
                <span className="text-white font-bold">{driver.phone}</span>
              </div>
              <div>
                <span className="text-slate-600 block text-[10px] uppercase">Email</span>
                <span className="text-slate-300">{driver.email || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-slate-600 block text-[10px] uppercase">Permanent Address</span>
                <span className="text-slate-300">{driver.address}, {driver.city}, {driver.state} — {driver.pincode}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 mt-6 text-[10px] font-mono text-slate-600">
            Carrier Verified Driver Dossier // Blockchain Ledger Synchronized
          </div>
        </div>
      </div>
    </div>
  )
}

