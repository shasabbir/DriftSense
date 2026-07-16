import { domainMatches } from '../shared/domainUtils'
import { driftLabelForAnswer } from '../shared/labelRules'
import { getActivityWindows, getSessions, getSettings, runStorageOperation, setActivityWindows, setSessions } from '../shared/storage'
import type { ActivityWindow, ActivityWindowInput, DeclaredIntention, InternalSession, PostSessionAnswer } from '../shared/types'

function randomId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`
}

export async function ensureSession(tabId: number, domain: string): Promise<InternalSession | null> {
  return runStorageOperation(async () => {
    const settings = await getSettings()
    const configured = settings.monitoredDomains.find((item) => item.enabled && domainMatches(domain, item.domain))
    if (!settings.consentAccepted || !settings.monitoringEnabled || !configured) return null

    const sessions = await getSessions()
    const existing = sessions.find((session) => session.tabId === tabId && session.status === 'active' && session.domain === configured.domain)
    if (existing) return existing

    const now = new Date().toISOString()
    const next: InternalSession = {
      sessionId: randomId('session'),
      anonymousUserId: settings.participantId,
      studyStage: settings.studyStage,
      condition: settings.condition,
      domain: configured.domain,
      domainCategory: configured.category,
      declaredIntention: null,
      intendedDurationMinutes: null,
      intentionCapturedAt: null,
      startTime: now,
      endTime: null,
      durationSeconds: 0,
      clickCount: 0,
      scrollCount: 0,
      keyboardActivityCount: 0,
      idleSeconds: 0,
      activeSeconds: 0,
      tabFocusLossCount: 0,
      tabSwitchCount: 0,
      videoPlayingSeconds: 0,
      checkinCount: 0,
      postSessionAnswer: null,
      driftLabel: null,
      actualDurationSeconds: 0,
      status: 'active',
      labelSource: null,
      createdAt: now,
      updatedAt: now,
      tabId,
      lastWindowAt: null,
      reflectionRequestedAt: null,
    }

    const closed = sessions.map((session) =>
      session.tabId === tabId && session.status === 'active'
        ? closeRecord(session, 'abandoned')
        : session,
    )
    await setSessions([...closed, next])
    scheduleReflection(next.sessionId, settings.reflectionAfterMinutes)
    return next
  })
}

export async function submitIntention(
  sessionId: string,
  intention: DeclaredIntention,
  intendedDurationMinutes: number | null,
): Promise<InternalSession | null> {
  return updateSession(sessionId, (session) => ({
    ...session,
    declaredIntention: intention,
    intendedDurationMinutes,
    intentionCapturedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })).then((session) => {
    if (session) scheduleReflection(session.sessionId, intendedDurationMinutes ?? undefined)
    return session
  })
}

export async function recordActivityWindow(
  sessionId: string,
  tabId: number,
  input: ActivityWindowInput,
): Promise<InternalSession | null> {
  return runStorageOperation(async () => {
    const sessions = await getSessions()
    const index = sessions.findIndex((session) => session.sessionId === sessionId && session.status === 'active')
    if (index < 0) return null
    const session = sessions[index]
    if (session.tabId !== tabId || !domainMatches(input.domain, session.domain)) return null

    const observedAt = new Date(input.observedAt)
    const startedAt = new Date(session.startTime)
    const offsetSeconds = Math.max(0, Math.round((observedAt.getTime() - startedAt.getTime()) / 1000))
    const safeWindowSeconds = Math.max(1, Math.min(60, Math.round(input.windowDurationSeconds)))
    const window: ActivityWindow = {
      windowId: randomId('window'),
      sessionId,
      anonymousUserId: session.anonymousUserId,
      timestamp: observedAt.toISOString(),
      timestampOffsetSeconds: offsetSeconds,
      windowDurationSeconds: safeWindowSeconds,
      clicksInWindow: Math.max(0, Math.round(input.clicksInWindow)),
      scrollEventsInWindow: Math.max(0, Math.round(input.scrollEventsInWindow)),
      keyboardActivityInWindow: Math.max(0, Math.round(input.keyboardActivityInWindow)),
      idleInWindow: Boolean(input.idleInWindow),
      tabFocused: Boolean(input.tabFocused),
      videoPlaying: Boolean(input.videoPlaying),
      urlDomainOnly: session.domain,
    }

    const durationSeconds = Math.max(session.durationSeconds, offsetSeconds)
    const updated: InternalSession = {
      ...session,
      durationSeconds,
      actualDurationSeconds: durationSeconds,
      clickCount: session.clickCount + window.clicksInWindow,
      scrollCount: session.scrollCount + window.scrollEventsInWindow,
      keyboardActivityCount: session.keyboardActivityCount + window.keyboardActivityInWindow,
      idleSeconds: session.idleSeconds + (window.idleInWindow ? safeWindowSeconds : 0),
      activeSeconds: session.activeSeconds + (!window.idleInWindow && window.tabFocused ? safeWindowSeconds : 0),
      videoPlayingSeconds: session.videoPlayingSeconds + (window.videoPlaying ? safeWindowSeconds : 0),
      lastWindowAt: window.timestamp,
      updatedAt: window.timestamp,
    }
    sessions[index] = updated
    const windows = await getActivityWindows()
    await Promise.all([setSessions(sessions), setActivityWindows([...windows, window])])
    return updated
  })
}

export async function submitReflection(sessionId: string, answer: PostSessionAnswer): Promise<InternalSession | null> {
  const result = await updateSession(sessionId, (session) => {
    const now = new Date().toISOString()
    const duration = Math.max(0, Math.round((Date.now() - new Date(session.startTime).getTime()) / 1000))
    return {
      ...session,
      postSessionAnswer: answer,
      driftLabel: driftLabelForAnswer(answer),
      labelSource: 'post_session_self_report',
      endTime: now,
      durationSeconds: Math.max(session.durationSeconds, duration),
      actualDurationSeconds: Math.max(session.actualDurationSeconds, duration),
      status: 'completed',
      updatedAt: now,
    }
  })
  await chrome.alarms.clear(`reflection:${sessionId}`)
  return result
}

export async function closeSessionForTab(tabId: number): Promise<void> {
  await runStorageOperation(async () => {
    const sessions = await getSessions()
    const now = new Date().toISOString()
    let changed = false
    const next = sessions.map((session) => {
      if (session.tabId !== tabId || session.status !== 'active') return session
      changed = true
      return closeRecord(session, 'abandoned', now)
    })
    if (changed) await setSessions(next)
  })
}

export async function noteTabSwitch(tabId: number): Promise<void> {
  await runStorageOperation(async () => {
    const sessions = await getSessions()
    let changed = false
    const next = sessions.map((session) => {
      if (session.tabId !== tabId || session.status !== 'active') return session
      changed = true
      return {
        ...session,
        tabFocusLossCount: session.tabFocusLossCount + 1,
        tabSwitchCount: session.tabSwitchCount + 1,
        updatedAt: new Date().toISOString(),
      }
    })
    if (changed) await setSessions(next)
  })
}

export async function markReflectionRequested(sessionId: string): Promise<InternalSession | null> {
  return updateSession(sessionId, (session) => ({
    ...session,
    checkinCount: session.checkinCount + 1,
    reflectionRequestedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))
}

export async function getActiveSessionForTab(tabId: number): Promise<InternalSession | null> {
  const sessions = await getSessions()
  return sessions.find((session) => session.tabId === tabId && session.status === 'active') ?? null
}

async function updateSession(
  sessionId: string,
  updater: (session: InternalSession) => InternalSession,
): Promise<InternalSession | null> {
  return runStorageOperation(async () => {
    const sessions = await getSessions()
    const index = sessions.findIndex((session) => session.sessionId === sessionId)
    if (index < 0) return null
    const updated = updater(sessions[index])
    sessions[index] = updated
    await setSessions(sessions)
    return updated
  })
}

function closeRecord(session: InternalSession, status: 'abandoned', endTime = new Date().toISOString()): InternalSession {
  const duration = Math.max(0, Math.round((new Date(endTime).getTime() - new Date(session.startTime).getTime()) / 1000))
  return {
    ...session,
    endTime,
    durationSeconds: Math.max(session.durationSeconds, duration),
    actualDurationSeconds: Math.max(session.actualDurationSeconds, duration),
    status,
    updatedAt: endTime,
  }
}

function scheduleReflection(sessionId: string, minutes?: number): void {
  const delayInMinutes = Math.max(1, minutes ?? 5)
  void chrome.alarms.clear(`reflection:${sessionId}`).then(() => {
    chrome.alarms.create(`reflection:${sessionId}`, { delayInMinutes })
  })
}
