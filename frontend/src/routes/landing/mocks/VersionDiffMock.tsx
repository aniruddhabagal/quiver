const CHANGES = [
  { kind: 'add', text: 'jira.create_issue', note: 'allow, 30 per minute' },
  { kind: 'mod', text: 'slack.post_message', note: 'description rewritten, now requires approval' },
  { kind: 'mod', text: 'github.open_pr', note: 'preset draft = true, maintainer_can_modify hidden' },
  { kind: 'del', text: 'fs.write_file', note: 'removed from the loadout' },
] as const

const TONE = {
  add: { mark: '+', cls: 'text-allowed' },
  mod: { mark: '~', cls: 'text-held' },
  del: { mark: '-', cls: 'text-denied' },
}

export function VersionDiffMock() {
  return (
    <div className="codeblock">
      <div className="flex items-center justify-between px-4 py-2 border-b border-hairline t-caption text-fg-3">
        <span>ops-agent, v3 to v4</span>
        <span>4 changes</span>
      </div>
      <ul className="m-0 p-0 list-none">
        {CHANGES.map((c) => (
          <li key={c.text} className="grid grid-cols-[auto_1fr] gap-x-3 px-4 py-2.5 border-t border-hairline first:border-t-0">
            <span className={`select-none ${TONE[c.kind].cls}`}>{TONE[c.kind].mark}</span>
            <span>
              <span className={c.kind === 'del' ? 'text-fg-3 line-through' : 'text-fg-1'}>{c.text}</span>
              <span className="block text-fg-3 t-mono-xs mt-0.5">{c.note}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="border-t border-hairline px-4 py-2.5 t-caption text-fg-3 flex justify-between">
        <span>published 2 days ago</span>
        <button type="button" className="link">
          Roll back to v3
        </button>
      </div>
    </div>
  )
}
