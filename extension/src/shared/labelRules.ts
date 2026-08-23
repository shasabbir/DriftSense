import type { DriftLabel, PostSessionAnswer } from './types'

export function driftLabelForAnswer(answer: PostSessionAnswer): DriftLabel {
  if (answer === 'aligned') return 0
  if (answer === 'moved_away') return 1
  return null
}

export const postSessionAnswerLabel: Record<PostSessionAnswer, string> = {
  aligned: 'Aligned',
  moved_away: 'No, I moved away from it',
  not_sure: 'Not sure',
}
