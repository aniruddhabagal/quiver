import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface Props {
  id?: string
  title?: string
  lede?: string
  tone?: 'void' | 'abyss'
  rule?: boolean
  children: ReactNode
  className?: string
}

/**
 * A landing section. Tone alternates the ground, a hairline separates
 * neighbours of the same tone. Headings reveal once on scroll; bodies don't.
 */
export function Section({ id, title, lede, tone = 'void', rule = false, children, className }: Props) {
  return (
    <section
      id={id}
      className={cn(
        'relative py-20 md:py-28',
        tone === 'abyss' ? 'bg-abyss' : 'bg-void',
        rule && 'rule-top',
        className,
      )}
    >
      <div className="container">
        {(title || lede) && (
          <header className="max-w-[46rem] mb-12 md:mb-16">
            {title && (
              <h2 className="t-display-lg text-fg-1" data-reveal>
                {title}
              </h2>
            )}
            {lede && (
              <p className="t-lede mt-5" data-reveal>
                {lede}
              </p>
            )}
          </header>
        )}
        {children}
      </div>
    </section>
  )
}
