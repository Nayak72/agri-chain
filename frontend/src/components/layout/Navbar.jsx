import { useState, useEffect } from 'react'
import { useNavigate, useLocation, NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { systemApi } from '../../api/system.api'
import { getInitials, getRoleLabel } from '../../utils'

// Navigation groups filtered by role
const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', roles: ['admin', 'farmer', 'warehouse_manager', 'transporter', 'driver', 'buyer'] },
    ],
  },
  {
    label: 'Agriculture',
    items: [
      { label: 'Farms', path: '/farms', roles: ['admin', 'farmer'] },
      { label: 'Produce', path: '/produce', roles: ['admin', 'farmer', 'warehouse_manager', 'buyer'] },
      { label: 'Batches', path: '/batches', roles: ['admin', 'farmer', 'warehouse_manager'] },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { label: 'Warehouses', path: '/warehouses', roles: ['admin', 'warehouse_manager'] },
      { label: 'Inventory', path: '/inventory', roles: ['admin', 'warehouse_manager'] },
      { label: 'Purchase Orders', path: '/purchase-orders', roles: ['admin', 'buyer', 'farmer'] },
      { label: 'Freight Bookings', path: '/freight-bookings', roles: ['admin', 'buyer', 'farmer'] },
      { label: 'Freight Quotes', path: '/freight-quotes', roles: ['admin', 'transporter'] },
    ],
  },
  {
    label: 'Transport',
    items: [
      { label: 'Transporters', path: '/transporters', roles: ['admin', 'transporter'] },
      { label: 'Fleet', path: '/fleet', roles: ['admin', 'transporter'] },
      { label: 'Drivers', path: '/drivers', roles: ['admin', 'transporter'] },
      { label: 'Shipments', path: '/shipments', roles: ['admin', 'transporter', 'driver', 'buyer', 'farmer'] },
      { label: 'Deliveries', path: '/deliveries', roles: ['admin', 'driver', 'buyer'] },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { label: 'Cold-Chain', path: '/cold-chain', roles: ['admin', 'warehouse_manager', 'transporter', 'driver', 'buyer', 'farmer'] },
      { label: 'Ledger', path: '/ledger', roles: ['admin', 'buyer', 'farmer', 'transporter', 'warehouse_manager', 'driver'] },
      { label: 'Analytics', path: '/analytics', roles: ['admin', 'transporter', 'farmer', 'buyer'] },
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Users', path: '/users', roles: ['admin'] },
      { label: 'Settings', path: '/settings', roles: ['admin'] },
    ],
  },
]

function NavDropdown({ group, userRole }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  
  const visibleItems = group.items.filter((item) =>
    item.roles.includes(userRole)
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
    try {
      await logout()
      navigate('/login')
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#030712]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-screen-2xl items-center justify-between px-4 lg:px-8 gap-4">
        
        {/* Brand */}
        <div
          className="group flex items-center gap-3 cursor-pointer shrink-0"
          onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 shadow-lg shadow-cyan-900/30 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-105">
            <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <svg className="h-6 w-6 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-slate-100 group-hover:text-white transition-colors leading-none">
              Agri<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Chain</span>
            </span>
            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 group-hover:text-cyan-500 transition-colors">
              Agricultural Logistics Network
            </span>
          </div>
        </div>

        {/* Center nav (desktop) */}
        {isAuthenticated && user && (
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_GROUPS.map((group) => (
              <NavDropdown key={group.label} group={group} userRole={user.role} />
            ))}
          </nav>
        )}

        {/* Right side */}
        <div className="flex items-center gap-3 shrink-0">
          
          {/* System status indicator */}
          <div className={`hidden md:flex items-center gap-2 rounded-full border px-3 py-1 transition-colors ${
            systemOnline === true
              ? 'border-emerald-500/20 bg-emerald-500/5'
              : systemOnline === false
              ? 'border-red-500/20 bg-red-500/5'
              : 'border-slate-700 bg-slate-800/30'
          }`}>
            <span className="relative flex h-2 w-2">
              {systemOnline === true && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                systemOnline === true ? 'bg-emerald-500' : systemOnline === false ? 'bg-red-500' : 'bg-slate-500'
              }`} />
            </span>
            <span className={`text-[10px] font-mono font-medium uppercase tracking-wider ${
              systemOnline === true ? 'text-emerald-400' : systemOnline === false ? 'text-red-400' : 'text-slate-500'
            }`}>
              {systemOnline === true ? 'System Online' : systemOnline === false ? 'Offline' : 'Connecting...'}
            </span>
          </div>

          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 pl-3 border-l border-white/10">
              {/* User pill */}
              <div className="group hidden sm:flex items-center gap-2 rounded-full border border-white/5 bg-slate-900/50 p-1 pr-3 transition-all hover:border-cyan-500/30 hover:bg-slate-800/50">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600 to-emerald-600 text-xs font-bold text-white shadow-inner">
                  {getInitials(user.full_name || user.email)}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-white leading-none">
                    {user.full_name || user.email?.split('@')[0] || 'User'}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider group-hover:text-cyan-500">
                    {getRoleLabel(user.role)}
                  </span>
                </div>
              </div>

              {/* Logout */}
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
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && isAuthenticated && user && (
        <div className="lg:hidden border-t border-white/5 bg-[#030712]/95 backdrop-blur-xl">
          <div className="max-w-screen-2xl mx-auto px-4 py-4 space-y-1">
            {NAV_GROUPS.flatMap((group) =>
              group.items
                .filter((item) => item.roles.includes(user.role))
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

