import { describe, expect, it } from 'vitest'
import { alertWindowAlreadyDecided, canDeliverPhase2Prompt, consecutivePositiveScoreCount, durationAlertWindows, existingPhase2Assignment, phase2Assignment, predictionOffsetsForDuration } from './phase2Policy'

describe('Phase 2 alert policy', () => {
  it('uses one duration-relative window for short sessions and two for long sessions', () => {
    expect(durationAlertWindows(20)).toEqual([{ index: 1, startMinute: 7, endMinute: 9 }])
    expect(durationAlertWindows(90)).toEqual([
      { index: 1, startMinute: 30, endMinute: 32 },
      { index: 2, startMinute: 60, endMinute: 62 },
    ])
    expect(predictionOffsetsForDuration(30)).toEqual([600, 660, 720, 1200, 1260, 1320])
    expect(predictionOffsetsForDuration(50)).toEqual([1020, 1080, 1140, 2040, 2100, 2160])
  })

  it('requires consecutive one-minute positive scores and resets after a negative score', () => {
    expect(consecutivePositiveScoreCount([{ cutoffSeconds: 600, triggered: true, assignment: null }], 660)).toBe(2)
    expect(consecutivePositiveScoreCount([
      { cutoffSeconds: 600, triggered: true, assignment: null },
      { cutoffSeconds: 660, triggered: false, assignment: null },
    ], 720)).toBe(1)
  })

  it('keeps one random assignment while allowing one decision in each alert window', () => {
    const rows = [{ cutoffSeconds: 1860, triggered: true, assignment: 'intervention' as const, alertWindow: 1 }]
    expect(existingPhase2Assignment(rows)).toBe('intervention')
    expect(alertWindowAlreadyDecided(rows, 1)).toBe(true)
    expect(alertWindowAlreadyDecided(rows, 2)).toBe(false)
  })

  it('keeps silent control silent and enforces the daily prompt cap', () => {
    expect(phase2Assignment(0.49, 0.5)).toBe('intervention')
    expect(phase2Assignment(0.5, 0.5)).toBe('silent_control')
    expect(canDeliverPhase2Prompt('silent_control', 0, 3)).toBe(false)
    expect(canDeliverPhase2Prompt('intervention', 2, 3)).toBe(true)
    expect(canDeliverPhase2Prompt('intervention', 3, 3)).toBe(false)
  })
})
