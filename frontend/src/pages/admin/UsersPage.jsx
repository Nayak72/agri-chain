import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  RefreshCw,
  Phone,
  Mail,
  AlertTriangle,
  ArrowRight
} from 'lucide-react'
import { usersApi } from '../../api/users.api'
import { formatDate } from '../../utils'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/common/PageHeader'
import StatusBadge from '../../components/common/StatusBadge'

const ROLE_BADGE_STYLES = {
  admin: 'bg-rose-50 text-rose-800 border-rose-200',
  farmer: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warehouse_manager: 'bg-amber-50 text-amber-800 border-amber-200',
  transporter: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  driver: 'bg-purple-50 text-purple-800 border-purple-200',
  buyer: 'bg-blue-50 text-blue-800 border-blue-200',
}

export default function UsersPage() {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Filters
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        page_size: 50,
      }
      if (search) params.search = search
      if (roleFilter) params.role = roleFilter
      if (statusFilter !== '') params.is_active = statusFilter === 'true'

      const res = await usersApi.list(params)
      setUsers(res.data.users || [])
      setTotal(res.data.total || 0)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch user directory')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [roleFilter, statusFilter])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchUsers()
  }

  const handleApprove = async (userId) => {
    setActionLoading(true)
    try {
      await usersApi.approve(userId)
      setSuccessMsg('User approved successfully')
      setTimeout(() => setSuccessMsg(null), 3000)
      fetchUsers()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to approve user')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSuspend = async (userId) => {
    if (!window.confirm('Are you sure you want to suspend this user? They will lose platform access.')) return
    setActionLoading(true)
    try {
      await usersApi.suspend(userId)
      setSuccessMsg('User suspended')
      setTimeout(() => setSuccessMsg(null), 3000)
      fetchUsers()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to suspend user')
    } finally {
      setActionLoading(false)
    }
  }

  const handleActivate = async (userId) => {
    setActionLoading(true)
    try {
      await usersApi.activate(userId)
      setSuccessMsg('User account activated')
      setTimeout(() => setSuccessMsg(null), 3000)
      fetchUsers()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to activate user')
    } finally {
      setActionLoading(false)
    }
  }

  // KPI calculations
  const pendingApprovals = users.filter(u => u.is_approved === false).length
  const activeCount = users.filter(u => u.is_active).length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Administration', href: '/users' },
          { label: 'User Directory' }
        ]}
        title="User Access & Role Administration"
        description="RBAC governance across all 6 platform personas: farmers, warehouse operators, carriers, drivers, and buyers."
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200">
            <Shield className="h-3.5 w-3.5 text-rose-600" />
            ADMINISTRATIVE REALM
          </span>
        }
        actions={
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-mono rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 shadow-xs transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-stone-400' : 'text-stone-500'}`} />
            <span>Refresh Registry</span>
          </button>
        }
      />

      {/* Messages */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-mono uppercase text-stone-500 mb-1 font-semibold">Total Users</div>
          <div className="text-2xl font-bold font-mono text-stone-900">{total}</div>
          <div className="text-xs text-stone-500 mt-1 font-sans">Platform-wide identity records</div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-mono uppercase text-stone-500 mb-1 font-semibold">Active Accounts</div>
          <div className="text-2xl font-bold font-mono text-emerald-700">{activeCount}</div>
          <div className="text-xs text-stone-500 mt-1 font-sans">Authorized for authentication</div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-mono uppercase text-stone-500 mb-1 font-semibold">Pending KYC Approval</div>
          <div className="text-2xl font-bold font-mono text-amber-700">{pendingApprovals}</div>
          <div className="text-xs text-stone-500 mt-1 font-sans">Awaiting administrator verification</div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-mono uppercase text-stone-500 mb-1 font-semibold">Roles Defined</div>
          <div className="text-2xl font-bold font-mono text-[#244634]">6 Roles</div>
          <div className="text-xs text-stone-500 mt-1 font-sans">RBAC matrix enforced</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-3 w-full">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search by full name or email address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-stone-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs font-mono text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634]"
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="farmer">Farmer</option>
              <option value="warehouse_manager">Warehouse Manager</option>
              <option value="transporter">Transporter</option>
              <option value="driver">Driver</option>
              <option value="buyer">Buyer</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs font-mono text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634]"
            >
              <option value="">All Statuses</option>
              <option value="true">Active Only</option>
              <option value="false">Suspended Only</option>
            </select>
          </div>
        </form>
      </div>

      {/* Users Directory Table */}
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-12 text-center text-stone-500 text-xs font-mono">
            Loading user directory...
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-stone-500 text-xs font-mono">
            No user accounts found matching query
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 uppercase bg-stone-50/75">
                  <th className="py-3 px-4 font-semibold">User</th>
                  <th className="py-3 px-4 font-semibold">Role</th>
                  <th className="py-3 px-4 font-semibold">Contact</th>
                  <th className="py-3 px-4 font-semibold">Approval</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Registered</th>
                  <th className="py-3 px-4 text-right font-semibold">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {users.map((u) => {
                  const isCurrent = currentUser?.sub === u.id
                  const roleStyle = ROLE_BADGE_STYLES[u.role] || 'bg-stone-100 text-stone-700 border-stone-200'

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-stone-50/80 transition-colors cursor-pointer"
                      onClick={() => navigate(`/users/${u.id}`)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-stone-900 flex items-center gap-2 font-sans">
                          {u.full_name}
                          {isCurrent && (
                            <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded font-normal font-mono">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-stone-500 text-[11px] flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3 text-stone-400" />
                          {u.email}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${roleStyle}`}>
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-stone-500">
                        {u.phone ? (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="h-3 w-3 text-stone-400" />
                            {u.phone}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {u.is_approved !== false ? (
                          <span className="flex items-center gap-1 text-emerald-700 text-[11px] font-sans font-medium">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Approved
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-700 text-[11px] font-sans font-medium">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Pending KYC
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {u.is_active ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-medium">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-medium">
                            Suspended
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-stone-500">
                        {formatDate(u.created_at)}
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {u.is_approved === false && (
                          <button
                            onClick={() => handleApprove(u.id)}
                            disabled={actionLoading}
                            className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors text-[11px] font-sans font-medium"
                          >
                            Approve
                          </button>
                        )}

                        {!isCurrent && (
                          u.is_active ? (
                            <button
                              onClick={() => handleSuspend(u.id)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 transition-colors text-[11px] font-sans font-medium"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(u.id)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors text-[11px] font-sans font-medium"
                            >
                              Activate
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
