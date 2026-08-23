import type { AppSettings, MonitoredDomain } from './types'

// Phase 1 protocol records use new keys so superseded visit data is preserved
// but cannot be silently mixed into the revised dataset.
export const STORAGE_KEYS = { settings: 'driftsense_settings', sessions: 'driftsense_phase1_sessions_v3', activityWindows: 'driftsense_phase1_activity_windows_v3', checkpointSnapshots: 'driftsense_phase1_checkpoints_v3' } as const
export const DOMAIN_PRESETS_VERSION = 3 as const
export const DEFAULT_DOMAINS: MonitoredDomain[] = [
  { domain: 'wikipedia.org', category: 'learning', enabled: false, createdAt: new Date(0).toISOString() },
  { domain: 'scholar.google.com', category: 'learning', enabled: false, createdAt: new Date(0).toISOString() },
  { domain: 'coursera.org', category: 'learning', enabled: false, createdAt: new Date(0).toISOString() },
  { domain: 'github.com', category: 'work', enabled: false, createdAt: new Date(0).toISOString() },
  { domain: 'stackoverflow.com', category: 'work', enabled: false, createdAt: new Date(0).toISOString() },
  { domain: 'youtube.com', category: 'video', enabled: false, createdAt: new Date(0).toISOString() },
]
export const TASK_TYPE_OPTIONS = [
  { value: 'writing_creating', label: 'Writing or creating', hint: 'Draft, design, edit, or produce something' },
  { value: 'coding_problem_solving', label: 'Coding or problem solving', hint: 'Build, debug, calculate, or solve' },
  { value: 'reading_research', label: 'Reading or research', hint: 'Read, compare, collect, or verify information' },
  { value: 'learning_tutorial', label: 'Learning or tutorial', hint: 'Study a topic or follow guided material' },
  { value: 'communication_coordination', label: 'Communication or coordination', hint: 'Message, meet, plan, or organize' },
  { value: 'other_planned_task', label: 'Other planned task', hint: 'A planned browser task not listed above' },
] as const
export const DOMAIN_CATEGORIES = ['video', 'social', 'news', 'shopping', 'learning', 'work', 'other'] as const

export function assessDomainCoverage(domains: MonitoredDomain[]) {
  const enabled = domains.filter((item) => item.enabled)
  return { enabledCount: enabled.length, workLearningCount: enabled.length, mixedUseCount: enabled.filter((x) => !['work', 'learning'].includes(x.category)).length, categoryCount: new Set(enabled.map((x) => x.category)).size, balanced: enabled.length > 0 }
}
export function createParticipantId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()
  return `DS-${token.slice(0, 6)}-${token.slice(6)}`
}
export function createDefaultSettings(): AppSettings {
  return { schemaVersion: 3, domainPresetsVersion: 3, participantId: createParticipantId(), consentAccepted: false, consentedAt: null, monitoringEnabled: false, studyStage: 'phase_1_collection', condition: 'phase_1_observational', monitoredDomains: DEFAULT_DOMAINS.map((item) => ({ ...item, createdAt: new Date().toISOString() })), activityWindowSeconds: 10, idleThresholdSeconds: 30, onboardingComplete: false }
}
export function migrateDomainPresets(settings: AppSettings): AppSettings {
  if (settings.schemaVersion === 3 && settings.domainPresetsVersion === 3) return settings
  const raw = settings as unknown as Record<string, unknown>
  const existingDomains = Array.isArray(raw.monitoredDomains) ? raw.monitoredDomains as MonitoredDomain[] : []
  const existing = new Set(existingDomains.map((item) => item.domain))
  const defaults = createDefaultSettings()
  return { ...defaults, participantId: typeof raw.participantId === 'string' ? raw.participantId : defaults.participantId, consentAccepted: Boolean(raw.consentAccepted), consentedAt: typeof raw.consentedAt === 'string' ? raw.consentedAt : null, monitoringEnabled: Boolean(raw.monitoringEnabled), onboardingComplete: Boolean(raw.onboardingComplete), idleThresholdSeconds: typeof raw.idleThresholdSeconds === 'number' ? raw.idleThresholdSeconds : 30, monitoredDomains: [...existingDomains, ...DEFAULT_DOMAINS.filter((item) => !existing.has(item.domain)).map((item) => ({ ...item, createdAt: new Date().toISOString() }))] }
}
