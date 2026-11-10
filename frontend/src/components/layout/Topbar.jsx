import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { systemApi } from '@/api/system.api'
import { getInitials, getRoleLabel } from '@/utils'
import { Menu, LogOut, ChevronRight } from 'lucide-react'

// Map route fragments to clean labels
const ROUTE_LABELS = {
  dashboard: 'Dashboard',
  farms: 'Farms',
  new: 'Create',
  produce: 'Produce Catalog',
  batches: 'Harvest Batches',
  warehouses: 'Warehouses',
  inventory: 'Inventory',
  'purchase-orders': 'Purchase Orders',
  'freight-bookings': 'Freight Bookings',
  'freight-quotes': 'Freight Quotes',
  transporters: 'Transporters',
  fleet: 'Fleet Inventory',
  drivers: 'Drivers',
  shipments: 'Shipments',
  deliveries: 'Deliveries',
  'cold-chain': 'Cold-Chain Monitoring',
  ledger: 'Audit Ledger',
  analytics: 'Analytics',
  users: 'User Governance',
  settings: 'System Settings',
  forbidden: 'Access Denied',
}

export function Topbar({ onOpenMobile }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [systemOnline, setSystemOnline] = useState(null) // null initially, then boolean

  // Health ping strictly checking systemApi.healthLive()
  useEffect(() => {
    let isMounted = true
    const checkHealth = async () => {
      try {
        await systemApi.healthLive()
        if (isMounted) setSystemOnline(true)
      } catch {
        if (isMounted) setSystemOnline(false)
      }
    }
    checkHealth()
    const interval = setInterval(checkHealth, 30_000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
    } finally {
      setIsLoggingOut(false)
      navigate('/login')
    }
  }

  // Generate breadcrumb items
  const pathParts = location.pathname.split('/').filter(Boolean)

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur-md sm:px-6 lg:px-8 select-none">
      {/* Left: Mobile hamburger & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-xl text-ink-secondary hover:bg-surface-muted hover:text-ink-primary transition-colors cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Dynamic Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-medium text-ink-secondary overflow-hidden">
          <Link
            to="/dashboard"
            className="hover:text-forest transition-colors truncate hidden sm:inline"
          >
            AgriChain
          </Link>

          {pathParts.map((part, index) => {
            const isLast = index === pathParts.length - 1
            const fullPath = `/${pathParts.slice(0, index + 1).join('/')}`
            const label = ROUTE_LABELS[part] || (part.length > 12 ? `${part.slice(0, 8)}...` : part)

            return (
              <React.Fragment key={fullPath}>
                <ChevronRight className="h-3 w-3 shrink-0 text-ink-tertiary hidden sm:inline" />
                {isLast ? (
                  <span className="font-semibold text-ink-primary truncate font-sans">
                    {label}
                  </span>
                ) : (
                  <Link
                    to={fullPath}
                    className="hover:text-forest transition-colors truncate"
                  >
                    {label}
                  </Link>
                )}
              </React.Fragment>
            )
          })}
        </nav>
      </div>

      {/* Right: Health indicator, user profile, logout */}
      <div className="flex items-center gap-3 shrink-0">
        {/* System Health Status (Strictly SYS:ONLINE or SYS:OFFLINE) */}
        {systemOnline !== null && (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-muted/80 border border-border text-[11px] font-mono">
            <span
              className={`h-2 w-2 rounded-full ${
                systemOnline
                  ? 'bg-emerald-600 animate-pulse'
                  : 'bg-red-600'
              }`}
            />
            <span className="text-ink-secondary font-semibold">
              {systemOnline ? 'SYS:ONLINE' : 'SYS:OFFLINE'}
            </span>
          </div>
        )}

        {/* User profile & actions */}
        {user && (
          <div className="flex items-center gap-2.5 pl-2 border-l border-border">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest/10 border border-forest/20 text-xs font-mono font-bold text-forest">
              {getInitials(user.full_name || user.email)}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-ink-primary leading-tight">
                {user.full_name || user.email?.split('@')[0]}
              </span>
              <span className="text-[10px] font-mono text-ink-secondary uppercase">
                {getRoleLabel(user.role)}
              </span>
            </div>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              title="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-50 ml-1"
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Sign out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

