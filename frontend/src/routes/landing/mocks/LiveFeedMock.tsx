import { useEffect, useRef, useState } from 'react'
import { OutcomeStamp, type Outcome } from '../../../components/brand/OutcomeStamp'
import { reducedMotion } from '../../../lib/motion'

interface Row {
  id: number
  tool: string
  outcome: Outcome
  ms: string
  agent: string
}

const FIXTURE: Omit<Row, 'id'>[] = [
  { tool: 'search_code', outcome: 'allowed', ms: '212 ms', agent: 'triage' },
  { tool: 'open_pr', outcome: 'held', ms: '4.1 s', agent: 'release-bot' },
  { tool: 'query', outcome: 'allowed', ms: '18 ms', agent: 'analyst' },
  { tool: 'post_message', outcome: 'allowed', ms: '340 ms', agent: 'release-bot' },
  { tool: 'drop_table', outcome: 'denied', ms: '1 ms', agent: 'analyst' },
  { tool: 'read_file', outcome: 'allowed', ms: '6 ms', agent: 'triage' },
  { tool: 'create_issue', outcome: 'allowed', ms: '410 ms', agent: 'triage' },
  { tool: 'delete_branch', outcome: 'held', ms: '38 s', agent: 'release-bot' },
  { tool: 'list_tables', outcome: 'allowed', ms: '22 ms', agent: 'analyst' },
  { tool: 'navigate', outcome: 'allowed', ms: '1.2 s', agent: 'qa' },
  { tool: 'query', outcome: 'denied', ms: '1 ms', agent: 'qa' },
  { tool: 'screenshot', outcome: 'allowed', ms: '880 ms', agent: 'qa' },
]

const MAX = 7

function stamp(d: Date) {
  return d.toLocaleTimeString([], { hour12: false })
}

export function LiveFeedMock() {
  const [rows, setRows] = useState<Row[]>(() => FIXTURE.slice(0, MAX).map((r, i) => ({ ...r, id: i })))
  const [times, setTimes] = useState<string[]>(() => Array.from({ length: MAX }, () => stamp(new Date())))
  const cursor = useRef(MAX)
  const [el, setEl] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    if (reducedMotion || !el) return
    let running = true
    let id = 0
    const tick = () => {
      if (!running) return
      const next = FIXTURE[cursor.current % FIXTURE.length]
      const rid = cursor.current++
      setRows((rs) => [{ ...next, id: rid }, ...rs].slice(0, MAX))
      setTimes((ts) => [stamp(new Date()), ...ts].slice(0, MAX))
      id = window.setTimeout(tick, 1400 + Math.random() * 1400)
    }
    const io = new IntersectionObserver(([e]) => {
      running = e.isIntersecting
      window.clearTimeout(id)
      if (running) id = window.setTimeout(tick, 600)
    })
    io.observe(el)
    return () => {
      running = false
      window.clearTimeout(id)
      io.disconnect()
    }
  }, [el])

  return (
    <div ref={setEl} className="codeblock">
      <div className="flex items-center justify-between px-4 py-2 border-b border-hairline t-caption text-fg-3">
        <span className="inline-flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-ion animate-pulse" />
          live, ops-agent
        </span>
        <span>last {MAX}</span>
      </div>
      <ul className="m-0 p-0 list-none">
        {rows.map((r, i) => (
          <li
            key={r.id}
            className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-4 px-4 py-2 border-t border-hairline first:border-t-0"
            style={{ animation: i === 0 && !reducedMotion ? 'feed-in 320ms var(--ease-ui)' : undefined }}
          >
            <span className="text-fg-4 t-mono-xs">{times[i]}</span>
            <span className="text-fg-1 truncate">
              {r.tool}
              <span className="text-fg-4 ml-2">{r.agent}</span>
            </span>
            <span className="text-fg-3 t-mono-xs">{r.ms}</span>
            <OutcomeStamp outcome={r.outcome} />
          </li>
        ))}
      </ul>
    </div>
  )
}
