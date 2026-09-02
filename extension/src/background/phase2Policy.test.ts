import { describe, expect, it } from 'vitest'
import { canDeliverPhase2Prompt, consecutivePositiveScoreCount, hasPhase2Assignment, phase2Assignment } from './phase2Policy'

describe('Phase 2 alert policy', () => {
  it('requires consecutive one-minute positive scores and resets after a negative score', () => {
    expect(consecutivePositiveScoreCount([{ cutoffSeconds: 600, triggered: true, assignment: null }], 660)).toBe(2)
    expect(consecutivePositiveScoreCount([
      { cutoffSeconds: 600, triggered: true, assignment: null },
      { cutoffSeconds: 660, triggered: false, assignment: null },
    ], 720)).toBe(1)
  })

  it('recognizes that a session has already received its one assignment', () => {
    expect(hasPhase2Assignment([{ cutoffSeconds: 660, triggered: true, assignment: 'intervention' }])).toBe(true)
    expect(hasPhase2Assignment([{ cutoffSeconds: 600, triggered: true, assignment: null }])).toBe(false)
  })

  it('keeps silent control silent and enforces the daily prompt cap', () => {
    expect(phase2Assignment(0.49, 0.5)).toBe('intervention')
    expect(phase2Assignment(0.5, 0.5)).toBe('silent_control')
    expect(canDeliverPhase2Prompt('silent_control', 0, 3)).toBe(false)
    expect(canDeliverPhase2Prompt('intervention', 2, 3)).toBe(true)
    expect(canDeliverPhase2Prompt('intervention', 3, 3)).toBe(false)
  })
})
