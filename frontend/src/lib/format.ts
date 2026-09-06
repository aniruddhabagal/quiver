export function relTime(iso: string | null | undefined): string {
  if (!iso) return 'never'
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.round(diff / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s} s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 48) return `${h} h ago`
  return `${Math.round(h / 24)} d ago`
}

export function fmtMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return ''
  if (ms < 1000) return `${ms} ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} s`
  return `${Math.round(ms / 60000)} min`
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour12: false })
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function fmtCount(n: number): string {
  return n.toLocaleString('en-US')
}

export function countdown(expiresAt: string, now = Date.now()): { left: number; label: string; frac: number; total: number } {
  const end = new Date(expiresAt).getTime()
  const left = Math.max(0, Math.round((end - now) / 1000))
  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')
  return { left, label: `${mm}:${ss}`, frac: 0, total: 0 }
}
