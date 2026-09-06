import { useEffect, useState } from 'react'
import { Tabs } from 'radix-ui'
import { PageHeader, Skeleton, EmptyState, Kbd } from '../../components/ui/Bits'
import { ApprovalCard } from '../../features/approvals/ApprovalCard'
import { useApprovals, useDecide } from '../../lib/hooks'
import { cn } from '../../lib/cn'

export default function Approvals() {
  const pending = useApprovals('pending')
  const resolved = useApprovals()
  const decide = useDecide()
  const [tab, setTab] = useState<'pending' | 'resolved'>('pending')
  const [focus, setFocus] = useState(0)

  const list = pending.data ?? []
  const history = (resolved.data ?? []).filter((a) => a.status !== 'pending').slice(0, 60)
  const focusIdx = Math.min(focus, Math.max(0, list.length - 1))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (tab !== 'pending' || !list.length) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      if (e.key === 'j') setFocus((f) => Math.min(list.length - 1, f + 1))
      if (e.key === 'k') setFocus((f) => Math.max(0, f - 1))
      if (e.key === 'a' || e.key === 'd') {
        const a = list[focusIdx]
        if (a) decide.mutate({ id: a.id, decision: e.key === 'a' ? 'approved' : 'denied' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tab, list, focusIdx, decide])

  return (
    <>
      <PageHeader
        title="Approvals"
        description="Calls to tools marked approve wait here. Decide, and the agent gets its answer."
        actions={
          <span className="hidden md:inline-flex items-center gap-2 t-caption text-fg-3">
            <Kbd>j</Kbd>
            <Kbd>k</Kbd> move <Kbd>a</Kbd> approve <Kbd>d</Kbd> deny
          </span>
        }
      />
      <Tabs.Root value={tab} onValueChange={(v) => setTab(v as 'pending' | 'resolved')}>
        <Tabs.List className="inline-flex gap-1 p-0.5 rounded-1 bg-abyss border border-hairline mb-6">
          {(['pending', 'resolved'] as const).map((v) => (
            <Tabs.Trigger key={v} value={v} className={cn('px-3.5 py-1.5 t-body-sm font-medium rounded-[3px] text-fg-3 data-[state=active]:bg-raised data-[state=active]:text-fg-1 capitalize')}>
              {v}
              {v === 'pending' && list.length > 0 && <span className="ml-2 text-held">{list.length}</span>}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <Tabs.Content value="pending">
          {pending.isLoading ? (
            <Skeleton className="h-40" />
          ) : list.length === 0 ? (
            <EmptyState title="Nothing waiting." body="When an agent calls a tool marked approve, its card lands here and the countdown starts." />
          ) : (
            <ul className="m-0 p-0 list-none grid gap-4 lg:grid-cols-2">
              {list.map((a, i) => (
                <li key={a.id} onMouseEnter={() => setFocus(i)}>
                  <ApprovalCard approval={a} focused={i === focusIdx} busy={decide.isPending} onDecide={(decision, reason) => decide.mutate({ id: a.id, decision, reason })} />
                </li>
              ))}
            </ul>
          )}
        </Tabs.Content>
        <Tabs.Content value="resolved">
          {history.length === 0 ? (
            <EmptyState title="No decisions yet." />
          ) : (
            <ul className="m-0 p-0 list-none grid gap-3 lg:grid-cols-2">
              {history.map((a) => (
                <li key={a.id}>
                  <ApprovalCard approval={a} compact />
                </li>
              ))}
            </ul>
          )}
        </Tabs.Content>
      </Tabs.Root>
    </>
  )
}
