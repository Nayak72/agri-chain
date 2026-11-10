import React, { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ROLES, ALL_ROLES, ADMIN_ONLY, normalizeRole, isRoleAllowed } from '@/constants/roles'
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
  BadgeDollarSign,
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
      { label: 'Batches', path: '/batches', icon: Boxes, roles: [ROLES.ADMIN, ROLES.FARMER, ROLES.WAREHOUSE_MANAGER] },
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
      { label: 'Freight Quotes', path: '/freight-quotes', icon: BadgeDollarSign, roles: [ROLES.ADMIN, ROLES.TRANSPORTER, ROLES.BUYER, ROLES.FARMER] },
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
  const { user } = useAuth()
  const location = useLocation()
  const userRole = normalizeRole(user?.role)

  // Close drawer on route change
  useEffect(() => {
    if (open) onClose()
  }, [location.pathname])

  if (!open) return null

  const visibleSectors = NAVIGATION_SECTORS.map((sec) => ({
    ...sec,
    items: sec.items.filter((item) => isRoleAllowed(userRole, item.roles)),
  })).filter((sec) => sec.items.length > 0)

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1b251e]/50 backdrop-blur-xs transition-opacity animate-fade-in-down"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative flex w-4/5 max-w-xs h-full flex-col bg-[#1b3527] text-white shadow-2xl animate-fade-in-left">
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-emerald-300">
              <Leaf className="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <span className="text-base font-bold text-white leading-tight">AgriChain</span>
              <p className="text-[10px] font-mono text-emerald-300/80">Nature Meets Precision</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable links */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
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
                        ? 'bg-white/15 text-white font-semibold'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-300' : 'text-white/60'}`} />
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
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 text-xs font-mono font-bold">
                {user.email ? user.email.slice(0, 2).toUpperCase() : 'U'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white truncate">
                  {user.full_name || user.email}
                </span>
                <span className="text-[10px] font-mono text-emerald-300 uppercase">
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

