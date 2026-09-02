import {
  ACTIVITY_EXPORT_FIELDS,
  CHECKPOINT_EXPORT_FIELDS,
  assertPrivacySafeRecord,
  MODELING_SESSION_EXPORT_FIELDS,
  sanitizeActivityWindow,
  sanitizeModelingSession,
  sanitizeSession,
} from './privacyGuard'
import { getAllData } from './storage'
import type { InternalSession } from './types'

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const text = Array.isArray(value) ? value.join('|') : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function recordsToCsv(records: Record<string, unknown>[], fields: readonly string[]): string {
  const lines = [fields.map(csvEscape).join(',')]
  for (const record of records) {
    assertPrivacySafeRecord(record)
    lines.push(fields.map((field) => csvEscape(record[field])).join(','))
  }
  return lines.join('\r\n')
}

function download(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10)
}

export function participantCsvFilename(participantId: string): string {
  const safeId = participantId.trim().replace(/[^A-Za-z0-9_-]/g, '_') || 'participant'
  return `${safeId}.csv`
}

export function modelingSessionsToCsv(sessions: InternalSession[]): string {
  const safe = sessions.map(sanitizeModelingSession) as unknown as Record<string, unknown>[]
  return recordsToCsv(safe, MODELING_SESSION_EXPORT_FIELDS)
}

export async function exportSessionsCsv(): Promise<void> {
  const { settings, sessions } = await getAllData()
  download(
    modelingSessionsToCsv(sessions),
    participantCsvFilename(settings.participantId),
    'text/csv;charset=utf-8',
  )
}

export async function exportActivityWindowsCsv(): Promise<void> {
  const { activityWindows } = await getAllData()
  const safe = activityWindows.map(sanitizeActivityWindow) as unknown as Record<string, unknown>[]
  download(recordsToCsv(safe, ACTIVITY_EXPORT_FIELDS), `driftsense-activity-windows-${dateStamp()}.csv`, 'text/csv;charset=utf-8')
}
export async function exportCheckpointSnapshotsCsv(): Promise<void> {
  const { checkpointSnapshots } = await getAllData()
  download(recordsToCsv(checkpointSnapshots as unknown as Record<string, unknown>[], CHECKPOINT_EXPORT_FIELDS), `driftsense-checkpoints-${dateStamp()}.csv`, 'text/csv;charset=utf-8')
}

export async function exportJsonBundle(): Promise<void> {
  const { settings, sessions, activityWindows, checkpointSnapshots } = await getAllData()
  const phase2Decisions = typeof chrome !== 'undefined' && chrome.storage?.local
    ? ((await chrome.storage.local.get('driftsense_phase2_decisions_v1')).driftsense_phase2_decisions_v1 ?? [])
    : []
  const payload = {
    schemaVersion: settings.schemaVersion,
    exportedAt: new Date().toISOString(),
    participantId: settings.participantId,
    studyStage: settings.studyStage,
    condition: settings.condition,
    sessions: sessions.map(sanitizeSession),
    activityWindows: activityWindows.map(sanitizeActivityWindow),
    checkpointSnapshots,
    phase2Decisions,
  }
  payload.sessions.forEach((record) => assertPrivacySafeRecord(record as unknown as Record<string, unknown>))
  payload.activityWindows.forEach((record) => assertPrivacySafeRecord(record as unknown as Record<string, unknown>))
  payload.checkpointSnapshots.forEach((record) => assertPrivacySafeRecord(record as unknown as Record<string, unknown>))
  payload.phase2Decisions.forEach((record: Record<string, unknown>) => assertPrivacySafeRecord(record))
  download(JSON.stringify(payload, null, 2), `driftsense-export-${dateStamp()}.json`, 'application/json')
}
