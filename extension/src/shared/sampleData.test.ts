import { describe, expect, it } from 'vitest'
import { seedSyntheticData } from './sampleData'
import { getAllData, initializeStorage } from './storage'

describe('synthetic dashboard data', () => {
  it('creates linked, privacy-safe sessions and windows', async () => {
    await initializeStorage()
    await seedSyntheticData()
    const data = await getAllData()
    expect(data.sessions.length).toBe(18)
    expect(data.activityWindows.length).toBeGreaterThan(18)
    expect(data.activityWindows.every((window) => data.sessions.some((session) => session.sessionId === window.sessionId))).toBe(true)
    expect(data.activityWindows.every((window) => !window.urlDomainOnly.includes('/'))).toBe(true)
  })
})
