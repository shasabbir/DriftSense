import { Database, ShieldCheck } from 'lucide-react'

export function PromptApp({ initialMode }: { initialMode: 'intention' | 'reflection' | 'hidden'; sessionId: string; domain: string; onIntentionCaptured: () => void; onClose: () => void; reflectionSignal: number }) {
  if (initialMode === 'hidden') return null
  return <div className="ds-overlay" role="dialog" aria-modal="true"><section className="ds-dialog"><header className="ds-header"><div className="ds-brand"><span className="ds-brand-mark"><Database size={17} /></span>DriftSense</div><span className="ds-privacy"><ShieldCheck size={14} /> Local only</span></header><div className="ds-copy ds-reflection-copy"><span className="ds-kicker">Phase 1 preview</span><h1>{initialMode === 'reflection' ? 'Did this session remain aligned with the task you started?' : 'Task sessions now start from the extension popup.'}</h1><p>No model-assisted mid-session prompt is shown during Phase 1.</p></div></section></div>
}
