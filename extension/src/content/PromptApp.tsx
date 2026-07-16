import { useState } from 'react'
import { ArrowRight, Check, Clock3, Database, ShieldCheck, X } from 'lucide-react'
import { INTENTION_OPTIONS } from '../shared/constants'
import { sendRuntimeMessage } from '../shared/runtime'
import type { DeclaredIntention, PostSessionAnswer } from '../shared/types'

interface PromptAppProps {
  initialMode: 'intention' | 'hidden'
  sessionId: string
  domain: string
  onIntentionCaptured: () => void
  onClose: () => void
  reflectionSignal: number
}

export function PromptApp({
  initialMode,
  sessionId,
  domain,
  onIntentionCaptured,
  onClose,
  reflectionSignal,
}: PromptAppProps) {
  const [mode, setMode] = useState<'intention' | 'reflection' | 'hidden'>(initialMode)
  const [lastSignal, setLastSignal] = useState(reflectionSignal)
  const [intention, setIntention] = useState<DeclaredIntention | null>(null)
  const [duration, setDuration] = useState('10')
  const [submitting, setSubmitting] = useState(false)

  if (reflectionSignal !== lastSignal) {
    setLastSignal(reflectionSignal)
    setMode('reflection')
  }

  if (mode === 'hidden') return null

  const submitIntention = async () => {
    if (!intention) return
    setSubmitting(true)
    const parsedDuration = Number.parseInt(duration, 10)
    await sendRuntimeMessage({
      type: 'SUBMIT_INTENTION',
      sessionId,
      intention,
      intendedDurationMinutes: Number.isFinite(parsedDuration) ? Math.min(120, Math.max(1, parsedDuration)) : null,
    })
    setSubmitting(false)
    setMode('hidden')
    onIntentionCaptured()
  }

  const skip = async () => {
    await sendRuntimeMessage({ type: 'SKIP_INTENTION', sessionId })
    setMode('hidden')
    onClose()
  }

  const answerReflection = async (answer: PostSessionAnswer) => {
    setSubmitting(true)
    await sendRuntimeMessage({ type: 'SUBMIT_REFLECTION', sessionId, answer })
    setSubmitting(false)
    setMode('hidden')
    onClose()
  }

  return (
    <div className="ds-overlay" role="dialog" aria-modal="true" aria-label="DriftSense session reflection">
      <section className="ds-dialog">
        <header className="ds-header">
          <div className="ds-brand"><span className="ds-brand-mark"><Database size={17} /></span>DriftSense</div>
          <span className="ds-privacy"><ShieldCheck size={14} /> Local only</span>
        </header>

        {mode === 'intention' ? (
          <>
            <div className="ds-copy">
              <span className="ds-domain">{domain}</span>
              <h1>What brings you here?</h1>
              <p>A quick intention helps connect this visit with your reflection later.</p>
            </div>
            <div className="ds-options">
              {INTENTION_OPTIONS.map((option) => (
                <button
                  className={intention === option.value ? 'ds-option ds-option-selected' : 'ds-option'}
                  key={option.value}
                  onClick={() => setIntention(option.value)}
                  type="button"
                >
                  <span><strong>{option.label}</strong><small>{option.hint}</small></span>
                  <span className="ds-radio">{intention === option.value && <Check size={14} />}</span>
                </button>
              ))}
            </div>
            <label className="ds-duration">
              <span><Clock3 size={16} /> Intended visit length</span>
              <span className="ds-duration-input"><input min="1" max="120" inputMode="numeric" value={duration} onChange={(event) => setDuration(event.target.value)} /> min</span>
            </label>
            <footer className="ds-actions">
              <button className="ds-text-button" type="button" onClick={skip}><X size={16} /> Skip this session</button>
              <button className="ds-primary" disabled={!intention || submitting} type="button" onClick={submitIntention}>Begin visit <ArrowRight size={17} /></button>
            </footer>
          </>
        ) : (
          <>
            <div className="ds-copy ds-reflection-copy">
              <span className="ds-kicker">Session reflection</span>
              <h1>Did this visit match your original intention?</h1>
              <p>Your answer is a self-report. DriftSense does not infer attention or intent.</p>
            </div>
            <div className="ds-reflection-grid">
              <button type="button" onClick={() => answerReflection('yes_matched')}><strong>Yes, it matched</strong><small>I stayed with the reason I came</small></button>
              <button type="button" onClick={() => answerReflection('no_drifted')}><strong>No, I drifted</strong><small>The visit moved away from my intention</small></button>
              <button type="button" onClick={() => answerReflection('continue_intentionally')}><strong>Continue intentionally</strong><small>I still want to be here</small></button>
              <button type="button" onClick={() => answerReflection('save_for_later')}><strong>Save for later</strong><small>I will return another time</small></button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
