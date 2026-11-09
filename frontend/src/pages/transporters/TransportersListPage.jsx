import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transportersApi } from '../../api/commerce.api'
import { useAuth } from '../../context/AuthContext'
import { formatDateTime } from '../../utils'

export default function TransportersListPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [actionMsg, setActionMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // New transporter form
  const [form, setForm] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gst_number: '',
    license_number: '',
    bank_account: '',
    ifsc_code: '',
  })

  const { data: transporters, isLoading, refetch } = useQuery({
    queryKey: ['transporters'],
    queryFn: () => transportersApi.list().then(res => res.data),
    staleTime: 30_000,
  })

  const transporterList = Array.isArray(transporters) ? transporters : transporters?.items || []
  const filtered = transporterList.filter(t =>
    t.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.city?.toLowerCase().includes(search.toLowerCase()) ||
    t.contact_person?.toLowerCase().includes(search.toLowerCase())
  )

  // Approve transporter mutation (Admin only)
  const approveMutation = useMutation({
    mutationFn: (id) => transportersApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transporters'] })
      setActionMsg('Transporter carrier approved successfully!')
      setErrorMsg('')
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Approval failed.'
      setErrorMsg(typeof msg === 'string' ? msg : JSON.stringify(msg))
    },
  })

  // Create transporter mutation
  const createMutation = useMutation({
    mutationFn: (data) => transportersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transporters'] })
      setShowRegisterModal(false)
      setActionMsg('Transporter carrier registered!')
      setErrorMsg('')
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Registration failed.'
      setErrorMsg(typeof msg === 'string' ? msg : JSON.stringify(msg))
    },
  })

  const handleCreateSubmit = (e) => {
    e.preventDefault()
    createMutation.mutate({
      company_name: form.company_name.trim(),
      contact_person: form.contact_person.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      gst_number: form.gst_number ? form.gst_number.trim() : null,
      license_number: form.license_number ? form.license_number.trim() : null,
      bank_account: form.bank_account ? form.bank_account.trim() : null,
      ifsc_code: form.ifsc_code ? form.ifsc_code.trim() : null,
    })
  }

  const isAdmin = user?.role === 'admin'

  return (
    <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-10 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-500"></span>
            <span className="text-xs font-mono font-medium text-cyan-500 uppercase tracking-widest">
              Carrier Fleet Network
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Transporter <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Directory</span>
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl">
            Verified logistics partners, cold-chain haulage carriers, and compliance accreditation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white transition-all text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync
          </button>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-semibold text-sm shadow-lg shadow-cyan-900/20 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Onboard Transporter
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-mono flex items-center gap-2">
          <span>✓</span> {actionMsg}
        </div>
      )}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-mono flex items-center gap-2">
          <span>✕</span> {errorMsg}
        </div>
      )}

      {/* Filter */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search company, city, contact person..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0b1121] border border-slate-800 rounded-xl px-4 py-2.5 pl-10 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
          />
          <svg className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <span className="text-xs font-mono text-slate-500">
          {filtered.length} carrier{filtered.length === 1 ? '' : 's'} registered
        </span>
      </div>

      {/* Transporters Grid */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
          <span className="text-slate-500 font-mono text-sm animate-pulse">Scanning transporter registry...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-[#0b1121]/40 p-16 text-center">
          <div className="text-4xl mb-4">🚚</div>
          <h3 className="text-xl font-medium text-white mb-2">No Transporters Found</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            {search ? 'No carriers match your filter query.' : 'No logistics carriers on record yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((t) => {
            const tId = t.id || t._id
            const isApproved = t.approval_status === 'APPROVED'
            return (
              <div
                key={tId}
                className="bg-[#0b1121] border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-2xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">
                        ID: {t.transporter_id || tId?.slice(-8)}
                      </span>
                      <h3 className="text-lg font-bold text-white truncate max-w-[200px] mt-0.5">
                        {t.company_name}
                      </h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${
                      isApproved
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    }`}>
                      {t.approval_status || 'PENDING'}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs font-mono mb-4 text-slate-400">
                    <div>Contact: <span className="text-slate-200">{t.contact_person}</span></div>
                    <div>Phone: <span className="text-slate-300">{t.phone}</span></div>
                    <div>Location: <span className="text-slate-300">{t.city}, {t.state}</span></div>
                    {t.gst_number && <div>GST: <span className="text-slate-500">{t.gst_number}</span></div>}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-600">
                    Registered: {formatDateTime(t.created_at)}
                  </span>
                  {isAdmin && !isApproved && (
                    <button
                      onClick={() => approveMutation.mutate(tId)}
                      disabled={approveMutation.isPending}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold transition-all disabled:opacity-50"
                    >
                      {approveMutation.isPending ? 'Approving...' : 'Approve Carrier'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Onboard Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1121] border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-1">Onboard Logistics Carrier</h3>
            <p className="text-xs text-slate-400 font-mono mb-4">Register transporter credentials and compliance identifiers.</p>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Company Name *</label>
                <input
                  type="text"
                  required
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  placeholder="e.g. MahaCold Logistics Pvt Ltd"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={form.contact_person}
                    onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                    placeholder="Suresh Patil"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Email *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contact@mahacold.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Office Address *</label>
                <input
                  type="text"
                  required
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Plot 42, Transport Nagar"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  placeholder="City"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                />
                <input
                  type="text"
                  required
                  placeholder="State"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                />
                <input
                  type="text"
                  required
                  pattern="^\d{6}$"
                  placeholder="Pincode"
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">GST Number</label>
                  <input
                    type="text"
                    value={form.gst_number}
                    onChange={(e) => setForm({ ...form, gst_number: e.target.value })}
                    placeholder="27AABCM1234F1Z5"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Fleet License No</label>
                  <input
                    type="text"
                    value={form.license_number}
                    onChange={(e) => setForm({ ...form, license_number: e.target.value })}
                    placeholder="MH-TR-2024-9988"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 text-white font-mono text-xs font-bold disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Registering...' : 'Register Carrier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

