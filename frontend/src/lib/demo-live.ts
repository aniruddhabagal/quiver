import { demoState, sampleArgs } from './demo-api'
import { outcomeFor } from './demo-data'
import { createEventSink, useLiveStore } from '../stores/live-store'
import type { Approval, Call, WsEvent } from './types'

/**
 * A fake WebSocket. Emits the same event union as the real socket so the UI
 * built against it needs no changes when the backend lands. Writes into the
 * demo state so lists and analytics stay consistent with what streamed by.
 */
export function startDemoLive(onEvent?: (e: WsEvent) => void) {
  const sink = createEventSink()
  const emit = (e: WsEvent) => {
    sink(e)
    onEvent?.(e)
  }
  const timers = new Set<number>()
  const later = (ms: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      timers.delete(id)
      fn()
    }, ms)
    timers.add(id)
  }
  const ts = () => new Date().toISOString()
  const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`

  useLiveStore.getState().setConnection('demo')
  useLiveStore.getState().setPending(demoState.approvals.filter((a) => a.status === 'pending').length)

  const settle = (call: Call, approval: Approval | null) => {
    call.finished_at = ts()
    call.duration_ms = Date.now() - new Date(call.started_at).getTime()
    demoState.calls.unshift(call)
    if (demoState.calls.length > 600) demoState.calls.length = 600
    emit({ type: 'call.finished', ts: ts(), payload: { call_id: call.id, loadout_id: call.loadout_id, alias: call.alias, status: call.status, duration_ms: call.duration_ms, is_error: call.is_error } })
    void approval
  }

  const fire = () => {
    const published = demoState.loadouts.filter((l) => l.published && l.tools.some((t) => t.enabled))
    if (!published.length) return
    const lo = published[Math.random() < 0.7 ? 0 : Math.floor(Math.random() * published.length)]
    const enabled = lo.tools.filter((t) => t.enabled)
    const t = enabled[Math.floor(Math.random() * enabled.length)]
    const srv = demoState.servers.find((s) => s.id === t.server_id)
    if (!srv) return
    const { status, action } = outcomeFor(t.policy)
    const agent = lo.id === 'lo_ops' ? (Math.random() < 0.5 ? 'release-bot' : 'triage') : lo.id === 'lo_analyst' ? 'analyst' : 'qa'
    const call: Call = {
      id: uid('c'),
      loadout_id: lo.id,
      loadout_slug: lo.slug,
      tool_id: t.id,
      alias: t.alias,
      server_id: srv.id,
      server_name: srv.name,
      upstream_name: t.upstream_name,
      agent,
      api_key_name: agent,
      source: 'mcp',
      args_redacted: sampleArgs(t.alias),
      result_preview: null,
      result_size: 0,
      is_error: false,
      status,
      error_message: null,
      approval_id: null,
      started_at: ts(),
      finished_at: null,
      duration_ms: null,
      policy_trace: [`alias ${t.alias} resolved to ${srv.name}/${t.upstream_name}`, `policy ${t.policy.mode}`],
    }
    emit({ type: 'call.started', ts: ts(), payload: { call_id: call.id, loadout_id: lo.id, alias: t.alias, agent, source: 'mcp' } })

    later(120 + Math.random() * 200, () => {
      if (action === 'deny') {
        call.is_error = true
        call.error_message = status === 'rate_limited' ? `Quiver: rate limit of ${t.policy.rate_limit_per_min ?? 60} per minute reached` : `Quiver: denied by policy 'deny' on tool ${t.alias}`
        emit({ type: 'call.decision', ts: ts(), payload: { call_id: call.id, loadout_id: lo.id, action: 'deny', reason: call.error_message } })
        later(40, () => settle(call, null))
        return
      }
      if (action === 'allow') {
        emit({ type: 'call.decision', ts: ts(), payload: { call_id: call.id, loadout_id: lo.id, action: 'allow', reason: 'policy allow' } })
        later(200 + Math.random() * 900, () => {
          call.is_error = status === 'error'
          call.error_message = status === 'error' ? 'upstream: 502 Bad Gateway' : null
          call.result_preview = status === 'ok' ? '{"ok":true}' : null
          call.result_size = status === 'ok' ? 100 + Math.floor(Math.random() * 3000) : 0
          settle(call, null)
        })
        return
      }
      // hold
      const approval: Approval = {
        id: uid('a'),
        loadout_id: lo.id,
        loadout_slug: lo.slug,
        call_id: call.id,
        alias: t.alias,
        server_name: srv.name,
        args_redacted: call.args_redacted,
        agent,
        status: 'pending',
        requested_at: ts(),
        expires_at: new Date(Date.now() + lo.settings.approval_timeout_s * 1000).toISOString(),
        decided_at: null,
        decided_by: null,
        reason: null,
      }
      call.approval_id = approval.id
      demoState.approvals.unshift(approval)
      emit({ type: 'call.decision', ts: ts(), payload: { call_id: call.id, loadout_id: lo.id, action: 'hold', reason: 'policy approve', approval_id: approval.id } })
      emit({ type: 'approval.pending', ts: ts(), payload: approval })

      // If nobody in the UI decides, the demo decides for them after a while.
      const autoAfter = 25000 + Math.random() * 30000
      later(autoAfter, () => {
        if (approval.status !== 'pending') return
        const decision = status === 'expired' ? 'expired' : status === 'held_denied' ? 'denied' : 'approved'
        approval.status = decision
        approval.decided_at = ts()
        approval.decided_by = decision === 'expired' ? null : 'release-lead'
        call.status = decision === 'approved' ? 'held_approved' : decision === 'denied' ? 'held_denied' : 'expired'
        call.is_error = decision !== 'approved'
        call.error_message = decision === 'expired' ? `Quiver: approval expired after ${lo.settings.approval_timeout_s} s` : null
        emit({ type: 'approval.decided', ts: ts(), payload: { approval_id: approval.id, decision, decided_by: approval.decided_by } })
        settle(call, approval)
      })
      // user decisions arrive through demo-api; poll cheaply so the stream reflects them
      const watch = () => {
        if (approval.status === 'pending') {
          later(800, watch)
          return
        }
        if (!call.finished_at) {
          call.status = approval.status === 'approved' ? 'held_approved' : 'held_denied'
          call.is_error = approval.status !== 'approved'
          emit({ type: 'approval.decided', ts: ts(), payload: { approval_id: approval.id, decision: approval.status as 'approved' | 'denied', decided_by: approval.decided_by } })
          settle(call, approval)
        }
      }
      later(800, watch)
    })
  }

  let cancelled = false
  const loop = () => {
    if (cancelled) return
    if (document.visibilityState === 'visible') fire()
    later(1100 + Math.random() * 1900, loop)
  }
  later(600, loop)

  // occasional server status flicker
  const flicker = () => {
    if (cancelled) return
    const jira = demoState.servers.find((s) => s.id === 'srv_jira')
    if (jira) {
      jira.status = jira.status === 'degraded' ? 'healthy' : 'degraded'
      jira.last_probe = { at: ts(), latency_ms: jira.status === 'degraded' ? 640 : 180, error: null }
      emit({ type: 'server.status', ts: ts(), payload: { server_id: jira.id, status: jira.status, latency_ms: jira.last_probe.latency_ms } })
    }
    later(45000 + Math.random() * 30000, flicker)
  }
  later(30000, flicker)

  return () => {
    cancelled = true
    for (const id of timers) window.clearTimeout(id)
    timers.clear()
    useLiveStore.getState().setConnection('offline')
  }
}
