import { describe, expect, it } from 'vitest'
import { driftLabelForAnswer } from './labelRules'

describe('post-session label rules', () => {
  it('maps explicit self-reports to the binary label', () => {
    expect(driftLabelForAnswer('aligned')).toBe(0)
    expect(driftLabelForAnswer('moved_away')).toBe(1)
  })

  it('keeps uncertainty outside the binary label', () => {
    expect(driftLabelForAnswer('not_sure')).toBeNull()
  })
})
