export const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const DUR = {
  hover: 0.12,
  state: 0.2,
  enter: 0.32,
  orchestrated: 0.9,
} as const

export const EASE_GSAP = 'power3.out'
