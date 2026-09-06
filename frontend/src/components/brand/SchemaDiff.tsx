import { cn } from '../../lib/cn'

export type DiffKind = 'same' | 'add' | 'del' | 'note'

export interface DiffLine {
  kind: DiffKind
  text: string
}

interface Props {
  title?: string
  lines: DiffLine[]
  className?: string
}

const GUTTER: Record<DiffKind, string> = {
  same: ' ',
  add: '+',
  del: '-',
  note: '~',
}

/** Unified diff of what the agent sees before and after curation. */
export function SchemaDiff({ title, lines, className }: Props) {
  return (
    <div className={cn('codeblock', className)}>
      {title && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-hairline t-caption text-fg-3">
          <span>{title}</span>
          <span>tools/list</span>
        </div>
      )}
      <pre className="m-0 p-4 whitespace-pre-wrap break-words">
        {lines.map((l, i) => (
          <div
            key={i}
            className={cn(
              'flex gap-3 -mx-4 px-4',
              l.kind === 'add' && 'bg-allowed/[0.07] text-allowed',
              l.kind === 'del' && 'bg-denied/[0.07] text-denied line-through decoration-denied/50',
              l.kind === 'note' && 'text-held',
              l.kind === 'same' && 'text-fg-2',
            )}
          >
            <span className="select-none w-3 shrink-0 text-fg-4">{GUTTER[l.kind]}</span>
            <span>{l.text}</span>
          </div>
        ))}
      </pre>
    </div>
  )
}
