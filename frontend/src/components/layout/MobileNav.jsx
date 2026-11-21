import React, { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { pageCapabilityForPath } from '@/constants/pageCapabilities'
import { ROLES, ALL_ROLES, ADMIN_ONLY } from '@/constants/roles'
import { getRoleLabel } from '@/utils'
import {
  LayoutDashboard,
  Sprout,
  Apple,
  Boxes,
  Warehouse,
  PackageSearch,
  ShoppingCart,
  CalendarCheck,
  IndianRupee,
  Building2,
  Truck,
  Users,
  Navigation,
  ClipboardCheck,
  ThermometerSnowflake,
  ShieldCheck,
  BarChart3,
  UserCog,
  Settings,
  X,
  Leaf,
} from 'lucide-react'

const NAVIGATION_SECTORS = [
  {
    sector: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ALL_ROLES },
    ],
  },
  {
    sector: 'Agriculture',
    items: [
      { label: 'Farms', path: '/farms', icon: Sprout, roles: [ROLES.ADMIN, ROLES.FARMER] },
      { label: 'Produce', path: '/produce', icon: Apple, roles: [ROLES.ADMIN, ROLES.FARMER, ROLES.WAREHOUSE_MANAGER, ROLES.BUYER] },
      { label: 'Batches', path: '/batches', icon: Boxes, roles: [ROLES.ADMIN, ROLES.FARMER, ROLES.WAREHOUSE_MANAGER, ROLES.BUYER] },
    ],
  },
  {
    sector: 'Warehousing',
    items: [
      { label: 'Warehouses', path: '/warehouses', icon: Warehouse, roles: [ROLES.ADMIN, ROLES.WAREHOUSE_MANAGER] },
      { label: 'Inventory', path: '/inventory', icon: PackageSearch, roles: [ROLES.ADMIN, ROLES.WAREHOUSE_MANAGER] },
    ],
  },
  {
    sector: 'Commerce',
    items: [
      { label: 'Purchase Orders', path: '/purchase-orders', icon: ShoppingCart, roles: [ROLES.ADMIN, ROLES.BUYER, ROLES.FARMER] },
      { label: 'Freight Bookings', path: '/freight-bookings', icon: CalendarCheck, roles: [ROLES.ADMIN, ROLES.BUYER, ROLES.FARMER] },
      { label: 'Freight Quotes', path: '/freight-quotes', icon: IndianRupee, roles: [ROLES.ADMIN, ROLES.TRANSPORTER, ROLES.BUYER, ROLES.FARMER] },
    ],
  },
  {
    sector: 'Transport',
    items: [
      { label: 'Transporters', path: '/transporters', icon: Building2, roles: [ROLES.ADMIN, ROLES.TRANSPORTER] },
      { label: 'Fleet', path: '/fleet', icon: Truck, roles: [ROLES.ADMIN, ROLES.TRANSPORTER] },
      { label: 'Drivers', path: '/drivers', icon: Users, roles: [ROLES.ADMIN, ROLES.TRANSPORTER] },
    ],
  },
  {
    sector: 'Fulfilment',
    items: [
      { label: 'Shipments', path: '/shipments', icon: Navigation, roles: ALL_ROLES },
      { label: 'Deliveries', path: '/deliveries', icon: ClipboardCheck, roles: [ROLES.ADMIN, ROLES.DRIVER, ROLES.BUYER, ROLES.TRANSPORTER] },
    ],
  },
  {
    sector: 'Monitoring',
    items: [
      { label: 'Cold-Chain', path: '/cold-chain', icon: ThermometerSnowflake, roles: ALL_ROLES },
      { label: 'Ledger', path: '/ledger', icon: ShieldCheck, roles: ALL_ROLES },
      { label: 'Analytics', path: '/analytics', icon: BarChart3, roles: ALL_ROLES },
    ],
  },
  {
    sector: 'Administration',
    items: [
      { label: 'Users', path: '/users', icon: UserCog, roles: ADMIN_ONLY },
      { label: 'Settings', path: '/settings', icon: Settings, roles: ADMIN_ONLY },
    ],
  },
]

export function MobileNav({ open, onClose }) {
  const { user, can } = useAuth()
  const location = useLocation()

  // Close drawer on route change
  useEffect(() => {
    if (open) onClose()
  }, [location.pathname])

  useEffect(() => {
    if (!open) return
    // Resizing an open mobile drawer must not leave desktop scrolling locked.
    const desktop = window.matchMedia?.('(min-width: 1024px)')
    const closeOnDesktop = () => { if (desktop?.matches) onClose() }
    closeOnDesktop()
    desktop?.addEventListener?.('change', closeOnDesktop)
    const previous = document.activeElement
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const panel = document.getElementById('mobile-navigation')
    const focusFrame = requestAnimationFrame(() => panel?.querySelector('button')?.focus())
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return
      const controls = panel?.querySelectorAll('a, button')
      const first = controls?.[0], last = controls?.[controls.length - 1]
      if (!panel?.contains(document.activeElement)) { event.preventDefault(); first?.focus(); return }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      desktop?.removeEventListener?.('change', closeOnDesktop)
      cancelAnimationFrame(focusFrame)
      document.body.style.overflow = oldOverflow
      document.removeEventListener('keydown', onKey)
      previous?.focus()
    }
  }, [open])

  const visibleSectors = NAVIGATION_SECTORS.map((sec) => ({
    ...sec,
    items: sec.items.filter((item) => can(pageCapabilityForPath(item.path))),
  })).filter((sec) => sec.items.length > 0)

  return (
    <div data-open={open} aria-hidden={!open} inert={!open ? "" : undefined} className="mobile-presence fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 glass-overlay"
        onClick={onClose}
      />

      {/* Drawer */}
      <div id="mobile-navigation" onTransitionEnd={event => {
        if (open && event.target === event.currentTarget && !event.currentTarget.contains(document.activeElement)) {
          event.currentTarget.querySelector('button')?.focus()
        }
      }} role="dialog" aria-modal="true" aria-label="Navigation" className="mobile-drawer glass-sidebar relative flex w-4/5 max-w-xs h-full flex-col text-white shadow-2xl">
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sage-light">
              <Leaf className="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <span className="text-base font-bold text-white leading-tight">AgriChain</span>
              <p className="text-[10px] font-mono text-sage-light/80">Nature Meets Precision</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="p-1.5 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable links */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scrollbar-thin">
          {visibleSectors.map((sec) => (
            <div key={sec.sector} className="space-y-1">
              <div className="px-2 pb-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-white/40">
                {sec.sector}
              </div>
              {sec.items.map((item) => {
                const Icon = item.icon
                const isActive =
                  item.path === '/dashboard'
                    ? location.pathname === '/dashboard'
                    : location.pathname.startsWith(item.path)

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                      isActive
                        ? 'glass-nav-active text-white font-semibold'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-sage-light' : 'text-white/60'}`} />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          ))}
        </div>

        {/* User footer */}
        {user && (
          <div className="p-4 border-t border-white/10 bg-black/10">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sage/20 text-ivory border border-sage/30 text-xs font-mono font-bold">
                {user.email ? user.email.slice(0, 2).toUpperCase() : 'U'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white truncate">
                  {user.full_name || user.email}
                </span>
                <span className="text-[10px] font-mono text-sage-light uppercase">
                  {getRoleLabel(user.role)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

