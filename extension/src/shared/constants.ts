import type { AppSettings, MonitoredDomain } from './types'

export const STORAGE_KEYS = {
  settings: 'driftsense_settings',
  sessions: 'driftsense_sessions',
  activityWindows: 'driftsense_activity_windows',
} as const

export const DEFAULT_DOMAINS: MonitoredDomain[] = [
  { domain: 'youtube.com', category: 'video', enabled: true, createdAt: new Date(0).toISOString() },
  { domain: 'facebook.com', category: 'social', enabled: true, createdAt: new Date(0).toISOString() },
  { domain: 'reddit.com', category: 'social', enabled: true, createdAt: new Date(0).toISOString() },
  { domain: 'instagram.com', category: 'social', enabled: true, createdAt: new Date(0).toISOString() },
  { domain: 'x.com', category: 'social', enabled: true, createdAt: new Date(0).toISOString() },
  { domain: 'linkedin.com', category: 'social', enabled: true, createdAt: new Date(0).toISOString() },
]

export const INTENTION_OPTIONS = [
  { value: 'specific_information', label: 'Specific information', hint: 'Find or verify something specific' },
  { value: 'intentional_break', label: 'Intentional break', hint: 'A deliberate pause with a clear end' },
  { value: 'boredom', label: 'Boredom', hint: 'Opening without a specific task' },
  { value: 'avoiding_work', label: 'Avoiding work', hint: 'Putting off something else' },
  { value: 'accidental_click', label: 'Accidental click', hint: 'This was not a planned visit' },
] as const

export const DOMAIN_CATEGORIES = ['video', 'social', 'news', 'shopping', 'learning', 'work', 'other'] as const

export function createParticipantId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()
  return `DS-${token.slice(0, 6)}-${token.slice(6)}`
}

export function createDefaultSettings(): AppSettings {
  return {
    schemaVersion: 1,
    participantId: createParticipantId(),
    consentAccepted: false,
    consentedAt: null,
    monitoringEnabled: false,
    studyStage: 'stage_1_training',
    condition: 'static_intention_prompt',
    monitoredDomains: DEFAULT_DOMAINS.map((item) => ({ ...item, createdAt: new Date().toISOString() })),
    activityWindowSeconds: 10,
    idleThresholdSeconds: 30,
    reflectionAfterMinutes: 5,
    onboardingComplete: false,
  }
}
