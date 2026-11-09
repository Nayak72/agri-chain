import { describe, it, expect } from 'vitest'
import { cn, formatCurrency, formatDate, getInitials, formatStatus } from '../utils/index.js'

describe('cn (class merger)', () => {
  it('merges classes', () => {
    expect(cn('a', 'b')).toBe('a b')
  })
  it('handles conditional classes', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c')
  })
  it('merges conflicting tailwind classes (last wins)', () => {
    expect(cn('text-red-400', 'text-cyan-400')).toBe('text-cyan-400')
  })
})

describe('formatCurrency', () => {
  it('converts paise to INR', () => {
    expect(formatCurrency(10000)).toContain('100')
  })
  it('handles null', () => {
    expect(formatCurrency(null)).toBe('—')
  })
})

describe('getInitials', () => {
  it('gets initials from full name', () => {
    expect(getInitials('John Doe')).toBe('JD')
  })
  it('handles single name', () => {
    expect(getInitials('Alice')).toBe('AL')
  })
  it('handles null', () => {
    expect(getInitials(null)).toBe('U')
  })
})

describe('formatStatus', () => {
  it('converts snake_case to Title Case', () => {
    expect(formatStatus('in_transit')).toBe('In Transit')
  })
  it('handles null', () => {
    expect(formatStatus(null)).toBe('—')
  })
})

