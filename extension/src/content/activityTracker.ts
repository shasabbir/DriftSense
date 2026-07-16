import { sendRuntimeMessage } from '../shared/runtime'

interface TrackerOptions {
  sessionId: string
  domain: string
  windowSeconds: number
  idleThresholdSeconds: number
}

export function startActivityTracker(options: TrackerOptions): () => void {
  let clicks = 0
  let scrolls = 0
  let keyboardEvents = 0
  let lastActivityAt = Date.now()

  const markActive = () => {
    lastActivityAt = Date.now()
  }
  const onClick = () => {
    clicks += 1
    markActive()
  }
  const onScroll = () => {
    scrolls += 1
    markActive()
  }
  const onKeydown = () => {
    keyboardEvents += 1
    markActive()
  }
  const onPointerMove = () => markActive()

  document.addEventListener('click', onClick, { capture: true, passive: true })
  document.addEventListener('scroll', onScroll, { capture: true, passive: true })
  document.addEventListener('keydown', onKeydown, { capture: true })
  document.addEventListener('pointermove', onPointerMove, { capture: true, passive: true })

  const interval = window.setInterval(() => {
    const hasPlayingVideo = Array.from(document.querySelectorAll('video')).some(
      (video) => !video.paused && !video.ended && video.readyState > 2,
    )
    const payload = {
      domain: options.domain,
      observedAt: new Date().toISOString(),
      windowDurationSeconds: options.windowSeconds,
      clicksInWindow: clicks,
      scrollEventsInWindow: scrolls,
      keyboardActivityInWindow: keyboardEvents,
      idleInWindow: Date.now() - lastActivityAt >= options.idleThresholdSeconds * 1000,
      tabFocused: document.visibilityState === 'visible' && document.hasFocus(),
      videoPlaying: hasPlayingVideo,
    }
    clicks = 0
    scrolls = 0
    keyboardEvents = 0
    void sendRuntimeMessage({ type: 'RECORD_ACTIVITY_WINDOW', sessionId: options.sessionId, window: payload }).catch(() => undefined)
  }, options.windowSeconds * 1000)

  return () => {
    window.clearInterval(interval)
    document.removeEventListener('click', onClick, true)
    document.removeEventListener('scroll', onScroll, true)
    document.removeEventListener('keydown', onKeydown, true)
    document.removeEventListener('pointermove', onPointerMove, true)
  }
}
