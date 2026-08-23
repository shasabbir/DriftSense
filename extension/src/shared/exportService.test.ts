import { describe, expect, it } from 'vitest'
import { modelingSessionsToCsv, participantCsvFilename } from './exportService'
import { MODELING_SESSION_EXPORT_FIELDS } from './privacyGuard'
import type { InternalSession } from './types'

export function completedSession(): InternalSession {
  return { sessionId: 'session_1', protocolVersion: 3, anonymousUserId: 'P01', studyStage: 'phase_1_collection', condition: 'phase_1_observational', taskType: 'learning_tutorial', intendedDurationMinutes: 15, taskSites: ['youtube.com','github.com'], initialTaskSite: 'youtube.com', startTime: '2026-07-19T09:00:00+06:00', endTime: '2026-07-19T09:12:00+06:00', durationSeconds: 720, clickCount: 7, scrollCount: 25, keyboardActivityCount: 1, idleSeconds: 40, activeSeconds: 600, awaySeconds: 80, tabFocusLossCount: 2, tabSwitchCount: 3, videoPlayingSeconds: 500, reflectionRequestedAt: '2026-07-19T09:12:00+06:00', reflectionAction: null, postSessionAnswer: 'aligned', driftLabel: 0, status: 'completed', labelSource: 'post_session_self_report', createdAt: '2026-07-19T09:00:00+06:00', updatedAt: '2026-07-19T09:12:00+06:00', activeTabId: 1, currentContext: 'task_site', contextChangedAt: '2026-07-19T09:12:00+06:00', lastWindowAt: '2026-07-19T09:12:00+06:00', contextEvents: [] }
}
describe('Phase 1 participant CSV export', () => {
  it('uses a safe participant filename', () => { expect(participantCsvFilename('P01')).toBe('P01.csv'); expect(participantCsvFilename('../P01')).toBe('___P01.csv') })
  it('writes the exact schema-v3 header and content-free values', () => { const csv = modelingSessionsToCsv([completedSession()]); const [header, row] = csv.split('\r\n'); expect(header).toBe(MODELING_SESSION_EXPORT_FIELDS.join(',')); expect(row).toBe('session_1,P01,2026-07-19T09:00:00+06:00,learning_tutorial,15,youtube.com,2,720,7,25,1,40,600,80,3,500,aligned,0') })
})
