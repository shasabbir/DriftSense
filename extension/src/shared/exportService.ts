import { ACTIVITY_EXPORT_FIELDS, assertPrivacySafeRecord, sanitizeActivityWindow, sanitizeSession, SESSION_EXPORT_FIELDS } from './privacyGuard'
import { getAllData } from './storage'

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

export async function exportSessionsCsv(): Promise<void> {
  const { sessions } = await getAllData()
  const safe = sessions.map(sanitizeSession) as unknown as Record<string, unknown>[]
  download(recordsToCsv(safe, SESSION_EXPORT_FIELDS), `driftsense-sessions-${dateStamp()}.csv`, 'text/csv;charset=utf-8')
}

export async function exportActivityWindowsCsv(): Promise<void> {
  const { activityWindows } = await getAllData()
  const safe = activityWindows.map(sanitizeActivityWindow) as unknown as Record<string, unknown>[]
  download(recordsToCsv(safe, ACTIVITY_EXPORT_FIELDS), `driftsense-activity-windows-${dateStamp()}.csv`, 'text/csv;charset=utf-8')
}

export async function exportJsonBundle(): Promise<void> {
  const { settings, sessions, activityWindows } = await getAllData()
  const payload = {
    schemaVersion: settings.schemaVersion,
    exportedAt: new Date().toISOString(),
    participantId: settings.participantId,
    studyStage: settings.studyStage,
    condition: settings.condition,
    sessions: sessions.map(sanitizeSession),
    activityWindows: activityWindows.map(sanitizeActivityWindow),
  }
  payload.sessions.forEach((record) => assertPrivacySafeRecord(record as unknown as Record<string, unknown>))
  payload.activityWindows.forEach((record) => assertPrivacySafeRecord(record as unknown as Record<string, unknown>))
  download(JSON.stringify(payload, null, 2), `driftsense-export-${dateStamp()}.json`, 'application/json')
}
