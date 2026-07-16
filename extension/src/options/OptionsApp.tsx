import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  EyeOff,
  FileKey2,
  Globe2,
  Info,
  LockKeyhole,
  Pause,
  Play,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import { DOMAIN_CATEGORIES } from '../shared/constants'
import { normalizeDomain } from '../shared/domainUtils'
import { removeUnusedDomainPermissions, requestDomainPermissions } from '../shared/permissions'
import { clearResearchData, patchSettings, setSettings } from '../shared/storage'
import type { AppSettings, DomainCategory, MonitoredDomain } from '../shared/types'
import { AppLogo } from '../ui/AppLogo'
import { useAppData } from '../ui/useAppData'

function dashboardUrl(): string {
  return typeof chrome !== 'undefined' && chrome.runtime?.getURL
    ? chrome.runtime.getURL('src/dashboard/index.html')
    : '/src/dashboard/index.html'
}

export function OptionsApp() {
  const { data, loading, refresh } = useAppData()
  if (loading || !data) return <LoadingPage />
  if (!data.settings.onboardingComplete) return <Onboarding settings={data.settings} onComplete={refresh} />
  return <SettingsPage settings={data.settings} sessionCount={data.sessions.length} windowCount={data.activityWindows.length} />
}

function LoadingPage() {
  return (
    <div className="app-shell">
      <header className="topbar"><AppLogo /><span className="skeleton" style={{ width: 110, minHeight: 30 }} /></header>
      <main className="page-container"><div className="skeleton" style={{ minHeight: 420 }} /></main>
    </div>
  )
}

function Onboarding({ settings, onComplete }: { settings: AppSettings; onComplete: () => Promise<void> }) {
  const [step, setStep] = useState(0)
  const [consent, setConsent] = useState(false)
  const [domains, setDomains] = useState(settings.monitoredDomains)
  const [reflectionMinutes, setReflectionMinutes] = useState(settings.reflectionAfterMinutes)
  const [saving, setSaving] = useState(false)
  const [permissionError, setPermissionError] = useState('')

  const enabledCount = domains.filter((domain) => domain.enabled).length
  const finish = async () => {
    setSaving(true)
    const granted = await requestDomainPermissions(domains)
    if (!granted) {
      setPermissionError('Domain access is required only for the sites you selected. Adjust the selection or approve access to continue.')
      setSaving(false)
      return
    }
    await setSettings({
      ...settings,
      consentAccepted: true,
      consentedAt: new Date().toISOString(),
      monitoringEnabled: true,
      monitoredDomains: domains,
      reflectionAfterMinutes: reflectionMinutes,
      onboardingComplete: true,
    })
    await onComplete()
    setSaving(false)
  }

  return (
    <main className="onboarding-shell">
      <header className="onboarding-header">
        <AppLogo />
        <span className="onboarding-step">Step {step + 1} of 3</span>
      </header>
      <div className="onboarding-progress"><span style={{ width: `${((step + 1) / 3) * 100}%` }} /></div>

      <section className="onboarding-content">
        {step === 0 && (
          <div className="onboarding-panel">
            <span className="onboarding-icon"><ShieldCheck size={25} /></span>
            <span className="eyebrow">Research consent</span>
            <h1>Your browsing content stays yours.</h1>
            <p className="onboarding-lead">DriftSense records lightweight counts on domains you choose, then asks you to reflect on whether each visit matched your intention.</p>
            <div className="privacy-grid">
              <div><Database size={19} /><strong>Collected locally</strong><span>Domain, timing, aggregate activity counts, intention, and your session reflection.</span></div>
              <div><EyeOff size={19} /><strong>Never collected</strong><span>Page text, full URLs, passwords, messages, screenshots, key values, or browser history.</span></div>
              <div><LockKeyhole size={19} /><strong>You stay in control</strong><span>Pause collection, inspect records, export them, or delete everything at any time.</span></div>
              <div><FileKey2 size={19} /><strong>Anonymous identity</strong><span>Your local participant code is not derived from your name, email, or account.</span></div>
            </div>
            <label className={consent ? 'consent-check consent-check-on' : 'consent-check'}>
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
              <span className="consent-box">{consent && <Check size={15} />}</span>
              <span><strong>I understand and consent to this collection.</strong><small>I can withdraw by pausing monitoring and deleting my local data.</small></span>
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="onboarding-panel">
            <span className="onboarding-icon"><Globe2 size={25} /></span>
            <span className="eyebrow">Monitored domains</span>
            <h1>Choose where sessions begin.</h1>
            <p className="onboarding-lead">Only enabled domains can create a DriftSense session. Subdomains are included; paths and search queries are discarded.</p>
            <div className="domain-chooser">
              {domains.map((item) => (
                <button
                  type="button"
                  className={item.enabled ? 'domain-choice domain-choice-on' : 'domain-choice'}
                  key={item.domain}
                  onClick={() => setDomains((current) => current.map((domain) => domain.domain === item.domain ? { ...domain, enabled: !domain.enabled } : domain))}
                >
                  <span className="domain-favicon">{item.domain[0].toUpperCase()}</span>
                  <span><strong>{item.domain}</strong><small>{item.category}</small></span>
                  <span className="choice-check">{item.enabled && <Check size={14} />}</span>
                </button>
              ))}
            </div>
            <div className="notice"><Info size={17} />You can add custom domains and change categories after setup.</div>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-panel">
            <span className="onboarding-icon"><Clock3 size={25} /></span>
            <span className="eyebrow">Collection rhythm</span>
            <h1>Set the reflection timing.</h1>
            <p className="onboarding-lead">A reflection appears after the intended duration you select for a visit. This fallback is used when no duration is available.</p>
            <div className="setup-summary">
              <label className="field">
                <span>Fallback reflection time</span>
                <div className="number-field"><input className="input" type="number" min="1" max="120" value={reflectionMinutes} onChange={(event) => setReflectionMinutes(Math.min(120, Math.max(1, Number(event.target.value))))} /><span>minutes</span></div>
              </label>
              <div className="participant-code"><span>Anonymous participant code</span><strong>{settings.participantId}</strong><small>Generated locally and included in exported research rows.</small></div>
            </div>
            <div className="ready-checks">
              <span><CheckCircle2 size={17} /> Consent recorded on this device</span>
              <span><CheckCircle2 size={17} /> {enabledCount} monitored domains selected</span>
              <span><CheckCircle2 size={17} /> Data remains in extension storage until export</span>
            </div>
            {permissionError && <div className="notice danger-notice permission-error"><Info size={17} />{permissionError}</div>}
          </div>
        )}
      </section>

      <footer className="onboarding-actions">
        <button className="button button-quiet" disabled={step === 0} type="button" onClick={() => setStep((current) => current - 1)}><ArrowLeft size={17} /> Back</button>
        {step < 2 ? (
          <button className="button button-primary" disabled={(step === 0 && !consent) || (step === 1 && enabledCount === 0)} type="button" onClick={() => setStep((current) => current + 1)}>Continue <ArrowRight size={17} /></button>
        ) : (
          <button className="button button-green" disabled={saving} type="button" onClick={finish}><Play size={16} /> Start collecting</button>
        )}
      </footer>
    </main>
  )
}

function SettingsPage({ settings, sessionCount, windowCount }: { settings: AppSettings; sessionCount: number; windowCount: number }) {
  const [draft, setDraft] = useState(settings)
  const [saved, setSaved] = useState(false)
  const [newDomain, setNewDomain] = useState('')
  const [newCategory, setNewCategory] = useState<DomainCategory>('other')
  const [domainError, setDomainError] = useState('')
  const [permissionError, setPermissionError] = useState('')

  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(settings), [draft, settings])
  const save = async () => {
    const granted = await requestDomainPermissions(draft.monitoredDomains)
    if (!granted) {
      setPermissionError('Chrome did not grant access to every enabled domain. Disable the unapproved domain or try saving again.')
      return
    }
    await removeUnusedDomainPermissions(settings.monitoredDomains, draft.monitoredDomains)
    await setSettings(draft)
    setPermissionError('')
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }
  const addDomain = () => {
    const normalized = normalizeDomain(newDomain)
    if (!normalized) return setDomainError('Enter a valid domain, such as example.com.')
    if (draft.monitoredDomains.some((item) => item.domain === normalized)) return setDomainError('That domain is already listed.')
    const item: MonitoredDomain = { domain: normalized, category: newCategory, enabled: true, createdAt: new Date().toISOString() }
    setDraft((current) => ({ ...current, monitoredDomains: [...current.monitoredDomains, item] }))
    setNewDomain('')
    setDomainError('')
  }
  const deleteData = async () => {
    if (!window.confirm('Delete all DriftSense sessions and activity windows stored on this device? This cannot be undone.')) return
    await clearResearchData()
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <AppLogo />
        <div className="topbar-actions">
          {saved && <span className="saved-label"><Check size={14} /> Saved</span>}
          <a className="button button-secondary" href={dashboardUrl()}><BarChart3 size={16} /> Dashboard</a>
          <button className="button button-primary" disabled={!isDirty} onClick={save} type="button">Save changes</button>
        </div>
      </header>
      <main className="page-container settings-container">
        <div className="page-heading">
          <div><span className="eyebrow">Collection settings</span><h1>Study configuration</h1><p>Control where collection runs, how sessions are reflected on, and what remains stored.</p></div>
          <span className={draft.monitoringEnabled ? 'status-pill' : 'status-pill status-pill-paused'}><span className="status-dot" />{draft.monitoringEnabled ? 'Collecting' : 'Paused'}</span>
        </div>

        <div className="settings-grid">
          <div className="settings-main">
            {permissionError && <div className="notice danger-notice"><Info size={17} />{permissionError}</div>}
            <section className="panel panel-pad settings-section">
              <div className="settings-section-head"><div><h2>Collection status</h2><p>Pause immediately without changing your domain list or stored records.</p></div><button aria-label="Toggle monitoring" className={draft.monitoringEnabled ? 'toggle toggle-on' : 'toggle'} type="button" onClick={() => setDraft((current) => ({ ...current, monitoringEnabled: !current.monitoringEnabled }))} /></div>
              <div className={draft.monitoringEnabled ? 'collection-state collection-state-live' : 'collection-state'}>
                {draft.monitoringEnabled ? <Play size={18} /> : <Pause size={18} />}
                <div><strong>{draft.monitoringEnabled ? 'Monitoring enabled' : 'Monitoring paused'}</strong><span>{draft.monitoringEnabled ? 'Enabled domains can start intention-labeled sessions.' : 'No new sessions or activity windows will be recorded.'}</span></div>
              </div>
            </section>

            <section className="panel panel-pad settings-section">
              <div className="settings-section-head"><div><h2>Monitored domains</h2><p>DriftSense stores the configured hostname only.</p></div><span className="count-label">{draft.monitoredDomains.filter((item) => item.enabled).length} enabled</span></div>
              <div className="domain-list">
                {draft.monitoredDomains.map((item) => (
                  <div className="domain-row" key={item.domain}>
                    <span className="domain-favicon">{item.domain[0].toUpperCase()}</span>
                    <div className="domain-name"><strong>{item.domain}</strong><span>{item.category}</span></div>
                    <button aria-label={`Toggle ${item.domain}`} className={item.enabled ? 'toggle toggle-on' : 'toggle'} type="button" onClick={() => setDraft((current) => ({ ...current, monitoredDomains: current.monitoredDomains.map((domain) => domain.domain === item.domain ? { ...domain, enabled: !domain.enabled } : domain) }))} />
                    <button className="button button-icon button-quiet" aria-label={`Remove ${item.domain}`} type="button" onClick={() => setDraft((current) => ({ ...current, monitoredDomains: current.monitoredDomains.filter((domain) => domain.domain !== item.domain) }))}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
              <div className="domain-add-row">
                <label className="field"><span>Domain</span><input className="input" placeholder="example.com" value={newDomain} onChange={(event) => setNewDomain(event.target.value)} /></label>
                <label className="field"><span>Category</span><select className="select" value={newCategory} onChange={(event) => setNewCategory(event.target.value as DomainCategory)}>{DOMAIN_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
                <button className="button button-secondary add-domain-button" type="button" onClick={addDomain}><Plus size={16} /> Add</button>
              </div>
              {domainError && <p className="field-error">{domainError}</p>}
            </section>

            <section className="panel panel-pad settings-section">
              <div className="settings-section-head"><div><h2>Session timing</h2><p>Aggregate signals are recorded in fixed windows; no interaction content is retained.</p></div></div>
              <div className="timing-grid">
                <label className="field"><span>Fallback reflection</span><div className="number-field"><input className="input" type="number" min="1" max="120" value={draft.reflectionAfterMinutes} onChange={(event) => setDraft((current) => ({ ...current, reflectionAfterMinutes: Math.min(120, Math.max(1, Number(event.target.value))) }))} /><span>minutes</span></div><small className="field-help">Used when a session has no intended duration.</small></label>
                <label className="field"><span>Idle threshold</span><div className="number-field"><input className="input" type="number" min="15" max="300" value={draft.idleThresholdSeconds} onChange={(event) => setDraft((current) => ({ ...current, idleThresholdSeconds: Math.min(300, Math.max(15, Number(event.target.value))) }))} /><span>seconds</span></div><small className="field-help">Marks a window idle after no counted interaction.</small></label>
                <div className="field"><span>Activity window</span><div className="read-only-field">10 seconds <LockKeyhole size={14} /></div><small className="field-help">Fixed for consistent research rows.</small></div>
              </div>
            </section>
          </div>

          <aside className="settings-side">
            <section className="panel panel-pad identity-panel">
              <span className="side-icon"><FileKey2 size={19} /></span><h2>Participant identity</h2><strong>{draft.participantId}</strong><p>Generated locally. It is the only participant identifier included in exports.</p>
            </section>
            <section className="panel panel-pad data-panel">
              <span className="side-icon side-icon-blue"><Database size={19} /></span><h2>Local data</h2>
              <div className="data-counts"><span><strong>{sessionCount}</strong> sessions</span><span><strong>{windowCount}</strong> windows</span></div>
              <a className="button button-secondary full-button" href={dashboardUrl()}><Download size={16} /> Review and export</a>
              <button className="button button-danger full-button" type="button" disabled={sessionCount === 0 && windowCount === 0} onClick={deleteData}><Trash2 size={16} /> Delete research data</button>
            </section>
            <section className="panel panel-pad protocol-panel"><span className="eyebrow">Active protocol</span><h2>Stage 1 training</h2><p>Static intention prompt with post-session self-report. Model assistance is not active in this build.</p></section>
          </aside>
        </div>
      </main>
    </div>
  )
}
