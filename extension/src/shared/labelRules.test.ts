import { describe, expect, it } from 'vitest'
import { driftLabelForAnswer } from './labelRules'

describe('post-session label rules', () => {
  it('maps explicit self-reports to the binary label', () => {
    expect(driftLabelForAnswer('yes_matched')).toBe(0)
    expect(driftLabelForAnswer('no_drifted')).toBe(1)
  })

  it('keeps continued and deferred outcomes outside the binary label', () => {
    expect(driftLabelForAnswer('continue_intentionally')).toBeNull()
    expect(driftLabelForAnswer('save_for_later')).toBeNull()
  })
})
