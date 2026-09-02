import { domainMatches, hostnameFromUrl } from '../shared/domainUtils'
import { permittedOrigins } from '../shared/permissions'
import { getSessions, getSettings, initializeStorage, patchSettings } from '../shared/storage'
import type { RuntimeRequest } from '../shared/types'
import { captureCheckpoint, dismissReflection, getOpenSession, getSessionForTaskSite, markReflectionRequested, noteActiveContext, recordActivityWindow, startTaskSession, submitReflection } from './sessionManager'
import { loadCheckpointModel, predictCheckpoint } from './checkpointModel'
import { alertWindowAlreadyDecided, alertWindowForCutoff, canDeliverPhase2Prompt, consecutivePositiveScoreCount, existingPhase2Assignment, phase2Assignment, type Phase2Assignment } from './phase2Policy'

type Phase2Decision = { sessionId: string; cutoffSeconds: number; at: string; modelVersion: string | null; probability: number | null; triggered: boolean; assignment: Phase2Assignment | null; alertWindow?: number | null; alertEpisode?: number | null; delivered: boolean; deliveryChannel?: 'esp32' | 'browser_notification' | null; reason: string }
const PHASE2_AUDIT_KEY = 'driftsense_phase2_decisions_v1'
const DEVICE_ALERT_KEY = 'driftsense_device_alert_v1'
const DEVICE_CONNECTION_KEY = 'driftsense_device_connection_v1'
async function auditRows(): Promise<Phase2Decision[]> { return (await chrome.storage.local.get(PHASE2_AUDIT_KEY))[PHASE2_AUDIT_KEY] ?? [] }
async function saveDecision(row: Phase2Decision) { const rows = await auditRows(); await chrome.storage.local.set({ [PHASE2_AUDIT_KEY]: [...rows, row] }) }
function deviceCommand(command: 'ALERT_ON' | 'ALERT_OFF') {
  void chrome.storage.local.set({ [DEVICE_ALERT_KEY]: command === 'ALERT_ON' })
  void chrome.runtime.sendMessage({ type: 'DRIFTSENSE_DEVICE_COMMAND', command: { type: command } }).catch(() => undefined)
}
async function esp32Connected(): Promise<boolean> {
  const state = (await chrome.storage.local.get(DEVICE_CONNECTION_KEY))[DEVICE_CONNECTION_KEY] as { connected?: boolean; updatedAt?: string } | undefined
  return Boolean(state?.connected && state.updatedAt && Date.now() - new Date(state.updatedAt).getTime() < 6000)
}
async function showBrowserCheckIn(sessionId: string): Promise<void> {
  await chrome.notifications.create(`driftsense-checkin:${sessionId}`, { type: 'basic', iconUrl: chrome.runtime.getURL('icons/icon-128.png'), title: 'DriftSense check-in', message: 'Take a moment to reflect on whether this session still matches the task you started.', priority: 1 })
  await chrome.storage.local.set({ [DEVICE_ALERT_KEY]: true })
}
async function alertEpisodeActive(): Promise<boolean> { return Boolean((await chrome.storage.local.get(DEVICE_ALERT_KEY))[DEVICE_ALERT_KEY]) }

async function evaluateCheckpoint(sessionId: string, cutoff: number) {
  const snapshot = await captureCheckpoint(sessionId, cutoff)
  if (!snapshot) return
  const model = await loadCheckpointModel()
  const session = (await getSessions()).find((item) => item.sessionId === sessionId)
  if (!model || !session) { await saveDecision({ sessionId, cutoffSeconds: cutoff, at: new Date().toISOString(), modelVersion: null, probability: null, triggered: false, assignment: null, delivered: false, reason: 'model_unavailable' }); return }
  try {
    const alertWindow = alertWindowForCutoff(session.intendedDurationMinutes, cutoff)
    if (!alertWindow) { await saveDecision({ sessionId, cutoffSeconds: cutoff, at: new Date().toISOString(), modelVersion: model.model_version, probability: null, triggered: false, assignment: null, alertWindow: null, delivered: false, reason: 'outside_duration_alert_window' }); return }
    const result = predictCheckpoint(model, session, snapshot)
    const prior = await auditRows()
    const sessionRows = prior.filter((item) => item.sessionId === sessionId)
    if (alertWindowAlreadyDecided(sessionRows, alertWindow.index)) { await saveDecision({ sessionId, cutoffSeconds: cutoff, at: new Date().toISOString(), modelVersion: result.modelVersion, probability: result.probability, triggered: result.triggered, assignment: null, alertWindow: alertWindow.index, delivered: false, reason: 'alert_window_already_decided' }); return }
    if (!result.triggered) { await saveDecision({ sessionId, cutoffSeconds: cutoff, at: new Date().toISOString(), modelVersion: result.modelVersion, probability: result.probability, triggered: false, assignment: null, alertWindow: alertWindow.index, delivered: false, reason: 'below_threshold' }); return }
    const required = model.consecutive_positive_scores_required ?? 1
    const consecutive = consecutivePositiveScoreCount(sessionRows, cutoff)
    if (consecutive < required) { await saveDecision({ sessionId, cutoffSeconds: cutoff, at: new Date().toISOString(), modelVersion: result.modelVersion, probability: result.probability, triggered: true, assignment: null, alertWindow: alertWindow.index, delivered: false, reason: 'awaiting_consecutive_score' }); return }
    const randomValue = crypto.getRandomValues(new Uint32Array(1))[0] / 0x1_0000_0000
    const assignment = existingPhase2Assignment(sessionRows) ?? phase2Assignment(randomValue, model.prompt_probability ?? 0.5)
    const today = new Date().toISOString().slice(0, 10)
    const deliveredToday = prior.filter((item) => item.delivered && item.at.startsWith(today)).length
    const deliveredInSession = sessionRows.filter((item) => item.delivered).length
    const eligibleForDelivery = canDeliverPhase2Prompt(assignment, deliveredToday, model.daily_prompt_cap ?? 3)
    let delivered = false
    let deliveryChannel: Phase2Decision['deliveryChannel'] = null
    let reason = assignment === 'silent_control' ? 'silent_control' : 'daily_cap'
    if (eligibleForDelivery && await alertEpisodeActive()) reason = 'previous_alert_still_active'
    else if (eligibleForDelivery && await esp32Connected()) { deviceCommand('ALERT_ON'); delivered = true; deliveryChannel = 'esp32'; reason = 'delivered_esp32' }
    else if (eligibleForDelivery) { await showBrowserCheckIn(sessionId); delivered = true; deliveryChannel = 'browser_notification'; reason = 'delivered_browser_fallback_no_device' }
    await saveDecision({ sessionId, cutoffSeconds: cutoff, at: new Date().toISOString(), modelVersion: result.modelVersion, probability: result.probability, triggered: true, assignment, alertWindow: alertWindow.index, alertEpisode: delivered ? deliveredInSession + 1 : null, delivered, deliveryChannel, reason })
  } catch (error) { await saveDecision({ sessionId, cutoffSeconds: cutoff, at: new Date().toISOString(), modelVersion: model.model_version, probability: null, triggered: false, assignment: null, delivered: false, reason: error instanceof Error ? error.message : 'prediction_failed' }) }
}

async function updateContextAndDevice(tabId: number, domain: string | null) {
  await noteActiveContext(tabId, domain)
  const session = await getOpenSession()
  if (session?.status === 'active' && session.currentContext === 'task_site') {
    deviceCommand('ALERT_OFF')
    await chrome.notifications.clear(`driftsense-checkin:${session.sessionId}`)
  }
}

void initializeStorage().then(syncCollectorRegistration).catch(reportCollectorError)
chrome.runtime.onInstalled.addListener((details) => { void initializeStorage().then(() => { void syncCollectorRegistration().catch(reportCollectorError); if (details.reason === 'install') void chrome.runtime.openOptionsPage() }) })
chrome.runtime.onStartup.addListener(() => { void initializeStorage().then(syncCollectorRegistration).catch(reportCollectorError) })
chrome.storage.onChanged.addListener((changes, areaName) => { if (areaName === 'local' && changes.driftsense_settings) void syncCollectorRegistration().catch(reportCollectorError) })

chrome.runtime.onMessage.addListener((request: RuntimeRequest, sender, sendResponse) => {
  void handleMessage(request, sender).then((response) => sendResponse({ ok: true, ...response })).catch((error: unknown) => sendResponse({ ok: false, error: error instanceof Error ? error.message : 'Unknown DriftSense error' }))
  return true
})

chrome.tabs.onActivated.addListener(({ tabId }) => { void chrome.tabs.get(tabId).then((tab) => updateContextAndDevice(tabId, hostnameFromUrl(tab.url ?? ''))).catch(() => updateContextAndDevice(tabId, null)) })
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => { if (changeInfo.url && tab.active) void updateContextAndDevice(tabId, hostnameFromUrl(changeInfo.url)) })
chrome.tabs.onRemoved.addListener((tabId) => { void updateContextAndDevice(tabId, null) })
chrome.alarms.onAlarm.addListener((alarm) => { const match = /^model-check:(.+):(\d+)$/.exec(alarm.name); if (match) void evaluateCheckpoint(match[1], Number(match[2])) })
chrome.notifications.onClosed.addListener((notificationId) => { if (notificationId.startsWith('driftsense-checkin:')) deviceCommand('ALERT_OFF') })

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
    deviceCommand('ALERT_OFF')
    try { await chrome.tabs.sendMessage(tabId, { type: 'TASK_SESSION_STARTED', sessionId: session.sessionId }) } catch { /* The page can be reloaded to attach the collector. */ }
    return { session }
  }
  if (request.type === 'RECORD_ACTIVITY_WINDOW') return { session: await recordActivityWindow(request.sessionId, request.window) }
  if (request.type === 'REQUEST_REFLECTION') {
    const session = await markReflectionRequested(request.sessionId)
    deviceCommand('ALERT_OFF')
    await chrome.notifications.clear(`driftsense-checkin:${request.sessionId}`)
    return { session }
  }
  if (request.type === 'DISMISS_REFLECTION') return { session: await dismissReflection(request.sessionId, request.action) }
  if (request.type === 'SUBMIT_REFLECTION') {
    const session = await submitReflection(request.sessionId, request.answer)
    deviceCommand('ALERT_OFF')
    await chrome.notifications.clear(`driftsense-checkin:${request.sessionId}`)
    return { session }
  }
  if (request.type === 'SET_MONITORING') {
    const settings = await patchSettings({ monitoringEnabled: request.enabled })
    if (!request.enabled) deviceCommand('ALERT_OFF')
    return { settings }
  }
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
