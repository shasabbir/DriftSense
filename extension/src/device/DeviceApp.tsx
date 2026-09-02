import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, BellOff, Cable, CheckCircle2, Clock3, RotateCcw, Square, TimerReset, Upload, Usb, XCircle } from 'lucide-react'
import { TASK_TYPE_OPTIONS } from '../shared/constants'
import { domainMatches } from '../shared/domainUtils'
import { sendRuntimeMessage } from '../shared/runtime'
import type { AppSettings, InternalSession, PostSessionAnswer, TaskType } from '../shared/types'
import { AppLogo } from '../ui/AppLogo'
import { formatDuration, taskTypeLabel } from '../ui/format'
import { formatDeviceCommand, parseDeviceLine, type DeviceButtonEvent, type DeviceCommand } from './serialProtocol'
import { installCheckpointModel, loadCheckpointModel, type CheckpointModelArtifact } from '../background/checkpointModel'

type PopupState = { ok: boolean; settings: AppSettings; sessions: InternalSession[]; activeSession: InternalSession | null; currentTabId: number | null; currentDomain: string | null }
type LocalMode = 'idle' | 'selecting'
type SerialPortLike = {
  open(options: { baudRate: number }): Promise<void>
  close(): Promise<void>
  readable: ReadableStream<Uint8Array> | null
  writable: WritableStream<Uint8Array> | null
}
type SerialNavigator = Navigator & { serial?: { requestPort(): Promise<SerialPortLike> } }

function extensionUrl(path: string): string {
  return typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL(path) : `/${path}`
}

function clampDuration(minutes: number): number {
  return Math.min(240, Math.max(0, Math.round(minutes)))
}

function isTaskSite(settings: AppSettings | null, domain: string | null): boolean {
  return Boolean(settings && domain && settings.monitoredDomains.some((item) => item.enabled && domainMatches(domain, item.domain)))
}

export function DeviceApp() {
  const [state, setState] = useState<PopupState | null>(null)
  const [taskType, setTaskType] = useState<TaskType>('writing_creating')
  const [selectedMinutes, setSelectedMinutes] = useState(0)
  const [localMode, setLocalMode] = useState<LocalMode>('idle')
  const [connected, setConnected] = useState(false)
  const [serialSupported] = useState(() => Boolean((navigator as SerialNavigator).serial))
  const [log, setLog] = useState<string[]>([])
  const [error, setError] = useState('')
  const [tick, setTick] = useState(Date.now())
  const [model, setModel] = useState<CheckpointModelArtifact | null>(null)
  const portRef = useRef<SerialPortLike | null>(null)
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const stateRef = useRef<PopupState | null>(null)
  const selectedMinutesRef = useRef(0)
  const localModeRef = useRef<LocalMode>('idle')
  const taskTypeRef = useRef<TaskType>('writing_creating')
  const timeReachedRef = useRef(false)
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve())
  const storeConnectionState = useCallback((isConnected: boolean) => chrome.storage.local.set({ driftsense_device_connection_v1: { connected: isConnected, updatedAt: new Date().toISOString() } }), [])

  const appendLog = useCallback((message: string) => {
    const stamped = `${new Date().toLocaleTimeString()} ${message}`
    setLog((items) => [stamped, ...items].slice(0, 8))
  }, [])

  const refresh = useCallback(async (): Promise<PopupState | null> => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return null
    const next = await sendRuntimeMessage<PopupState>({ type: 'GET_POPUP_STATE' })
    setState(next)
    stateRef.current = next
    return next
  }, [])

  const sendCommand = useCallback((command: DeviceCommand): Promise<void> => {
    const line = formatDeviceCommand(command)
    const queued = writeQueueRef.current.catch(() => undefined).then(async () => {
      const port = portRef.current
      if (!port?.writable) return
      const writer = port.writable.getWriter()
      try {
        await writer.write(new TextEncoder().encode(`${line}\n`))
        if (command.type !== 'PING') appendLog(`> ${line}`)
      } finally {
        writer.releaseLock()
      }
    }).catch((writeError: unknown) => appendLog(writeError instanceof Error ? writeError.message : 'Serial write failed'))
    writeQueueRef.current = queued
    return queued
  }, [appendLog])

  const submitReflection = useCallback(async (session: InternalSession, answer: PostSessionAnswer) => {
    await sendRuntimeMessage({ type: 'SUBMIT_REFLECTION', sessionId: session.sessionId, answer })
    await sendCommand({ type: 'COMPLETE' })
    setLocalMode('idle')
    await refresh()
  }, [refresh, sendCommand])

  const requestReflection = useCallback(async (session: InternalSession) => {
    await sendRuntimeMessage({ type: 'REQUEST_REFLECTION', sessionId: session.sessionId })
    await sendCommand({ type: 'REFLECTION' })
    await refresh()
  }, [refresh, sendCommand])

  const startSession = useCallback(async () => {
    const latest = await refresh()
    const minutes = selectedMinutesRef.current
    if (!latest?.currentDomain || !isTaskSite(latest.settings, latest.currentDomain)) {
      setError('Open an approved task-site tab, then press button 3 to start.')
      return
    }
    if (minutes < 1) {
      setError('Set a duration first with button 2.')
      return
    }
    const response = await sendRuntimeMessage<{ ok: boolean; error?: string }>({
      type: 'START_TASK_SESSION',
      tabId: latest.currentTabId ?? undefined,
      domain: latest.currentDomain,
      taskType: taskTypeRef.current,
      intendedDurationMinutes: minutes,
    })
    if (!response.ok) {
      setError(response.error ?? 'Unable to start the task session.')
      return
    }
    setError('')
    setLocalMode('idle')
    await sendCommand({ type: 'START' })
    await sendCommand({ type: 'TIME', seconds: minutes * 60 })
    await refresh()
  }, [refresh, sendCommand])

  const handleButtonEvent = useCallback(async (event: DeviceButtonEvent) => {
    appendLog(`< BUTTON:${event.button}`)
    const latest = await refresh()
    const active = latest?.activeSession
    if (active?.status === 'pending_reflection') {
      if (event.button === 1) await submitReflection(active, 'aligned')
      if (event.button === 2) await submitReflection(active, 'moved_away')
      if (event.button === 3) await submitReflection(active, 'not_sure')
      return
    }
    if (active?.status === 'active') {
      if (event.button === 3) await requestReflection(active)
      return
    }
    if (event.button === 1) {
      setLocalMode('selecting')
      setSelectedMinutes(0)
      await sendCommand({ type: 'DURATION', minutes: 0 })
      return
    }
    if (event.button === 2) {
      const next = clampDuration((localModeRef.current === 'selecting' ? selectedMinutesRef.current : 0) + 10)
      setLocalMode('selecting')
      setSelectedMinutes(next)
      await sendCommand({ type: 'DURATION', minutes: next })
      return
    }
    if (event.button === 3 && localModeRef.current === 'selecting') await startSession()
  }, [appendLog, refresh, requestReflection, sendCommand, startSession, submitReflection])

  const connect = useCallback(async () => {
    const serial = (navigator as SerialNavigator).serial
    if (!serial) {
      setError('This Chrome build does not expose Web Serial on extension pages.')
      return
    }
    setError('')
    const port = await serial.requestPort()
    await port.open({ baudRate: 115200 })
    portRef.current = port
    setConnected(true)
    await storeConnectionState(true)
    appendLog('Connected at 115200 baud')
    await sendCommand({ type: 'READY' })
    const alertState = (await chrome.storage.local.get('driftsense_device_alert_v1')).driftsense_device_alert_v1
    if (alertState) await sendCommand({ type: 'ALERT_ON' })

    const reader = port.readable?.getReader()
    if (!reader) return
    readerRef.current = reader
    const decoder = new TextDecoder()
    let buffer = ''
    void (async () => {
      try {
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split(/\r?\n/)
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            const parsed = parseDeviceLine(line)
            if (parsed) await handleButtonEvent(parsed)
          }
        }
      } catch (readError) {
        appendLog(readError instanceof Error ? readError.message : 'Serial read stopped')
      } finally {
        reader.releaseLock()
        readerRef.current = null
        setConnected(false)
        await storeConnectionState(false)
      }
    })()
  }, [appendLog, handleButtonEvent, sendCommand, storeConnectionState])

  const disconnect = useCallback(async () => {
    await sendCommand({ type: 'ALERT_OFF' })
    try { await readerRef.current?.cancel() } catch { /* already closed */ }
    try { await portRef.current?.close() } catch { /* already closed */ }
    portRef.current = null
    setConnected(false)
    await storeConnectionState(false)
    appendLog('Disconnected')
  }, [appendLog, sendCommand, storeConnectionState])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    if (!connected) return
    const heartbeat = () => {
      void storeConnectionState(true)
      void sendCommand({ type: 'PING' })
    }
    heartbeat()
    const id = window.setInterval(heartbeat, 2000)
    const markDisconnected = () => void storeConnectionState(false)
    window.addEventListener('beforeunload', markDisconnected)
    return () => { window.clearInterval(id); window.removeEventListener('beforeunload', markDisconnected); void storeConnectionState(false) }
  }, [connected, sendCommand, storeConnectionState])
  useEffect(() => { void loadCheckpointModel().then(setModel) }, [])
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return
    const listener = (message: unknown) => {
      const candidate = message as { type?: string; command?: DeviceCommand }
      if (candidate.type === 'DRIFTSENSE_DEVICE_COMMAND' && candidate.command) {
        void sendCommand(candidate.command)
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [sendCommand])
  useEffect(() => {
    const id = window.setInterval(() => { setTick(Date.now()); void refresh() }, 1000)
    return () => window.clearInterval(id)
  }, [refresh])
  useEffect(() => { stateRef.current = state }, [state])
  useEffect(() => { selectedMinutesRef.current = selectedMinutes }, [selectedMinutes])
  useEffect(() => { localModeRef.current = localMode }, [localMode])
  useEffect(() => { taskTypeRef.current = taskType }, [taskType])

  const active = state?.activeSession ?? null
  const mode = active?.status === 'pending_reflection' ? 'reflection' : active?.status === 'active' ? 'running' : localMode
  const approvedCurrentSite = isTaskSite(state?.settings ?? null, state?.currentDomain ?? null)
  const elapsed = active?.status === 'active' ? Math.max(active.durationSeconds, Math.round((tick - new Date(active.startTime).getTime()) / 1000)) : 0
  const remaining = active?.status === 'active' && active.intendedDurationMinutes ? Math.max(0, active.intendedDurationMinutes * 60 - elapsed) : 0

  useEffect(() => {
    if (!connected || active?.status !== 'active') return
    void sendCommand({ type: 'TIME', seconds: remaining })
    if (remaining === 0 && !timeReachedRef.current) {
      timeReachedRef.current = true
      void sendCommand({ type: 'TIME_REACHED' })
    }
  }, [active?.status, connected, remaining, sendCommand])
  useEffect(() => { if (active?.status === 'active' && remaining > 0) timeReachedRef.current = false }, [active?.status, remaining])

  return <div className="app-shell">
    <header className="topbar">
      <AppLogo />
      <div className="topbar-actions">
        <a className="button button-secondary" href={extensionUrl('src/popup/index.html')}>Popup</a>
        {connected ? <button className="button button-secondary" onClick={disconnect}><XCircle size={16} /> Disconnect</button> : <button className="button button-green" disabled={!serialSupported} onClick={() => void connect()}><Usb size={16} /> Connect ESP32</button>}
      </div>
    </header>

    <main className="page-container device-page">
      <section className="page-heading">
        <div><span className="eyebrow">USB serial controller</span><h1>ESP32 session device</h1><p>Use three hardware buttons for duration setup, task start, stop, and final reflection.</p></div>
        <span className={connected ? 'status-pill' : 'status-pill status-pill-paused'}><span className="status-dot" /> {connected ? 'Connected' : serialSupported ? 'Ready to connect' : 'Web Serial unavailable'}</span>
      </section>

      {error && <section className="notice danger-notice"><XCircle size={18} /> {error}</section>}

      <section className="device-grid">
        <div className="panel panel-pad device-status">
          <div className="device-display">
            <span>{mode === 'running' ? 'RUNNING' : mode === 'reflection' ? 'REFLECT' : mode === 'selecting' ? 'SELECT' : 'READY'}</span>
            <strong>{mode === 'running' ? formatDuration(remaining) : mode === 'selecting' ? `${selectedMinutes} min` : mode === 'reflection' ? '1  2  3' : '--:--'}</strong>
          </div>
          <div className="device-state-lines">
            <span><Cable size={15} /> {connected ? 'USB serial open' : 'Connect the ESP32 with a USB data cable'}</span>
            <span><Clock3 size={15} /> {active?.status === 'active' ? `${formatDuration(elapsed)} elapsed` : 'No active task timer'}</span>
            <span className={approvedCurrentSite ? 'ok-line' : ''}><CheckCircle2 size={15} /> {state?.currentDomain ? `${state.currentDomain}${approvedCurrentSite ? ' is approved' : ' is not approved'}` : 'Focus an approved task-site tab before hardware start'}</span>
          </div>
        </div>

        <div className="panel panel-pad">
          <div className="section-heading"><h2>Hardware buttons</h2><p>Button behavior follows the ESP32 discussion file.</p></div>
          <div className="button-map">
            <button className="button button-secondary" onClick={() => void handleButtonEvent({ type: 'button', button: 1 })}><TimerReset size={16} /> Button 1</button>
            <button className="button button-secondary" onClick={() => void handleButtonEvent({ type: 'button', button: 2 })}><Clock3 size={16} /> Button 2</button>
            <button className="button button-secondary" onClick={() => void handleButtonEvent({ type: 'button', button: 3 })}><Square size={16} /> Button 3</button>
          </div>
          <div className="state-table">
            <span>Idle</span><strong>1 setup, 2 add 10 min</strong>
            <span>Selecting</span><strong>1 reset, 2 add 10 min, 3 start</strong>
            <span>Running</span><strong>3 finish and reflect</strong>
            <span>Reflection</span><strong>1 aligned, 2 moved away, 3 not sure</strong>
          </div>
        </div>

        <div className="panel panel-pad">
          <div className="section-heading"><h2>Task setup</h2><p>Select the task type here, then use the hardware duration buttons.</p></div>
          <label className="field"><span>Task type</span><select className="select" value={taskType} onChange={(event) => setTaskType(event.target.value as TaskType)}>{TASK_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <div className="device-actions">
            <button className="button button-secondary" onClick={() => { setLocalMode('selecting'); setSelectedMinutes(0); void sendCommand({ type: 'DURATION', minutes: 0 }) }}><RotateCcw size={16} /> Setup/reset</button>
            <button className="button button-secondary" onClick={() => { const next = clampDuration(selectedMinutes + 10); setLocalMode('selecting'); setSelectedMinutes(next); void sendCommand({ type: 'DURATION', minutes: next }) }}><Clock3 size={16} /> Add 10 min</button>
            <button className="button button-green" disabled={!approvedCurrentSite || selectedMinutes < 1 || Boolean(active)} onClick={() => void startSession()}>Start task</button>
          </div>
        </div>

        <div className="panel panel-pad">
          <div className="section-heading"><h2>Phase 2 model</h2><p>{model ? `${model.model_version} · ${model.prediction_offsets_seconds.length === 0 ? 'duration-relative alert windows' : `${model.prediction_offsets_seconds[0] / 60} minute checkpoint`}` : 'No valid checkpoint model installed. Automatic alerts are disabled.'}</p></div>
          <label className="button button-secondary"><Upload size={16} /> Import frozen_model.json<input hidden type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; void file.text().then(JSON.parse).then(installCheckpointModel).then((installed) => { setModel(installed); setError(''); appendLog(`Installed ${installed.model_version}`) }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Invalid model file.')); event.target.value = '' }} /></label>
          <div className="device-actions">
            <button className="button button-secondary" disabled={!connected} onClick={() => void sendCommand({ type: 'ALERT_ON' })}><Bell size={16} /> Test alert</button>
            <button className="button button-secondary" disabled={!connected} onClick={() => void sendCommand({ type: 'ALERT_OFF' })}><BellOff size={16} /> Stop test</button>
          </div>
        </div>

        <div className="panel panel-pad">
          <div className="section-heading"><h2>Current session</h2><p>{active ? taskTypeLabel(active.taskType) : 'No active or pending session.'}</p></div>
          {active?.status === 'active' ? <button className="button button-primary" onClick={() => void requestReflection(active)}><Square size={16} /> Finish and reflect</button> : null}
          {active?.status === 'pending_reflection' ? <div className="reflection-buttons"><button className="button button-green" onClick={() => void submitReflection(active, 'aligned')}>Aligned</button><button className="button button-primary" onClick={() => void submitReflection(active, 'moved_away')}>Moved away</button><button className="button button-secondary" onClick={() => void submitReflection(active, 'not_sure')}>Not sure</button></div> : null}
          <div className="serial-log">{log.length ? log.map((item) => <span key={item}>{item}</span>) : <span>No serial events yet.</span>}</div>
        </div>
      </section>
    </main>
  </div>
}
