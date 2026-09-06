import { useEffect, useRef } from 'react'
import { reducedMotion } from '../../../lib/motion'

interface Mote {
  x: number
  y: number
  r: number
  depth: number
  drift: number
  phase: number
  teal: boolean
}

/**
 * Fixed, full-page canvas behind everything: slow motes that parallax with
 * the scroll, and a soft spotlight that trails the pointer. Sections are
 * slightly translucent so this shows through their ground.
 */
export function Backdrop() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const fine = window.matchMedia('(pointer: fine)').matches
    const N = window.innerWidth < 768 ? 34 : 72
    const motes: Mote[] = Array.from({ length: N }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.6 + Math.random() * 1.4,
      depth: 0.25 + Math.random() * 0.75,
      drift: (Math.random() - 0.5) * 0.012,
      phase: Math.random() * Math.PI * 2,
      teal: Math.random() < 0.28,
    }))

    let w = 0
    let h = 0
    let scroll = window.scrollY
    let mx = -9999
    let my = -9999
    let sx = mx
    let sy = my
    let frame = 0

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const onScroll = () => {
      scroll = window.scrollY
    }
    const onMove = (e: MouseEvent) => {
      mx = e.clientX
      my = e.clientY
    }
    const onLeave = () => {
      mx = -9999
      my = -9999
    }

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h)

      if (fine && mx > -999) {
        sx += (mx - sx) * 0.12
        sy += (my - sy) * 0.12
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 340)
        g.addColorStop(0, 'rgba(124, 108, 255, 0.085)')
        g.addColorStop(0.45, 'rgba(124, 108, 255, 0.03)')
        g.addColorStop(1, 'rgba(124, 108, 255, 0)')
        ctx.fillStyle = g
        ctx.fillRect(sx - 340, sy - 340, 680, 680)
      }

      for (const m of motes) {
        if (!reducedMotion) m.y -= m.drift * 0.0009
        if (m.y < -0.02) m.y += 1.04
        if (m.y > 1.02) m.y -= 1.04
        const py = (((m.y * h - scroll * 0.14 * m.depth) % h) + h) % h
        const px = m.x * w + Math.sin(t * 0.00025 + m.phase) * 6 * m.depth
        const tw = reducedMotion ? 0.7 : 0.55 + 0.45 * Math.sin(t * 0.0011 + m.phase * 2)
        const a = (0.16 + 0.34 * tw) * m.depth
        ctx.fillStyle = m.teal ? `rgba(46, 230, 214, ${a.toFixed(3)})` : `rgba(167, 155, 255, ${a.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(px, py, m.r * (0.7 + m.depth * 0.5), 0, Math.PI * 2)
        ctx.fill()
      }

      if (!reducedMotion) frame = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('scroll', onScroll, { passive: true })
    if (fine) {
      window.addEventListener('mousemove', onMove, { passive: true })
      document.documentElement.addEventListener('mouseleave', onLeave)
    }

    if (reducedMotion) {
      draw(0)
      const redraw = () => draw(0)
      window.addEventListener('scroll', redraw, { passive: true })
      return () => {
        window.removeEventListener('resize', resize)
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('scroll', redraw)
      }
    }

    frame = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('mousemove', onMove)
      document.documentElement.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return <canvas ref={ref} className="backdrop" aria-hidden="true" />
}
