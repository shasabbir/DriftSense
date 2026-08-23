import { hostnameFromUrl } from '../shared/domainUtils'
import { sendRuntimeMessage } from '../shared/runtime'
import type { PageContextResponse } from '../shared/types'
import { startActivityTracker } from './activityTracker'

const domain = hostnameFromUrl(window.location.href)
let stopTracker: (() => void) | null = null

async function attach(): Promise<void> {
  if (!domain || stopTracker) return
  const response = await sendRuntimeMessage<PageContextResponse & { ok: boolean }>({ type: 'GET_PAGE_CONTEXT', domain }).catch(() => null)
  if (!response?.ok || !response.monitored || !response.session) return
  stopTracker = startActivityTracker({ sessionId: response.session.sessionId, domain, windowSeconds: response.activityWindowSeconds ?? 10, idleThresholdSeconds: response.idleThresholdSeconds ?? 30 })
}

void attach()
chrome.runtime.onMessage.addListener((message: { type?: string }) => { if (message.type === 'TASK_SESSION_STARTED') void attach() })
window.addEventListener('pagehide', () => { stopTracker?.(); stopTracker = null }, { once: true })
