const ROWS = [
  { name: 'github', transport: 'streamable', tools: 27, status: 'healthy', latency: '84 ms' },
  { name: 'slack', transport: 'streamable', tools: 19, status: 'healthy', latency: '121 ms' },
  { name: 'postgres', transport: 'sse', tools: 12, status: 'healthy', latency: '9 ms' },
  { name: 'filesystem', transport: 'streamable', tools: 14, status: 'healthy', latency: '3 ms' },
  { name: 'jira', transport: 'streamable', tools: 31, status: 'degraded', latency: '640 ms' },
  { name: 'browser', transport: 'sse', tools: 22, status: 'healthy', latency: '210 ms' },
] as const

export function ServerTableMock() {
  const total = ROWS.reduce((n, r) => n + r.tools, 0)
  return (
    <div className="panel overflow-hidden">
      <table className="w-full t-mono text-left border-collapse">
        <thead>
          <tr className="text-fg-3 t-caption">
            <th className="font-normal px-4 py-2.5">server</th>
            <th className="font-normal px-2 py-2.5">tools</th>
            <th className="font-normal px-4 py-2.5 text-right">latency</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.name} className="border-t border-hairline">
              <td className="px-4 py-2.5 text-fg-1">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full mr-2.5 align-middle"
                  style={{ background: r.status === 'healthy' ? 'var(--color-allowed)' : 'var(--color-held)' }}
                />
                {r.name}
                <span className="text-fg-4 ml-2 t-mono-xs">{r.transport}</span>
              </td>
              <td className="px-2 py-2.5 text-fg-2">{r.tools}</td>
              <td className="px-4 py-2.5 text-right text-fg-2">{r.latency}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-hairline px-4 py-2.5 t-caption text-fg-3 flex justify-between">
        <span>{total} tools connected</span>
        <span className="text-arc-bright">12 exposed</span>
      </div>
    </div>
  )
}
