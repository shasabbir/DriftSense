import { describe, expect, it } from 'vitest'
import { modelingSessionsToCsv, participantCsvFilename } from './exportService'
import { MODELING_SESSION_EXPORT_FIELDS } from './privacyGuard'
import type { InternalSession } from './types'

function completedSession(): InternalSession {
  return {
    sessionId: 'session_1', anonymousUserId: 'P01', studyStage: 'stage_1_training', condition: 'static_intention_prompt',
    domain: 'youtube.com', domainCategory: 'video', declaredIntention: 'learning_or_tutorial', intendedDurationMinutes: 15,
    intentionCapturedAt: '2026-07-19T09:00:00+06:00', startTime: '2026-07-19T09:00:00+06:00', endTime: '2026-07-19T09:12:00+06:00',
    durationSeconds: 720, clickCount: 7, scrollCount: 25, keyboardActivityCount: 1, idleSeconds: 40, activeSeconds: 680,
    tabFocusLossCount: 2, tabSwitchCount: 2, videoPlayingSeconds: 500, checkinCount: 1,
    postSessionAnswer: 'yes_matched', driftLabel: 0, actualDurationSeconds: 720, status: 'completed', labelSource: 'post_session_self_report',
    createdAt: '2026-07-19T09:00:00+06:00', updatedAt: '2026-07-19T09:12:00+06:00',
    tabId: 1, lastWindowAt: '2026-07-19T09:12:00+06:00', reflectionRequestedAt: '2026-07-19T09:12:00+06:00',
  }
}

describe('participant modeling CSV export', () => {
  it('uses the participant code as a safe filename', () => {
    expect(participantCsvFilename('P01')).toBe('P01.csv')
    expect(participantCsvFilename('../P01')).toBe('___P01.csv')
  })

  it('writes the exact data.csv-compatible header and values', () => {
    const csv = modelingSessionsToCsv([completedSession()])
    const [header, row] = csv.split('\r\n')
    expect(header).toBe(MODELING_SESSION_EXPORT_FIELDS.join(','))
    expect(row).toBe('session_1,P01,2026-07-19T09:00:00+06:00,youtube.com,learning_or_tutorial,15,720,7,25,1,40,2,0')
  })
})
