import { useEffect, useMemo } from 'react'
import { ReactFlow, Background, BackgroundVariant, Controls, useNodesState, useEdgesState, type Node, type Edge, type NodeMouseHandler } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { nodeTypes } from './nodes'
import { edgeTypes, type PulseEdgeData, type Pulse } from './PulseEdge'
import { buildGraph } from './layout'
import type { Server, ToolSpec } from '../../../lib/types'
import './canvas.css'

interface Props {
  tools: ToolSpec[]
  servers: Server[]
  meta: { name: string; overload: number; dirty: boolean; url: string; published: boolean; held: number }
  pulses: Record<string, Pulse[]>
  selectedId: string | null
  onSelect: (toolId: string | null) => void
  publishing: boolean
}

export function QuiverCanvas({ tools, servers, meta, pulses, selectedId, onSelect, publishing }: Props) {
  const graph = useMemo(() => buildGraph(tools, servers, meta), [tools, servers, meta])
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(graph.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(graph.edges)

  useEffect(() => {
    setNodes(graph.nodes.map((n) => ({ ...n, selected: n.id === `t:${selectedId}` })))
    setEdges(graph.edges)
  }, [graph, selectedId, setNodes, setEdges])

  const liveEdges = useMemo(
    () => edges.map((e) => (e.type === 'pulse' ? { ...e, data: { ...(e.data as PulseEdgeData), pulses: pulses[e.id] ?? [] } } : e)),
    [edges, pulses],
  )

  const onNodeClick: NodeMouseHandler = (_, node) => {
    if (node.type === 'tool') onSelect(node.id.slice(2))
    else onSelect(null)
  }

  return (
    <div className={`qcanvas ${publishing ? 'is-publishing' : ''}`}>
      <ReactFlow
        nodes={nodes}
        edges={liveEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={() => onSelect(null)}
        fitView
        fitViewOptions={{ padding: 0.18, maxZoom: 1 }}
        minZoom={0.15}
        maxZoom={1.4}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="rgba(150,140,255,0.16)" />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  )
}
