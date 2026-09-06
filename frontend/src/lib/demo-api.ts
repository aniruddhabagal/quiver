import { DemoModeError } from './demo-mode'
import { DEMO_USER, KEYS, LOADOUTS, SERVERS, VERSIONS, buildApprovals, buildCalls, sampleArgs } from './demo-data'
import { recomputeOverload } from './overload'
import type {
  AnalyticsOverview,
  ApiKey,
  Approval,
  Call,
  Loadout,
  LoadoutVersion,
  OutcomeSlice,
  Server,
  TimeseriesPoint,
  ToolSpec,
  TopTool,
  UpstreamTool,
  VersionDiff,
} from './types'

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T

export interface DemoState {
  servers: Server[]
  loadouts: Loadout[]
  versions: LoadoutVersion[]
  calls: Call[]
  approvals: Approval[]
  keys: ApiKey[]
}

function seed(): DemoState {
  const servers = clone(SERVERS)
  const loadouts = clone(LOADOUTS)
  const calls = buildCalls(loadouts, servers)
  return { servers, loadouts, versions: clone(VERSIONS), calls, approvals: buildApprovals(calls, servers), keys: clone(KEYS) }
}

export const demoState: DemoState = seed()

export function lookupTool(state: DemoState, t: ToolSpec): UpstreamTool | undefined {
  return state.servers.find((s) => s.id === t.server_id)?.manifest.tools.find((u) => u.name === t.upstream_name)
}

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`
const now = () => new Date().toISOString()

function notFound(what: string): never {
  throw Object.assign(new Error(`${what} not found`), { status: 404 })
}

function diffLoadouts(a: ToolSpec[], b: ToolSpec[]): LoadoutVersion['summary'] {
  const byId = (xs: ToolSpec[]) => new Map(xs.map((t) => [t.id, t]))
  const ma = byId(a)
  const mb = byId(b)
  const added = b.filter((t) => !ma.has(t.id)).map((t) => t.alias)
  const removed = a.filter((t) => !mb.has(t.id)).map((t) => t.alias)
  const changed = b.filter((t) => ma.has(t.id) && JSON.stringify(ma.get(t.id)) !== JSON.stringify(t)).map((t) => t.alias)
  return { added, removed, changed }
}

const snapshots = new Map<string, ToolSpec[]>()
for (const lo of demoState.loadouts) snapshots.set(`${lo.id}:${lo.current_version}`, clone(lo.tools))

function bucketize(calls: Call[], hours: number, stepMin: number): TimeseriesPoint[] {
  const end = Date.now()
  const start = end - hours * 3600000
  const step = stepMin * 60000
  const buckets: TimeseriesPoint[] = []
  for (let t = start; t < end; t += step) buckets.push({ t: new Date(t).toISOString(), ok: 0, held: 0, denied: 0, error: 0 })
  for (const c of calls) {
    const ts = new Date(c.started_at).getTime()
    if (ts < start) continue
    const b = buckets[Math.min(buckets.length - 1, Math.floor((ts - start) / step))]
    if (c.status === 'ok') b.ok++
    else if (c.status.startsWith('held') || c.status === 'expired') b.held++
    else if (c.status === 'denied' || c.status === 'rate_limited') b.denied++
    else b.error++
  }
  return buckets
}

/**
 * Resolves an API call against the in-memory state. Paths are the real API
 * paths without the /api/v1 prefix. Most mutations work so the demo feels
 * real; only account-level changes throw DemoModeError.
 */
export async function demoRequest(method: string, path: string, body?: unknown): Promise<unknown> {
  await new Promise((r) => setTimeout(r, 40 + Math.random() * 120))
  const url = new URL(path, 'http://demo')
  const p = url.pathname
  const q = url.searchParams
  const s = demoState
  const seg = p.split('/').filter(Boolean)

  // ---- auth ----
  if (p === '/auth/me') return clone(DEMO_USER)
  if (p === '/auth/login' || p === '/auth/signup' || p === '/auth/refresh' || p === '/auth/logout') {
    throw new DemoModeError('Signing in')
  }

  // ---- servers ----
  if (p === '/servers' && method === 'GET') return clone(s.servers)
  if (p === '/servers' && method === 'POST') {
    const b = body as Partial<Server> & { url: string; name: string }
    const srv: Server = {
      id: uid('srv'),
      name: b.name,
      url: b.url,
      transport: b.transport ?? 'auto',
      detected_transport: 'streamable_http',
      auth: { type: b.auth?.type ?? 'none', header_name: b.auth?.header_name ?? null, has_credentials: (b.auth?.type ?? 'none') !== 'none' },
      manifest: { tools: [], fetched_at: null, error: 'Demo servers have no manifest until the backend is connected.' },
      status: 'unknown',
      last_probe: { at: null, latency_ms: null, error: null },
      created_at: now(),
    }
    s.servers.unshift(srv)
    return clone(srv)
  }
  if (seg[0] === 'servers' && seg[1]) {
    const srv = s.servers.find((x) => x.id === seg[1]) ?? notFound('server')
    if (seg[2] === 'tools') return clone(srv.manifest.tools)
    if (seg[2] === 'probe') {
      srv.last_probe = { at: now(), latency_ms: 20 + Math.round(Math.random() * 200), error: null }
      srv.status = srv.status === 'unknown' ? 'healthy' : srv.status
      return clone(srv)
    }
    if (seg[2] === 'refresh-manifest') {
      srv.manifest.fetched_at = now()
      return clone(srv)
    }
    if (method === 'DELETE') {
      s.servers = s.servers.filter((x) => x.id !== srv.id)
      return undefined
    }
    if (method === 'PATCH' || method === 'PUT') {
      Object.assign(srv, body as Partial<Server>)
      return clone(srv)
    }
    return clone(srv)
  }

  // ---- loadouts ----
  if (p === '/loadouts' && method === 'GET') return clone(s.loadouts)
  if (p === '/loadouts' && method === 'POST') {
    const b = body as { name: string; description?: string }
    const slug = b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || uid('loadout')
    const lo: Loadout = {
      id: uid('lo'),
      name: b.name,
      slug,
      description: b.description ?? '',
      tools: [],
      settings: { approval_timeout_s: 120, agent_header: 'X-Agent-Name', default_timeout_s: 60, slack_webhook_configured: false },
      published: false,
      current_version: 0,
      overload: { score: 0, breakdown: { schema_tokens: 0, unused_tools: 0, duplicate_names: 0, avg_description_chars: 0 } },
      created_at: now(),
      updated_at: now(),
    }
    s.loadouts.unshift(lo)
    return clone(lo)
  }
  if (seg[0] === 'loadouts' && seg[1]) {
    const lo = s.loadouts.find((x) => x.id === seg[1] || x.slug === seg[1]) ?? notFound('loadout')
    if (!seg[2]) {
      if (method === 'GET') return clone(lo)
      if (method === 'DELETE') {
        s.loadouts = s.loadouts.filter((x) => x.id !== lo.id)
        return undefined
      }
      if (method === 'PATCH' || method === 'PUT') {
        const b = body as Partial<Loadout>
        if (b.name !== undefined) lo.name = b.name
        if (b.description !== undefined) lo.description = b.description
        if (b.settings) lo.settings = { ...lo.settings, ...b.settings }
        lo.updated_at = now()
        return clone(lo)
      }
    }
    if (seg[2] === 'tools' && method === 'PUT') {
      const b = body as { tools: ToolSpec[]; note?: string }
      const before = snapshots.get(`${lo.id}:${lo.current_version}`) ?? []
      const summary = diffLoadouts(before, b.tools)
      lo.tools = clone(b.tools)
      lo.current_version += 1
      lo.updated_at = now()
      lo.overload = recomputeOverload(lo, (t) => lookupTool(s, t))
      snapshots.set(`${lo.id}:${lo.current_version}`, clone(lo.tools))
      s.versions.push({ id: uid('v'), loadout_id: lo.id, version: lo.current_version, summary, created_at: now() })
      return clone(lo)
    }
    if (seg[2] === 'publish') {
      lo.published = true
      lo.updated_at = now()
      return clone(lo)
    }
    if (seg[2] === 'unpublish') {
      lo.published = false
      lo.updated_at = now()
      return clone(lo)
    }
    if (seg[2] === 'versions') {
      if (seg[3] && seg[4] === 'rollback') {
        const snap = snapshots.get(`${lo.id}:${seg[3]}`) ?? notFound('version')
        return demoRequest('PUT', `/loadouts/${lo.id}/tools`, { tools: snap })
      }
      return clone(s.versions.filter((v) => v.loadout_id === lo.id).sort((a, b) => b.version - a.version))
    }
    if (seg[2] === 'diff') {
      const from = Number(q.get('from'))
      const to = Number(q.get('to'))
      const a = snapshots.get(`${lo.id}:${from}`) ?? []
      const b = snapshots.get(`${lo.id}:${to}`) ?? lo.tools
      const ma = new Map(a.map((t) => [t.id, t]))
      const mb = new Map(b.map((t) => [t.id, t]))
      const diff: VersionDiff = {
        from,
        to,
        added: b.filter((t) => !ma.has(t.id)),
        removed: a.filter((t) => !mb.has(t.id)),
        changed: b
          .filter((t) => ma.has(t.id) && JSON.stringify(ma.get(t.id)) !== JSON.stringify(t))
          .map((t) => {
            const o = ma.get(t.id)!
            const fields = (Object.keys(t) as (keyof ToolSpec)[]).filter((k) => JSON.stringify(o[k]) !== JSON.stringify(t[k]))
            return { alias: t.alias, fields }
          }),
      }
      return clone(diff)
    }
    if (seg[2] === 'playground' && seg[3] === 'call') {
      const b = body as { alias: string; arguments: Record<string, unknown> }
      const t = lo.tools.find((x) => x.alias === b.alias) ?? notFound('tool')
      const srv = s.servers.find((x) => x.id === t.server_id) ?? notFound('server')
      const r = Math.random()
      const status = t.policy.mode === 'deny' ? 'denied' : t.policy.mode === 'approve' ? 'held_approved' : r < 0.92 ? 'ok' : 'error'
      const call: Call = {
        id: uid('c'),
        loadout_id: lo.id,
        loadout_slug: lo.slug,
        tool_id: t.id,
        alias: t.alias,
        server_id: srv.id,
        server_name: srv.name,
        upstream_name: t.upstream_name,
        agent: 'playground',
        api_key_name: null,
        source: 'playground',
        args_redacted: { ...b.arguments, ...t.presets },
        result_preview: status === 'ok' || status === 'held_approved' ? JSON.stringify({ ok: true, echo: b.arguments }, null, 2) : null,
        result_size: status === 'ok' ? 240 : 0,
        is_error: status !== 'ok' && status !== 'held_approved',
        status,
        error_message: status === 'denied' ? `Quiver: denied by policy 'deny' on tool ${t.alias}` : status === 'error' ? 'upstream: 502 Bad Gateway' : null,
        approval_id: null,
        started_at: now(),
        finished_at: now(),
        duration_ms: status === 'denied' ? 1 : 80 + Math.round(Math.random() * 600),
        policy_trace: [`alias ${t.alias} resolved to ${srv.name}/${t.upstream_name}`, `policy ${t.policy.mode}`],
      }
      s.calls.unshift(call)
      return clone(call)
    }
  }

  // ---- approvals ----
  if (p === '/approvals' && method === 'GET') {
    const status = q.get('status')
    const list = status ? s.approvals.filter((a) => a.status === status) : s.approvals
    return clone(list.slice(0, Number(q.get('limit') ?? 100)))
  }
  if (seg[0] === 'approvals' && seg[1]) {
    const a = s.approvals.find((x) => x.id === seg[1]) ?? notFound('approval')
    if (seg[2] === 'decide' && method === 'POST') {
      const b = body as { decision: 'approved' | 'denied'; reason?: string }
      if (a.status !== 'pending') throw Object.assign(new Error('Already decided'), { status: 409 })
      a.status = b.decision
      a.decided_at = now()
      a.decided_by = 'you'
      a.reason = b.reason ?? null
      const call = s.calls.find((c) => c.id === a.call_id)
      if (call) {
        call.status = b.decision === 'approved' ? 'held_approved' : 'held_denied'
        call.finished_at = now()
        call.duration_ms = Date.now() - new Date(call.started_at).getTime()
        call.is_error = b.decision !== 'approved'
      }
      return clone(a)
    }
    return clone(a)
  }

  // ---- calls ----
  if (p === '/calls' && method === 'GET') {
    let list = s.calls
    const lo = q.get('loadout_id')
    const st = q.get('status')
    const search = q.get('q')?.toLowerCase()
    if (lo) list = list.filter((c) => c.loadout_id === lo)
    if (st) list = list.filter((c) => c.status === st)
    if (search) list = list.filter((c) => c.alias.includes(search) || c.agent.includes(search))
    return clone(list.slice(0, Number(q.get('limit') ?? 200)))
  }
  if (p === '/calls/export') return clone(s.calls)
  if (seg[0] === 'calls' && seg[1]) return clone(s.calls.find((c) => c.id === seg[1]) ?? notFound('call'))

  // ---- keys ----
  if (p === '/keys' && method === 'GET') return clone(s.keys)
  if (p === '/keys' && method === 'POST') {
    const b = body as { name: string; scope: ApiKey['scope'] }
    const key: ApiKey = { id: uid('k'), name: b.name, prefix: 'qv_live_' + Math.random().toString(36).slice(2, 4), scope: b.scope, created_at: now(), last_used_at: null, revoked_at: null }
    s.keys.unshift(key)
    return { ...clone(key), plaintext: `qv_live_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}` }
  }
  if (seg[0] === 'keys' && seg[1] && method === 'DELETE') {
    const k = s.keys.find((x) => x.id === seg[1]) ?? notFound('key')
    k.revoked_at = now()
    return undefined
  }

  // ---- analytics ----
  if (p === '/analytics/overview') {
    const day = Date.now() - 86400000
    const prev = day - 86400000
    const last = s.calls.filter((c) => new Date(c.started_at).getTime() > day)
    const before = s.calls.filter((c) => {
      const t = new Date(c.started_at).getTime()
      return t <= day && t > prev
    })
    const o: AnalyticsOverview = {
      calls_24h: last.length,
      calls_prev_24h: before.length,
      held_now: s.approvals.filter((a) => a.status === 'pending').length,
      denied_24h: last.filter((c) => c.status === 'denied' || c.status === 'rate_limited').length,
      mean_overload: Math.round(s.loadouts.reduce((n, l) => n + l.overload.score, 0) / Math.max(1, s.loadouts.length)),
    }
    return o
  }
  if (p === '/analytics/timeseries') return bucketize(s.calls, Number(q.get('hours') ?? 24), Number(q.get('step') ?? 60))
  if (p === '/analytics/top-tools') {
    const m = new Map<string, TopTool & { durs: number[] }>()
    for (const c of s.calls) {
      const k = `${c.loadout_slug}/${c.alias}`
      const e = m.get(k) ?? { alias: c.alias, loadout_slug: c.loadout_slug, calls: 0, p50_ms: 0, durs: [] }
      e.calls++
      if (c.duration_ms) e.durs.push(c.duration_ms)
      m.set(k, e)
    }
    return [...m.values()]
      .map((e) => ({ alias: e.alias, loadout_slug: e.loadout_slug, calls: e.calls, p50_ms: e.durs.sort((a, b) => a - b)[Math.floor(e.durs.length / 2)] ?? 0 }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 8)
  }
  if (p === '/analytics/outcomes') {
    const m = new Map<string, number>()
    for (const c of s.calls) m.set(c.status, (m.get(c.status) ?? 0) + 1)
    return [...m.entries()].map(([status, count]) => ({ status, count }) as OutcomeSlice)
  }

  // ---- settings ----
  if (seg[0] === 'settings' || seg[0] === 'account') throw new DemoModeError('Changing account settings')

  notFound(`${method} ${p}`)
}

export { sampleArgs }
