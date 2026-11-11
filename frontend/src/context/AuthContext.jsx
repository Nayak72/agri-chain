import { createContext, useContext, useState, useCallback } from 'react'
import { authApi } from '../api/auth.api'
import { tokenStore } from '../api/client'
import { ROLES, normalizeRole } from '../constants/roles'

const AuthContext = createContext(null)

// Development-only account email presets (NO passwords stored in frontend code)
const DEV_ACCOUNTS = import.meta.env.DEV
  ? [
      { label: 'Admin', email: 'admin@agrichain.com', role: ROLES.ADMIN },
      { label: 'Farmer', email: 'farmer1@agrichain.com', role: ROLES.FARMER },
      { label: 'Warehouse Mgr', email: 'warehouse1@agrichain.com', role: ROLES.WAREHOUSE_MANAGER },
      { label: 'Transporter', email: 'transporter1@agrichain.com', role: ROLES.TRANSPORTER },
      { label: 'Driver', email: 'driver1@agrichain.com', role: ROLES.DRIVER },
      { label: 'Buyer', email: 'buyer1@agrichain.com', role: ROLES.BUYER },
    ]
  : []

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const loading = false
  const [error, setError] = useState(null)
  const login = useCallback(async (email, password) => {
    setError(null)
    try {
      const res = await authApi.login(email, password)
      tokenStore.set(res.data.access_token)
      const meRes = await authApi.me()
      setUser(meRes.data)
      return { success: true, user: meRes.data }
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Invalid credentials. Please try again.'
      setError(message)
      return { success: false, error: message }
    }
  }, [])

  const register = useCallback(async (registrationData) => {
    setError(null)
    try {
      const res = await authApi.register(registrationData)
      // If auto-approved (FARMER / BUYER), tokens are returned
      if (res.data.access_token) {
        tokenStore.set(res.data.access_token)
        const meRes = await authApi.me()
        setUser(meRes.data)
          return { success: true, status: 'APPROVED', user: meRes.data }
      }
      // If pending approval (TRANSPORTER / WAREHOUSE_MANAGER / DRIVER)
      return { success: true, status: res.data.status || 'PENDING_APPROVAL', user: res.data.user }
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Registration failed. Please check your information.'
      setError(message)
      return { success: false, error: message }
    }
  }, [])

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])

  const hasRole = useCallback(
    (...roles) => {
      if (!user?.role) return false
      const currentRole = normalizeRole(user.role)
      const targetRoles = roles.map(r => normalizeRole(r))
      return targetRoles.includes(currentRole)
    },
    [user]
  )

  const isAdmin = normalizeRole(user?.role) === ROLES.ADMIN

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
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
