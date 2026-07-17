import type { AppSettings, MonitoredDomain } from './types'

export const STORAGE_KEYS = {
  settings: 'driftsense_settings',
  sessions: 'driftsense_sessions',
  activityWindows: 'driftsense_activity_windows',
} as const

export const DOMAIN_PRESETS_VERSION = 2 as const

export const DEFAULT_DOMAINS: MonitoredDomain[] = [
  { domain: 'wikipedia.org', category: 'learning', enabled: false, createdAt: new Date(0).toISOString() },
  { domain: 'scholar.google.com', category: 'learning', enabled: false, createdAt: new Date(0).toISOString() },
  { domain: 'coursera.org', category: 'learning', enabled: false, createdAt: new Date(0).toISOString() },
  { domain: 'github.com', category: 'work', enabled: false, createdAt: new Date(0).toISOString() },
  { domain: 'stackoverflow.com', category: 'work', enabled: false, createdAt: new Date(0).toISOString() },
  { domain: 'linkedin.com', category: 'work', enabled: false, createdAt: new Date(0).toISOString() },
  { domain: 'youtube.com', category: 'video', enabled: false, createdAt: new Date(0).toISOString() },
  { domain: 'reddit.com', category: 'social', enabled: false, createdAt: new Date(0).toISOString() },
  { domain: 'facebook.com', category: 'social', enabled: false, createdAt: new Date(0).toISOString() },
  { domain: 'instagram.com', category: 'social', enabled: false, createdAt: new Date(0).toISOString() },
]

export const INTENTION_OPTIONS = [
  { value: 'work_or_study', label: 'Work or study task', hint: 'Complete a planned work or study task' },
  { value: 'learning_or_tutorial', label: 'Learning or tutorial', hint: 'Learn a topic or follow a tutorial' },
  { value: 'specific_information', label: 'Specific information', hint: 'Find or verify something specific' },
  { value: 'communication_or_community', label: 'Communication or community', hint: 'Reply, participate, or connect with others' },
  { value: 'planned_entertainment_or_break', label: 'Planned entertainment or break', hint: 'Take a deliberate break with a clear end' },
  { value: 'open_ended_browsing', label: 'Open-ended browsing', hint: 'Explore without a specific destination' },
  { value: 'accidental_open', label: 'Opened accidentally', hint: 'This visit was not planned' },
] as const

export const DOMAIN_CATEGORIES = ['video', 'social', 'news', 'shopping', 'learning', 'work', 'other'] as const

const WORK_LEARNING_CATEGORIES = new Set(['learning', 'work'])

export function assessDomainCoverage(domains: MonitoredDomain[]) {
  const enabled = domains.filter((item) => item.enabled)
  const workLearningCount = enabled.filter((item) => WORK_LEARNING_CATEGORIES.has(item.category)).length
  const mixedUseCount = enabled.length - workLearningCount
  return {
    enabledCount: enabled.length,
    workLearningCount,
    mixedUseCount,
    categoryCount: new Set(enabled.map((item) => item.category)).size,
    balanced: workLearningCount > 0 && mixedUseCount > 0,
  }
}

export function migrateDomainPresets(settings: AppSettings): AppSettings {
  if (settings.domainPresetsVersion === DOMAIN_PRESETS_VERSION && settings.schemaVersion === 2) return settings
  const existing = new Set(settings.monitoredDomains.map((item) => item.domain))
  const createdAt = new Date().toISOString()
  const additions = DEFAULT_DOMAINS
    .filter((item) => !existing.has(item.domain))
    .map((item) => ({ ...item, enabled: false, createdAt }))
  return {
    ...settings,
    schemaVersion: 2,
    domainPresetsVersion: DOMAIN_PRESETS_VERSION,
    monitoredDomains: [...settings.monitoredDomains, ...additions],
  }
}

export function createParticipantId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()
  return `DS-${token.slice(0, 6)}-${token.slice(6)}`
}

export function normalizeParticipantId(input: string): string | null {
  const normalized = input.trim().toUpperCase()
  return /^[A-Z0-9][A-Z0-9_-]{1,23}$/.test(normalized) ? normalized : null
}

export function createDefaultSettings(): AppSettings {
  return {
    schemaVersion: 2,
    domainPresetsVersion: DOMAIN_PRESETS_VERSION,
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
