import { useEffect, useState } from 'react'
import { BarChart3, ChevronRight, Clock3, Database, Plus, Settings2, ShieldCheck, Square } from 'lucide-react'
import { TASK_TYPE_OPTIONS } from '../shared/constants'
import { domainMatches } from '../shared/domainUtils'
import { requestDomainPermissions } from '../shared/permissions'
import { sendRuntimeMessage } from '../shared/runtime'
import { patchSettings, setSettings } from '../shared/storage'
import type { AppSettings, InternalSession, PostSessionAnswer, TaskType } from '../shared/types'
import { AppLogo } from '../ui/AppLogo'
import { formatDuration, taskTypeLabel } from '../ui/format'
import { useAppData } from '../ui/useAppData'

function extensionUrl(path: string): string { return typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL(path) : `/${path}` }
type PopupState = { ok: boolean; settings: AppSettings; sessions: InternalSession[]; activeSession: InternalSession | null; currentTabId: number | null; currentDomain: string | null }

export function PopupApp() {
  const { data, loading } = useAppData()
  const [state, setState] = useState<PopupState | null>(null)
  const [taskType, setTaskType] = useState<TaskType>('writing_creating')
  const [duration, setDuration] = useState('30')
  const [error, setError] = useState('')
  const [addingDomain, setAddingDomain] = useState(false)
  useEffect(() => { if (data) void refresh() }, [data])
  const refresh = async () => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      setState({ ok: true, settings: data!.settings, sessions: data!.sessions, activeSession: data!.sessions.find((session) => session.status === 'active' || session.status === 'pending_reflection') ?? null, currentTabId: null, currentDomain: data!.settings.monitoredDomains.find((item) => item.enabled)?.domain ?? null })
      return
    }
    setState(await sendRuntimeMessage<PopupState>({ type: 'GET_POPUP_STATE' }))
  }
  if (loading || !data || !state) return <div className="popup-shell"><div className="popup-loading skeleton" /></div>
  const settings = state.settings
  const { sessions } = data
  const active = state.activeSession
  const approvedCurrentSite = Boolean(state.currentDomain && settings.monitoredDomains.some((item) => item.enabled && domainMatches(state.currentDomain!, item.domain)))
  const completed = sessions.filter((session) => session.status === 'completed')
  const labeled = completed.filter((session) => session.driftLabel !== null)
  const start = async () => {
    if (!state.currentDomain) return
    const minutes = Number.parseInt(duration, 10)
    const response = await sendRuntimeMessage<{ ok: boolean; error?: string }>({ type: 'START_TASK_SESSION', tabId: state.currentTabId ?? undefined, domain: state.currentDomain, taskType, intendedDurationMinutes: Number.isFinite(minutes) ? Math.min(240, Math.max(1, minutes)) : null })
    if (!response.ok) return setError(response.error ?? 'Unable to start task.')
    await refresh()
  }
  const answer = async (value: PostSessionAnswer) => { await sendRuntimeMessage({ type: 'SUBMIT_REFLECTION', sessionId: active!.sessionId, answer: value }); await refresh() }
  const toggleMonitoring = async () => { const enabled = !settings.monitoringEnabled; if (chrome?.runtime) await sendRuntimeMessage({ type: 'SET_MONITORING', enabled }); else await patchSettings({ monitoringEnabled: enabled }) }
  const addCurrentDomain = async () => {
    if (!state.currentDomain) return
    setAddingDomain(true)
    setError('')
    const existing = settings.monitoredDomains.find((item) => domainMatches(state.currentDomain!, item.domain))
    const nextDomains = existing
      ? settings.monitoredDomains.map((item) => item.domain === existing.domain ? { ...item, enabled: true } : item)
      : [...settings.monitoredDomains, { domain: state.currentDomain, category: 'other' as const, enabled: true, createdAt: new Date().toISOString() }]
    const granted = await requestDomainPermissions(nextDomains)
    if (!granted) {
      setError('Chrome access was not granted, so this domain was not added.')
      setAddingDomain(false)
      return
    }
    const nextSettings = { ...settings, monitoredDomains: nextDomains }
    await setSettings(nextSettings)
    if (typeof chrome !== 'undefined' && chrome.runtime?.id) await sendRuntimeMessage({ type: 'SYNC_COLLECTOR' })
    setState((current) => current ? { ...current, settings: nextSettings } : current)
    setAddingDomain(false)
  }

  return <div className="popup-shell">
    <header className="popup-header"><AppLogo /><button className={settings.monitoringEnabled ? 'toggle toggle-on' : 'toggle'} type="button" aria-label="Toggle collection" onClick={toggleMonitoring} /></header>
    {!settings.onboardingComplete ? <section className="popup-setup"><span><ShieldCheck size={22} /></span><h1>Complete private setup</h1><p>Review consent and choose participant-approved task sites.</p><a className="button button-primary" href={extensionUrl('src/options/index.html')}>Open setup <ChevronRight size={16} /></a></section> : <>
      <section className={settings.monitoringEnabled ? 'popup-state popup-state-live' : 'popup-state'}><div><span className="status-dot" /><strong>{settings.monitoringEnabled ? 'Phase 1 collection ready' : 'Collection is paused'}</strong></div><small>{settings.monitoredDomains.filter((item) => item.enabled).length} approved task sites</small></section>
      {active?.status === 'pending_reflection' ? <section className="active-session"><div className="active-session-top"><span>Post-session reflection</span><span className="live-label">Pending</span></div><strong>Did this session remain aligned with the task you started?</strong><div className="popup-reflection-actions"><button className="button button-green" onClick={() => answer('aligned')}>Aligned</button><button className="button button-primary" onClick={() => answer('moved_away')}>No, I moved away</button><button className="button button-quiet" onClick={() => answer('not_sure')}>Not sure</button></div></section>
      : active ? <ActiveTask session={active} onRefresh={refresh} />
      : <section className="active-session"><div className="active-session-top"><span>Start a task session</span><span className="live-label">Phase 1</span></div><label className="field"><span>Task type</span><select className="select" value={taskType} onChange={(e) => setTaskType(e.target.value as TaskType)}>{TASK_TYPE_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label><label className="field"><span>Intended duration (context only)</span><div className="number-field"><input className="input" type="number" min="1" max="240" value={duration} onChange={(e) => setDuration(e.target.value)} /><span>minutes</span></div></label>{error && <small className="field-error">{error}</small>}{!approvedCurrentSite && state.currentDomain && <button className="button add-domain-popup-button full-button" disabled={addingDomain} onClick={addCurrentDomain}><Plus size={14} /> {addingDomain ? 'Adding…' : 'Add this domain'}</button>}<button className="button button-green full-button" disabled={!settings.monitoringEnabled || !approvedCurrentSite} onClick={start}>Start task</button><small>{approvedCurrentSite ? `Starting on ${state.currentDomain}` : state.currentDomain ? `${state.currentDomain} is not an approved task site.` : 'Open a website to add it as a task site.'}</small></section>}
      <section className="popup-stats"><div><span>Completed</span><strong>{completed.length}</strong><small>sessions</small></div><div><span>Labeled</span><strong>{labeled.length}</strong><small>binary outcomes</small></div><div><span>Windows</span><strong>{data.activityWindows.length}</strong><small>10-second rows</small></div></section>
      <nav className="popup-links"><a href={extensionUrl('src/dashboard/index.html')}><span className="popup-link-icon green"><BarChart3 size={17} /></span><span><strong>Open dashboard</strong><small>Review and export records</small></span><ChevronRight size={17} /></a><a href={extensionUrl('src/options/index.html')}><span className="popup-link-icon blue"><Settings2 size={17} /></span><span><strong>Collection settings</strong><small>Task sites and privacy</small></span><ChevronRight size={17} /></a></nav>
      <footer className="popup-footer"><ShieldCheck size={14} /> Local-first, content-free <span /> Phase 1</footer>
    </>}
  </div>
}

function ActiveTask({ session, onRefresh }: { session: InternalSession; onRefresh: () => Promise<void> }) {
  const duration = Math.max(session.durationSeconds, Math.round((Date.now() - new Date(session.startTime).getTime()) / 1000))
  const finish = async () => { await sendRuntimeMessage({ type: 'REQUEST_REFLECTION', sessionId: session.sessionId }); await onRefresh() }
  return <section className="active-session"><div className="active-session-top"><span>Active task</span><span className="live-label"><span /> Live</span></div><div className="active-domain"><span>{session.initialTaskSite[0].toUpperCase()}</span><div><strong>{taskTypeLabel(session.taskType)}</strong><small>Started on {session.initialTaskSite}</small></div></div><div className="active-meta"><span><Clock3 size={14} /> {formatDuration(duration)}</span><span><Database size={14} /> {session.scrollCount + session.clickCount} events</span></div><button className="button end-button" type="button" onClick={finish}><Square size={14} /> Finish and reflect</button></section>
}
