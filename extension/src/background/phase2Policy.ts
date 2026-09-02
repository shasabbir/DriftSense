export type Phase2Assignment = 'intervention' | 'silent_control'

export type Phase2HistoryRow = {
  cutoffSeconds: number
  triggered: boolean
  assignment: Phase2Assignment | null
}

export function hasPhase2Assignment(rows: Phase2HistoryRow[]): boolean {
  return rows.some((row) => row.assignment !== null)
}

export function consecutivePositiveScoreCount(rows: Phase2HistoryRow[], currentCutoffSeconds: number): number {
  let count = 1
  let expectedCutoff = currentCutoffSeconds - 60
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index]
    if (row.cutoffSeconds !== expectedCutoff || !row.triggered) break
    count += 1
    expectedCutoff -= 60
  }
  return count
}

export function phase2Assignment(randomValue: number, promptProbability: number): Phase2Assignment {
  const probability = Math.max(0, Math.min(1, promptProbability))
  return randomValue < probability ? 'intervention' : 'silent_control'
}

export function canDeliverPhase2Prompt(assignment: Phase2Assignment, deliveredToday: number, dailyCap: number): boolean {
  return assignment === 'intervention' && deliveredToday < Math.max(0, dailyCap)
}
