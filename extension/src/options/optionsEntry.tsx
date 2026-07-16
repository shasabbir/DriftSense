import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { OptionsApp } from './OptionsApp'
import '../ui/styles.css'
import './options.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OptionsApp />
  </StrictMode>,
)
