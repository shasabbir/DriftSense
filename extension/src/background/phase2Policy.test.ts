import { describe, expect, it } from 'vitest'
import { alertWindowAlreadyDecided, assignmentForDeliveryPolicy, canDeliverPhase2Prompt, consecutivePositiveScoreCount, durationAlertWindows, existingPhase2Assignment, phase2Assignment, predictionOffsetsForDuration } from './phase2Policy'

describe('Phase 2 alert policy', () => {
  it('uses one midpoint decision below 30 minutes and two third-point decisions from 30 minutes', () => {
    expect(durationAlertWindows(10)).toEqual([{ index: 1, startMinute: 5, endMinute: 5 }])
    expect(durationAlertWindows(20)).toEqual([{ index: 1, startMinute: 10, endMinute: 10 }])
    expect(durationAlertWindows(29)).toEqual([{ index: 1, startMinute: 15, endMinute: 15 }])
    expect(durationAlertWindows(30)).toEqual([
      { index: 1, startMinute: 10, endMinute: 10 },
      { index: 2, startMinute: 20, endMinute: 20 },
    ])
    expect(durationAlertWindows(90)).toEqual([
      { index: 1, startMinute: 30, endMinute: 30 },
      { index: 2, startMinute: 60, endMinute: 60 },
    ])
    expect(predictionOffsetsForDuration(30)).toEqual([600, 1200])
    expect(predictionOffsetsForDuration(50)).toEqual([1020, 2040])
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

  it('always delivers qualifying intervention windows in technical-pilot mode', () => {
    expect(assignmentForDeliveryPolicy(null, 'technical_pilot_always_deliver', 0.99, 0.5)).toBe('intervention')
    expect(canDeliverPhase2Prompt('intervention', 99, 3, 'technical_pilot_always_deliver')).toBe(true)
  })
})
