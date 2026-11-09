// Utility: merge Tailwind classes safely
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Format currency from paise to INR
export function formatCurrency(paise) {
  if (paise == null) return '—'
  const rupees = paise / 100
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(rupees)
}

// Format date/time
export function formatDate(dateStr, options = {}) {
  if (!dateStr) return '—'
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      ...options,
    }).format(new Date(dateStr))
  } catch {
    return '—'
  }
}

export function formatDateTime(dateStr) {
  return formatDate(dateStr, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Truncate MongoDB ObjectId for display
export function shortId(id) {
  if (!id) return '—'
  const s = String(id)
  return s.length > 8 ? `...${s.slice(-8)}` : s
}

// Get user initials
export function getInitials(name) {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

// Role display helpers
import { ROLES, normalizeRole } from '../constants/roles'
export { ROLES, normalizeRole }

export const ROLE_LABELS = {
  ADMIN: 'Administrator',
  FARMER: 'Farmer',
  WAREHOUSE_MANAGER: 'Warehouse Manager',
  TRANSPORTER: 'Transporter',
  DRIVER: 'Driver',
  BUYER: 'Buyer',
}

export function getRoleLabel(role) {
  const norm = normalizeRole(role)
  return ROLE_LABELS[norm] || role || 'Unknown'
}

export function getRoleColor(role) {
  const norm = normalizeRole(role)
  const colors = {
    ADMIN: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    FARMER: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    WAREHOUSE_MANAGER: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    TRANSPORTER: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    DRIVER: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    BUYER: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  }
  return colors[norm] || 'text-slate-400 bg-slate-500/10 border-slate-500/20'
}

// Status badge colors for shipments/orders
export function getStatusColor(status) {
  const colors = {
    // Shipment statuses
    pending: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
    booking_confirmed: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    vehicle_assigned: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    driver_assigned: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    loading: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    loaded: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    dispatched: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    in_transit: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    checkpoint_reached: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    delivered: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    delayed: 'text-red-400 bg-red-500/10 border-red-500/20',
    cancelled: 'text-red-400 bg-red-500/10 border-red-500/20',
    // Order statuses
    draft: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
    submitted: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    accepted: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    rejected: 'text-red-400 bg-red-500/10 border-red-500/20',
    fulfilled: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    // Alert severities
    low: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    critical: 'text-red-400 bg-red-500/10 border-red-500/20',
    // Active/inactive
    active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    inactive: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
    approved: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    suspended: 'text-red-400 bg-red-500/10 border-red-500/20',
  }
  return colors[status?.toLowerCase()] || 'text-slate-400 bg-slate-500/10 border-slate-500/20'
}

export function formatStatus(status) {
  if (!status) return '—'
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// Weight formatting
export function formatWeight(kg) {
  if (kg == null) return '—'
  return `${kg.toLocaleString('en-IN')} kg`
}

// Temperature formatting
export function formatTemp(celsius) {
  if (celsius == null) return '—'
  return `${celsius.toFixed(1)}°C`
}

