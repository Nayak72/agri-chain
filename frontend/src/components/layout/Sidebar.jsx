import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ROLES, ALL_ROLES, ADMIN_ONLY, normalizeRole, isRoleAllowed } from '@/constants/roles'
import { getInitials, getRoleLabel } from '@/utils'
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
  ChevronLeft,
  ChevronRight,
  LogOut,
  Leaf,
} from 'lucide-react'

// Canonical 8 navigation sectors strictly aligned with App.jsx route allowlists
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

export function Sidebar({ collapsed, onToggleCollapse, className }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const userRole = normalizeRole(user?.role)

  // Filter sectors and items based strictly on user role
  const visibleSectors = NAVIGATION_SECTORS.map((sec) => ({
    ...sec,
    items: sec.items.filter((item) => isRoleAllowed(userRole, item.roles)),
  })).filter((sec) => sec.items.length > 0)

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 hidden lg:flex flex-col bg-[#1b3527] border-r border-[#152a1e] text-[#F6F4EC] transition-all duration-200 select-none ${
        collapsed ? 'w-[72px]' : 'w-[252px]'
      } ${className || ''}`}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center px-4 border-b border-white/10 justify-between shrink-0">
        <NavLink to="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-emerald-300 border border-white/15 shadow-sm">
            <Leaf className="h-5 w-5 stroke-[2]" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-base font-bold tracking-tight text-white leading-tight truncate">
                AgriChain
              </span>
              <span className="text-[10px] font-mono tracking-wider text-emerald-300/80 uppercase truncate">
                Nature Meets Precision
              </span>
            </div>
          )}
        </NavLink>
      </div>

      {/* Navigation Links (Scrollable) */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
        {visibleSectors.map((sec) => (
          <div key={sec.sector} className="space-y-1">
            {!collapsed && (
              <div className="px-2.5 pb-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-white/40">
                {sec.sector}
              </div>
            )}
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
                  title={collapsed ? item.label : undefined}
                  className={`group flex items-center gap-3 rounded-xl px-2.5 py-2 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-white/15 text-white font-semibold shadow-xs border border-white/10'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  } ${collapsed ? 'justify-center px-0' : ''}`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-105 ${
                      isActive ? 'text-emerald-300' : 'text-white/60 group-hover:text-white'
                    }`}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              )
            })}
          </div>
        ))}
      </div>

      {/* User & Collapse Footer */}
      <div className="shrink-0 border-t border-white/10 p-3 bg-black/10">
        <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 text-xs font-mono font-bold">
              {getInitials(user?.full_name || user?.email)}
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white truncate leading-tight">
                  {user?.full_name || user?.email?.split('@')[0]}
                </span>
                <span className="text-[10px] font-mono text-emerald-300/80 uppercase truncate">
                  {getRoleLabel(user?.role)}
                </span>
              </div>
            )}
          </div>

          {!collapsed && (
            <button
              onClick={() => onToggleCollapse(!collapsed)}
              className="p-1 rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors"
              title="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            onClick={() => onToggleCollapse(!collapsed)}
            className="mt-2 flex w-full justify-center p-1.5 rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors"
            title="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  )
}

