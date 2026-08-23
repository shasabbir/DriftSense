import { createDefaultSettings, migrateDomainPresets, STORAGE_KEYS } from './constants'
import type { ActivityWindow, AppSettings, CheckpointSnapshot, InternalSession, StoredData } from './types'

const fallbackEventName = 'driftsense-storage-change'
let operationQueue: Promise<unknown> = Promise.resolve()

function hasChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local)
}

async function readKey<T>(key: string): Promise<T | undefined> {
  if (hasChromeStorage()) {
    const result = await chrome.storage.local.get(key)
    return result[key] as T | undefined
  }

  const raw = localStorage.getItem(key)
  return raw ? (JSON.parse(raw) as T) : undefined
}

async function writeKey<T>(key: string, value: T): Promise<void> {
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ [key]: value })
    return
  }

  localStorage.setItem(key, JSON.stringify(value))
  window.dispatchEvent(new CustomEvent(fallbackEventName, { detail: { key, value } }))
}

export async function initializeStorage(): Promise<StoredData> {
  const [settings, sessions, activityWindows, checkpointSnapshots] = await Promise.all([
    readKey<AppSettings>(STORAGE_KEYS.settings),
    readKey<InternalSession[]>(STORAGE_KEYS.sessions),
    readKey<ActivityWindow[]>(STORAGE_KEYS.activityWindows),
    readKey<CheckpointSnapshot[]>(STORAGE_KEYS.checkpointSnapshots),
  ])

  const initializedSettings = settings ? migrateDomainPresets(settings) : createDefaultSettings()
  const initialized: StoredData = {
    settings: initializedSettings,
    sessions: sessions ?? [],
    activityWindows: activityWindows ?? [],
    checkpointSnapshots: checkpointSnapshots ?? [],
  }

  await Promise.all([
    settings === initializedSettings ? Promise.resolve() : writeKey(STORAGE_KEYS.settings, initialized.settings),
    sessions ? Promise.resolve() : writeKey(STORAGE_KEYS.sessions, initialized.sessions),
    activityWindows ? Promise.resolve() : writeKey(STORAGE_KEYS.activityWindows, initialized.activityWindows),
    checkpointSnapshots ? Promise.resolve() : writeKey(STORAGE_KEYS.checkpointSnapshots, initialized.checkpointSnapshots),
  ])

  return initialized
}

export async function getSettings(): Promise<AppSettings> {
  const stored = await readKey<AppSettings>(STORAGE_KEYS.settings)
  if (!stored) return createDefaultSettings()
  const migrated = migrateDomainPresets(stored)
  if (migrated !== stored) await writeKey(STORAGE_KEYS.settings, migrated)
  return migrated
}

export async function setSettings(settings: AppSettings): Promise<void> {
  await writeKey(STORAGE_KEYS.settings, settings)
}

export async function patchSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  return runStorageOperation(async () => {
    const settings = await getSettings()
    const next = { ...settings, ...patch }
    await setSettings(next)
    return next
  })
}

export async function getSessions(): Promise<InternalSession[]> {
  return (await readKey<InternalSession[]>(STORAGE_KEYS.sessions)) ?? []
}

export async function setSessions(sessions: InternalSession[]): Promise<void> {
  await writeKey(STORAGE_KEYS.sessions, sessions)
}

export async function getActivityWindows(): Promise<ActivityWindow[]> {
  return (await readKey<ActivityWindow[]>(STORAGE_KEYS.activityWindows)) ?? []
}

export async function setActivityWindows(windows: ActivityWindow[]): Promise<void> {
  await writeKey(STORAGE_KEYS.activityWindows, windows)
}
export async function getCheckpointSnapshots(): Promise<CheckpointSnapshot[]> { return (await readKey<CheckpointSnapshot[]>(STORAGE_KEYS.checkpointSnapshots)) ?? [] }
export async function setCheckpointSnapshots(snapshots: CheckpointSnapshot[]): Promise<void> { await writeKey(STORAGE_KEYS.checkpointSnapshots, snapshots) }

export async function getAllData(): Promise<StoredData> {
  const [settings, sessions, activityWindows, checkpointSnapshots] = await Promise.all([getSettings(), getSessions(), getActivityWindows(), getCheckpointSnapshots()])
  return { settings, sessions, activityWindows, checkpointSnapshots }
}

export async function clearResearchData(): Promise<void> {
  await runStorageOperation(async () => {
    await Promise.all([setSessions([]), setActivityWindows([]), setCheckpointSnapshots([])])
  })
}

export async function deleteSessionData(sessionId: string): Promise<void> {
  await runStorageOperation(async () => {
    const [sessions, windows, snapshots] = await Promise.all([getSessions(), getActivityWindows(), getCheckpointSnapshots()])
    await Promise.all([
      setSessions(sessions.filter((session) => session.sessionId !== sessionId)),
      setActivityWindows(windows.filter((window) => window.sessionId !== sessionId)),
      setCheckpointSnapshots(snapshots.filter((snapshot) => snapshot.sessionId !== sessionId)),
    ])
  })
}

export function runStorageOperation<T>(operation: () => Promise<T>): Promise<T> {
  const result = operationQueue.then(operation, operation)
  operationQueue = result.then(
    () => undefined,
    () => undefined,
  )
  return result
}

export function subscribeToStorage(callback: () => void): () => void {
  if (hasChromeStorage()) {
    const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName === 'local' && Object.keys(changes).some((key) => Object.values(STORAGE_KEYS).includes(key as never))) {
        callback()
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }

  const listener = () => callback()
  window.addEventListener(fallbackEventName, listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener(fallbackEventName, listener)
    window.removeEventListener('storage', listener)
  }
}
