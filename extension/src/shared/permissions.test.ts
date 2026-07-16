import { describe, expect, it } from 'vitest'
import { originsForDomains } from './permissions'

describe('optional domain permissions', () => {
  it('creates exact and subdomain patterns only for enabled domains', () => {
    const patterns = originsForDomains([
      { domain: 'youtube.com', category: 'video', enabled: true, createdAt: new Date(0).toISOString() },
      { domain: 'reddit.com', category: 'social', enabled: false, createdAt: new Date(0).toISOString() },
    ])
    expect(patterns).toContain('https://youtube.com/*')
    expect(patterns).toContain('https://*.youtube.com/*')
    expect(patterns.some((pattern) => pattern.includes('reddit.com'))).toBe(false)
  })
})
