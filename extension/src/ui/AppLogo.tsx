import { Activity } from 'lucide-react'

export function AppLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="app-logo" aria-label="DriftSense">
      <span className="app-logo-mark"><Activity size={compact ? 15 : 18} strokeWidth={2.2} /></span>
      {!compact && <span>DriftSense</span>}
    </div>
  )
}
