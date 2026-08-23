import { domainMatches, hostnameFromUrl } from '../shared/domainUtils'
import { permittedOrigins } from '../shared/permissions'
import { getSessions, getSettings, initializeStorage, patchSettings } from '../shared/storage'
import type { RuntimeRequest } from '../shared/types'
import { captureCheckpoint, dismissReflection, getOpenSession, getSessionForTaskSite, markReflectionRequested, noteActiveContext, recordActivityWindow, startTaskSession, submitReflection } from './sessionManager'

void initializeStorage().then(syncCollectorRegistration).catch(reportCollectorError)
chrome.runtime.onInstalled.addListener((details) => { void initializeStorage().then(() => { void syncCollectorRegistration().catch(reportCollectorError); if (details.reason === 'install') void chrome.runtime.openOptionsPage() }) })
chrome.runtime.onStartup.addListener(() => { void initializeStorage().then(syncCollectorRegistration).catch(reportCollectorError) })
chrome.storage.onChanged.addListener((changes, areaName) => { if (areaName === 'local' && changes.driftsense_settings) void syncCollectorRegistration().catch(reportCollectorError) })

chrome.runtime.onMessage.addListener((request: RuntimeRequest, sender, sendResponse) => {
  void handleMessage(request, sender).then((response) => sendResponse({ ok: true, ...response })).catch((error: unknown) => sendResponse({ ok: false, error: error instanceof Error ? error.message : 'Unknown DriftSense error' }))
  return true
})

chrome.tabs.onActivated.addListener(({ tabId }) => { void chrome.tabs.get(tabId).then((tab) => noteActiveContext(tabId, hostnameFromUrl(tab.url ?? ''))).catch(() => noteActiveContext(tabId, null)) })
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => { if (changeInfo.url && tab.active) void noteActiveContext(tabId, hostnameFromUrl(changeInfo.url)) })
chrome.tabs.onRemoved.addListener((tabId) => { void noteActiveContext(tabId, null) })
chrome.alarms.onAlarm.addListener((alarm) => { const match = /^checkpoint:(.+):(180|300|600)$/.exec(alarm.name); if (match) void captureCheckpoint(match[1], Number(match[2]) as 180 | 300 | 600) })

async function handleMessage(request: RuntimeRequest, sender: chrome.runtime.MessageSender): Promise<Record<string, unknown>> {
  if (request.type === 'GET_PAGE_CONTEXT') {
    const settings = await getSettings()
    if (!settings.consentAccepted) return { monitored: false, reason: 'consent_required' }
    if (!settings.monitoringEnabled) return { monitored: false, reason: 'monitoring_paused' }
    const configured = settings.monitoredDomains.find((item) => item.enabled && domainMatches(request.domain, item.domain))
    if (!configured) return { monitored: false, reason: 'domain_not_approved' }
    const session = await getSessionForTaskSite(request.domain)
    if (!session) return { monitored: false, reason: 'no_active_task' }
    return { monitored: true, session, idleThresholdSeconds: settings.idleThresholdSeconds, activityWindowSeconds: settings.activityWindowSeconds }
  }
  if (request.type === 'START_TASK_SESSION') {
    const tabId = request.tabId ?? sender.tab?.id ?? await getCurrentTabId()
    if (tabId === null) throw new Error('Open an approved task site before starting a task.')
    const session = await startTaskSession(tabId, request.domain, request.taskType, request.intendedDurationMinutes)
    if (!session) throw new Error('This hostname is not an enabled participant-approved task site.')
    try { await chrome.tabs.sendMessage(tabId, { type: 'TASK_SESSION_STARTED', sessionId: session.sessionId }) } catch { /* The page can be reloaded to attach the collector. */ }
    return { session }
  }
  if (request.type === 'RECORD_ACTIVITY_WINDOW') return { session: await recordActivityWindow(request.sessionId, request.window) }
  if (request.type === 'REQUEST_REFLECTION') return { session: await markReflectionRequested(request.sessionId) }
  if (request.type === 'DISMISS_REFLECTION') return { session: await dismissReflection(request.sessionId, request.action) }
  if (request.type === 'SUBMIT_REFLECTION') return { session: await submitReflection(request.sessionId, request.answer) }
  if (request.type === 'SET_MONITORING') return { settings: await patchSettings({ monitoringEnabled: request.enabled }) }
  if (request.type === 'SYNC_COLLECTOR') return { collectorStatus: await syncCollectorRegistration() }
  if (request.type === 'GET_POPUP_STATE') {
    const [settings, sessions, currentTabId] = await Promise.all([getSettings(), getSessions(), getCurrentTabId()])
    let currentDomain: string | null = null
    if (currentTabId !== null) currentDomain = hostnameFromUrl((await chrome.tabs.get(currentTabId)).url ?? '')
    return { settings, sessions, activeSession: await getOpenSession(), currentTabId, currentDomain }
  }
  return {}
}

async function getCurrentTabId(): Promise<number | null> { const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); return tab?.id ?? null }
type CollectorRegistrationStatus = { registered: boolean; matches: string[] }
let collectorSyncQueue: Promise<CollectorRegistrationStatus> = Promise.resolve({ registered: false, matches: [] })
function syncCollectorRegistration(): Promise<CollectorRegistrationStatus> { const sync = collectorSyncQueue.catch(() => ({ registered: false, matches: [] })).then(applyCollectorRegistration); collectorSyncQueue = sync; return sync }
async function applyCollectorRegistration(): Promise<CollectorRegistrationStatus> {
  const registrationId = 'driftsense-task-site-collector'
  const all = await chrome.scripting.getRegisteredContentScripts()
  const stale = all.filter((item) => item.id === registrationId || item.id === 'driftsense-domain-collector').map((item) => item.id)
  if (stale.length) await chrome.scripting.unregisterContentScripts({ ids: stale })
  const settings = await getSettings()
  if (!settings.consentAccepted || !settings.monitoringEnabled) return { registered: false, matches: [] }
  const matches = await permittedOrigins(settings.monitoredDomains)
  if (!matches.length) return { registered: false, matches: [] }
  const scripts = chrome.runtime.getManifest().content_scripts?.[0]?.js
  if (!scripts?.length) throw new Error('DriftSense collector bundle was not found.')
  await chrome.scripting.registerContentScripts([{ id: registrationId, js: scripts, matches, persistAcrossSessions: true, runAt: 'document_idle', world: 'ISOLATED' }])
  return { registered: true, matches }
}
function reportCollectorError(error: unknown): void { console.error('DriftSense collector registration failed.', error) }
