export type Phase2Assignment = 'intervention' | 'silent_control'
export type DeliveryPolicy = 'randomized_capped' | 'technical_pilot_always_deliver'

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

export const ALERT_REPEAT_SECONDS = 10
export const ALERT_MAX_CYCLES = 5
export const ALERT_AUTO_STOP_SECONDS = (ALERT_MAX_CYCLES - 1) * ALERT_REPEAT_SECONDS + 1

export function durationAlertWindows(intendedDurationMinutes: number | null): DurationAlertWindow[] {
  if (!intendedDurationMinutes || intendedDurationMinutes < 1) return []
  const duration = Math.round(intendedDurationMinutes)
  const interval = duration <= 20 ? 5 : 10
  const checkpoints = Array.from({ length: Math.floor(duration / interval) }, (_, index) => (index + 1) * interval)
  return checkpoints.map((startMinute, index) => ({
    index: index + 1,
    startMinute,
    endMinute: startMinute,
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

export function phase2Assignment(randomValue: number, promptProbability: number): Phase2Assignment {
  const probability = Math.max(0, Math.min(1, promptProbability))
  return randomValue < probability ? 'intervention' : 'silent_control'
}

export function assignmentForDeliveryPolicy(existing: Phase2Assignment | null, policy: DeliveryPolicy, randomValue: number, promptProbability: number): Phase2Assignment {
  if (existing) return existing
  return policy === 'technical_pilot_always_deliver' ? 'intervention' : phase2Assignment(randomValue, promptProbability)
}

export function canDeliverPhase2Prompt(assignment: Phase2Assignment, deliveredToday: number, dailyCap: number, policy: DeliveryPolicy = 'randomized_capped'): boolean {
  return assignment === 'intervention' && (policy === 'technical_pilot_always_deliver' || deliveredToday < Math.max(0, dailyCap))
}
