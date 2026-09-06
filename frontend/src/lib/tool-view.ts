import type { JsonSchema, ToolSpec, UpstreamTool } from './types'

/**
 * What the agent sees for one curated tool: alias, rewritten description, and
 * the schema with presets and hidden arguments removed. Mirrors the backend.
 */
export function agentFacingSchema(spec: ToolSpec, upstream: UpstreamTool | undefined): JsonSchema {
  const base: JsonSchema = JSON.parse(JSON.stringify(upstream?.inputSchema ?? { type: 'object', properties: {} })) as JsonSchema
  base.type = 'object'
  base.properties = base.properties ?? {}
  const removed = new Set([...Object.keys(spec.presets), ...spec.hidden_args])
  for (const k of removed) delete base.properties[k]
  if (base.required) {
    base.required = base.required.filter((r) => !removed.has(r))
    if (!base.required.length) delete base.required
  }
  return base
}

export function agentFacingTool(spec: ToolSpec, upstream: UpstreamTool | undefined) {
  return {
    name: spec.alias,
    description: spec.description_override ?? upstream?.description ?? '',
    inputSchema: agentFacingSchema(spec, upstream),
  }
}

export function estimateTokens(text: string) {
  return Math.round(text.length / 4)
}
