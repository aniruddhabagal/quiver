import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { Wordmark } from '../../components/brand/Wordmark'
import { Button } from '../../components/ui/Button'
import { demoMode } from '../../lib/demo-mode'

export function AuthShell({ title, lede, children, alt }: { title: string; lede: string; children: ReactNode; alt: ReactNode }) {
  const nav = useNavigate()
  return (
    <div className="min-h-screen bg-void text-fg-1 grid lg:grid-cols-[1.1fr_1fr]">
      <div className="hidden lg:flex flex-col justify-between p-10 border-r border-hairline bg-[radial-gradient(ellipse_70%_60%_at_30%_20%,rgba(124,108,255,0.18),transparent_70%)]">
        <Link to="/" className="no-underline">
          <Wordmark />
        </Link>
        <div className="max-w-[26rem]">
          <p className="t-display-lg">Twelve tools, one URL, a human in the loop.</p>
          <p className="t-lede mt-4">Quiver keeps what the agent sees small and what it can do governed.</p>
        </div>
        <p className="t-caption text-fg-4">MIT licensed. Self-host with one compose file.</p>
      </div>
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="lg:hidden mb-10">
          <Link to="/" className="no-underline">
            <Wordmark />
          </Link>
        </div>
        <div className="w-full max-w-[24rem] mx-auto">
          <h1 className="t-display-md">{title}</h1>
          <p className="t-body-sm text-fg-3 mt-2">{lede}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 pt-6 border-t border-hairline flex flex-col gap-3">
            <Button
              variant="subtle"
              onClick={() => {
                demoMode.set(true, true)
                nav('/app')
              }}
            >
              Try the demo instead
            </Button>
            <p className="t-body-sm text-fg-3 text-center">{alt}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
