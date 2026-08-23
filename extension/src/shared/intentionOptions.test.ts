import { describe, expect, it } from 'vitest'
import { TASK_TYPE_OPTIONS } from './constants'

describe('structured task types', () => {
  it('uses the six protocol task types without free text', () => {
    const values = TASK_TYPE_OPTIONS.map((option) => option.value)
    expect(values).toEqual([
      'writing_creating',
      'coding_problem_solving',
      'reading_research',
      'learning_tutorial',
      'communication_coordination',
      'other_planned_task',
    ])
    expect(values).not.toContain('free_text')
  })
})
