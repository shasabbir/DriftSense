import { describe, expect, it } from 'vitest'
import { assessDomainCoverage, createDefaultSettings, migrateDomainPresets } from './constants'
import type { AppSettings, MonitoredDomain } from './types'

function domain(domain: string, category: MonitoredDomain['category'], enabled = true): MonitoredDomain {
  return { domain, category, enabled, createdAt: new Date(0).toISOString() }
}

describe('research domain coverage', () => {
  it('starts every suggested domain disabled for explicit participant selection', () => {
    expect(createDefaultSettings().monitoredDomains.every((item) => !item.enabled)).toBe(true)
  })

  it('requires both work or learning and mixed-use context', () => {
    expect(assessDomainCoverage([domain('github.com', 'work')]).balanced).toBe(false)
    expect(assessDomainCoverage([domain('youtube.com', 'video')]).balanced).toBe(false)
    expect(assessDomainCoverage([domain('github.com', 'work'), domain('youtube.com', 'video')]).balanced).toBe(true)
  })

  it('adds new balanced candidates to old settings without enabling them', () => {
    const current = createDefaultSettings()
    const old = {
      ...current,
      schemaVersion: 1,
      domainPresetsVersion: 1,
      monitoredDomains: [domain('youtube.com', 'video')],
    } as unknown as AppSettings
    const migrated = migrateDomainPresets(old)
    expect(migrated.schemaVersion).toBe(2)
    expect(migrated.domainPresetsVersion).toBe(2)
    expect(migrated.monitoredDomains.find((item) => item.domain === 'youtube.com')?.enabled).toBe(true)
    expect(migrated.monitoredDomains.find((item) => item.domain === 'github.com')?.enabled).toBe(false)
  })
})
