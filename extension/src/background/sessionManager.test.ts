import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultSettings } from '../shared/constants'
import { getActivityWindows, getSessions, initializeStorage, setSettings } from '../shared/storage'
import { ensureSession, recordActivityWindow, submitIntention, submitReflection } from './sessionManager'

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
    await setSettings({ ...settings, consentAccepted: true, monitoringEnabled: true, onboardingComplete: true })

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
    await setSettings({ ...settings, consentAccepted: true, monitoringEnabled: true, onboardingComplete: true })
    const session = await ensureSession(8, 'reddit.com')
    await submitIntention(session!.sessionId, 'intentional_break', 5)
    await submitReflection(session!.sessionId, 'no_drifted')

    const stored = (await getSessions()).find((item) => item.sessionId === session!.sessionId)
    expect(stored?.driftLabel).toBe(1)
    expect(stored?.labelSource).toBe('post_session_self_report')
    expect(stored?.status).toBe('completed')
  })
})
