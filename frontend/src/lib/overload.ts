import type { Loadout, OverloadBreakdown, ToolSpec, UpstreamTool } from './types'

/** Rough token count for a JSON blob: four characters per token. */
export function schemaTokens(tools: ToolSpec[], lookup: (t: ToolSpec) => UpstreamTool | undefined) {
  let chars = 0
  for (const t of tools) {
    if (!t.enabled) continue
    const up = lookup(t)
    const desc = t.description_override ?? up?.description ?? ''
    const schema = up?.inputSchema ?? {}
    chars += t.alias.length + desc.length + JSON.stringify(schema).length
  }
  return Math.round(chars / 4)
}

export function scoreOverload(b: OverloadBreakdown, toolCount: number): number {
  const tokenPart = Math.min(60, (b.schema_tokens / 12000) * 60)
  const unusedPart = toolCount ? Math.min(20, (b.unused_tools / toolCount) * 30) : 0
  const dupPart = Math.min(12, b.duplicate_names * 4)
  const descPart = b.avg_description_chars < 40 ? 8 : b.avg_description_chars > 400 ? 6 : 0
  return Math.round(Math.min(100, tokenPart + unusedPart + dupPart + descPart))
}

export function recomputeOverload(loadout: Loadout, lookup: (t: ToolSpec) => UpstreamTool | undefined): Loadout['overload'] {
  const enabled = loadout.tools.filter((t) => t.enabled)
  const names = enabled.map((t) => t.alias.toLowerCase().replace(/[^a-z]/g, ''))
  const dup = names.length - new Set(names).size
  const descs = enabled.map((t) => (t.description_override ?? lookup(t)?.description ?? '').length)
  const avg = descs.length ? Math.round(descs.reduce((a, b) => a + b, 0) / descs.length) : 0
  const breakdown: OverloadBreakdown = {
    schema_tokens: schemaTokens(enabled, lookup),
    unused_tools: loadout.overload?.breakdown.unused_tools ?? 0,
    duplicate_names: dup,
    avg_description_chars: avg,
  }
  return { score: scoreOverload(breakdown, enabled.length), breakdown }
}
