import React, { useState, useEffect } from 'react'
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
  AlertTriangle
} from 'lucide-react'
import { usersApi } from '../../api/users.api'
import { formatDate } from '../../utils'
import { useAuth } from '../../context/AuthContext'

const ROLE_BADGE_STYLES = {
  admin: 'bg-red-500/10 text-red-400 border-red-500/30',
  farmer: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  warehouse_manager: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  transporter: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  driver: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  buyer: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
}

export default function UsersPage() {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Users className="h-6 w-6 text-cyan-400" />
              User Access & Role Administration
            </h1>
            <span className="px-2.5 py-1 text-xs font-mono font-semibold uppercase bg-red-500/10 text-red-400 border border-red-500/30 rounded flex items-center gap-1.5">
              <Shield className="h-3 w-3 text-red-400" />
              ADMINISTRATIVE REALM
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            RBAC governance across all 6 platform personas: farmers, warehouse operators, carriers, drivers, and buyers
          </p>
        </div>

        <button
          onClick={fetchUsers}
          disabled={loading}
          className="px-3 py-2 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Registry
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-300 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-sm text-emerald-300 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-[#0b1121]/90 p-4">
          <div className="text-xs font-mono uppercase text-slate-400 mb-1">Total Users</div>
          <div className="text-2xl font-bold font-mono text-white">{total}</div>
          <div className="text-xs text-slate-400 mt-1">Platform-wide identity records</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0b1121]/90 p-4">
          <div className="text-xs font-mono uppercase text-slate-400 mb-1">Active Accounts</div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{activeCount}</div>
          <div className="text-xs text-slate-400 mt-1">Authorized for authentication</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0b1121]/90 p-4">
          <div className="text-xs font-mono uppercase text-slate-400 mb-1">Pending KYC Approval</div>
          <div className="text-2xl font-bold font-mono text-amber-400">{pendingApprovals}</div>
          <div className="text-xs text-slate-400 mt-1">Awaiting administrator verification</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0b1121]/90 p-4">
          <div className="text-xs font-mono uppercase text-slate-400 mb-1">Roles Defined</div>
          <div className="text-2xl font-bold font-mono text-cyan-400">6 Roles</div>
          <div className="text-xs text-slate-400 mt-1">RBAC matrix enforced</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-800 bg-[#0b1121]/80 backdrop-blur-sm p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-3 w-full">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by full name or email address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
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
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Statuses</option>
              <option value="true">Active Only</option>
              <option value="false">Suspended Only</option>
            </select>
          </div>
        </form>
      </div>

      {/* Users Directory Table */}
      <div className="rounded-xl border border-slate-800 bg-[#0b1121] overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs font-mono">
            Loading user directory...
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-mono">
            No user accounts found matching query
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase bg-slate-900/60">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Approval</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {users.map((u) => {
                  const isCurrent = currentUser?.sub === u.id
                  const roleStyle = ROLE_BADGE_STYLES[u.role] || 'bg-slate-800 text-slate-300 border-slate-700'

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white flex items-center gap-2">
                          {u.full_name}
                          {isCurrent && (
                            <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.2 rounded font-normal">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3 text-slate-500" />
                          {u.email}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${roleStyle}`}>
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                        {u.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-slate-500" />
                            {u.phone}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {u.is_approved !== false ? (
                          <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Approved
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-400 text-[11px]">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Pending KYC
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {u.is_active ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px]">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 text-[10px]">
                            Suspended
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                        {formatDate(u.created_at)}
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                        {u.is_approved === false && (
                          <button
                            onClick={() => handleApprove(u.id)}
                            disabled={actionLoading}
                            className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-colors text-[11px]"
                          >
                            Approve
                          </button>
                        )}

                        {!isCurrent && (
                          u.is_active ? (
                            <button
                              onClick={() => handleSuspend(u.id)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 rounded bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/30 transition-colors text-[11px]"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(u.id)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 rounded bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 transition-colors text-[11px]"
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

