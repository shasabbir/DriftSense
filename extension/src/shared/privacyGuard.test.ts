import { describe, expect, it } from 'vitest'
import { completedSession } from './exportService.test'
import { assertPrivacySafeRecord, sanitizeModelingSession, sanitizeSession } from './privacyGuard'
describe('export privacy guard', () => {
  it('removes service-worker-only context state', () => { const safe = sanitizeSession(completedSession()) as unknown as Record<string, unknown>; expect(safe.activeTabId).toBeUndefined(); expect(safe.contextChangedAt).toBeUndefined() })
  it('blocks prohibited content and destination fields', () => { expect(() => assertPrivacySafeRecord({ sessionId: '1', page_text: 'unsafe' })).toThrow(/privacy guard/i); expect(() => assertPrivacySafeRecord({ destination_domain: 'private.example' })).toThrow(/privacy guard/i) })
  it('maps sessions to the Phase 1 modeling schema', () => { expect(sanitizeModelingSession(completedSession())).toMatchObject({ participant_id: 'P01', task_type: 'learning_tutorial', initial_task_site: 'youtube.com', away_seconds: 80, drift_label: 0 }) })
})
