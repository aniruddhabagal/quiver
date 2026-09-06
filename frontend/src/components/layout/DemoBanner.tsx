import { Link } from 'react-router'
import { demoMode, useDemoMode } from '../../lib/demo-mode'
import { API_URL } from '../../lib/api'

export function DemoBanner() {
  const demo = useDemoMode()
  if (!demo) return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-held/30 bg-held/[0.07] t-body-sm">
      <span className="text-fg-2">
        <span className="text-held font-semibold">Demo mode.</span> Sample data and simulated traffic. Approvals and edits work, nothing leaves this tab.
      </span>
      <span className="flex items-center gap-3">
        {API_URL && (
          <button type="button" className="link" onClick={() => demoMode.set(false)}>
            Exit demo
          </button>
        )}
        <Link to="/login" className="link text-fg-1">
          Sign in
        </Link>
      </span>
    </div>
  )
}
