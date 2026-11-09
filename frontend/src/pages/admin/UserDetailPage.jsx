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
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-mono text-slate-400">Loading user dossier...</p>
      </div>
    )
  }

  if (isError || !userProfile) {
    return (
      <div className="space-y-6">
        <Link
          to="/users"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Back to User Directory
        </Link>
        <div className="p-8 rounded-2xl bg-slate-900/80 border border-red-500/30 text-center max-w-lg mx-auto">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">User Record Not Found</h3>
          <p className="text-xs text-slate-400 mt-1 mb-6">
            {error?.response?.data?.detail || 'The requested user profile does not exist or you lack admin authorization.'}
          </p>
          <button
            onClick={() => navigate('/users')}
            className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700"
          >
            Return to Users
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/users"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold font-mono text-white">
                {userProfile.full_name || 'Platform User'}
              </h1>
              <span className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full ${getRoleColor(userProfile.role)}`}>
                {getRoleLabel(userProfile.role)}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Account Dossier // ID: {userProfile.id || userProfile._id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openEditModal}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit Profile
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback.message && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
              : 'bg-red-950/30 border-red-500/30 text-red-300'
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
          <div className="p-6 rounded-2xl bg-[#0b1121] border border-slate-800 space-y-5">
            <h2 className="text-base font-bold text-white pb-3 border-b border-slate-800">
              Identity & Contact Records
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 block mb-1">Email Address</span>
                <span className="text-white font-semibold text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4 text-cyan-400" />
                  {userProfile.email}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 block mb-1">Phone Number</span>
                <span className="text-white font-semibold text-sm flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  {userProfile.phone || 'Not Provided'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 block mb-1">Created At</span>
                <span className="text-slate-300 text-xs flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  {userProfile.created_at ? formatDateTime(userProfile.created_at) : 'N/A'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 block mb-1">Last Updated</span>
                <span className="text-slate-300 text-xs flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  {userProfile.updated_at ? formatDateTime(userProfile.updated_at) : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Ledger audit note */}
          <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 text-purple-300 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-purple-200">
              <Lock className="w-4 h-4" /> Cryptographic Governance
            </div>
            <p className="leading-relaxed">
              Account creation, role amendments, and approval state transitions are sealed on the SHA-256 audit ledger.
            </p>
          </div>
        </div>

        {/* Right Column: Status & Admin Controls */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#0b1121] border border-slate-800 space-y-5">
            <h3 className="text-base font-bold text-white pb-3 border-b border-slate-800">
              Account Status & Controls
            </h3>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono uppercase text-slate-400 block">Approval</span>
                  <span className="text-xs font-bold text-white">
                    {userProfile.is_approved ? 'Approved' : 'Pending Approval'}
                  </span>
                </div>
                {userProfile.is_approved ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Clock className="w-5 h-5 text-amber-400" />
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono uppercase text-slate-400 block">Activity State</span>
                  <span className="text-xs font-bold text-white">
                    {userProfile.is_active ? 'Active' : 'Suspended'}
                  </span>
                </div>
                {userProfile.is_active ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 space-y-2">
              {!userProfile.is_approved && (
                <button
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" />
                  {approveMutation.isPending ? 'Approving...' : 'Approve User Account'}
                </button>
              )}

              {userProfile.is_active ? (
                <button
                  onClick={() => suspendMutation.mutate()}
                  disabled={suspendMutation.isPending}
                  className="w-full py-2.5 rounded-xl bg-slate-900 border border-red-500/40 text-red-300 hover:bg-red-950/20 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <UserX className="w-4 h-4 text-red-400" />
                  {suspendMutation.isPending ? 'Suspending...' : 'Suspend Account'}
                </button>
              ) : (
                <button
                  onClick={() => activateMutation.mutate()}
                  disabled={activateMutation.isPending}
                  className="w-full py-2.5 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/20 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  {activateMutation.isPending ? 'Reactivating...' : 'Reactivate Account'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1121] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Edit User Profile</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Platform Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {getRoleLabel(r)} ({r})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => updateMutation.mutate(editForm)}
                disabled={updateMutation.isPending}
                className="flex-1 py-2 rounded-xl bg-cyan-400 text-slate-950 text-xs font-bold hover:bg-cyan-300 disabled:opacity-50"
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

