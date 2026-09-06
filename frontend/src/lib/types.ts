export type PolicyMode = 'allow' | 'approve' | 'deny'

export interface RedactRule {
  pattern: string
  replacement: string
}

export interface Policy {
  mode: PolicyMode
  rate_limit_per_min: number | null
  redact: RedactRule[]
  timeout_s: number | null
}

export type JsonSchema = {
  type?: string
  description?: string
  properties?: Record<string, JsonSchema>
  required?: string[]
  enum?: unknown[]
  items?: JsonSchema
  default?: unknown
  [k: string]: unknown
}

export interface UpstreamTool {
  name: string
  description?: string
  inputSchema: JsonSchema
}

export type ServerStatus = 'unknown' | 'healthy' | 'degraded' | 'down'
export type Transport = 'auto' | 'streamable_http' | 'sse'

export interface Server {
  id: string
  name: string
  url: string
  transport: Transport
  detected_transport: Exclude<Transport, 'auto'> | null
  auth: { type: 'none' | 'bearer' | 'api_key_header' | 'basic'; header_name?: string | null; has_credentials: boolean }
  manifest: { tools: UpstreamTool[]; fetched_at: string | null; error: string | null }
  status: ServerStatus
  last_probe: { at: string | null; latency_ms: number | null; error: string | null }
  created_at: string
}

export interface ToolSpec {
  id: string
  server_id: string
  upstream_name: string
  alias: string
  description_override: string | null
  presets: Record<string, unknown>
  hidden_args: string[]
  policy: Policy
  enabled: boolean
}

export interface OverloadBreakdown {
  schema_tokens: number
  unused_tools: number
  duplicate_names: number
  avg_description_chars: number
}

export interface Loadout {
  id: string
  name: string
  slug: string
  description: string
  tools: ToolSpec[]
  settings: {
    approval_timeout_s: number
    agent_header: string
    default_timeout_s: number
    slack_webhook_configured: boolean
  }
  published: boolean
  current_version: number
  overload: { score: number; breakdown: OverloadBreakdown }
  created_at: string
  updated_at: string
}

export interface LoadoutVersion {
  id: string
  loadout_id: string
  version: number
  summary: { added: string[]; removed: string[]; changed: string[] }
  created_at: string
}

export interface VersionDiff {
  from: number
  to: number
  added: ToolSpec[]
  removed: ToolSpec[]
  changed: { alias: string; fields: string[] }[]
}

export type CallStatus = 'ok' | 'error' | 'denied' | 'rate_limited' | 'held_approved' | 'held_denied' | 'expired'

export interface Call {
  id: string
  loadout_id: string
  loadout_slug: string
  tool_id: string
  alias: string
  server_id: string
  server_name: string
  upstream_name: string
  agent: string
  api_key_name: string | null
  source: 'mcp' | 'playground'
  args_redacted: Record<string, unknown>
  result_preview: string | null
  result_size: number
  is_error: boolean
  status: CallStatus
  error_message: string | null
  approval_id: string | null
  started_at: string
  finished_at: string | null
  duration_ms: number | null
  policy_trace: string[]
}

export type ApprovalStatus = 'pending' | 'approved' | 'denied' | 'expired'

export interface Approval {
  id: string
  loadout_id: string
  loadout_slug: string
  call_id: string
  alias: string
  server_name: string
  args_redacted: Record<string, unknown>
  agent: string
  status: ApprovalStatus
  requested_at: string
  expires_at: string
  decided_at: string | null
  decided_by: string | null
  reason: string | null
}

export interface ApiKey {
  id: string
  name: string
  prefix: string
  scope: { type: 'account' | 'loadout'; loadout_id?: string }
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

export interface User {
  id: string
  email: string
  display_name: string
}

export interface AnalyticsOverview {
  calls_24h: number
  held_now: number
  denied_24h: number
  mean_overload: number
  calls_prev_24h: number
}

export interface TimeseriesPoint {
  t: string
  ok: number
  held: number
  denied: number
  error: number
}

export interface TopTool {
  alias: string
  loadout_slug: string
  calls: number
  p50_ms: number
}

export interface OutcomeSlice {
  status: CallStatus
  count: number
}

export type WsEvent =
  | { type: 'call.started'; ts: string; payload: { call_id: string; loadout_id: string; alias: string; agent: string; source: 'mcp' | 'playground' } }
  | { type: 'call.decision'; ts: string; payload: { call_id: string; loadout_id: string; action: 'allow' | 'hold' | 'deny'; reason: string; approval_id?: string } }
  | { type: 'call.finished'; ts: string; payload: { call_id: string; loadout_id: string; alias: string; status: CallStatus; duration_ms: number; is_error: boolean } }
  | { type: 'approval.pending'; ts: string; payload: Approval }
  | { type: 'approval.decided'; ts: string; payload: { approval_id: string; decision: 'approved' | 'denied' | 'expired'; decided_by: string | null } }
  | { type: 'server.status'; ts: string; payload: { server_id: string; status: ServerStatus; latency_ms: number | null } }
  | { type: 'ping'; ts: string; payload?: undefined }

export type ConnectionState = 'live' | 'reconnecting' | 'demo' | 'offline'
