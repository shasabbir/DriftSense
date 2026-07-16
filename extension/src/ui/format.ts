import type { DeclaredIntention, SessionRecord } from '../shared/types'

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.max(0, Math.round(seconds))}s`
  const minutes = Math.floor(seconds / 60)
  const remaining = Math.round(seconds % 60)
  if (minutes < 60) return remaining ? `${minutes}m ${remaining}s` : `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

export function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

export function intentionLabel(value: DeclaredIntention | null): string {
  if (!value) return 'Not provided'
  return {
    specific_information: 'Specific information',
    intentional_break: 'Intentional break',
    boredom: 'Boredom',
    avoiding_work: 'Avoiding work',
    accidental_click: 'Accidental click',
  }[value]
}

export function sessionOutcome(session: Pick<SessionRecord, 'driftLabel' | 'postSessionAnswer' | 'status'>): string {
  if (session.driftLabel === 1) return 'Drift'
  if (session.driftLabel === 0) return 'Aligned'
  if (session.postSessionAnswer === 'continue_intentionally') return 'Continued'
  if (session.postSessionAnswer === 'save_for_later') return 'Deferred'
  if (session.status === 'active') return 'Active'
  return 'Unlabeled'
}
