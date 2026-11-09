import { useState, useEffect } from 'react'
import { useNavigate, useLocation, NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { systemApi } from '../../api/system.api'
import { getInitials, getRoleLabel } from '../../utils'
import { ROLES, normalizeRole } from '../../constants/roles'

// Navigation groups filtered by canonical role
const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', roles: [ROLES.ADMIN, ROLES.FARMER, ROLES.WAREHOUSE_MANAGER, ROLES.TRANSPORTER, ROLES.DRIVER, ROLES.BUYER] },
    ],
  },
  {
    label: 'Agriculture',
    items: [
      { label: 'Farms', path: '/farms', roles: [ROLES.ADMIN, ROLES.FARMER] },
      { label: 'Produce', path: '/produce', roles: [ROLES.ADMIN, ROLES.FARMER, ROLES.WAREHOUSE_MANAGER, ROLES.BUYER] },
      { label: 'Batches', path: '/batches', roles: [ROLES.ADMIN, ROLES.FARMER, ROLES.WAREHOUSE_MANAGER] },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { label: 'Warehouses', path: '/warehouses', roles: [ROLES.ADMIN, ROLES.WAREHOUSE_MANAGER] },
      { label: 'Inventory', path: '/inventory', roles: [ROLES.ADMIN, ROLES.WAREHOUSE_MANAGER] },
      { label: 'Purchase Orders', path: '/purchase-orders', roles: [ROLES.ADMIN, ROLES.BUYER, ROLES.FARMER] },
      { label: 'Freight Bookings', path: '/freight-bookings', roles: [ROLES.ADMIN, ROLES.BUYER, ROLES.FARMER] },
      { label: 'Freight Quotes', path: '/freight-quotes', roles: [ROLES.ADMIN, ROLES.TRANSPORTER] },
    ],
  },
  {
    label: 'Transport',
    items: [
      { label: 'Transporters', path: '/transporters', roles: [ROLES.ADMIN, ROLES.TRANSPORTER] },
      { label: 'Fleet', path: '/fleet', roles: [ROLES.ADMIN, ROLES.TRANSPORTER] },
      { label: 'Drivers', path: '/drivers', roles: [ROLES.ADMIN, ROLES.TRANSPORTER] },
      { label: 'Shipments', path: '/shipments', roles: [ROLES.ADMIN, ROLES.TRANSPORTER, ROLES.DRIVER, ROLES.BUYER, ROLES.FARMER] },
      { label: 'Deliveries', path: '/deliveries', roles: [ROLES.ADMIN, ROLES.DRIVER, ROLES.BUYER] },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { label: 'Cold-Chain', path: '/cold-chain', roles: [ROLES.ADMIN, ROLES.WAREHOUSE_MANAGER, ROLES.TRANSPORTER, ROLES.DRIVER, ROLES.BUYER, ROLES.FARMER] },
      { label: 'Ledger', path: '/ledger', roles: [ROLES.ADMIN, ROLES.BUYER, ROLES.FARMER, ROLES.TRANSPORTER, ROLES.WAREHOUSE_MANAGER, ROLES.DRIVER] },
      { label: 'Analytics', path: '/analytics', roles: [ROLES.ADMIN, ROLES.TRANSPORTER, ROLES.FARMER, ROLES.BUYER] },
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Users', path: '/users', roles: [ROLES.ADMIN] },
      { label: 'Settings', path: '/settings', roles: [ROLES.ADMIN] },
    ],
  },
]

function NavDropdown({ group, userRole }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  
  const normUserRole = normalizeRole(userRole)
  const visibleItems = group.items.filter((item) =>
    item.roles.map(r => normalizeRole(r)).includes(normUserRole)
  )
  if (visibleItems.length === 0) return null

  const isActive = visibleItems.some((item) => location.pathname.startsWith(item.path))

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        className={`flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
          isActive
            ? 'text-cyan-400 bg-cyan-500/10'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
        }`}
      >
        {group.label}
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-[#0b1121] border border-slate-800 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50">
          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `block px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'text-cyan-400 bg-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const navigate = useNavigate()
  const { user, logout, isAuthenticated } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [systemOnline, setSystemOnline] = useState(null) // null = unknown, true/false
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Health ping every 30 seconds
  useEffect(() => {
    const checkHealth = async () => {
      try {
        await systemApi.healthLive()
        setSystemOnline(true)
      } catch {
        setSystemOnline(false)
      }
    }
    checkHealth()
    const interval = setInterval(checkHealth, 30_000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await logout()
    setIsLoggingOut(false)
    navigate('/login')
  }

  const roleNorm = normalizeRole(user?.role)

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#030712]/80 backdrop-blur-xl transition-all">
      <div className="max-w-screen-2xl mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
        
        {/* Brand */}
        <div className="flex items-center gap-6">
          <NavLink to={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-emerald-400 p-[1px] transition-transform group-hover:scale-105">
              <div className="h-full w-full rounded-[7px] bg-[#030712] flex items-center justify-center font-mono text-sm font-bold text-white">
                AC
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-white group-hover:text-cyan-400 transition-colors">
                AgriChain
              </span>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest leading-none">
                WarehouseOS
              </span>
            </div>
          </NavLink>

          {/* Desktop Navigation Groups */}
          {isAuthenticated && user && (
            <nav className="hidden lg:flex items-center gap-1">
              {NAV_GROUPS.map((group) => (
                <NavDropdown key={group.label} group={group} userRole={user.role} />
              ))}
            </nav>
          )}
        </div>

        {/* Right utilities */}
        <div className="flex items-center gap-4">
          
          {/* Health indicator */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono">
            <span
              className={`h-2 w-2 rounded-full ${
                systemOnline === true
                  ? 'bg-emerald-400 animate-pulse'
                  : systemOnline === false
                  ? 'bg-red-500'
                  : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-400">
              {systemOnline === true
                ? 'SYS:ONLINE'
                : systemOnline === false
                ? 'SYS:OFFLINE'
                : 'SYS:SYNC'}
            </span>
          </div>

          {/* User Profile & Actions */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 pl-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-cyan-500/20 to-emerald-400/20 border border-cyan-500/30 flex items-center justify-center text-xs font-mono font-medium text-cyan-300">
                  {getInitials(user.full_name || user.email)}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-200 leading-tight">
                    {user.full_name || user.email?.split('@')[0]}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    {getRoleLabel(user.role)}
                  </span>
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                title="Sign out"
                className="group flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-transparent text-slate-400 transition-all hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
              >
                {isLoggingOut ? (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                )}
              </button>

              {/* Mobile menu toggle */}
              <button
                className="lg:hidden flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {mobileMenuOpen
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  }
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/login')}
                className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 text-white text-xs font-semibold shadow hover:brightness-110 transition-all"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && isAuthenticated && user && (
        <div className="lg:hidden border-t border-white/5 bg-[#030712]/95 backdrop-blur-xl">
          <div className="max-w-screen-2xl mx-auto px-4 py-4 space-y-1">
            {NAV_GROUPS.flatMap((group) =>
              group.items
                .filter((item) => item.roles.map(r => normalizeRole(r)).includes(roleNorm))
                .map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `block px-4 py-2.5 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'text-cyan-400 bg-cyan-500/10'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`
                    }
                  >
                    <span className="text-xs font-mono text-slate-600 mr-2">{group.label} /</span>
                    {item.label}
                  </NavLink>
                ))
            )}
          </div>
        </div>
      )}
    </header>
  )
}
