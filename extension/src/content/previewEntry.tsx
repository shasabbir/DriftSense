import { createRoot } from 'react-dom/client'
import { PromptApp } from './PromptApp'
import { promptStyles } from './promptStyles'

const host = document.getElementById('root')!
const shadow = host.attachShadow({ mode: 'open' })
const style = document.createElement('style')
style.textContent = promptStyles
const mount = document.createElement('div')
shadow.append(style, mount)

const previewMode = new URLSearchParams(window.location.search).get('mode') === 'reflection'
  ? 'reflection'
  : 'intention'

createRoot(mount).render(
  <PromptApp
    initialMode={previewMode}
    sessionId="preview-session"
    domain="youtube.com"
    reflectionSignal={0}
    onIntentionCaptured={() => undefined}
    onClose={() => undefined}
  />,
)
