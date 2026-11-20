import { describe, it, expect } from 'vitest'
import vercelConfig from '../../vercel.json'
import { apiClient, authClient, healthClient } from '../api/client.js'

describe('Deployment Configuration', () => {
  it('loads valid vercel.json with expected proxy rewrite rules', () => {
    expect(vercelConfig).toBeDefined()
    expect(Array.isArray(vercelConfig.rewrites)).toBe(true)

    const sources = vercelConfig.rewrites.map(r => r.source)
    expect(sources).toContain('/api/:path*')
    expect(sources).toContain('/health/:path*')
    expect(sources).toContain('/uploads/:path*')
    expect(sources).toContain('/(.*)')

    const lastRewrite = vercelConfig.rewrites[vercelConfig.rewrites.length - 1]
    expect(lastRewrite.source).toBe('/(.*)')
    expect(lastRewrite.destination).toBe('/index.html')
  })

  it('apiClient and authClient default to /api/v1 relative base URL', () => {
    expect(apiClient.defaults.baseURL).toBe('/api/v1')
    expect(authClient.defaults.baseURL).toBe('/api/v1')
  })

  it('healthClient has timeout configured for lightweight health pings', () => {
    expect(healthClient.defaults.timeout).toBe(5000)
  })
})

