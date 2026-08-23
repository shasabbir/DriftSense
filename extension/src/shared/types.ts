export type DomainCategory = 'video' | 'social' | 'news' | 'shopping' | 'learning' | 'work' | 'other'

export type TaskType = 'writing_creating' | 'coding_problem_solving' | 'reading_research' | 'learning_tutorial' | 'communication_coordination' | 'other_planned_task'
export type StudyCondition = 'phase_1_observational'
export type DriftLabel = 0 | 1 | null
export type SessionStatus = 'active' | 'pending_reflection' | 'completed' | 'abandoned'
export type PostSessionAnswer = 'aligned' | 'moved_away' | 'not_sure'
export type ReflectionAction = 'dismissed' | 'remind_later' | null

export interface MonitoredDomain { domain: string; category: DomainCategory; enabled: boolean; createdAt: string }

export interface AppSettings {
  schemaVersion: 3
  domainPresetsVersion: 3
  participantId: string
  consentAccepted: boolean
  consentedAt: string | null
  monitoringEnabled: boolean
  studyStage: 'phase_1_collection'
  condition: StudyCondition
  monitoredDomains: MonitoredDomain[]
  activityWindowSeconds: 10
  idleThresholdSeconds: number
  onboardingComplete: boolean
}

export interface SessionRecord {
  sessionId: string
  protocolVersion: 3
  anonymousUserId: string
  studyStage: 'phase_1_collection'
  condition: StudyCondition
  taskType: TaskType
  intendedDurationMinutes: number | null
  taskSites: string[]
  initialTaskSite: string
  startTime: string
  endTime: string | null
  durationSeconds: number
  clickCount: number
  scrollCount: number
  keyboardActivityCount: number
  idleSeconds: number
  activeSeconds: number
  awaySeconds: number
  tabFocusLossCount: number
  tabSwitchCount: number
  videoPlayingSeconds: number
  reflectionRequestedAt: string | null
  reflectionAction: ReflectionAction
  postSessionAnswer: PostSessionAnswer | null
  driftLabel: DriftLabel
  status: SessionStatus
  labelSource: 'post_session_self_report' | null
  createdAt: string
  updatedAt: string
}

export interface ModelingSessionRecord {
  session_id: string; participant_id: string; start_time: string; task_type: TaskType
  intended_duration_minutes: number | null; initial_task_site: string; task_site_count: number
  duration_seconds: number; click_count: number; scroll_count: number; keyboard_activity_count: number
  idle_seconds: number; active_seconds: number; away_seconds: number; tab_switch_count: number
  video_playing_seconds: number; post_session_answer: PostSessionAnswer | null; drift_label: DriftLabel
}

export interface InternalSession extends SessionRecord {
  activeTabId: number | null
  currentContext: 'task_site' | 'away'
  contextChangedAt: string
  lastWindowAt: string | null
  contextEvents: ContextEvent[]
}

export interface ContextEvent { timestampOffsetSeconds: number; previousContext: 'task_site' | 'away'; nextContext: 'task_site' | 'away'; previousContextSeconds: number; tabSwitched: boolean }
export interface CheckpointSnapshot { sessionId: string; anonymousUserId: string; cutoffSeconds: 180 | 300 | 600; capturedAt: string; observable: boolean; clickCount: number; scrollCount: number; keyboardActivityCount: number; idleSeconds: number; activeSeconds: number; awaySeconds: number; tabSwitchCount: number; videoPlayingSeconds: number }

export interface ActivityWindow {
  windowId: string; sessionId: string; anonymousUserId: string; timestamp: string; timestampOffsetSeconds: number
  windowDurationSeconds: number; clicksInWindow: number; scrollEventsInWindow: number; keyboardActivityInWindow: number
  idleInWindow: boolean; tabFocused: boolean; videoPlaying: boolean; taskSiteHostname: string
}
export interface ActivityWindowInput {
  domain: string; observedAt: string; windowDurationSeconds: number; clicksInWindow: number; scrollEventsInWindow: number
  keyboardActivityInWindow: number; idleInWindow: boolean; tabFocused: boolean; videoPlaying: boolean
}
export interface StoredData { settings: AppSettings; sessions: InternalSession[]; activityWindows: ActivityWindow[]; checkpointSnapshots: CheckpointSnapshot[] }

export type RuntimeRequest =
  | { type: 'GET_PAGE_CONTEXT'; domain: string }
  | { type: 'START_TASK_SESSION'; tabId?: number; domain: string; taskType: TaskType; intendedDurationMinutes: number | null }
  | { type: 'RECORD_ACTIVITY_WINDOW'; sessionId: string; window: ActivityWindowInput }
  | { type: 'SUBMIT_REFLECTION'; sessionId: string; answer: PostSessionAnswer }
  | { type: 'REQUEST_REFLECTION'; sessionId: string }
  | { type: 'DISMISS_REFLECTION'; sessionId: string; action: Exclude<ReflectionAction, null> }
  | { type: 'SET_MONITORING'; enabled: boolean }
  | { type: 'SYNC_COLLECTOR' }
  | { type: 'GET_POPUP_STATE' }

export interface PageContextResponse {
  monitored: boolean
  reason?: 'consent_required' | 'monitoring_paused' | 'domain_not_approved' | 'no_active_task'
  session?: InternalSession
  idleThresholdSeconds?: number
  activityWindowSeconds?: number
}
