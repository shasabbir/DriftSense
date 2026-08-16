import { createRoot } from 'react-dom/client'
import { hostnameFromUrl } from '../shared/domainUtils'
import { sendRuntimeMessage } from '../shared/runtime'
import type { PageContextResponse } from '../shared/types'
import { startActivityTracker } from './activityTracker'
import { PromptApp } from './PromptApp'
import { promptStyles } from './promptStyles'

const domain = hostnameFromUrl(window.location.href)

if (domain) void initialize(domain)

async function initialize(currentDomain: string): Promise<void> {
  const response = await sendRuntimeMessage<PageContextResponse & { ok: boolean }>({ type: 'GET_PAGE_CONTEXT', domain: currentDomain }).catch(() => null)
  if (!response?.ok || !response.monitored || !response.session) return

  const host = document.createElement('div')
  host.id = 'driftsense-root'
  const shadow = host.attachShadow({ mode: 'closed' })
  const style = document.createElement('style')
  style.textContent = promptStyles
  const mount = document.createElement('div')
  shadow.append(style, mount)
  document.documentElement.appendChild(host)

  let stopTracker: (() => void) | null = null
  let reflectionSignal = 0

  const beginTracking = () => {
    if (stopTracker) return
    stopTracker = startActivityTracker({
      sessionId: response.session!.sessionId,
      domain: currentDomain,
      windowSeconds: response.activityWindowSeconds ?? 10,
      idleThresholdSeconds: response.idleThresholdSeconds ?? 30,
    })
  }

  const stopTracking = () => {
    stopTracker?.()
    stopTracker = null
  }

  if (response.session.declaredIntention && !response.session.reflectionRequestedAt) beginTracking()

  const root = createRoot(mount)
  const render = (mode: 'intention' | 'reflection' | 'hidden') => {
    root.render(
      <PromptApp
        initialMode={mode}
        sessionId={response.session!.sessionId}
        domain={response.session!.domain}
        reflectionSignal={reflectionSignal}
        onIntentionCaptured={beginTracking}
        onClose={stopTracking}
      />,
    )
  }
  render(response.session.reflectionRequestedAt ? 'reflection' : response.shouldPromptIntention ? 'intention' : 'hidden')

  chrome.runtime.onMessage.addListener((message: { type?: string; sessionId?: string }) => {
    if (message.type !== 'SHOW_REFLECTION' || message.sessionId !== response.session?.sessionId) return
    stopTracking()
    reflectionSignal += 1
    render('reflection')
  })

  window.addEventListener('pagehide', stopTracking, { once: true })
}
