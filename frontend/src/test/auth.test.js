import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authClient, apiClient, tokenStore } from '../api/client.js'

describe('Auth Client & Interceptor Loop Prevention', () => {
  beforeEach(() => {
    tokenStore.clear()
    vi.restoreAllMocks()
  })

  it('authClient is a distinct instance from apiClient', () => {
    expect(authClient).toBeDefined()
    expect(apiClient).toBeDefined()
    expect(authClient).not.toBe(apiClient)
  })

  it('authClient does not attach Bearer token from tokenStore', () => {
    tokenStore.set('mock-token-xyz')
    // authClient request interceptors list is empty or does not set Authorization
    const reqConfig = { headers: {} }
    // authClient does not have the Bearer token interceptor
    expect(authClient.interceptors.request.handlers.length).toBe(0)
  })

  it('apiClient has Bearer token request interceptor', async () => {
    tokenStore.set('mock-token-abc')
    const config = { headers: {} }
    const handler = apiClient.interceptors.request.handlers[0].fulfilled
    const transformed = handler(config)
    expect(transformed.headers.Authorization).toBe('Bearer mock-token-abc')
  })

  it('apiClient response interceptor does NOT attempt token refresh on /auth/ endpoints', async () => {
    const errorHandler = apiClient.interceptors.response.handlers[0].rejected
    const fake401AuthError = {
      config: { url: '/auth/login', _retry: false },
      response: { status: 401, data: { detail: 'Invalid credentials' } },
    }

    // Calling errorHandler on /auth/login must reject immediately without calling refresh
    await expect(errorHandler(fake401AuthError)).rejects.toEqual(fake401AuthError)
    // _retry must remain false, proving it did NOT try to refresh
    expect(fake401AuthError.config._retry).toBe(false)
  })

  it('apiClient response interceptor does NOT attempt token refresh on /auth/refresh', async () => {
    const errorHandler = apiClient.interceptors.response.handlers[0].rejected
    const fake401RefreshError = {
      config: { url: '/auth/refresh', _retry: false },
      response: { status: 401, data: { detail: 'Refresh token revoked or unknown' } },
    }

    await expect(errorHandler(fake401RefreshError)).rejects.toEqual(fake401RefreshError)
    expect(fake401RefreshError.config._retry).toBe(false)
  })
})

