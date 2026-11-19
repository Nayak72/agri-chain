import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { normalizeRole } from '../constants/roles'
import { pageCapabilityForPath } from '../constants/pageCapabilities'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, isAuthenticated, can } = useAuth()
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

  // Recognized pages use the backend-issued workspace capability. The legacy
  // role guard remains only for routes that have no workspace policy yet.
  const capability = pageCapabilityForPath(location.pathname)
  if (capability && !can(capability)) {
    return <Navigate to="/forbidden" replace />
  }
  if (!capability && allowedRoles && allowedRoles.length > 0) {
    const userRole = normalizeRole(user.role)
    const normalizedAllowed = allowedRoles.map(r => normalizeRole(r))
    if (!normalizedAllowed.includes(userRole)) {
      return <Navigate to="/forbidden" replace />
    }
  }

  return children
}
