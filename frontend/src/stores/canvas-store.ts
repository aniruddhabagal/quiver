import { create } from 'zustand'
import type { Loadout, Policy, ToolSpec, UpstreamTool } from '../lib/types'

interface CanvasState {
  loadoutId: string | null
  tools: ToolSpec[]
  savedTools: ToolSpec[]
  selectedId: string | null
  dirty: boolean
  load: (loadout: Loadout) => void
  add: (serverId: string, upstream: UpstreamTool) => void
  update: (id: string, patch: Partial<ToolSpec>) => void
  updatePolicy: (id: string, patch: Partial<Policy>) => void
  remove: (id: string) => void
  select: (id: string | null) => void
  markSaved: (tools: ToolSpec[]) => void
  discard: () => void
}

const DEFAULT_POLICY: Policy = { mode: 'allow', rate_limit_per_min: null, redact: [], timeout_s: null }

function uniqueAlias(base: string, taken: Set<string>) {
  let alias = base.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64) || 'tool'
  let n = 2
  while (taken.has(alias)) alias = `${base}_${n++}`
  return alias
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  loadoutId: null,
  tools: [],
  savedTools: [],
  selectedId: null,
  dirty: false,
  load: (lo) => set({ loadoutId: lo.id, tools: structuredClone(lo.tools), savedTools: structuredClone(lo.tools), selectedId: null, dirty: false }),
  add: (serverId, upstream) => {
    const { tools } = get()
    if (tools.some((t) => t.server_id === serverId && t.upstream_name === upstream.name)) return
    const alias = uniqueAlias(upstream.name, new Set(tools.map((t) => t.alias)))
    const spec: ToolSpec = {
      id: `t_${Math.random().toString(36).slice(2, 10)}`,
      server_id: serverId,
      upstream_name: upstream.name,
      alias,
      description_override: null,
      presets: {},
      hidden_args: [],
      policy: { ...DEFAULT_POLICY },
      enabled: true,
    }
    set({ tools: [...tools, spec], dirty: true, selectedId: spec.id })
  },
  update: (id, patch) => set((s) => ({ tools: s.tools.map((t) => (t.id === id ? { ...t, ...patch } : t)), dirty: true })),
  updatePolicy: (id, patch) => set((s) => ({ tools: s.tools.map((t) => (t.id === id ? { ...t, policy: { ...t.policy, ...patch } } : t)), dirty: true })),
  remove: (id) => set((s) => ({ tools: s.tools.filter((t) => t.id !== id), selectedId: s.selectedId === id ? null : s.selectedId, dirty: true })),
  select: (selectedId) => set({ selectedId }),
  markSaved: (tools) => set({ tools: structuredClone(tools), savedTools: structuredClone(tools), dirty: false }),
  discard: () => set((s) => ({ tools: structuredClone(s.savedTools), dirty: false, selectedId: null })),
}))
