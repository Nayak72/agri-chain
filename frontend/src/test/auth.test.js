import { describe, it, expect, beforeEach } from 'vitest'
import { authClient, apiClient, tokenStore } from '../api/client.js'

describe('Access-token-only authentication', () => {
  beforeEach(() => {
    tokenStore.clear()
    window.history.pushState({}, '', '/login')
  })

  it('uses a separate unauthenticated client', () => {
    expect(authClient).not.toBe(apiClient)
    expect(authClient.interceptors.request.handlers.length).toBe(0)
  })

  it('attaches the in-memory access token', () => {
    tokenStore.set('access-token')
    const handler = apiClient.interceptors.request.handlers[0].fulfilled
    expect(handler({ headers: {} }).headers.Authorization).toBe('Bearer access-token')
  })

  it('clears the token on 401 without retrying', async () => {
    tokenStore.set('expired-token')
    const error = { response: { status: 401 }, config: { url: '/orders' } }
    await expect(apiClient.interceptors.response.handlers[0].rejected(error)).rejects.toBe(error)
    expect(tokenStore.get()).toBeNull()
    expect(error.config._retry).toBeUndefined()
  })

  it('keeps the token on a non-authentication error', async () => {
    tokenStore.set('access-token')
    const error = { response: { status: 403 }, config: { url: '/orders' } }
    await expect(apiClient.interceptors.response.handlers[0].rejected(error)).rejects.toBe(error)
    expect(tokenStore.get()).toBe('access-token')
  })
})
