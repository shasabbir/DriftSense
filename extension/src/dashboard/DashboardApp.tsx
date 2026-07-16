import { useMemo, useState } from 'react'
import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  Filter,
  Gauge,
  Globe2,
  Info,
  Layers3,
  LockKeyhole,
  Menu,
  Pause,
  Play,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  X,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { exportActivityWindowsCsv, exportJsonBundle, exportSessionsCsv } from '../shared/exportService'
import { seedSyntheticData } from '../shared/sampleData'
import { clearResearchData, deleteSessionData, patchSettings } from '../shared/storage'
import type { AppSettings, InternalSession, StoredData } from '../shared/types'
import { AppLogo } from '../ui/AppLogo'
import { formatDate, formatDuration, formatTime, intentionLabel, sessionOutcome } from '../ui/format'
import { useAppData } from '../ui/useAppData'

type View = 'overview' | 'trends' | 'intentions' | 'sessions' | 'data'

const navItems = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'trends', label: 'Trends', icon: Activity },
  { id: 'intentions', label: 'Intention alignment', icon: Target },
  { id: 'sessions', label: 'Session history', icon: Layers3 },
  { id: 'data', label: 'Data & privacy', icon: ShieldCheck },
] as const

function extensionUrl(path: string): string {
  return typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL(path) : `/${path}`
}

export function DashboardApp() {
  const { data, loading } = useAppData()
  const [view, setView] = useState<View>('overview')
  const [menuOpen, setMenuOpen] = useState(false)

  if (loading || !data) return <DashboardLoading />

  const content = {
    overview: <Overview data={data} onNavigate={setView} />,
    trends: <Trends data={data} />,
    intentions: <Intentions data={data} />,
    sessions: <Sessions data={data} />,
    data: <DataPrivacy data={data} />,
  }[view]

  return (
    <div className="dashboard-shell">
      <aside className={menuOpen ? 'dashboard-sidebar dashboard-sidebar-open' : 'dashboard-sidebar'}>
        <div className="sidebar-brand"><AppLogo /><button className="mobile-close" type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X size={18} /></button></div>
        <nav className="dashboard-nav">
          <span className="nav-label">Workspace</span>
          {navItems.map((item) => {
            const Icon = item.icon
            return <button type="button" className={view === item.id ? 'nav-item nav-item-active' : 'nav-item'} key={item.id} onClick={() => { setView(item.id); setMenuOpen(false) }}><Icon size={17} /><span>{item.label}</span></button>
          })}
        </nav>
        <div className="sidebar-study">
          <span className="sidebar-study-icon"><Database size={17} /></span>
          <div><strong>Stage 1 collection</strong><span>Static intention prompt</span></div>
        </div>
        <div className="sidebar-footer">
          <span className={data.settings.monitoringEnabled ? 'status-pill' : 'status-pill status-pill-paused'}><span className="status-dot" />{data.settings.monitoringEnabled ? 'Collecting' : 'Paused'}</span>
          <a className="button button-icon button-quiet" aria-label="Settings" href={extensionUrl('src/options/index.html')}><Settings2 size={18} /></a>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <button className="mobile-menu" aria-label="Open navigation" type="button" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
          <div className="dashboard-breadcrumb"><span>DriftSense</span><ChevronRight size={14} /><strong>{navItems.find((item) => item.id === view)?.label}</strong></div>
          <div className="dashboard-top-actions">
            <span className="participant-chip"><span>Participant</span><strong>{data.settings.participantId}</strong></span>
            <button className="button button-primary" type="button" onClick={exportJsonBundle}><Download size={15} /> Export data</button>
          </div>
        </header>
        <div className="dashboard-content">{content}</div>
      </main>
    </div>
  )
}

function DashboardLoading() {
  return <div className="dashboard-shell"><aside className="dashboard-sidebar"><div className="sidebar-brand"><AppLogo /></div></aside><main className="dashboard-main"><div className="dashboard-content"><div className="skeleton" style={{ minHeight: 620 }} /></div></main></div>
}

function Overview({ data, onNavigate }: { data: StoredData; onNavigate: (view: View) => void }) {
  const completed = data.sessions.filter((session) => session.status === 'completed')
  const active = data.sessions.filter((session) => session.status === 'active')
  const labeled = completed.filter((session) => session.driftLabel !== null)
  const drift = labeled.filter((session) => session.driftLabel === 1)
  const aligned = labeled.filter((session) => session.driftLabel === 0)
  const average = completed.length ? completed.reduce((sum, session) => sum + session.durationSeconds, 0) / completed.length : 0
  const alignment = labeled.length ? Math.round((aligned.length / labeled.length) * 100) : 0
  const daily = dailySeries(data.sessions, 7)
  const outcomes = [
    { name: 'Aligned', value: aligned.length, color: '#167b5a' },
    { name: 'Drift', value: drift.length, color: '#c7553d' },
    { name: 'Unlabeled', value: completed.length - labeled.length, color: '#cbd4cf' },
  ].filter((item) => item.value > 0)

  if (data.sessions.length === 0) return <EmptyDashboard />

  return (
    <>
      <PageTitle eyebrow="Study snapshot" title="Collection overview" subtitle="Delayed summaries from locally stored, self-reported sessions." actions={<MonitoringButton settings={data.settings} />} />
      <section className="metric-grid">
        <Metric label="Total sessions" value={String(data.sessions.length)} detail={`${active.length} currently active`} icon={Layers3} tone="green" />
        <Metric label="Intention aligned" value={labeled.length ? `${alignment}%` : '-'} detail={`${aligned.length} of ${labeled.length} labeled`} icon={Target} tone="blue" />
        <Metric label="Self-reported drift" value={String(drift.length)} detail={`${labeled.length ? Math.round((drift.length / labeled.length) * 100) : 0}% of labeled sessions`} icon={Gauge} tone="coral" />
        <Metric label="Average duration" value={formatDuration(average)} detail="Completed sessions" icon={Clock3} tone="amber" />
      </section>

      <section className="dashboard-grid dashboard-grid-wide">
        <article className="panel chart-panel">
          <PanelHeader title="Session activity" detail="Last 7 days" />
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ top: 8, right: 6, left: -24, bottom: 0 }}>
                <defs><linearGradient id="sessionArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#167b5a" stopOpacity={0.22} /><stop offset="100%" stopColor="#167b5a" stopOpacity={0.01} /></linearGradient></defs>
                <CartesianGrid vertical={false} stroke="#e8ecea" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#78847e', fontSize: 10 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#78847e', fontSize: 10 }} />
                <Tooltip contentStyle={{ border: '1px solid #dfe5e2', borderRadius: 6, boxShadow: '0 8px 24px rgba(25,33,30,.08)', fontSize: 11 }} />
                <Area type="monotone" dataKey="sessions" stroke="#167b5a" strokeWidth={2} fill="url(#sessionArea)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="panel outcome-panel">
          <PanelHeader title="Reflection outcomes" detail={`${labeled.length}/${completed.length} labeled`} />
          <div className="outcome-chart">
            {outcomes.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={outcomes} dataKey="value" nameKey="name" innerRadius={52} outerRadius={72} paddingAngle={3} isAnimationActive={false}>{outcomes.map((entry) => <Cell fill={entry.color} key={entry.name} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <CircleHelp size={42} />}
            <div className="outcome-center"><strong>{labeled.length}</strong><span>labeled</span></div>
          </div>
          <div className="legend-list">{outcomes.map((item) => <span key={item.name}><i style={{ background: item.color }} />{item.name}<strong>{item.value}</strong></span>)}</div>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid-even">
        <article className="panel table-panel">
          <PanelHeader title="Recent sessions" detail="Latest completed visits" action={<button className="text-link" type="button" onClick={() => onNavigate('sessions')}>View all <ChevronRight size={14} /></button>} />
          <SessionTable sessions={[...data.sessions].sort((a, b) => b.startTime.localeCompare(a.startTime)).slice(0, 5)} compact />
        </article>
        <article className="panel top-domain-panel">
          <PanelHeader title="Domain summary" detail="By session count" />
          <DomainSummary sessions={data.sessions} />
        </article>
      </section>
    </>
  )
}

function Trends({ data }: { data: StoredData }) {
  const daily = dailySeries(data.sessions, 14)
  const hourly = hourlySeries(data.sessions)
  const labeled = data.sessions.filter((session) => session.driftLabel !== null)
  const completion = data.sessions.length ? Math.round((labeled.length / data.sessions.length) * 100) : 0
  return (
    <>
      <PageTitle eyebrow="Behavior over time" title="Session trends" subtitle="Aggregate patterns are descriptive and do not score productivity or attention." />
      <div className="notice trends-notice"><Info size={17} />Charts update after stored session changes. They are not used as an additional real-time intervention.</div>
      <section className="dashboard-grid dashboard-grid-wide trends-top">
        <article className="panel chart-panel large-chart">
          <PanelHeader title="Sessions and drift" detail="Last 14 days" />
          <div className="chart-wrap chart-wrap-large">
            <ResponsiveContainer width="100%" height="100%"><BarChart data={daily} margin={{ top: 8, right: 6, left: -24, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e8ecea" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#78847e', fontSize: 10 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#78847e', fontSize: 10 }} /><Tooltip /><Bar dataKey="sessions" fill="#8fc7b2" radius={[3,3,0,0]} isAnimationActive={false} /><Bar dataKey="drift" fill="#c7553d" radius={[3,3,0,0]} isAnimationActive={false} /></BarChart></ResponsiveContainer>
          </div>
        </article>
        <article className="panel trend-summary panel-pad">
          <span className="side-icon"><CheckCircle2 size={19} /></span><h2>Label completeness</h2><strong>{completion}%</strong><p>{labeled.length} of {data.sessions.length} sessions have a binary post-session label.</p><div className="progress-track"><span style={{ width: `${completion}%` }} /></div>
          <hr />
          <span className="small-label">Interpretation</span><p>Unlabeled, continued, and deferred sessions remain visible and are not treated as non-drift.</p>
        </article>
      </section>
      <section className="panel chart-panel">
        <PanelHeader title="Sessions by time of day" detail="Based on local session start time" />
        <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={hourly} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e8ecea" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#78847e', fontSize: 10 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#78847e', fontSize: 10 }} /><Tooltip /><Bar dataKey="sessions" fill="#2b6cb0" radius={[3,3,0,0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div>
      </section>
    </>
  )
}

function Intentions({ data }: { data: StoredData }) {
  const rows = intentionSeries(data.sessions)
  return (
    <>
      <PageTitle eyebrow="Declared purpose" title="Intention alignment" subtitle="Compare participant-provided intentions with participant-provided session outcomes." />
      <section className="panel chart-panel intention-chart-panel">
        <PanelHeader title="Sessions by declared intention" detail="Aligned and drift-labeled sessions" />
        {rows.length ? <div className="chart-wrap chart-wrap-large"><ResponsiveContainer width="100%" height="100%"><BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, left: 32, bottom: 0 }}><CartesianGrid horizontal={false} stroke="#e8ecea" /><XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#78847e', fontSize: 10 }} /><YAxis type="category" dataKey="shortLabel" width={105} axisLine={false} tickLine={false} tick={{ fill: '#5f6b65', fontSize: 10 }} /><Tooltip /><Bar dataKey="aligned" stackId="a" fill="#167b5a" isAnimationActive={false} /><Bar dataKey="drift" stackId="a" fill="#c7553d" isAnimationActive={false} /><Bar dataKey="other" stackId="a" fill="#cbd4cf" radius={[0,3,3,0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div> : <SimpleEmpty title="No intentions yet" text="Intention summaries appear after monitored visits are labeled." />}
      </section>
      <section className="intention-cards">
        {rows.map((row) => (
          <article className="panel intention-card" key={row.key}>
            <span className="intention-card-icon"><Target size={17} /></span><span className="small-label">{row.label}</span><strong>{row.total}</strong><p>{row.labeled ? `${Math.round((row.aligned / row.labeled) * 100)}% aligned among labeled` : 'No binary labels yet'}</p>
            <div className="split-bar"><span style={{ width: `${row.total ? (row.aligned / row.total) * 100 : 0}%` }} /><i style={{ width: `${row.total ? (row.drift / row.total) * 100 : 0}%` }} /></div>
          </article>
        ))}
      </section>
    </>
  )
}

function Sessions({ data }: { data: StoredData }) {
  const [query, setQuery] = useState('')
  const [outcome, setOutcome] = useState('all')
  const [selected, setSelected] = useState<InternalSession | null>(null)
  const filtered = useMemo(() => [...data.sessions]
    .sort((a, b) => b.startTime.localeCompare(a.startTime))
    .filter((session) => session.domain.includes(query.toLowerCase()) || intentionLabel(session.declaredIntention).toLowerCase().includes(query.toLowerCase()))
    .filter((session) => outcome === 'all' || sessionOutcome(session).toLowerCase() === outcome), [data.sessions, query, outcome])

  return (
    <>
      <PageTitle eyebrow="Inspectable records" title="Session history" subtitle="Every row contains domain-level metadata, aggregate counts, and participant-provided reflections only." />
      <section className="panel sessions-panel">
        <div className="session-toolbar">
          <label className="search-field"><Search size={16} /><input placeholder="Search domain or intention" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <label className="filter-field"><Filter size={15} /><select value={outcome} onChange={(event) => setOutcome(event.target.value)}><option value="all">All outcomes</option><option value="aligned">Aligned</option><option value="drift">Drift</option><option value="unlabeled">Unlabeled</option><option value="active">Active</option></select></label>
          <span className="session-result-count">{filtered.length} records</span>
        </div>
        {filtered.length ? <SessionTable sessions={filtered} onSelect={setSelected} /> : <SimpleEmpty title="No matching sessions" text="Adjust the search or outcome filter." />}
      </section>
      {selected && <SessionDrawer session={selected} windowCount={data.activityWindows.filter((window) => window.sessionId === selected.sessionId).length} onClose={() => setSelected(null)} />}
    </>
  )
}

function DataPrivacy({ data }: { data: StoredData }) {
  const [busy, setBusy] = useState(false)
  const showDevelopmentTools = import.meta.env.DEV || ['127.0.0.1', 'localhost'].includes(window.location.hostname)
  const deleteAll = async () => {
    if (!window.confirm('Delete every locally stored DriftSense session and activity window? This cannot be undone.')) return
    setBusy(true); await clearResearchData(); setBusy(false)
  }
  const seed = async () => { setBusy(true); await seedSyntheticData(); setBusy(false) }
  return (
    <>
      <PageTitle eyebrow="Participant control" title="Data and privacy" subtitle="Inspect the local dataset, export allowlisted fields, or remove stored research records." />
      <section className="data-hero panel">
        <div><span className="data-hero-icon"><ShieldCheck size={25} /></span><span className="eyebrow">Local storage</span><h2>Your records have not been uploaded.</h2><p>Exports are created only when you choose a format below. The extension contains no analytics service or cloud backend.</p></div>
        <div className="data-hero-stats"><span><strong>{data.sessions.length}</strong> session records</span><span><strong>{data.activityWindows.length}</strong> activity windows</span><span><strong>{data.settings.monitoredDomains.filter((item) => item.enabled).length}</strong> enabled domains</span></div>
      </section>
      <section className="dashboard-grid dashboard-grid-even data-grid">
        <article className="panel panel-pad">
          <PanelHeader title="Export dataset" detail="UTF-8, allowlisted fields" />
          <div className="export-list">
            <button type="button" onClick={exportSessionsCsv}><span className="export-icon green"><FileSpreadsheet size={19} /></span><span><strong>Sessions CSV</strong><small>One row per monitored session</small></span><Download size={16} /></button>
            <button type="button" onClick={exportActivityWindowsCsv}><span className="export-icon blue"><FileSpreadsheet size={19} /></span><span><strong>Activity windows CSV</strong><small>Aggregate ten-second windows</small></span><Download size={16} /></button>
            <button type="button" onClick={exportJsonBundle}><span className="export-icon amber"><FileJson size={19} /></span><span><strong>Complete JSON bundle</strong><small>Sessions and activity windows</small></span><Download size={16} /></button>
          </div>
        </article>
        <article className="panel panel-pad schema-panel">
          <PanelHeader title="Privacy boundary" detail="Schema version 1" />
          <div className="privacy-boundary"><span><CheckCircle2 size={16} /> Domain hostname</span><span><CheckCircle2 size={16} /> Timing and aggregate counts</span><span><CheckCircle2 size={16} /> Declared intention</span><span><CheckCircle2 size={16} /> Self-reported outcome</span><span className="not-collected"><X size={16} /> Page text or full URL</span><span className="not-collected"><X size={16} /> Messages, screenshots, key values</span></div>
        </article>
      </section>
      <section className="panel panel-pad danger-zone">
        <div><span className="side-icon side-icon-danger"><Trash2 size={19} /></span><div><h2>Delete local research data</h2><p>Removes all sessions and activity windows. Consent and domain settings remain on this device.</p></div></div>
        <button className="button button-danger" disabled={busy || (data.sessions.length === 0 && data.activityWindows.length === 0)} type="button" onClick={deleteAll}><Trash2 size={16} /> Delete all data</button>
      </section>
      {showDevelopmentTools && <section className="dev-tools"><span><Sparkles size={15} /> Development preview</span><button className="button button-secondary" disabled={busy} type="button" onClick={seed}>Load synthetic records</button></section>}
    </>
  )
}

function PageTitle({ eyebrow, title, subtitle, actions }: { eyebrow: string; title: string; subtitle: string; actions?: React.ReactNode }) {
  return <div className="page-heading dashboard-page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>{actions}</div>
}

function MonitoringButton({ settings }: { settings: AppSettings }) {
  const toggle = () => void patchSettings({ monitoringEnabled: !settings.monitoringEnabled })
  return <button className={settings.monitoringEnabled ? 'button button-secondary' : 'button button-green'} type="button" onClick={toggle}>{settings.monitoringEnabled ? <Pause size={15} /> : <Play size={15} />}{settings.monitoringEnabled ? 'Pause collection' : 'Resume collection'}</button>
}

function Metric({ label, value, detail, icon: Icon, tone }: { label: string; value: string; detail: string; icon: typeof Activity; tone: string }) {
  return <article className="panel metric-card"><span className={`metric-icon ${tone}`}><Icon size={19} /></span><span className="metric-label">{label}</span><strong>{value}</strong><small>{detail}</small></article>
}

function PanelHeader({ title, detail, action }: { title: string; detail?: string; action?: React.ReactNode }) {
  return <header className="panel-header"><div><h2>{title}</h2>{detail && <span>{detail}</span>}</div>{action}</header>
}

function SessionTable({ sessions, compact = false, onSelect }: { sessions: InternalSession[]; compact?: boolean; onSelect?: (session: InternalSession) => void }) {
  return <div className="table-scroll"><table className="session-table"><thead><tr><th>Domain</th><th>Intention</th><th>Started</th><th>Duration</th><th>Outcome</th>{!compact && <th aria-label="View" />}</tr></thead><tbody>{sessions.map((session) => <tr key={session.sessionId} onClick={() => onSelect?.(session)} className={onSelect ? 'clickable-row' : ''}><td><span className="table-domain-icon">{session.domain[0].toUpperCase()}</span><strong>{session.domain}</strong></td><td>{intentionLabel(session.declaredIntention)}</td><td><strong>{formatDate(session.startTime)}</strong><small>{formatTime(session.startTime)}</small></td><td>{formatDuration(session.durationSeconds)}</td><td><OutcomeBadge session={session} /></td>{!compact && <td><ChevronRight size={15} /></td>}</tr>)}</tbody></table></div>
}

function OutcomeBadge({ session }: { session: InternalSession }) {
  const outcome = sessionOutcome(session)
  return <span className={`outcome-badge outcome-${outcome.toLowerCase()}`}>{outcome}</span>
}

function DomainSummary({ sessions }: { sessions: InternalSession[] }) {
  const counts = Object.entries(sessions.reduce<Record<string, { total: number; drift: number }>>((acc, session) => { const current = acc[session.domain] ?? { total: 0, drift: 0 }; current.total += 1; current.drift += session.driftLabel === 1 ? 1 : 0; acc[session.domain] = current; return acc }, {})).sort((a, b) => b[1].total - a[1].total).slice(0, 5)
  const max = Math.max(1, ...counts.map(([, value]) => value.total))
  return <div className="domain-summary-list">{counts.map(([domain, value]) => <div key={domain}><span className="table-domain-icon">{domain[0].toUpperCase()}</span><div><strong>{domain}</strong><span className="domain-bar"><i style={{ width: `${(value.total / max) * 100}%` }} /></span></div><span><strong>{value.total}</strong><small>{value.drift} drift</small></span></div>)}</div>
}

function SessionDrawer({ session, windowCount, onClose }: { session: InternalSession; windowCount: number; onClose: () => void }) {
  const remove = async () => { if (!window.confirm('Delete this session and its linked activity windows?')) return; await deleteSessionData(session.sessionId); onClose() }
  return <div className="drawer-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}><aside className="session-drawer"><header><div><span className="eyebrow">Session detail</span><h2>{session.domain}</h2></div><button className="button button-icon button-quiet" type="button" aria-label="Close session detail" onClick={onClose}><X size={19} /></button></header><div className="drawer-outcome"><OutcomeBadge session={session} /><span>{formatDate(session.startTime)} at {formatTime(session.startTime)}</span></div><div className="drawer-section"><h3>Intention and reflection</h3><DetailRow label="Declared intention" value={intentionLabel(session.declaredIntention)} /><DetailRow label="Intended duration" value={session.intendedDurationMinutes ? `${session.intendedDurationMinutes} minutes` : 'Not provided'} /><DetailRow label="Post-session answer" value={sessionOutcome(session)} /></div><div className="drawer-section"><h3>Aggregate activity</h3><div className="drawer-metrics"><span><strong>{formatDuration(session.durationSeconds)}</strong>duration</span><span><strong>{session.clickCount}</strong>clicks</span><span><strong>{session.scrollCount}</strong>scrolls</span><span><strong>{session.keyboardActivityCount}</strong>keyboard events</span><span><strong>{formatDuration(session.idleSeconds)}</strong>idle</span><span><strong>{windowCount}</strong>windows</span></div></div><div className="drawer-section"><h3>Record identity</h3><DetailRow label="Session ID" value={session.sessionId} mono /><DetailRow label="Label source" value={session.labelSource ?? 'None'} /></div><div className="drawer-privacy"><LockKeyhole size={15} />This record contains no page title, path, query, text, screenshot, message, or key value.</div><footer><button className="button button-danger" type="button" onClick={remove}><Trash2 size={15} /> Delete session</button></footer></aside></div>
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div className="detail-row"><span>{label}</span><strong className={mono ? 'mono-value' : ''}>{value}</strong></div> }
function SimpleEmpty({ title, text }: { title: string; text: string }) { return <div className="simple-empty"><CircleHelp size={24} /><strong>{title}</strong><span>{text}</span></div> }
function EmptyDashboard() { return <><PageTitle eyebrow="Study snapshot" title="Collection overview" subtitle="Delayed summaries from locally stored, self-reported sessions." /><section className="panel empty-state"><div><span className="empty-state-icon"><Database size={22} /></span><h3>No sessions collected yet</h3><p>Enable monitoring and visit one of your configured domains. The intention prompt will begin the first session.</p><a className="button button-secondary" href={extensionUrl('src/options/index.html')}><Settings2 size={16} /> Review monitored domains</a></div></section></> }

function dailySeries(sessions: InternalSession[], days: number) {
  const values = Array.from({ length: days }, (_, index) => { const date = new Date(); date.setHours(0,0,0,0); date.setDate(date.getDate() - (days - 1 - index)); const key = date.toISOString().slice(0,10); return { key, label: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date), sessions: 0, drift: 0 } })
  for (const session of sessions) { const local = new Date(session.startTime); local.setHours(0,0,0,0); const key = local.toISOString().slice(0,10); const row = values.find((item) => item.key === key); if (row) { row.sessions += 1; row.drift += session.driftLabel === 1 ? 1 : 0 } }
  return values
}

function hourlySeries(sessions: InternalSession[]) { const labels = ['12a-4a','4a-8a','8a-12p','12p-4p','4p-8p','8p-12a']; return labels.map((label, index) => ({ label, sessions: sessions.filter((session) => Math.floor(new Date(session.startTime).getHours() / 4) === index).length })) }

function intentionSeries(sessions: InternalSession[]) {
  const keys = ['specific_information','intentional_break','boredom','avoiding_work','accidental_click'] as const
  return keys.map((key) => { const matching = sessions.filter((session) => session.declaredIntention === key); const aligned = matching.filter((session) => session.driftLabel === 0).length; const drift = matching.filter((session) => session.driftLabel === 1).length; return { key, label: intentionLabel(key), shortLabel: intentionLabel(key), total: matching.length, aligned, drift, other: matching.length - aligned - drift, labeled: aligned + drift } }).filter((row) => row.total > 0)
}
