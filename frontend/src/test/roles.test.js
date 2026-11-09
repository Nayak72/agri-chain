import { describe, it, expect } from 'vitest'
import {
  ROLES,
  ALL_ROLES,
  ADMIN_ONLY,
  AGRI_ROLES,
  COMMERCE_ROLES,
  TRANSPORT_ROLES,
  normalizeRole,
  isRoleAllowed
} from '../constants/roles'

describe('Role Constants and Normalization', () => {
  it('defines canonical uppercase strings for all 6 roles', () => {
    expect(ROLES.ADMIN).toBe('ADMIN')
    expect(ROLES.FARMER).toBe('FARMER')
    expect(ROLES.WAREHOUSE_MANAGER).toBe('WAREHOUSE_MANAGER')
    expect(ROLES.TRANSPORTER).toBe('TRANSPORTER')
    expect(ROLES.DRIVER).toBe('DRIVER')
    expect(ROLES.BUYER).toBe('BUYER')
  })

  it('normalizes lowercase roles to canonical uppercase', () => {
    expect(normalizeRole('admin')).toBe('ADMIN')
    expect(normalizeRole('farmer')).toBe('FARMER')
    expect(normalizeRole('warehouse_manager')).toBe('WAREHOUSE_MANAGER')
    expect(normalizeRole('transporter')).toBe('TRANSPORTER')
    expect(normalizeRole('driver')).toBe('DRIVER')
    expect(normalizeRole('buyer')).toBe('BUYER')
  })

  it('normalizes mixed-case and padded strings correctly', () => {
    expect(normalizeRole('  Farmer  ')).toBe('FARMER')
    expect(normalizeRole('Warehouse_Manager')).toBe('WAREHOUSE_MANAGER')
    expect(normalizeRole('TRANSPORTER')).toBe('TRANSPORTER')
  })

  it('handles null, undefined, and non-string values gracefully', () => {
    expect(normalizeRole(null)).toBe('')
    expect(normalizeRole(undefined)).toBe('')
    expect(normalizeRole(123)).toBe('')
    expect(normalizeRole({})).toBe('')
  })

  it('verifies ALL_ROLES includes exactly the 6 defined platform roles', () => {
    expect(ALL_ROLES).toHaveLength(6)
    expect(ALL_ROLES).toContain(ROLES.ADMIN)
    expect(ALL_ROLES).toContain(ROLES.FARMER)
    expect(ALL_ROLES).toContain(ROLES.WAREHOUSE_MANAGER)
    expect(ALL_ROLES).toContain(ROLES.TRANSPORTER)
    expect(ALL_ROLES).toContain(ROLES.DRIVER)
    expect(ALL_ROLES).toContain(ROLES.BUYER)
  })

  it('verifies role groupings', () => {
    expect(ADMIN_ONLY).toEqual(['ADMIN'])
    expect(AGRI_ROLES).toEqual(['ADMIN', 'FARMER', 'WAREHOUSE_MANAGER'])
    expect(COMMERCE_ROLES).toEqual(['ADMIN', 'BUYER', 'FARMER'])
    expect(TRANSPORT_ROLES).toEqual(['ADMIN', 'TRANSPORTER', 'DRIVER'])
  })

  it('checks role allowance using isRoleAllowed helper', () => {
    expect(isRoleAllowed('admin', ADMIN_ONLY)).toBe(true)
    expect(isRoleAllowed('ADMIN', ADMIN_ONLY)).toBe(true)
    expect(isRoleAllowed('farmer', ADMIN_ONLY)).toBe(false)
    expect(isRoleAllowed('farmer', AGRI_ROLES)).toBe(true)
    expect(isRoleAllowed('driver', TRANSPORT_ROLES)).toBe(true)
    expect(isRoleAllowed('buyer', TRANSPORT_ROLES)).toBe(false)
  })
})

