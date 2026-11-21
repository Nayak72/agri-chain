import { describe, it, expect } from 'vitest'
import { cn, formatCurrency, formatRupees, rupeesToPaise, formatDate, getInitials, formatStatus } from '../utils/index.js'

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
    expect(formatCurrency(10000)).toBe('₹100.00')
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


describe('INR money handling', () => {
  it('formats Indian digit grouping and paise consistently', () => {
    expect(formatCurrency(123456789)).toBe('₹12,34,567.89')
    expect(formatCurrency(1)).toBe('₹0.01')
    expect(formatCurrency(0)).toBe('₹0.00')
    expect(formatRupees(1234567.89)).toBe('₹12,34,567.89')
    expect(formatCurrency(NaN)).toBe('—')
  })

  it.each([['0.29', 29], ['35.50', 3550], ['12000', 1200000], ['0', 0], ['1.1', 110]])(
    'converts ₹%s to exactly %i paise', (input, expected) => {
      expect(rupeesToPaise(input)).toBe(expected)
    },
  )

  it.each(['', '1.001', '-1', 'Infinity', 'NaN', '12abc', '9007199254740992'])(
    'rejects invalid or unrepresentable rupee input %s', (input) => {
      expect(rupeesToPaise(input)).toBeNull()
    },
  )
})
