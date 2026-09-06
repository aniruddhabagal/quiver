import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '../../lib/cn'

interface Props {
  url: string
  apiKey?: string
  label?: string
  glow?: boolean
  className?: string
}

/** The published endpoint: the one thing on the page allowed to glow ion. */
export function EndpointBlock({ url, apiKey, label = 'MCP endpoint', glow = true, className }: Props) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard blocked: the URL is still selectable */
    }
  }

  return (
    <div
      className={cn(
        'chamfer relative bg-abyss border border-ion/40 p-4 pl-5',
        glow && 'glow-ion',
        className,
      )}
    >
      <span className="absolute left-0 top-3 bottom-3 w-px bg-ion/70" aria-hidden="true" />
      <div className="flex items-center justify-between gap-3">
        <span className="t-caption text-fg-3">{label}</span>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex items-center gap-1.5 t-caption text-fg-2 hover:text-fg-1 transition-colors"
          aria-label="Copy endpoint URL"
        >
          {copied ? <Check size={13} className="text-allowed" /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <code className="t-mono block mt-1.5 text-ion-bright break-all select-all">{url}</code>
      {apiKey && (
        <div className="mt-3">
          <span className="t-caption text-fg-3 block">Authorization header</span>
          <code className="t-mono text-fg-2 block break-all">Bearer {apiKey}</code>
        </div>
      )}
    </div>
  )
}
