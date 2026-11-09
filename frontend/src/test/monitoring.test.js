import { describe, it, expect } from 'vitest'

// Web Crypto SHA-256 test
async function testSha256(message) {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

describe('Cryptographic Hash Chain Integrity', () => {
  it('calculates deterministic SHA-256 hash for ledger block envelope', async () => {
    const blockPayload = '0:0000000000000000000000000000000000000000000000000000000000000000:{"event": "GENESIS"}:BLOCK_GENESIS'
    const hash = await testSha256(blockPayload)
    expect(hash).toBeDefined()
    expect(hash.length).toBe(64) // 256 bits = 64 hex chars

    // Calling again on identical data must match
    const repeatHash = await testSha256(blockPayload)
    expect(repeatHash).toBe(hash)
  })

  it('demonstrates avalanche effect when a single byte is tampered', async () => {
    const payloadA = '{"temperature": 4.5, "status": "NORMAL"}'
    const payloadB = '{"temperature": 4.6, "status": "NORMAL"}'

    const hashA = await testSha256(payloadA)
    const hashB = await testSha256(payloadB)

    expect(hashA).not.toBe(hashB)
    // Hashes should differ substantially
    let differences = 0
    for (let i = 0; i < hashA.length; i++) {
      if (hashA[i] !== hashB[i]) differences++
    }
    expect(differences).toBeGreaterThan(20) // Severe avalanche effect
  })
})

describe('Cold-Chain Threshold Validation', () => {
  const SENSORS = {
    NORMAL: { temp: 6.2, humidity: 88.0 },
    EXCURSION: { temp: 14.8, humidity: 95.0 },
  }

  function evaluateColdChainSla(reading, minTemp = 4.0, maxTemp = 8.0) {
    if (reading.temp > maxTemp || reading.temp < minTemp) {
      return 'EXCURSION'
    }
    return 'COMPLIANT'
  }

  it('evaluates normal temperature within SLA range as COMPLIANT', () => {
    expect(evaluateColdChainSla(SENSORS.NORMAL)).toBe('COMPLIANT')
  })

  it('evaluates elevated temperature excursion as EXCURSION', () => {
    expect(evaluateColdChainSla(SENSORS.EXCURSION)).toBe('EXCURSION')
  })
})

