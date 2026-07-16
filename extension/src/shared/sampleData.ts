import { getSettings, setActivityWindows, setSessions } from './storage'
import type { ActivityWindow, DeclaredIntention, InternalSession } from './types'

const domains = [
  ['youtube.com', 'video'],
  ['reddit.com', 'social'],
  ['linkedin.com', 'social'],
] as const
const intentions: DeclaredIntention[] = ['specific_information', 'intentional_break', 'boredom', 'avoiding_work']

export async function seedSyntheticData(): Promise<void> {
  const settings = await getSettings()
  const sessions: InternalSession[] = []
  const windows: ActivityWindow[] = []
  const now = Date.now()

  for (let index = 0; index < 18; index += 1) {
    const [domain, category] = domains[index % domains.length]
    const start = new Date(now - index * 7.5 * 60 * 60 * 1000)
    const duration = 180 + (index % 6) * 95
    const drift = index % 4 === 1 || index % 7 === 0
    const sessionId = `demo_session_${index + 1}`
    const end = new Date(start.getTime() + duration * 1000)
    sessions.push({
      sessionId,
      anonymousUserId: settings.participantId,
      studyStage: 'stage_1_training',
      condition: 'static_intention_prompt',
      domain,
      domainCategory: category,
      declaredIntention: intentions[index % intentions.length],
      intendedDurationMinutes: 5 + (index % 3) * 5,
      intentionCapturedAt: start.toISOString(),
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      durationSeconds: duration,
      clickCount: 4 + index * 2,
      scrollCount: 8 + index * 5,
      keyboardActivityCount: index % 5,
      idleSeconds: (index % 4) * 10,
      activeSeconds: Math.max(0, duration - (index % 4) * 10),
      tabFocusLossCount: index % 4,
      tabSwitchCount: index % 4,
      videoPlayingSeconds: domain === 'youtube.com' ? Math.round(duration * 0.7) : 0,
      checkinCount: 1,
      postSessionAnswer: drift ? 'no_drifted' : 'yes_matched',
      driftLabel: drift ? 1 : 0,
      actualDurationSeconds: duration,
      status: 'completed',
      labelSource: 'post_session_self_report',
      createdAt: start.toISOString(),
      updatedAt: end.toISOString(),
      tabId: -(index + 1),
      lastWindowAt: end.toISOString(),
      reflectionRequestedAt: end.toISOString(),
    })

    for (let offset = 10; offset <= Math.min(duration, 180); offset += 10) {
      windows.push({
        windowId: `demo_window_${index}_${offset}`,
        sessionId,
        anonymousUserId: settings.participantId,
        timestamp: new Date(start.getTime() + offset * 1000).toISOString(),
        timestampOffsetSeconds: offset,
        windowDurationSeconds: 10,
        clicksInWindow: offset % 30 === 0 ? 1 : 0,
        scrollEventsInWindow: drift ? 3 : 1,
        keyboardActivityInWindow: 0,
        idleInWindow: false,
        tabFocused: true,
        videoPlaying: domain === 'youtube.com',
        urlDomainOnly: domain,
      })
    }
  }

  await Promise.all([setSessions(sessions), setActivityWindows(windows)])
}
