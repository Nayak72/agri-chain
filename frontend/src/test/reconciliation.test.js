import { describe, it, expect } from 'vitest'

function validateWeightReconciliation(received, accepted, damaged, rejected, tolerance = 0.01) {
  const sum = Number(accepted) + Number(damaged) + Number(rejected)
  const diff = Math.abs(Number(received) - sum)
  return {
    isValid: diff <= tolerance,
    difference: diff,
    received: Number(received),
    totalCategorized: sum,
  }
}

describe('Warehouse Intake Weight Reconciliation', () => {
  it('passes when received exactly equals accepted + damaged + rejected', () => {
    const result = validateWeightReconciliation(5000, 4800, 150, 50)
    expect(result.isValid).toBe(true)
    expect(result.difference).toBe(0)
    expect(result.totalCategorized).toBe(5000)
  })

  it('fails when received weight is greater than categorized sum (unaccounted loss)', () => {
    const result = validateWeightReconciliation(5000, 4800, 100, 50) // sums to 4950
    expect(result.isValid).toBe(false)
    expect(result.difference).toBe(50)
  })

  it('fails when categorized sum exceeds received weight (over-allocation)', () => {
    const result = validateWeightReconciliation(5000, 4900, 150, 50) // sums to 5100
    expect(result.isValid).toBe(false)
    expect(result.difference).toBe(100)
  })

  it('handles floating point decimals within 0.01 kg tolerance', () => {
    // 0.1 + 0.2 in JS float math is 0.30000000000000004
    const result = validateWeightReconciliation(100.3, 100.0, 0.1, 0.2)
    expect(result.isValid).toBe(true)
    expect(result.difference).toBeLessThanOrEqual(0.01)
  })

  it('detects discrepancies just outside the 0.01 kg tolerance', () => {
    const result = validateWeightReconciliation(100.0, 99.98, 0, 0)
    expect(result.isValid).toBe(false)
    expect(result.difference).toBeGreaterThan(0.01)
  })

  it('handles 100% accepted without damages or rejections', () => {
    const result = validateWeightReconciliation(2500.5, 2500.5, 0, 0)
    expect(result.isValid).toBe(true)
    expect(result.totalCategorized).toBe(2500.5)
  })
})

