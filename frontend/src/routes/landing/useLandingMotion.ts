import { useEffect, type RefObject } from 'react'
import { reducedMotion, EASE_GSAP } from '../../lib/motion'

/**
 * Lenis smooth scroll driven by gsap's ticker, one hero intro, and once-only
 * reveals on section heads. Everything is dynamically imported so the first
 * paint never waits on the motion bundle. Reduced motion skips all of it.
 */
export function useLandingMotion(root: RefObject<HTMLElement | null>, onIntroDone: () => void) {
  useEffect(() => {
    const el = root.current
    if (!el) return

    if (reducedMotion) {
      onIntroDone()
      return
    }

    let cancelled = false
    let cleanup: (() => void) | null = null
    // If the motion chunk never arrives, show everything rather than a blank page.
    const failsafe = window.setTimeout(() => {
      document.documentElement.classList.remove('js-motion')
      onIntroDone()
    }, 4000)

    void (async () => {
      const [{ default: gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
        import('lenis'),
      ])
      if (cancelled) return
      window.clearTimeout(failsafe)
      gsap.registerPlugin(ScrollTrigger)

      const lenis = new Lenis({ lerp: 0.08, autoRaf: false, smoothWheel: true })
      lenis.on('scroll', ScrollTrigger.update)
      const tick = (time: number) => lenis.raf(time * 1000)
      gsap.ticker.add(tick)
      gsap.ticker.lagSmoothing(0)

      const ctx = gsap.context(() => {
        // hero intro
        const heroTargets = el.querySelectorAll<HTMLElement>('[data-hero]')
        const words = el.querySelectorAll<HTMLElement>('.hero-word')
        const rest = Array.from(heroTargets).filter((n) => !n.classList.contains('hero-word'))
        const wires = el.querySelectorAll<SVGPathElement>('.hero-canvas .wire')

        gsap.set(words, { yPercent: 110, opacity: 1 })
        gsap.set(rest, { y: 18 })

        const intro = gsap.timeline({
          defaults: { ease: EASE_GSAP },
          onComplete: () => {
            if (!cancelled) onIntroDone()
          },
        })
        intro
          .to(words, { yPercent: 0, duration: 0.9, stagger: 0.055 }, 0)
          .to(rest, { opacity: 1, y: 0, duration: 0.8, stagger: 0.12 }, 0.35)
          .to(wires, { strokeDashoffset: 0, duration: 1.1, stagger: 0.045, ease: 'power2.inOut' }, 0.9)

        // section heads and grouped bodies reveal once
        el.querySelectorAll<HTMLElement>('[data-reveal]').forEach((node) => {
          gsap.from(node, {
            opacity: 0,
            y: 24,
            duration: 0.7,
            ease: EASE_GSAP,
            scrollTrigger: { trigger: node, start: 'top 82%', once: true },
          })
        })
        el.querySelectorAll<HTMLElement>('[data-reveal-stagger]').forEach((group) => {
          gsap.from(group.children, {
            opacity: 0,
            y: 20,
            duration: 0.7,
            stagger: 0.09,
            ease: EASE_GSAP,
            scrollTrigger: { trigger: group, start: 'top 80%', once: true },
          })
        })

        // one scrubbed parallax: the nebula behind the hero
        const nebula = el.querySelector('.hero-nebula')
        const hero = el.querySelector('#top')
        if (nebula && hero) {
          gsap.to(nebula, {
            yPercent: 28,
            ease: 'none',
            scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
          })
        }
      }, el)

      cleanup = () => {
        ctx.revert()
        gsap.ticker.remove(tick)
        lenis.destroy()
      }
    })().catch(() => {
      window.clearTimeout(failsafe)
      document.documentElement.classList.remove('js-motion')
      onIntroDone()
    })

    return () => {
      cancelled = true
      window.clearTimeout(failsafe)
      cleanup?.()
    }
  }, [root, onIntroDone])
}
