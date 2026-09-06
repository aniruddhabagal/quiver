import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { AlertTriangle } from 'lucide-react'
import { StatusDot } from '../../../components/ui/Bits'
import { CartridgeGlyph } from '../../../components/brand/CartridgeGlyph'
import { overloadTone } from '../OverloadChip'
import { cn } from '../../../lib/cn'
import type { EndpointNodeData, QuiverNodeData, ServerNodeData, ToolNodeData } from './layout'

export const ServerNode = memo(function ServerNode({ data }: NodeProps<Node<ServerNodeData>>) {
  return (
    <div className="qnode qnode--server">
      <StatusDot status={data.server.status} />
      <div className="min-w-0">
        <div className="t-mono text-fg-1 truncate">{data.server.name}</div>
        <div className="t-caption text-fg-3">
          {data.count} of {data.server.manifest.tools.length} tools
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="qhandle" />
    </div>
  )
})

const MODE_CLS = { allow: 'text-allowed border-allowed/50', approve: 'text-held border-held/50', deny: 'text-denied border-denied/50' } as const

export const ToolNode = memo(function ToolNode({ data, selected }: NodeProps<Node<ToolNodeData>>) {
  const { spec } = data
  const presets = Object.keys(spec.presets).length
  return (
    <div className={cn('qnode qnode--tool', selected && 'is-selected', !spec.enabled && 'is-off')}>
      <Handle type="target" position={Position.Left} className="qhandle" />
      <div className="flex items-center justify-between gap-2">
        <span className="t-mono text-fg-1 truncate">{spec.alias}</span>
        <span className={cn('t-caption font-medium px-1.5 py-0.5 rounded-[3px] border shrink-0', MODE_CLS[spec.policy.mode])}>{spec.policy.mode}</span>
      </div>
      <div className="flex items-center gap-2 t-caption text-fg-3 mt-1 min-w-0">
        <span className="truncate">
          {data.serverName}/{spec.upstream_name}
        </span>
        {presets > 0 && <span className="text-arc-bright shrink-0">{presets} preset</span>}
        {spec.hidden_args.length > 0 && <span className="text-fg-4 shrink-0">{spec.hidden_args.length} hidden</span>}
        {data.missing && (
          <span className="text-denied shrink-0" title="Not in the server's manifest any more">
            <AlertTriangle size={12} />
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="qhandle" />
    </div>
  )
})

export const QuiverNode = memo(function QuiverNode({ data }: NodeProps<Node<QuiverNodeData>>) {
  const tone = overloadTone(data.overload)
  return (
    <div className="qnode qnode--quiver chamfer">
      <Handle type="target" position={Position.Left} className="qhandle" />
      <div className="flex items-center gap-2">
        <CartridgeGlyph size={18} />
        <span className="font-display font-semibold text-[1.05rem] text-fg-1 truncate">{data.name}</span>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="font-display font-semibold text-[2.1rem] leading-none text-arc-bright">{data.count}</div>
          <div className="t-caption text-fg-3">tools exposed</div>
        </div>
        <div className="text-right">
          <div className={cn('font-display font-semibold text-[1.4rem] leading-none', tone === 'allowed' ? 'text-allowed' : tone === 'held' ? 'text-held' : 'text-denied')}>{data.overload}</div>
          <div className="t-caption text-fg-3">overload</div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 t-caption">
        {data.dirty ? <span className="text-held">Unsaved changes</span> : <span className="text-fg-4">Saved</span>}
        {data.held > 0 && <span className="ml-auto text-held inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-held animate-pulse" />{data.held} held</span>}
      </div>
      <Handle type="source" position={Position.Right} className="qhandle" />
    </div>
  )
})

export const EndpointNode = memo(function EndpointNode({ data }: NodeProps<Node<EndpointNodeData>>) {
  return (
    <div className={cn('qnode qnode--endpoint', data.published && 'is-live')}>
      <Handle type="target" position={Position.Left} className="qhandle" />
      <div className="t-caption text-fg-3">{data.published ? 'live endpoint' : 'endpoint, not published'}</div>
      <code className="t-mono-xs text-ion-bright break-all block mt-1">{data.url}</code>
    </div>
  )
})

export const nodeTypes = { server: ServerNode, tool: ToolNode, quiver: QuiverNode, endpoint: EndpointNode }
