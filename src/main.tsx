import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Dizayn tizimi shrifti: Manrope (interfeys, sarlavhalar, raqamlar)
import '@fontsource-variable/manrope'

import { App } from '@/app/App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
