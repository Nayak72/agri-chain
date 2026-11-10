import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw, Search, Truck, Check, AlertCircle, CheckCircle2, X } from 'lucide-react'
import { transportersApi } from '../../api/commerce.api'
import { useAuth } from '../../context/AuthContext'
import { formatDateTime } from '../../utils'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'
import { EmptyState } from '../../components/common/EmptyState'

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

  const { data: transporters, isLoading, refetch, isFetching } = useQuery({
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
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <PageHeader
        eyebrow="Carrier Fleet Network"
        title="Transporter Directory"
        description="Verified logistics partners, cold-chain haulage carriers, and compliance accreditation."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2 bg-white/80 border-[#E1DDD0] hover:bg-[#F2EFE7] text-[#26312A]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowRegisterModal(true)}
              className="gap-2 bg-[#244634] hover:bg-[#1A3326] text-white shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Onboard Transporter</span>
            </Button>
          </div>
        }
      />

      {actionMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {actionMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" /> {errorMsg}
        </div>
      )}

      {/* Filter and stats */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#7A887E] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Search company, city, contact person..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white/90 border-[#E1DDD0] text-sm text-[#26312A] placeholder:text-[#7A887E] focus-visible:ring-[#244634]"
          />
        </div>
        <div className="text-xs font-mono text-[#526357] flex items-center gap-1.5 self-end sm:self-center">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3F7C56]" />
          <span>{filtered.length} carrier{filtered.length === 1 ? '' : 's'} registered</span>
        </div>
      </div>

      {/* Transporters Grid */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#244634]/20 border-t-[#244634] rounded-full animate-spin" />
          <span className="text-xs font-mono text-[#526357] animate-pulse">Scanning transporter registry...</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No Transporters Found"
          description={search ? 'No carriers match your filter query.' : 'No logistics carriers on record yet.'}
          action={
            !search ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowRegisterModal(true)}
                className="bg-[#244634] hover:bg-[#1A3326] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Onboard First Transporter
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((t) => {
            const tId = t.id || t._id
            const isApproved = t.approval_status === 'APPROVED'
            return (
              <Card
                key={tId}
                className="bg-white/90 border-[#E1DDD0] hover:border-[#244634]/40 hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                <CardContent className="p-6 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-[10px] font-mono text-[#7A887E] uppercase tracking-widest block">
                          ID: {t.transporter_id || tId?.slice(-8)}
                        </span>
                        <h3 className="text-base font-serif font-bold text-[#1B2A20] truncate max-w-[200px] mt-0.5">
                          {t.company_name}
                        </h3>
                      </div>
                      <Badge variant={isApproved ? 'success' : 'warning'} size="sm" className="font-mono text-[10px]">
                        {t.approval_status || 'PENDING'}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-xs font-mono mb-4 text-[#526357] py-2 border-y border-[#ECE7DA]">
                      <div>Contact: <span className="text-[#26312A] font-medium">{t.contact_person}</span></div>
                      <div>Phone: <span className="text-[#26312A]">{t.phone}</span></div>
                      <div>Location: <span className="text-[#26312A]">{t.city}, {t.state}</span></div>
                      {t.gst_number && <div>GST: <span className="text-[#7A887E]">{t.gst_number}</span></div>}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-[#7A887E]">
                    <span>
                      Registered: {formatDateTime(t.created_at)}
                    </span>
                    {isAdmin && !isApproved && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => approveMutation.mutate(tId)}
                        disabled={approveMutation.isPending}
                        className="bg-[#244634] hover:bg-[#1A3326] text-white text-[10px] h-7 px-2.5"
                      >
                        {approveMutation.isPending ? 'Approving...' : 'Approve Carrier'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Onboard Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-[#1B2A20]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="bg-white border-[#E1DDD0] max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 pb-3 border-b border-[#ECE7DA]">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#1B2A20]">Onboard Logistics Carrier</h3>
                <p className="text-xs text-[#526357] font-mono mt-0.5">Register transporter credentials and compliance identifiers.</p>
              </div>
              <button onClick={() => setShowRegisterModal(false)} className="text-[#7A887E] hover:text-[#26312A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-[#526357] uppercase font-semibold">Company Name *</label>
                  <Input
                    type="text"
                    required
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                    placeholder="e.g. MahaCold Logistics Pvt Ltd"
                    className="bg-white border-[#E1DDD0] text-xs font-mono focus-visible:ring-[#244634]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-[#526357] uppercase font-semibold">Contact Person *</label>
                    <Input
                      type="text"
                      required
                      value={form.contact_person}
                      onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                      placeholder="Suresh Patil"
                      className="bg-white border-[#E1DDD0] text-xs font-mono focus-visible:ring-[#244634]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-[#526357] uppercase font-semibold">Phone Number *</label>
                    <Input
                      type="text"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="bg-white border-[#E1DDD0] text-xs font-mono focus-visible:ring-[#244634]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-[#526357] uppercase font-semibold">Email *</label>
                  <Input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="contact@mahacold.com"
                    className="bg-white border-[#E1DDD0] text-xs font-mono focus-visible:ring-[#244634]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-[#526357] uppercase font-semibold">Office Address *</label>
                  <Input
                    type="text"
                    required
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Plot 42, Transport Nagar"
                    className="bg-white border-[#E1DDD0] text-xs font-mono focus-visible:ring-[#244634]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="text"
                    required
                    placeholder="City"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="bg-white border-[#E1DDD0] text-xs font-mono focus-visible:ring-[#244634]"
                  />
                  <Input
                    type="text"
                    required
                    placeholder="State"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="bg-white border-[#E1DDD0] text-xs font-mono focus-visible:ring-[#244634]"
                  />
                  <Input
                    type="text"
                    required
                    pattern="^\d{6}$"
                    placeholder="Pincode"
                    value={form.pincode}
                    onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                    className="bg-white border-[#E1DDD0] text-xs font-mono focus-visible:ring-[#244634]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-[#526357] uppercase font-semibold">GST Number</label>
                    <Input
                      type="text"
                      value={form.gst_number}
                      onChange={(e) => setForm({ ...form, gst_number: e.target.value })}
                      placeholder="27AABCM1234F1Z5"
                      className="bg-white border-[#E1DDD0] text-xs font-mono focus-visible:ring-[#244634]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-[#526357] uppercase font-semibold">Fleet License No</label>
                    <Input
                      type="text"
                      value={form.license_number}
                      onChange={(e) => setForm({ ...form, license_number: e.target.value })}
                      placeholder="MH-TR-2024-9988"
                      className="bg-white border-[#E1DDD0] text-xs font-mono focus-visible:ring-[#244634]"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRegisterModal(false)}
                    className="flex-1 bg-white border-[#E1DDD0] text-[#26312A] hover:bg-[#F2EFE7] text-xs font-mono"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={createMutation.isPending}
                    className="flex-1 bg-[#244634] hover:bg-[#1A3326] text-white font-mono text-xs shadow-sm"
                  >
                    {createMutation.isPending ? 'Registering...' : 'Register Carrier'}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
