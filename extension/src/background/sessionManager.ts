import { domainMatches } from '../shared/domainUtils'
import { driftLabelForAnswer } from '../shared/labelRules'
import { getActivityWindows, getCheckpointSnapshots, getSessions, getSettings, runStorageOperation, setActivityWindows, setCheckpointSnapshots, setSessions } from '../shared/storage'
import type { ActivityWindow, ActivityWindowInput, CheckpointSnapshot, InternalSession, PostSessionAnswer, ReflectionAction, TaskType } from '../shared/types'
import { predictionOffsetsForDuration } from './phase2Policy'

export { predictionOffsetsForDuration } from './phase2Policy'

const randomId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`
const isOpen = (session: InternalSession) => session.status === 'active' || session.status === 'pending_reflection'

export async function startTaskSession(tabId: number, domain: string, taskType: TaskType, intendedDurationMinutes: number | null): Promise<InternalSession | null> {
  return runStorageOperation(async () => {
    const settings = await getSettings()
    const configured = settings.monitoredDomains.find((item) => item.enabled && domainMatches(domain, item.domain))
    if (!settings.consentAccepted || !settings.monitoringEnabled || !configured) return null
    const sessions = await getSessions()
    if (sessions.some(isOpen)) throw new Error('Finish the current task session before starting another.')
    const now = new Date().toISOString()
    const taskSites = settings.monitoredDomains.filter((item) => item.enabled).map((item) => item.domain)
    const next: InternalSession = {
      sessionId: randomId('session'), protocolVersion: 3, anonymousUserId: settings.participantId,
      studyStage: settings.studyStage, condition: settings.condition, taskType,
      intendedDurationMinutes, taskSites, initialTaskSite: configured.domain,
      startTime: now, endTime: null, durationSeconds: 0, clickCount: 0, scrollCount: 0,
      keyboardActivityCount: 0, idleSeconds: 0, activeSeconds: 0, awaySeconds: 0,
      tabFocusLossCount: 0, tabSwitchCount: 0, videoPlayingSeconds: 0,
      reflectionRequestedAt: null, reflectionAction: null, postSessionAnswer: null, driftLabel: null,
      status: 'active', labelSource: null, createdAt: now, updatedAt: now,
      activeTabId: tabId, currentContext: 'task_site', contextChangedAt: now, lastWindowAt: null, contextEvents: [],
    }
    await setSessions([...sessions, next])
    for (const seconds of predictionOffsetsForDuration(intendedDurationMinutes)) chrome.alarms.create(`model-check:${next.sessionId}:${seconds}`, { when: Date.now() + seconds * 1000 })
    return next
  })
}

export async function getOpenSession(): Promise<InternalSession | null> {
  return (await getSessions()).find(isOpen) ?? null
}

export async function getSessionForTaskSite(domain: string): Promise<InternalSession | null> {
  const session = await getOpenSession()
  return session && session.status === 'active' && session.taskSites.some((site) => domainMatches(domain, site)) ? session : null
}

export async function recordActivityWindow(sessionId: string, input: ActivityWindowInput): Promise<InternalSession | null> {
  return runStorageOperation(async () => {
    const sessions = await getSessions()
    const index = sessions.findIndex((session) => session.sessionId === sessionId && session.status === 'active')
    if (index < 0) return null
    const session = sessions[index]
    const taskSite = session.taskSites.find((site) => domainMatches(input.domain, site))
    if (!taskSite || !input.tabFocused) return session
    const observedAt = new Date(input.observedAt)
    const offsetSeconds = Math.max(0, Math.round((observedAt.getTime() - new Date(session.startTime).getTime()) / 1000))
    const seconds = Math.max(1, Math.min(10, Math.round(input.windowDurationSeconds)))
    const window: ActivityWindow = {
      windowId: randomId('window'), sessionId, anonymousUserId: session.anonymousUserId,
      timestamp: observedAt.toISOString(), timestampOffsetSeconds: offsetSeconds, windowDurationSeconds: seconds,
      clicksInWindow: Math.max(0, Math.round(input.clicksInWindow)), scrollEventsInWindow: Math.max(0, Math.round(input.scrollEventsInWindow)),
      keyboardActivityInWindow: Math.max(0, Math.round(input.keyboardActivityInWindow)), idleInWindow: Boolean(input.idleInWindow),
      tabFocused: true, videoPlaying: Boolean(input.videoPlaying), taskSiteHostname: taskSite,
    }
    const updated: InternalSession = {
      ...session, durationSeconds: Math.max(session.durationSeconds, offsetSeconds),
      clickCount: session.clickCount + window.clicksInWindow, scrollCount: session.scrollCount + window.scrollEventsInWindow,
      keyboardActivityCount: session.keyboardActivityCount + window.keyboardActivityInWindow,
      idleSeconds: session.idleSeconds + (window.idleInWindow ? seconds : 0),
      activeSeconds: session.activeSeconds + (window.idleInWindow ? 0 : seconds),
      videoPlayingSeconds: session.videoPlayingSeconds + (window.videoPlaying ? seconds : 0),
      lastWindowAt: window.timestamp, updatedAt: window.timestamp,
    }
    sessions[index] = updated
    const windows = await getActivityWindows()
    await Promise.all([setSessions(sessions), setActivityWindows([...windows, window])])
    return updated
  })
}

export async function noteActiveContext(tabId: number, domain: string | null): Promise<void> {
  await runStorageOperation(async () => {
    const sessions = await getSessions()
    const index = sessions.findIndex((session) => session.status === 'active')
    if (index < 0) return
    const session = sessions[index]
    const now = new Date()
    const elapsed = Math.max(0, Math.round((now.getTime() - new Date(session.contextChangedAt).getTime()) / 1000))
    const nextContext = domain && session.taskSites.some((site) => domainMatches(domain, site)) ? 'task_site' : 'away'
    const tabSwitched = session.activeTabId !== null && session.activeTabId !== tabId
    sessions[index] = {
      ...session,
      awaySeconds: session.awaySeconds + (session.currentContext === 'away' ? elapsed : 0),
      tabFocusLossCount: session.tabFocusLossCount + (session.currentContext === 'task_site' && nextContext === 'away' ? 1 : 0),
      tabSwitchCount: tabSwitched ? session.tabSwitchCount + 1 : session.tabSwitchCount,
      activeTabId: tabId, currentContext: nextContext, contextChangedAt: now.toISOString(), updatedAt: now.toISOString(),
      contextEvents: [...session.contextEvents, { timestampOffsetSeconds: Math.max(0, Math.round((now.getTime() - new Date(session.startTime).getTime()) / 1000)), previousContext: session.currentContext, nextContext, previousContextSeconds: elapsed, tabSwitched }],
    }
    await setSessions(sessions)
  })
}

export async function captureCheckpoint(sessionId: string, cutoffSeconds: number): Promise<CheckpointSnapshot | null> {
  return runStorageOperation(async () => {
    const sessions = await getSessions(); const session = sessions.find((item) => item.sessionId === sessionId)
    const observedDuration = session ? Math.max(session.durationSeconds, session.status === 'active' ? Math.round((Date.now() - new Date(session.startTime).getTime()) / 1000) : 0) : 0
    if (!session || observedDuration < cutoffSeconds) return null
    const windows = (await getActivityWindows()).filter((window) => window.sessionId === sessionId && window.timestampOffsetSeconds <= cutoffSeconds)
    const sum = (field: 'clicksInWindow' | 'scrollEventsInWindow' | 'keyboardActivityInWindow') => windows.reduce((total, window) => total + window[field], 0)
    let awaySeconds = session.contextEvents.filter((event) => event.previousContext === 'away' && event.timestampOffsetSeconds <= cutoffSeconds).reduce((total, event) => total + event.previousContextSeconds, 0)
    const lastEvent = [...session.contextEvents].reverse().find((event) => event.timestampOffsetSeconds <= cutoffSeconds)
    const contextAtCutoff = lastEvent?.nextContext ?? 'task_site'
    const contextStarted = lastEvent?.timestampOffsetSeconds ?? 0
    if (contextAtCutoff === 'away') awaySeconds += Math.max(0, cutoffSeconds - contextStarted)
    const snapshot: CheckpointSnapshot = { sessionId, anonymousUserId: session.anonymousUserId, cutoffSeconds, capturedAt: new Date().toISOString(), observable: true, clickCount: sum('clicksInWindow'), scrollCount: sum('scrollEventsInWindow'), keyboardActivityCount: sum('keyboardActivityInWindow'), idleSeconds: windows.filter((window) => window.idleInWindow).reduce((total, window) => total + window.windowDurationSeconds, 0), activeSeconds: windows.filter((window) => !window.idleInWindow).reduce((total, window) => total + window.windowDurationSeconds, 0), awaySeconds, tabSwitchCount: session.contextEvents.filter((event) => event.tabSwitched && event.timestampOffsetSeconds <= cutoffSeconds).length, videoPlayingSeconds: windows.filter((window) => window.videoPlaying).reduce((total, window) => total + window.windowDurationSeconds, 0) }
    const snapshots = await getCheckpointSnapshots(); await setCheckpointSnapshots([...snapshots.filter((item) => !(item.sessionId === sessionId && item.cutoffSeconds === cutoffSeconds)), snapshot]); return snapshot
  })
}

export async function markReflectionRequested(sessionId: string): Promise<InternalSession | null> {
  const result = await updateSession(sessionId, (session) => {
    if (session.status !== 'active') return session
    const now = new Date().toISOString()
    const contextElapsed = Math.max(0, Math.round((Date.now() - new Date(session.contextChangedAt).getTime()) / 1000))
    return { ...session, status: 'pending_reflection', reflectionRequestedAt: now, endTime: now, durationSeconds: Math.max(session.durationSeconds, Math.round((Date.now() - new Date(session.startTime).getTime()) / 1000)), awaySeconds: session.awaySeconds + (session.currentContext === 'away' ? contextElapsed : 0), contextChangedAt: now, updatedAt: now }
  })
  for (const alarm of await chrome.alarms.getAll()) if (alarm.name.startsWith(`model-check:${sessionId}:`)) await chrome.alarms.clear(alarm.name)
  return result
}

export async function dismissReflection(sessionId: string, action: Exclude<ReflectionAction, null>): Promise<InternalSession | null> {
  return updateSession(sessionId, (session) => session.status === 'pending_reflection' ? { ...session, reflectionAction: action, updatedAt: new Date().toISOString() } : session)
}

export async function submitReflection(sessionId: string, answer: PostSessionAnswer): Promise<InternalSession | null> {
  return updateSession(sessionId, (session) => {
    if (session.status !== 'pending_reflection') return session
    return { ...session, postSessionAnswer: answer, driftLabel: driftLabelForAnswer(answer), labelSource: answer === 'not_sure' ? null : 'post_session_self_report', status: 'completed', updatedAt: new Date().toISOString() }
  })
}

async function updateSession(sessionId: string, updater: (session: InternalSession) => InternalSession): Promise<InternalSession | null> {
  return runStorageOperation(async () => {
    const sessions = await getSessions(); const index = sessions.findIndex((session) => session.sessionId === sessionId)
    if (index < 0) return null
    sessions[index] = updater(sessions[index]); await setSessions(sessions); return sessions[index]
  })
}
