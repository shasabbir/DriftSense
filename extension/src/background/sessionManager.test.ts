import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultSettings } from '../shared/constants'
import { getActivityWindows, getCheckpointSnapshots, getSessions, initializeStorage, setSettings } from '../shared/storage'
import { captureCheckpoint, getSessionForTaskSite, markReflectionRequested, noteActiveContext, recordActivityWindow, startTaskSession, submitReflection } from './sessionManager'

beforeEach(async () => { vi.useRealTimers(); vi.stubGlobal('chrome', { alarms: { create: vi.fn(), clear: vi.fn(async () => true) } }); await initializeStorage() })
async function enableSites(...sites: string[]) { const settings = createDefaultSettings(); const monitoredDomains = settings.monitoredDomains.map((item) => ({ ...item, enabled: sites.includes(item.domain) })); await setSettings({ ...settings, consentAccepted: true, monitoringEnabled: true, onboardingComplete: true, monitoredDomains }) }

describe('Phase 1 task-session lifecycle', () => {
  it('requires an explicit start on an approved task site', async () => {
    await enableSites('youtube.com')
    expect(await getSessionForTaskSite('youtube.com')).toBeNull()
    expect(await startTaskSession(7, 'example.com', 'learning_tutorial', 20)).toBeNull()
    const session = await startTaskSession(7, 'm.youtube.com', 'learning_tutorial', 20)
    expect(session?.initialTaskSite).toBe('youtube.com')
    await expect(startTaskSession(8, 'youtube.com', 'reading_research', 10)).rejects.toThrow(/current task/i)
  })

  it('records focused content-free 10-second windows only on approved task sites', async () => {
    await enableSites('youtube.com', 'github.com')
    const session = await startTaskSession(7, 'youtube.com', 'learning_tutorial', 20)
    await recordActivityWindow(session!.sessionId, { domain: 'github.com', observedAt: new Date(Date.now() + 10_000).toISOString(), windowDurationSeconds: 30, clicksInWindow: 2, scrollEventsInWindow: 4, keyboardActivityInWindow: 3, idleInWindow: false, tabFocused: true, videoPlaying: true })
    await recordActivityWindow(session!.sessionId, { domain: 'example.com', observedAt: new Date(Date.now() + 20_000).toISOString(), windowDurationSeconds: 10, clicksInWindow: 99, scrollEventsInWindow: 0, keyboardActivityInWindow: 0, idleInWindow: false, tabFocused: true, videoPlaying: false })
    const [window] = await getActivityWindows()
    expect(window.taskSiteHostname).toBe('github.com')
    expect(window.windowDurationSeconds).toBe(10)
    expect(JSON.stringify(window)).not.toContain('keyValue')
    expect((await getSessions())[0].clickCount).toBe(2)
  })

  it('stores only aggregate away time without the destination', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-08-23T10:00:00Z'))
    await enableSites('github.com')
    const session = await startTaskSession(1, 'github.com', 'coding_problem_solving', 30)
    vi.setSystemTime(new Date('2026-08-23T10:01:00Z')); await noteActiveContext(2, 'private.example')
    vi.setSystemTime(new Date('2026-08-23T10:03:00Z')); await noteActiveContext(1, 'github.com')
    const stored = (await getSessions()).find((item) => item.sessionId === session!.sessionId)!
    expect(stored.awaySeconds).toBe(120)
    expect(JSON.stringify(stored)).not.toContain('private.example')
  })

  it('keeps reflection recoverable and labels only explicit binary answers', async () => {
    await enableSites('github.com')
    const session = await startTaskSession(1, 'github.com', 'coding_problem_solving', 30)
    await markReflectionRequested(session!.sessionId)
    expect((await getSessions())[0].status).toBe('pending_reflection')
    await submitReflection(session!.sessionId, 'not_sure')
    expect((await getSessions())[0].driftLabel).toBeNull()
    const second = await startTaskSession(1, 'github.com', 'coding_problem_solving', 30)
    await markReflectionRequested(second!.sessionId); await submitReflection(second!.sessionId, 'moved_away')
    expect((await getSessions())[1].driftLabel).toBe(1)
  })

  it('builds checkpoint features without including post-cutoff windows or context events', async () => {
    vi.useFakeTimers(); const start = new Date('2026-08-23T10:00:00Z'); vi.setSystemTime(start)
    await enableSites('github.com'); const session = await startTaskSession(1, 'github.com', 'coding_problem_solving', 30)
    await recordActivityWindow(session!.sessionId, { domain: 'github.com', observedAt: new Date(start.getTime() + 590_000).toISOString(), windowDurationSeconds: 10, clicksInWindow: 2, scrollEventsInWindow: 1, keyboardActivityInWindow: 0, idleInWindow: false, tabFocused: true, videoPlaying: false })
    await recordActivityWindow(session!.sessionId, { domain: 'github.com', observedAt: new Date(start.getTime() + 610_000).toISOString(), windowDurationSeconds: 10, clicksInWindow: 9, scrollEventsInWindow: 0, keyboardActivityInWindow: 0, idleInWindow: false, tabFocused: true, videoPlaying: false })
    vi.setSystemTime(new Date(start.getTime() + 620_000)); await captureCheckpoint(session!.sessionId, 600)
    const [snapshot] = await getCheckpointSnapshots(); expect(snapshot.clickCount).toBe(2); expect(snapshot.cutoffSeconds).toBe(600)
  })
})
