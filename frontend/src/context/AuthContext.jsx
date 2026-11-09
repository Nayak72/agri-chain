import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { authApi } from '../api/auth.api'
import { tokenStore } from '../api/client'

const AuthContext = createContext(null)

// Demo accounts available only in development
const DEV_ACCOUNTS = import.meta.env.DEV
  ? [
      { label: 'Admin', email: 'admin@agrichain.com', password: 'Admin@123', role: 'admin' },
      { label: 'Farmer', email: 'farmer1@agrichain.com', password: 'Farmer@123', role: 'farmer' },
      { label: 'Warehouse Mgr', email: 'wm1@agrichain.com', password: 'Warehouse@123', role: 'warehouse_manager' },
      { label: 'Transporter', email: 'transporter1@agrichain.com', password: 'Transport@123', role: 'transporter' },
      { label: 'Driver', email: 'driver1@agrichain.com', password: 'Driver@123', role: 'driver' },
      { label: 'Buyer', email: 'buyer1@agrichain.com', password: 'Buyer@123', role: 'buyer' },
    ]
  : []

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true) // true while restoring session
  const [error, setError] = useState(null)
  const refreshTimerRef = useRef(null)

  // Schedule proactive token refresh (25 min into 30 min token life)
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const res = await authApi.refresh()
        tokenStore.set(res.data.access_token)
        scheduleRefresh()
      } catch {
        // Refresh failed, user will be logged out on next API call
        tokenStore.clear()
        setUser(null)
      }
    }, 25 * 60 * 1000)
  }, [])

  // Attempt silent session restoration on mount
  useEffect(() => {
    let isMounted = true

    const restoreSession = async () => {
      try {
        const res = await authApi.refresh()
        if (!isMounted) return
        tokenStore.set(res.data.access_token)
        const meRes = await authApi.me()
        if (!isMounted) return
        setUser(meRes.data)
        scheduleRefresh()
      } catch {
        // No valid session - that's completely expected when not logged in
        if (!isMounted) return
        tokenStore.clear()
        setUser(null)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    restoreSession()
    return () => {
      isMounted = false
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [scheduleRefresh])

  const login = useCallback(async (email, password) => {
    setError(null)
    try {
      const res = await authApi.login(email, password)
      tokenStore.set(res.data.access_token)
      const meRes = await authApi.me()
      setUser(meRes.data)
      scheduleRefresh()
      return { success: true }
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Invalid credentials. Please try again.'
      setError(message)
      return { success: false, error: message }
    }
  }, [scheduleRefresh])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Best effort
    } finally {
      tokenStore.clear()
      setUser(null)
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [])

  const hasRole = useCallback(
    (...roles) => user && roles.includes(user.role),
    [user]
  )

  const isAdmin = user?.role === 'admin'

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        hasRole,
        isAdmin,
        devAccounts: DEV_ACCOUNTS,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export default AuthContext

