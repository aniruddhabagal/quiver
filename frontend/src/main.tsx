import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'lenis/dist/lenis.css'
import './styles/index.css'
import { reducedMotion } from './lib/motion'
import App from './App'

// Mark the document before first paint so intro targets start hidden and
// the motion hook can animate them in. Reduced-motion users never see this.
if (!reducedMotion) document.documentElement.classList.add('js-motion')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
