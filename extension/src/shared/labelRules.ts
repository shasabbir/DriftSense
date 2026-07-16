import type { DriftLabel, PostSessionAnswer } from './types'

export function driftLabelForAnswer(answer: PostSessionAnswer): DriftLabel {
  if (answer === 'yes_matched') return 0
  if (answer === 'no_drifted') return 1
  return null
}

export const postSessionAnswerLabel: Record<PostSessionAnswer, string> = {
  yes_matched: 'Yes, it matched',
  no_drifted: 'No, I drifted',
  continue_intentionally: 'Continue intentionally',
  save_for_later: 'Save for later',
}
