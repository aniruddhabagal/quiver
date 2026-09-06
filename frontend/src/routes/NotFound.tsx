import { Link } from 'react-router'
import { Wordmark } from '../components/brand/Wordmark'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-void text-fg-1 flex flex-col items-center justify-center gap-6 px-6 text-center">
      <Wordmark />
      <h1 className="t-display-lg">Nothing at this depth.</h1>
      <p className="t-lede">The page you asked for isn't in any loadout.</p>
      <div className="flex gap-3">
        <Link to="/" className="btn btn-ghost">
          Back to the front
        </Link>
        <Link to="/app" className="btn btn-primary glow-cta">
          Open the app
        </Link>
      </div>
    </div>
  )
}
