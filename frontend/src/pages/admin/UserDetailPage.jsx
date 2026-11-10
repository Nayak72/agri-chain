import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  UserCheck,
  ShieldAlert,
  ShieldCheck,
  UserX,
  Mail,
  Phone,
  Calendar,
  Lock,
  Edit2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react'
import { usersApi } from '../../api/users.api'
import { ROLES, ALL_ROLES } from '../../constants/roles'
import { getRoleColor, getRoleLabel, formatDateTime } from '../../utils'
import PageHeader from '../../components/common/PageHeader'
import StatusBadge from '../../components/common/StatusBadge'

export default function UserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', role: '' })

  const { data: userProfile, isLoading, isError, error } = useQuery({
    queryKey: ['user-detail', id],
    queryFn: () => usersApi.get(id).then(res => res.data),
  })

  // Mutations
  const approveMutation = useMutation({
    mutationFn: () => usersApi.approve(id),
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'User successfully approved. Account is now active.' })
      queryClient.invalidateQueries({ queryKey: ['user-detail', id] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err) => {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Failed to approve user' })
    },
  })

  const suspendMutation = useMutation({
    mutationFn: () => usersApi.suspend(id),
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'User account has been suspended.' })
      queryClient.invalidateQueries({ queryKey: ['user-detail', id] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err) => {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Failed to suspend user' })
    },
  })

  const activateMutation = useMutation({
    mutationFn: () => usersApi.activate(id),
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'User account has been reactivated.' })
      queryClient.invalidateQueries({ queryKey: ['user-detail', id] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err) => {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Failed to activate user' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data) => usersApi.update(id, data),
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'User profile updated successfully.' })
      setShowEditModal(false)
      queryClient.invalidateQueries({ queryKey: ['user-detail', id] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err) => {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Failed to update user' })
    },
  })

  const openEditModal = () => {
    if (userProfile) {
      setEditForm({
        full_name: userProfile.full_name || '',
        phone: userProfile.phone || '',
        role: userProfile.role || ROLES.FARMER,
      })
      setShowEditModal(true)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <div className="w-8 h-8 border-3 border-stone-200 border-t-[#244634] rounded-full animate-spin" />
        <p className="text-xs font-mono text-stone-500">Loading user dossier...</p>
      </div>
    )
  }

  if (isError || !userProfile) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="p-8 rounded-2xl bg-white border border-stone-200 shadow-sm">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-stone-900">User Record Not Found</h3>
          <p className="text-xs text-stone-500 mt-1 mb-6">
            {error?.response?.data?.detail || 'The requested user profile does not exist or you lack admin authorization.'}
          </p>
          <button
            onClick={() => navigate('/users')}
            className="px-4 py-2 rounded-lg bg-[#244634] text-white text-xs font-semibold hover:bg-[#1b3527] transition-colors"
          >
            Return to Users
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Bar */}
      <PageHeader
        breadcrumbs={[
          { label: 'Users', href: '/users' },
          { label: userProfile.full_name || 'User Profile' }
        ]}
        title={userProfile.full_name || 'Platform User'}
        description={`Account Dossier // ID: ${userProfile.id || userProfile._id}`}
        badge={
          <span className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full ${getRoleColor(userProfile.role)}`}>
            {getRoleLabel(userProfile.role)}
          </span>
        }
        actions={
          <div className="flex items-center gap-2.5">
            <Link
              to="/users"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 shadow-xs transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Directory</span>
            </Link>
            <button
              onClick={openEditModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#244634] text-white hover:bg-[#1b3527] shadow-xs transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          </div>
        }
      />

      {/* Feedback banner */}
      {feedback.message && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback({ type: '', message: '' })} className="hover:opacity-75">
            ✕
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-stone-900 pb-3 border-b border-stone-100">
              Identity & Contact Records
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-stone-500 block mb-1 font-sans">Email Address</span>
                <span className="text-stone-900 font-semibold text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#244634]" />
                  {userProfile.email}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-stone-500 block mb-1 font-sans">Phone Number</span>
                <span className="text-stone-900 font-semibold text-sm flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-700" />
                  {userProfile.phone || 'Not Provided'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-stone-500 block mb-1 font-sans">Created At</span>
                <span className="text-stone-700 text-xs flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-stone-400" />
                  {userProfile.created_at ? formatDateTime(userProfile.created_at) : 'N/A'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-stone-500 block mb-1 font-sans">Last Updated</span>
                <span className="text-stone-700 text-xs flex items-center gap-2">
                  <Clock className="w-4 h-4 text-stone-400" />
                  {userProfile.updated_at ? formatDateTime(userProfile.updated_at) : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Ledger audit note */}
          <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs space-y-1.5 font-sans">
            <div className="flex items-center gap-2 font-bold text-purple-950">
              <Lock className="w-4 h-4 text-purple-700" /> Cryptographic Governance
            </div>
            <p className="leading-relaxed text-purple-800 text-[11px]">
              Account creation, role amendments, and approval state transitions are sealed on the SHA-256 audit ledger.
            </p>
          </div>
        </div>

        {/* Right Column: Status & Admin Controls */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-5">
            <h3 className="text-base font-bold text-stone-900 pb-3 border-b border-stone-100 font-sans">
              Account Status & Controls
            </h3>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono uppercase text-stone-500 font-semibold block">Approval</span>
                  <span className="text-xs font-bold text-stone-900 font-sans">
                    {userProfile.is_approved ? 'Approved' : 'Pending Approval'}
                  </span>
                </div>
                {userProfile.is_approved ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Clock className="w-5 h-5 text-amber-600" />
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono uppercase text-stone-500 font-semibold block">Activity State</span>
                  <span className="text-xs font-bold text-stone-900 font-sans">
                    {userProfile.is_active ? 'Active' : 'Suspended'}
                  </span>
                </div>
                {userProfile.is_active ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600" />
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 space-y-2">
              {!userProfile.is_approved && (
                <button
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  className="w-full py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-xs"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{approveMutation.isPending ? 'Approving...' : 'Approve User Account'}</span>
                </button>
              )}

              {userProfile.is_active ? (
                <button
                  onClick={() => suspendMutation.mutate()}
                  disabled={suspendMutation.isPending}
                  className="w-full py-2.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <UserX className="w-4 h-4 text-rose-600" />
                  <span>{suspendMutation.isPending ? 'Suspending...' : 'Suspend Account'}</span>
                </button>
              ) : (
                <button
                  onClick={() => activateMutation.mutate()}
                  disabled={activateMutation.isPending}
                  className="w-full py-2.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>{activateMutation.isPending ? 'Reactivating...' : 'Reactivate Account'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl animate-fade-in-up">
            <h3 className="text-base font-bold text-stone-900">Edit User Profile</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-mono uppercase text-stone-600 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-stone-600 font-semibold mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-stone-600 font-semibold mb-1">Platform Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634]"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {getRoleLabel(r)} ({r})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-2 rounded-lg border border-stone-200 bg-white text-stone-700 text-xs font-semibold hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => updateMutation.mutate(editForm)}
                disabled={updateMutation.isPending}
                className="flex-1 py-2 rounded-lg bg-[#244634] text-white text-xs font-bold hover:bg-[#1b3527] disabled:opacity-50 shadow-xs"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
