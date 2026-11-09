import { describe, it, expect } from 'vitest'

function evaluateLedgerValidity(verifyResult) {
  if (!verifyResult || typeof verifyResult !== 'object') return false
  return Boolean(verifyResult.valid ?? verifyResult.is_valid ?? false)
}

describe('Ledger Integrity Verification Resolution', () => {
  it('correctly evaluates canonical backend { valid: true } as valid', () => {
    const backendResponse = {
      valid: true,
      chain_id: 'agrichain-audit-v1',
      total_blocks: 12,
      verified_blocks: 12,
      invalid_blocks: 0,
      first_invalid_block: null,
      message: 'All blocks valid',
    }
    expect(evaluateLedgerValidity(backendResponse)).toBe(true)
  })

  it('correctly evaluates canonical backend { valid: false } as invalid', () => {
    const backendResponse = {
      valid: false,
      chain_id: 'agrichain-audit-v1',
      total_blocks: 12,
      verified_blocks: 8,
      invalid_blocks: 1,
      first_invalid_block: 9,
      error: 'Previous hash mismatch at block 9',
    }
    expect(evaluateLedgerValidity(backendResponse)).toBe(false)
  })

  it('supports backwards-compatible fallback for legacy { is_valid: true }', () => {
    const legacyResponse = {
      is_valid: true,
      blocks_checked: 10,
    }
    expect(evaluateLedgerValidity(legacyResponse)).toBe(true)
  })

  it('supports backwards-compatible fallback for legacy { is_valid: false }', () => {
    const legacyResponse = {
      is_valid: false,
      error: 'Hash broken',
    }
    expect(evaluateLedgerValidity(legacyResponse)).toBe(false)
  })

  it('handles null, undefined, or empty payload as invalid', () => {
    expect(evaluateLedgerValidity(null)).toBe(false)
    expect(evaluateLedgerValidity(undefined)).toBe(false)
    expect(evaluateLedgerValidity({})).toBe(false)
    expect(evaluateLedgerValidity({ error: 'Endpoint timed out' })).toBe(false)
  })
})

