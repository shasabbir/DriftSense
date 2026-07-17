import type { ActivityWindow, InternalSession, ModelingSessionRecord, SessionRecord } from './types'

export const MODELING_SESSION_EXPORT_FIELDS = [
  'session_id',
  'participant_id',
  'start_time',
  'domain',
  'declared_intention',
  'intended_duration_minutes',
  'duration_seconds',
  'click_count',
  'scroll_count',
  'keyboard_activity_count',
  'idle_seconds',
  'focus_loss_count',
  'drift_label',
] as const satisfies readonly (keyof ModelingSessionRecord)[]

export const SESSION_EXPORT_FIELDS = [
  'sessionId',
  'anonymousUserId',
  'studyStage',
  'condition',
  'domain',
  'domainCategory',
  'declaredIntention',
  'intendedDurationMinutes',
  'intentionCapturedAt',
  'startTime',
  'endTime',
  'durationSeconds',
  'clickCount',
  'scrollCount',
  'keyboardActivityCount',
  'idleSeconds',
  'activeSeconds',
  'tabFocusLossCount',
  'tabSwitchCount',
  'videoPlayingSeconds',
  'checkinCount',
  'postSessionAnswer',
  'driftLabel',
  'actualDurationSeconds',
  'status',
  'labelSource',
  'createdAt',
  'updatedAt',
] as const satisfies readonly (keyof SessionRecord)[]

export const ACTIVITY_EXPORT_FIELDS = [
  'windowId',
  'sessionId',
  'anonymousUserId',
  'timestamp',
  'timestampOffsetSeconds',
  'windowDurationSeconds',
  'clicksInWindow',
  'scrollEventsInWindow',
  'keyboardActivityInWindow',
  'idleInWindow',
  'tabFocused',
  'videoPlaying',
  'urlDomainOnly',
] as const satisfies readonly (keyof ActivityWindow)[]

export function sanitizeSession(session: InternalSession): SessionRecord {
  return Object.fromEntries(SESSION_EXPORT_FIELDS.map((field) => [field, session[field]])) as unknown as SessionRecord
}

export function sanitizeModelingSession(session: InternalSession): ModelingSessionRecord {
  return {
    session_id: session.sessionId,
    participant_id: session.anonymousUserId,
    start_time: session.startTime,
    domain: session.domain,
    declared_intention: session.declaredIntention,
    intended_duration_minutes: session.intendedDurationMinutes,
    duration_seconds: Math.max(session.durationSeconds, session.actualDurationSeconds),
    click_count: session.clickCount,
    scroll_count: session.scrollCount,
    keyboard_activity_count: session.keyboardActivityCount,
    idle_seconds: session.idleSeconds,
    focus_loss_count: session.tabFocusLossCount,
    drift_label: session.driftLabel,
  }
}

export function sanitizeActivityWindow(window: ActivityWindow): ActivityWindow {
  return Object.fromEntries(ACTIVITY_EXPORT_FIELDS.map((field) => [field, window[field]])) as unknown as ActivityWindow
}

const PROHIBITED_FIELD_PATTERN = /(url_path|full_url|page_title|page_text|password|message|screenshot|source_code|key_value|keystroke_value|webcam|face|emotion)/i

export function assertPrivacySafeRecord(record: Record<string, unknown>): void {
  const unsafeField = Object.keys(record).find((field) => PROHIBITED_FIELD_PATTERN.test(field))
  if (unsafeField) throw new Error(`Export blocked by privacy guard: ${unsafeField}`)
}
