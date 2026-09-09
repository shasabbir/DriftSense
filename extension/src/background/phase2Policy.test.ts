import { describe, expect, it } from 'vitest'
import { ALERT_AUTO_STOP_SECONDS, ALERT_MAX_CYCLES, ALERT_REPEAT_SECONDS, alertWindowAlreadyDecided, assignmentForDeliveryPolicy, canDeliverPhase2Prompt, durationAlertWindows, existingPhase2Assignment, phase2Assignment, predictionOffsetsForDuration } from './phase2Policy'

describe('Phase 2 alert policy', () => {
  it('checks every five minutes through 20 minutes and every ten minutes above 20', () => {
    expect(predictionOffsetsForDuration(4)).toEqual([])
    expect(predictionOffsetsForDuration(10)).toEqual([300, 600])
    expect(predictionOffsetsForDuration(20)).toEqual([300, 600, 900, 1200])
    expect(predictionOffsetsForDuration(21)).toEqual([600, 1200])
    expect(predictionOffsetsForDuration(50)).toEqual([600, 1200, 1800, 2400, 3000])
    expect(predictionOffsetsForDuration(90)).toEqual([600, 1200, 1800, 2400, 3000, 3600, 4200, 4800, 5400])
  })

  it('allows five alert cycles ten seconds apart before the extension stops the alert', () => {
    expect(ALERT_REPEAT_SECONDS).toBe(10)
    expect(ALERT_MAX_CYCLES).toBe(5)
    expect(ALERT_AUTO_STOP_SECONDS).toBe(41)
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
