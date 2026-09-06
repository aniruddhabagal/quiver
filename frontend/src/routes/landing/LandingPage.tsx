import { useCallback, useRef, useState } from 'react'
import { Nav } from './sections/Nav'
import { Hero } from './sections/Hero'
import { ProblemStrip } from './sections/ProblemStrip'
import { HowItWorks } from './sections/HowItWorks'
import { Guardrails } from './sections/Guardrails'
import { LiveVersioned } from './sections/LiveVersioned'
import { Overload } from './sections/Overload'
import { Cta } from './sections/Cta'
import { Footer } from './sections/Footer'
import { useLandingMotion } from './useLandingMotion'
import { Backdrop } from './ambient/Backdrop'
import { Ambient } from './ambient/Ambient'
import './landing.css'
import './ambient/ambient.css'

export function LandingPage() {
  const root = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const onIntroDone = useCallback(() => setActive(true), [])
  useLandingMotion(root, onIntroDone)

  return (
    <div ref={root} className="landing">
      <Backdrop />
      <Ambient />
      <Nav />
      <main>
        <Hero active={active} />
        <ProblemStrip />
        <HowItWorks />
        <Guardrails />
        <LiveVersioned />
        <Overload />
        <Cta />
      </main>
      <Footer />
    </div>
  )
}
