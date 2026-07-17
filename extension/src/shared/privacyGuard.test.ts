import { describe, expect, it } from 'vitest'
import { assertPrivacySafeRecord, MODELING_SESSION_EXPORT_FIELDS, sanitizeModelingSession, sanitizeSession } from './privacyGuard'
import type { InternalSession } from './types'

describe('export privacy guard', () => {
  it('removes service-worker-only session fields', () => {
    const session = {
      sessionId: 'session_1', anonymousUserId: 'DS-TEST', studyStage: 'stage_1_training', condition: 'static_intention_prompt',
      domain: 'reddit.com', domainCategory: 'social', declaredIntention: null, intendedDurationMinutes: null,
      intentionCapturedAt: null, startTime: new Date(0).toISOString(), endTime: null, durationSeconds: 0,
      clickCount: 0, scrollCount: 0, keyboardActivityCount: 0, idleSeconds: 0, activeSeconds: 0,
      tabFocusLossCount: 0, tabSwitchCount: 0, videoPlayingSeconds: 0, checkinCount: 0,
      postSessionAnswer: null, driftLabel: null, actualDurationSeconds: 0, status: 'active', labelSource: null,
      createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString(), tabId: 42,
      lastWindowAt: null, reflectionRequestedAt: null,
    } satisfies InternalSession
    const safe = sanitizeSession(session) as unknown as Record<string, unknown>
    expect(safe.tabId).toBeUndefined()
    expect(safe.lastWindowAt).toBeUndefined()
  })

  it('blocks prohibited field names', () => {
    expect(() => assertPrivacySafeRecord({ sessionId: '1', page_text: 'unsafe' })).toThrow(/privacy guard/i)
  })

  it('maps an internal session to the simplified modeling schema', () => {
    const session = {
      sessionId: 'session_1', anonymousUserId: 'P01', studyStage: 'stage_1_training', condition: 'static_intention_prompt',
      domain: 'reddit.com', domainCategory: 'social', declaredIntention: 'specific_information', intendedDurationMinutes: 10,
      intentionCapturedAt: new Date(0).toISOString(), startTime: new Date(0).toISOString(), endTime: new Date(600_000).toISOString(), durationSeconds: 590,
      clickCount: 4, scrollCount: 18, keyboardActivityCount: 2, idleSeconds: 30, activeSeconds: 560,
      tabFocusLossCount: 3, tabSwitchCount: 3, videoPlayingSeconds: 0, checkinCount: 1,
      postSessionAnswer: 'no_drifted', driftLabel: 1, actualDurationSeconds: 600, status: 'completed', labelSource: 'post_session_self_report',
      createdAt: new Date(0).toISOString(), updatedAt: new Date(600_000).toISOString(), tabId: 42,
      lastWindowAt: null, reflectionRequestedAt: null,
    } satisfies InternalSession
    const safe = sanitizeModelingSession(session)
    expect(Object.keys(safe)).toEqual(MODELING_SESSION_EXPORT_FIELDS)
    expect(safe).toMatchObject({
      session_id: 'session_1', participant_id: 'P01', domain: 'reddit.com',
      declared_intention: 'specific_information', intended_duration_minutes: 10,
      duration_seconds: 600, click_count: 4, scroll_count: 18,
      keyboard_activity_count: 2, idle_seconds: 30, focus_loss_count: 3, drift_label: 1,
    })
  })
})
