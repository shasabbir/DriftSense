import { describe, expect, it } from 'vitest'
import { INTENTION_OPTIONS } from './constants'

describe('intention options', () => {
  it('covers productive and leisure contexts with neutral current values', () => {
    const values = INTENTION_OPTIONS.map((option) => option.value)
    expect(values).toEqual([
      'work_or_study',
      'learning_or_tutorial',
      'specific_information',
      'communication_or_community',
      'planned_entertainment_or_break',
      'open_ended_browsing',
      'accidental_open',
    ])
    expect(values).not.toContain('boredom')
    expect(values).not.toContain('avoiding_work')
  })
})
