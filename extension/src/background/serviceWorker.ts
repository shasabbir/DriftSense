import { domainMatches, hostnameFromUrl } from '../shared/domainUtils'
import { permittedOrigins } from '../shared/permissions'
import { getSessions, getSettings, initializeStorage, patchSettings } from '../shared/storage'
import type { RuntimeRequest } from '../shared/types'
import {
  closeSessionForTab,
  ensureSession,
  getActiveSessionForTab,
  markReflectionRequested,
  noteTabSwitch,
  recordActivityWindow,
  submitIntention,
  submitReflection,
} from './sessionManager'

void initializeStorage().then(syncCollectorRegistration)

chrome.runtime.onInstalled.addListener((details) => {
  void initializeStorage().then(() => {
    void syncCollectorRegistration()
    if (details.reason === 'install') void chrome.runtime.openOptionsPage()
  })
})

chrome.runtime.onStartup.addListener(() => {
  void initializeStorage().then(syncCollectorRegistration)
})

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.driftsense_settings) void syncCollectorRegistration()
})

chrome.runtime.onMessage.addListener((request: RuntimeRequest, sender, sendResponse) => {
  void handleMessage(request, sender)
    .then((response) => sendResponse({ ok: true, ...response }))
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown DriftSense error'
      sendResponse({ ok: false, error: message })
    })
  return true
})

let lastActiveTabId: number | null = null

chrome.tabs.onActivated.addListener(({ tabId }) => {
  if (lastActiveTabId !== null && lastActiveTabId !== tabId) void noteTabSwitch(lastActiveTabId)
  lastActiveTabId = tabId
})

chrome.tabs.onRemoved.addListener((tabId) => {
  void closeSessionForTab(tabId)
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!changeInfo.url) return
  void getActiveSessionForTab(tabId).then((session) => {
    if (!session) return
    const domain = hostnameFromUrl(changeInfo.url)
    if (!domain || !domainMatches(domain, session.domain)) void closeSessionForTab(tabId)
  })
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm.name.startsWith('reflection:')) return
  const sessionId = alarm.name.slice('reflection:'.length)
  void getSessions().then(async (sessions) => {
    const session = sessions.find((item) => item.sessionId === sessionId && item.status === 'active')
    if (!session || !session.declaredIntention) return
    await markReflectionRequested(sessionId)
    try {
      await chrome.tabs.sendMessage(session.tabId, { type: 'SHOW_REFLECTION', sessionId })
    } catch {
      // The tab may be unavailable; the unlabeled session remains visible for later review.
    }
  })
})

async function handleMessage(request: RuntimeRequest, sender: chrome.runtime.MessageSender): Promise<Record<string, unknown>> {
  if (request.type === 'GET_PAGE_CONTEXT') {
    const settings = await getSettings()
    if (!settings.consentAccepted) return { monitored: false, reason: 'consent_required' }
    if (!settings.monitoringEnabled) return { monitored: false, reason: 'monitoring_paused' }
    const configured = settings.monitoredDomains.find((item) => item.enabled && domainMatches(request.domain, item.domain))
    if (!configured) return { monitored: false, reason: 'domain_not_monitored' }
    if (!sender.tab?.id) return { monitored: false }
    const session = await ensureSession(sender.tab.id, request.domain)
    return {
      monitored: Boolean(session),
      session,
      shouldPromptIntention: Boolean(session && !session.declaredIntention),
      idleThresholdSeconds: settings.idleThresholdSeconds,
      activityWindowSeconds: settings.activityWindowSeconds,
    }
  }

  if (request.type === 'SUBMIT_INTENTION') {
    const session = await submitIntention(request.sessionId, request.intention, request.intendedDurationMinutes)
    return { session }
  }

  if (request.type === 'SKIP_INTENTION') {
    if (sender.tab?.id) await closeSessionForTab(sender.tab.id)
    return {}
  }

  if (request.type === 'RECORD_ACTIVITY_WINDOW') {
    if (!sender.tab?.id) return {}
    const session = await recordActivityWindow(request.sessionId, sender.tab.id, request.window)
    return { session }
  }

  if (request.type === 'SUBMIT_REFLECTION') {
    const session = await submitReflection(request.sessionId, request.answer)
    return { session }
  }

  if (request.type === 'REQUEST_REFLECTION') {
    const sessions = await getSessions()
    const session = sessions.find((item) => item.sessionId === request.sessionId && item.status === 'active')
    if (session) {
      await markReflectionRequested(session.sessionId)
      await chrome.tabs.sendMessage(session.tabId, { type: 'SHOW_REFLECTION', sessionId: session.sessionId })
    }
    return {}
  }

  if (request.type === 'END_ACTIVE_SESSION') {
    const tabId = request.tabId ?? (await getCurrentTabId())
    if (tabId !== null) {
      const session = await getActiveSessionForTab(tabId)
      if (session) {
        await markReflectionRequested(session.sessionId)
        await chrome.tabs.sendMessage(tabId, { type: 'SHOW_REFLECTION', sessionId: session.sessionId })
      }
    }
    return {}
  }

  if (request.type === 'SET_MONITORING') {
    const settings = await patchSettings({ monitoringEnabled: request.enabled })
    return { settings }
  }

  if (request.type === 'GET_POPUP_STATE') {
    const [settings, sessions, currentTabId] = await Promise.all([getSettings(), getSessions(), getCurrentTabId()])
    const activeSession = currentTabId === null
      ? null
      : sessions.find((session) => session.tabId === currentTabId && session.status === 'active') ?? null
    return { settings, sessions, activeSession }
  }

  return {}
}

async function getCurrentTabId(): Promise<number | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab?.id ?? null
}

async function syncCollectorRegistration(): Promise<void> {
  const registrationId = 'driftsense-domain-collector'
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [registrationId] })
  if (existing.length) await chrome.scripting.unregisterContentScripts({ ids: [registrationId] })

  const settings = await getSettings()
  if (!settings.consentAccepted || !settings.monitoringEnabled) return
  const matches = await permittedOrigins(settings.monitoredDomains)
  if (!matches.length) return

  const bundledScripts = chrome.runtime.getManifest().content_scripts?.[0]?.js
  if (!bundledScripts?.length) throw new Error('DriftSense collector bundle was not found.')
  await chrome.scripting.registerContentScripts([{
    id: registrationId,
    js: bundledScripts,
    matches,
    persistAcrossSessions: true,
    runAt: 'document_idle',
    world: 'ISOLATED',
  }])
}
