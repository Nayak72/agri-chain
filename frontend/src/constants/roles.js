export const ROLES = {
  ADMIN: 'ADMIN',
  FARMER: 'FARMER',
  WAREHOUSE_MANAGER: 'WAREHOUSE_MANAGER',
  TRANSPORTER: 'TRANSPORTER',
  DRIVER: 'DRIVER',
  BUYER: 'BUYER',
}

export const ALL_ROLES = Object.values(ROLES)
export const ADMIN_ONLY = [ROLES.ADMIN]
export const AGRI_ROLES = [ROLES.ADMIN, ROLES.FARMER, ROLES.WAREHOUSE_MANAGER]
export const COMMERCE_ROLES = [ROLES.ADMIN, ROLES.BUYER, ROLES.FARMER]
export const TRANSPORT_ROLES = [ROLES.ADMIN, ROLES.TRANSPORTER, ROLES.DRIVER]

export function normalizeRole(role) {
  if (!role || typeof role !== 'string') return ''
  return role.toUpperCase().trim()
}

export function isRoleAllowed(role, allowedRoles = []) {
  if (!role || !allowedRoles || !allowedRoles.length) return false
  const normalized = normalizeRole(role)
  return allowedRoles.some((allowed) => normalizeRole(allowed) === normalized)
}

