import { useEffect, useState } from 'react'
import { BarChart3, ChevronRight, Clock3, Database, Settings2, ShieldCheck, Square } from 'lucide-react'
import { sendRuntimeMessage } from '../shared/runtime'
import { patchSettings } from '../shared/storage'
import type { InternalSession } from '../shared/types'
import { AppLogo } from '../ui/AppLogo'
import { formatDuration, intentionLabel } from '../ui/format'
import { useAppData } from '../ui/useAppData'

function extensionUrl(path: string): string {
  return typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL(path) : `/${path}`
}

export function PopupApp() {
  const { data, loading } = useAppData()
  const [activeSessionId, setActiveSessionId] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    if (!data) return
    let cancelled = false
    void sendRuntimeMessage<{ ok: boolean; activeSession: InternalSession | null }>({ type: 'GET_POPUP_STATE' })
      .then((response) => {
        if (!cancelled) setActiveSessionId(response.ok ? response.activeSession?.sessionId ?? null : null)
      })
      .catch(() => {
        if (!cancelled) setActiveSessionId(null)
      })
    return () => { cancelled = true }
  }, [data])

  if (loading || !data || activeSessionId === undefined) return <div className="popup-shell"><div className="popup-loading skeleton" /></div>

  const { settings, sessions } = data
  const activeSession = sessions.find((session) => session.sessionId === activeSessionId && session.status === 'active') ?? null
  const completed = sessions.filter((session) => session.status === 'completed')
  const labeled = completed.filter((session) => session.driftLabel !== null)
  const drift = labeled.filter((session) => session.driftLabel === 1).length
  const alignmentRate = labeled.length ? Math.round(((labeled.length - drift) / labeled.length) * 100) : 0

  const toggleMonitoring = async () => {
    const enabled = !settings.monitoringEnabled
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      await sendRuntimeMessage({ type: 'SET_MONITORING', enabled })
    } else {
      await patchSettings({ monitoringEnabled: enabled })
    }
  }

  return (
    <div className="popup-shell">
      <header className="popup-header">
        <AppLogo />
        <button className={settings.monitoringEnabled ? 'toggle toggle-on' : 'toggle'} type="button" aria-label="Toggle monitoring" onClick={toggleMonitoring} />
      </header>

      {!settings.onboardingComplete ? (
        <section className="popup-setup">
          <span><ShieldCheck size={22} /></span><h1>Complete private setup</h1><p>Review consent and choose the domains that may start a research session.</p>
          <a className="button button-primary" href={extensionUrl('src/options/index.html')}>Open setup <ChevronRight size={16} /></a>
        </section>
      ) : (
        <>
          <section className={settings.monitoringEnabled ? 'popup-state popup-state-live' : 'popup-state'}>
            <div><span className="status-dot" /><strong>{settings.monitoringEnabled ? 'Collection is active' : 'Collection is paused'}</strong></div>
            <small>{settings.monitoringEnabled ? `${settings.monitoredDomains.filter((item) => item.enabled).length} domains enabled` : 'No new sessions will begin'}</small>
          </section>

          {activeSession ? <ActiveSession session={activeSession} /> : (
            <section className="popup-idle">
              <span className="popup-idle-icon"><Clock3 size={18} /></span>
              <div><strong>No active session</strong><small>A session begins on an enabled domain.</small></div>
            </section>
          )}

          <section className="popup-stats">
            <div><span>Completed</span><strong>{completed.length}</strong><small>sessions</small></div>
            <div><span>Aligned</span><strong>{labeled.length ? `${alignmentRate}%` : '-'}</strong><small>self-reported</small></div>
            <div><span>Windows</span><strong>{data.activityWindows.length}</strong><small>aggregate rows</small></div>
          </section>

          <nav className="popup-links">
            <a href={extensionUrl('src/dashboard/index.html')}><span className="popup-link-icon green"><BarChart3 size={17} /></span><span><strong>Open dashboard</strong><small>Review sessions and export data</small></span><ChevronRight size={17} /></a>
            <a href={extensionUrl('src/options/index.html')}><span className="popup-link-icon blue"><Settings2 size={17} /></span><span><strong>Collection settings</strong><small>Domains, timing, and privacy</small></span><ChevronRight size={17} /></a>
          </nav>

          <footer className="popup-footer"><ShieldCheck size={14} /> Local-first collection <span /> Stage 1</footer>
        </>
      )}
    </div>
  )
}

function ActiveSession({ session }: { session: InternalSession }) {
  const pendingReflection = session.reflectionRequestedAt !== null
  const durationEnd = pendingReflection ? new Date(session.reflectionRequestedAt!).getTime() : Date.now()
  const duration = Math.max(session.durationSeconds, Math.round((durationEnd - new Date(session.startTime).getTime()) / 1000))
  const requestReflection = async () => {
    await sendRuntimeMessage({ type: 'REQUEST_REFLECTION', sessionId: session.sessionId })
    window.close()
  }

  return (
    <section className="active-session">
      <div className="active-session-top"><span>{pendingReflection ? 'Reflection pending' : 'Active visit'}</span><span className="live-label"><span /> {pendingReflection ? 'Ended' : 'Live'}</span></div>
      <div className="active-domain"><span>{session.domain[0].toUpperCase()}</span><div><strong>{session.domain}</strong><small>{intentionLabel(session.declaredIntention)}</small></div></div>
      <div className="active-meta"><span><Clock3 size={14} /> {formatDuration(duration)}</span><span><Database size={14} /> {session.scrollCount + session.clickCount} events</span></div>
      <button className="button end-button" type="button" onClick={requestReflection}><Square size={14} /> {pendingReflection ? 'Show reflection' : 'End and reflect'}</button>
    </section>
  )
}
