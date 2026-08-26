import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DeviceApp } from './DeviceApp'
import '../ui/styles.css'
import './device.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DeviceApp />
  </StrictMode>,
)
