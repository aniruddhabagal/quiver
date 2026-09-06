import dagre from '@dagrejs/dagre'
import type { Edge, Node } from '@xyflow/react'
import type { Server, ToolSpec } from '../../../lib/types'

export const SIZES = {
  server: { width: 200, height: 56 },
  tool: { width: 224, height: 66 },
  quiver: { width: 220, height: 168 },
  endpoint: { width: 260, height: 96 },
}

export interface ServerNodeData extends Record<string, unknown> {
  server: Server
  count: number
}
export interface ToolNodeData extends Record<string, unknown> {
  spec: ToolSpec
  serverName: string
  missing: boolean
}
export interface QuiverNodeData extends Record<string, unknown> {
  name: string
  count: number
  overload: number
  dirty: boolean
  held: number
}
export interface EndpointNodeData extends Record<string, unknown> {
  url: string
  published: boolean
}

export function buildGraph(tools: ToolSpec[], servers: Server[], meta: { name: string; overload: number; dirty: boolean; url: string; published: boolean; held: number }) {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', nodesep: 14, ranksep: 96, marginx: 24, marginy: 24 })
  g.setDefaultEdgeLabel(() => ({}))

  const usedServers = servers.filter((s) => tools.some((t) => t.server_id === s.id))
  const nodes: Node[] = []
  const edges: Edge[] = []

  for (const s of usedServers) {
    g.setNode(`s:${s.id}`, SIZES.server)
    nodes.push({ id: `s:${s.id}`, type: 'server', position: { x: 0, y: 0 }, data: { server: s, count: tools.filter((t) => t.server_id === s.id).length } satisfies ServerNodeData, draggable: false })
  }
  for (const t of tools) {
    const srv = servers.find((s) => s.id === t.server_id)
    const missing = !srv || !srv.manifest.tools.some((u) => u.name === t.upstream_name)
    g.setNode(`t:${t.id}`, SIZES.tool)
    nodes.push({ id: `t:${t.id}`, type: 'tool', position: { x: 0, y: 0 }, data: { spec: t, serverName: srv?.name ?? '?', missing } satisfies ToolNodeData })
    if (srv) {
      g.setEdge(`s:${srv.id}`, `t:${t.id}`)
      edges.push({ id: `e:s:${t.id}`, source: `s:${srv.id}`, target: `t:${t.id}`, type: 'quiet' })
    }
    g.setEdge(`t:${t.id}`, 'quiver')
    edges.push({ id: `e:t:${t.id}`, source: `t:${t.id}`, target: 'quiver', type: 'pulse', data: { tone: t.enabled ? (t.policy.mode === 'deny' ? 'denied' : t.policy.mode === 'approve' ? 'held' : 'arc') : 'off' } })
  }
  g.setNode('quiver', SIZES.quiver)
  nodes.push({ id: 'quiver', type: 'quiver', position: { x: 0, y: 0 }, data: { name: meta.name, count: tools.filter((t) => t.enabled).length, overload: meta.overload, dirty: meta.dirty, held: meta.held } satisfies QuiverNodeData, draggable: false })
  g.setNode('endpoint', SIZES.endpoint)
  nodes.push({ id: 'endpoint', type: 'endpoint', position: { x: 0, y: 0 }, data: { url: meta.url, published: meta.published } satisfies EndpointNodeData, draggable: false })
  g.setEdge('quiver', 'endpoint')
  edges.push({ id: 'e:out', source: 'quiver', target: 'endpoint', type: 'pulse', data: { tone: 'ion' } })

  dagre.layout(g)
  for (const n of nodes) {
    const p = g.node(n.id)
    const size = SIZES[n.type as keyof typeof SIZES]
    n.position = { x: p.x - size.width / 2, y: p.y - size.height / 2 }
    // explicit dimensions mean edges and fitView work before any measurement
    n.width = size.width
    n.height = size.height
  }
  return { nodes, edges }
}
