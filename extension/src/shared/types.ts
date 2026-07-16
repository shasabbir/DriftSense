export type DomainCategory =
  | 'video'
  | 'social'
  | 'news'
  | 'shopping'
  | 'learning'
  | 'work'
  | 'other'

export type DeclaredIntention =
  | 'specific_information'
  | 'intentional_break'
  | 'boredom'
  | 'avoiding_work'
  | 'accidental_click'

export type StudyCondition = 'static_intention_prompt'
export type DriftLabel = 0 | 1 | null
export type SessionStatus = 'active' | 'completed' | 'abandoned'

export interface MonitoredDomain {
  domain: string
  category: DomainCategory
  enabled: boolean
  createdAt: string
}

export interface AppSettings {
  schemaVersion: 1
  participantId: string
  consentAccepted: boolean
  consentedAt: string | null
  monitoringEnabled: boolean
  studyStage: 'stage_1_training'
  condition: StudyCondition
  monitoredDomains: MonitoredDomain[]
  activityWindowSeconds: 10
  idleThresholdSeconds: number
  reflectionAfterMinutes: number
  onboardingComplete: boolean
}

export interface SessionRecord {
  sessionId: string
  anonymousUserId: string
  studyStage: 'stage_1_training'
  condition: StudyCondition
  domain: string
  domainCategory: DomainCategory
  declaredIntention: DeclaredIntention | null
  intendedDurationMinutes: number | null
  intentionCapturedAt: string | null
  startTime: string
  endTime: string | null
  durationSeconds: number
  clickCount: number
  scrollCount: number
  keyboardActivityCount: number
  idleSeconds: number
  activeSeconds: number
  tabFocusLossCount: number
  tabSwitchCount: number
  videoPlayingSeconds: number
  checkinCount: number
  postSessionAnswer: PostSessionAnswer | null
  driftLabel: DriftLabel
  actualDurationSeconds: number
  status: SessionStatus
  labelSource: 'post_session_self_report' | null
  createdAt: string
  updatedAt: string
}

export interface InternalSession extends SessionRecord {
  tabId: number
  lastWindowAt: string | null
  reflectionRequestedAt: string | null
}

export type PostSessionAnswer =
  | 'yes_matched'
  | 'no_drifted'
  | 'continue_intentionally'
  | 'save_for_later'

export interface ActivityWindow {
  windowId: string
  sessionId: string
  anonymousUserId: string
  timestamp: string
  timestampOffsetSeconds: number
  windowDurationSeconds: number
  clicksInWindow: number
  scrollEventsInWindow: number
  keyboardActivityInWindow: number
  idleInWindow: boolean
  tabFocused: boolean
  videoPlaying: boolean
  urlDomainOnly: string
}

export interface ActivityWindowInput {
  domain: string
  observedAt: string
  windowDurationSeconds: number
  clicksInWindow: number
  scrollEventsInWindow: number
  keyboardActivityInWindow: number
  idleInWindow: boolean
  tabFocused: boolean
  videoPlaying: boolean
}

export interface StoredData {
  settings: AppSettings
  sessions: InternalSession[]
  activityWindows: ActivityWindow[]
}

export type RuntimeRequest =
  | { type: 'GET_PAGE_CONTEXT'; domain: string }
  | { type: 'SUBMIT_INTENTION'; sessionId: string; intention: DeclaredIntention; intendedDurationMinutes: number | null }
  | { type: 'SKIP_INTENTION'; sessionId: string }
  | { type: 'RECORD_ACTIVITY_WINDOW'; sessionId: string; window: ActivityWindowInput }
  | { type: 'SUBMIT_REFLECTION'; sessionId: string; answer: PostSessionAnswer }
  | { type: 'REQUEST_REFLECTION'; sessionId: string }
  | { type: 'END_ACTIVE_SESSION'; tabId?: number }
  | { type: 'SET_MONITORING'; enabled: boolean }
  | { type: 'SYNC_COLLECTOR' }
  | { type: 'GET_POPUP_STATE' }

export interface PageContextResponse {
  monitored: boolean
  reason?: 'consent_required' | 'monitoring_paused' | 'domain_not_monitored'
  session?: InternalSession
  shouldPromptIntention?: boolean
  idleThresholdSeconds?: number
  activityWindowSeconds?: number
}
