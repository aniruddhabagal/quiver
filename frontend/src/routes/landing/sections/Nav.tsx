import { useEffect, useState } from 'react'
import { Github } from 'lucide-react'
import { Wordmark } from '../../../components/brand/Wordmark'
import { cn } from '../../../lib/cn'

const GITHUB = 'https://github.com/aniruddhabagal/quiver'

export function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  return (
    <nav
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-colors duration-300',
        scrolled ? 'glass border-t-0 border-x-0' : 'bg-transparent',
      )}
      aria-label="Primary"
    >
      <div className="container flex items-center justify-between h-16">
        <a href="#top" className="no-underline" aria-label="Quiver home">
          <Wordmark />
        </a>
        <div className="hidden md:flex items-center gap-7 t-body-sm">
          <a href="#how-it-works" className="link">
            How it works
          </a>
          <a href="#guardrails" className="link">
            Guardrails
          </a>
          <a href={GITHUB} className="link inline-flex items-center gap-1.5" target="_blank" rel="noreferrer">
            <Github size={15} />
            GitHub
          </a>
        </div>
        <div className="flex items-center gap-2.5">
          <a href="#how-it-works" className="btn btn-ghost btn-sm hidden sm:inline-flex">
            Open the demo
          </a>
          <a href="#get-started" className="btn btn-primary btn-sm glow-cta">
            Get started
          </a>
        </div>
      </div>
    </nav>
  )
}
