export type Phase2Assignment = 'intervention' | 'silent_control'

export type Phase2HistoryRow = {
  cutoffSeconds: number
  triggered: boolean
  assignment: Phase2Assignment | null
  alertWindow?: number | null
}

export type DurationAlertWindow = {
  index: number
  startMinute: number
  endMinute: number
}

export function durationAlertWindows(intendedDurationMinutes: number | null): DurationAlertWindow[] {
  if (!intendedDurationMinutes || intendedDurationMinutes < 1) return []
  const duration = Math.round(intendedDurationMinutes)
  const starts = [Math.max(3, Math.ceil(duration / 3))]
  if (duration >= 30) starts.push(Math.ceil((duration * 2) / 3))
  return [...new Set(starts)].map((startMinute, index) => ({
    index: index + 1,
    startMinute,
    endMinute: Math.min(duration, startMinute + 2),
  }))
}

export function predictionOffsetsForDuration(intendedDurationMinutes: number | null): number[] {
  return durationAlertWindows(intendedDurationMinutes).flatMap((window) =>
    Array.from({ length: window.endMinute - window.startMinute + 1 }, (_, index) => (window.startMinute + index) * 60),
  )
}

export function alertWindowForCutoff(intendedDurationMinutes: number | null, cutoffSeconds: number): DurationAlertWindow | null {
  return durationAlertWindows(intendedDurationMinutes).find((window) => cutoffSeconds >= window.startMinute * 60 && cutoffSeconds <= window.endMinute * 60) ?? null
}

export function existingPhase2Assignment(rows: Phase2HistoryRow[]): Phase2Assignment | null {
  return rows.find((row) => row.assignment !== null)?.assignment ?? null
}

export function alertWindowAlreadyDecided(rows: Phase2HistoryRow[], alertWindow: number): boolean {
  return rows.some((row) => row.assignment !== null && (row.alertWindow ?? 1) === alertWindow)
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
