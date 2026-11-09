import { describe, it, expect, vi } from 'vitest'
import { tokenStore } from '../api/client.js'

describe('tokenStore', () => {
  it('stores and retrieves a token', () => {
    tokenStore.set('test-token-abc')
    expect(tokenStore.get()).toBe('test-token-abc')
  })
  it('clears the token', () => {
    tokenStore.set('some-token')
    tokenStore.clear()
    expect(tokenStore.get()).toBeNull()
  })
})

