import { describe, expect, it } from 'vitest'
import { assertPrivacySafeRecord, sanitizeSession } from './privacyGuard'
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
})
