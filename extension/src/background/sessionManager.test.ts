import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultSettings } from '../shared/constants'
import { getActivityWindows, getSessions, initializeStorage, setSettings } from '../shared/storage'
import { ensureSession, markReflectionRequested, recordActivityWindow, submitIntention, submitReflection } from './sessionManager'

beforeEach(async () => {
  vi.stubGlobal('chrome', {
    alarms: {
      clear: vi.fn(async () => true),
      create: vi.fn(),
    },
  })
  await initializeStorage()
})

describe('session collection lifecycle', () => {
  it('records only configured domains and aggregates privacy-safe windows', async () => {
    const settings = createDefaultSettings()
    const monitoredDomains = settings.monitoredDomains.map((item) => ({ ...item, enabled: item.domain === 'youtube.com' }))
    await setSettings({ ...settings, consentAccepted: true, monitoringEnabled: true, onboardingComplete: true, monitoredDomains })

    expect(await ensureSession(7, 'example.com')).toBeNull()
    const session = await ensureSession(7, 'm.youtube.com')
    expect(session?.domain).toBe('youtube.com')

    await submitIntention(session!.sessionId, 'specific_information', 10)
    const updated = await recordActivityWindow(session!.sessionId, 7, {
      domain: 'm.youtube.com',
      observedAt: new Date(Date.now() + 10_000).toISOString(),
      windowDurationSeconds: 10,
      clicksInWindow: 2,
      scrollEventsInWindow: 4,
      keyboardActivityInWindow: 3,
      idleInWindow: false,
      tabFocused: true,
      videoPlaying: true,
    })

    expect(updated?.clickCount).toBe(2)
    expect(updated?.keyboardActivityCount).toBe(3)
    const [window] = await getActivityWindows()
    expect(window.urlDomainOnly).toBe('youtube.com')
    expect(JSON.stringify(window)).not.toContain('keyValue')
  })

  it('uses only post-session reflection to create the binary drift label', async () => {
    const settings = createDefaultSettings()
    const monitoredDomains = settings.monitoredDomains.map((item) => ({ ...item, enabled: item.domain === 'reddit.com' }))
    await setSettings({ ...settings, consentAccepted: true, monitoringEnabled: true, onboardingComplete: true, monitoredDomains })
    const session = await ensureSession(8, 'reddit.com')
    await submitIntention(session!.sessionId, 'planned_entertainment_or_break', 5)
    await submitReflection(session!.sessionId, 'no_drifted')

    const stored = (await getSessions()).find((item) => item.sessionId === session!.sessionId)
    expect(stored?.driftLabel).toBe(1)
    expect(stored?.labelSource).toBe('post_session_self_report')
    expect(stored?.status).toBe('completed')
  })

  it('records aligned sessions on participant-approved work domains', async () => {
    const settings = createDefaultSettings()
    const monitoredDomains = settings.monitoredDomains.map((item) => ({ ...item, enabled: item.domain === 'github.com' }))
    await setSettings({ ...settings, consentAccepted: true, monitoringEnabled: true, onboardingComplete: true, monitoredDomains })

    const session = await ensureSession(9, 'github.com')
    await submitIntention(session!.sessionId, 'specific_information', 20)
    await submitReflection(session!.sessionId, 'yes_matched')

    const stored = (await getSessions()).find((item) => item.sessionId === session!.sessionId)
    expect(stored?.domainCategory).toBe('work')
    expect(stored?.driftLabel).toBe(0)
    expect(stored?.labelSource).toBe('post_session_self_report')
  })

  it('freezes collection and duration when reflection is requested', async () => {
    vi.useFakeTimers()
    const startedAt = new Date('2026-08-16T10:00:00.000Z')
    vi.setSystemTime(startedAt)

    const settings = createDefaultSettings()
    const monitoredDomains = settings.monitoredDomains.map((item) => ({ ...item, enabled: item.domain === 'youtube.com' }))
    await setSettings({ ...settings, consentAccepted: true, monitoringEnabled: true, onboardingComplete: true, monitoredDomains })
    const session = await ensureSession(10, 'youtube.com')
    await submitIntention(session!.sessionId, 'learning_or_tutorial', 10)

    vi.setSystemTime(new Date(startedAt.getTime() + 60_000))
    await markReflectionRequested(session!.sessionId)
    await markReflectionRequested(session!.sessionId)

    vi.setSystemTime(new Date(startedAt.getTime() + 120_000))
    const ignoredWindow = await recordActivityWindow(session!.sessionId, 10, {
      domain: 'youtube.com',
      observedAt: new Date().toISOString(),
      windowDurationSeconds: 10,
      clicksInWindow: 4,
      scrollEventsInWindow: 3,
      keyboardActivityInWindow: 2,
      idleInWindow: false,
      tabFocused: true,
      videoPlaying: true,
    })
    expect(ignoredWindow).toBeNull()

    await submitReflection(session!.sessionId, 'yes_matched')
    const stored = (await getSessions()).find((item) => item.sessionId === session!.sessionId)
    expect(stored?.checkinCount).toBe(1)
    expect(stored?.durationSeconds).toBe(60)
    expect(stored?.endTime).toBe('2026-08-16T10:01:00.000Z')
    expect((await getActivityWindows()).filter((item) => item.sessionId === session!.sessionId)).toHaveLength(0)

    vi.useRealTimers()
  })
})
