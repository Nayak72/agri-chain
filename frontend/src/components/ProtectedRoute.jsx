import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { normalizeRole } from '../constants/roles'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
          <span className="text-slate-500 font-mono text-sm animate-pulse">
            Restoring session...
          </span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Account approval check
  if (user.is_approved === false) {
    return <Navigate to="/pending-approval" replace />
  }

  // Account active check
  if (user.is_active === false) {
    return <Navigate to="/forbidden" replace />
  }

  // Role check using canonical uppercase normalization
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = normalizeRole(user.role)
    const normalizedAllowed = allowedRoles.map(r => normalizeRole(r))
    if (!normalizedAllowed.includes(userRole)) {
      return <Navigate to="/forbidden" replace />
    }
  }

  return children
}
