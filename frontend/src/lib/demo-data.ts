import type { ApiKey, Approval, Call, CallStatus, JsonSchema, Loadout, LoadoutVersion, Policy, Server, ToolSpec, UpstreamTool, User } from './types'

const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString()
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString()

const str = (description: string): JsonSchema => ({ type: 'string', description })
const bool = (description: string): JsonSchema => ({ type: 'boolean', description })
const num = (description: string): JsonSchema => ({ type: 'integer', description })

function tool(name: string, description: string, props: Record<string, JsonSchema>, required: string[]): UpstreamTool {
  return { name, description, inputSchema: { type: 'object', properties: props, required } }
}

export const DEMO_USER: User = { id: 'u_demo', email: 'you@example.com', display_name: 'Demo' }

const GITHUB_TOOLS: UpstreamTool[] = [
  tool('create_pull_request', 'Create a new pull request in a GitHub repository', { owner: str('Repository owner'), repo: str('Repository name'), title: str('PR title'), body: str('PR body'), head: str('Branch with changes'), base: str('Target branch'), draft: bool('Create as draft'), maintainer_can_modify: bool('Allow maintainer edits') }, ['owner', 'repo', 'title', 'head', 'base']),
  tool('search_code', 'Search code across repositories', { q: str('Search query'), per_page: num('Results per page') }, ['q']),
  tool('delete_branch', 'Delete a branch', { owner: str('Owner'), repo: str('Repository'), branch: str('Branch name') }, ['owner', 'repo', 'branch']),
  tool('list_issues', 'List issues in a repository', { owner: str('Owner'), repo: str('Repository'), state: { type: 'string', enum: ['open', 'closed', 'all'] } }, ['owner', 'repo']),
  tool('merge_pull_request', 'Merge a pull request', { owner: str('Owner'), repo: str('Repository'), number: num('PR number'), method: { type: 'string', enum: ['merge', 'squash', 'rebase'] } }, ['owner', 'repo', 'number']),
  tool('fork_repo', 'Fork a repository', { owner: str('Owner'), repo: str('Repository') }, ['owner', 'repo']),
  tool('get_file_contents', 'Read a file from a repository', { owner: str('Owner'), repo: str('Repository'), path: str('File path'), ref: str('Git ref') }, ['owner', 'repo', 'path']),
]
const SLACK_TOOLS: UpstreamTool[] = [
  tool('post_message', 'Post a message to a channel', { channel: str('Channel id'), text: str('Message text'), thread_ts: str('Thread timestamp') }, ['channel', 'text']),
  tool('list_channels', 'List channels in the workspace', { limit: num('Max channels') }, []),
  tool('upload_file', 'Upload a file to a channel', { channel: str('Channel'), content: str('File content'), filename: str('File name') }, ['channel', 'content']),
  tool('add_reaction', 'React to a message', { channel: str('Channel'), timestamp: str('Message ts'), name: str('Emoji name') }, ['channel', 'timestamp', 'name']),
  tool('get_channel_history', 'Read recent messages from a channel', { channel: str('Channel'), limit: num('Max messages') }, ['channel']),
]
const POSTGRES_TOOLS: UpstreamTool[] = [
  tool('query', 'Run a read-only SQL query', { sql: str('SQL statement') }, ['sql']),
  tool('list_tables', 'List tables in the database', { schema: str('Schema name') }, []),
  tool('describe_table', 'Describe columns of a table', { table: str('Table name') }, ['table']),
  tool('drop_table', 'Drop a table', { table: str('Table name'), cascade: bool('Cascade') }, ['table']),
  tool('vacuum', 'Vacuum a table', { table: str('Table name') }, []),
]
const FS_TOOLS: UpstreamTool[] = [
  tool('read_file', 'Read a file', { path: str('Absolute path') }, ['path']),
  tool('list_dir', 'List a directory', { path: str('Absolute path') }, ['path']),
  tool('write_file', 'Write a file', { path: str('Absolute path'), content: str('Content') }, ['path', 'content']),
  tool('delete_path', 'Delete a file or directory', { path: str('Absolute path'), recursive: bool('Recurse') }, ['path']),
  tool('search_files', 'Search files by pattern', { root: str('Root dir'), pattern: str('Glob') }, ['root', 'pattern']),
]
const JIRA_TOOLS: UpstreamTool[] = [
  tool('create_issue', 'Create an issue', { project: str('Project key'), summary: str('Summary'), description: str('Description'), issuetype: str('Issue type') }, ['project', 'summary']),
  tool('search_issues', 'Search issues with JQL', { jql: str('JQL'), max: num('Max results') }, ['jql']),
  tool('transition_issue', 'Move an issue to a status', { key: str('Issue key'), transition: str('Transition id') }, ['key', 'transition']),
  tool('delete_issue', 'Delete an issue', { key: str('Issue key') }, ['key']),
  tool('add_comment', 'Comment on an issue', { key: str('Issue key'), body: str('Comment') }, ['key', 'body']),
  tool('bulk_edit', 'Bulk edit issues', { jql: str('JQL'), fields: { type: 'object' } }, ['jql', 'fields']),
]
const BROWSER_TOOLS: UpstreamTool[] = [
  tool('navigate', 'Open a URL', { url: str('URL') }, ['url']),
  tool('screenshot', 'Capture the page', { full_page: bool('Full page') }, []),
  tool('click', 'Click an element', { selector: str('CSS selector') }, ['selector']),
  tool('type_text', 'Type into an element', { selector: str('CSS selector'), text: str('Text') }, ['selector', 'text']),
  tool('run_script', 'Evaluate JavaScript', { script: str('Script') }, ['script']),
  tool('get_text', 'Extract text from the page', { selector: str('CSS selector') }, []),
]

function server(id: string, name: string, url: string, tools: UpstreamTool[], opts: Partial<Server> = {}): Server {
  return {
    id,
    name,
    url,
    transport: 'auto',
    detected_transport: 'streamable_http',
    auth: { type: 'bearer', has_credentials: true },
    manifest: { tools, fetched_at: minutesAgo(12), error: null },
    status: 'healthy',
    last_probe: { at: minutesAgo(1), latency_ms: 84, error: null },
    created_at: daysAgo(21),
    ...opts,
  }
}

export const SERVERS: Server[] = [
  server('srv_github', 'github', 'https://mcp.github.example.com/mcp', GITHUB_TOOLS, { last_probe: { at: minutesAgo(1), latency_ms: 84, error: null } }),
  server('srv_slack', 'slack', 'https://slack-mcp.internal.example.com/mcp', SLACK_TOOLS, { last_probe: { at: minutesAgo(1), latency_ms: 121, error: null } }),
  server('srv_postgres', 'postgres', 'https://pg-mcp.internal.example.com/sse', POSTGRES_TOOLS, { detected_transport: 'sse', auth: { type: 'api_key_header', header_name: 'X-API-Key', has_credentials: true }, last_probe: { at: minutesAgo(1), latency_ms: 9, error: null } }),
  server('srv_fs', 'filesystem', 'https://fs-mcp.internal.example.com/mcp', FS_TOOLS, { auth: { type: 'none', has_credentials: false }, last_probe: { at: minutesAgo(1), latency_ms: 3, error: null } }),
  server('srv_jira', 'jira', 'https://jira-mcp.internal.example.com/mcp', JIRA_TOOLS, { status: 'degraded', last_probe: { at: minutesAgo(1), latency_ms: 640, error: null } }),
  server('srv_browser', 'browser', 'https://browser-mcp.internal.example.com/sse', BROWSER_TOOLS, { detected_transport: 'sse', auth: { type: 'none', has_credentials: false }, last_probe: { at: minutesAgo(1), latency_ms: 210, error: null } }),
]

export const ALLOW: Policy = { mode: 'allow', rate_limit_per_min: null, redact: [], timeout_s: null }
const APPROVE: Policy = { mode: 'approve', rate_limit_per_min: null, redact: [], timeout_s: null }
const REDACT_TOKENS = { pattern: '(ghp|sk|xoxb)-?[A-Za-z0-9_]{16,}', replacement: '••••' }

function spec(server_id: string, upstream_name: string, alias: string, policy: Policy, extra: Partial<ToolSpec> = {}): ToolSpec {
  return {
    id: `t_${server_id.slice(4)}_${upstream_name}`,
    server_id,
    upstream_name,
    alias,
    description_override: null,
    presets: {},
    hidden_args: [],
    policy,
    enabled: true,
    ...extra,
  }
}

const OPS_TOOLS: ToolSpec[] = [
  spec('srv_github', 'create_pull_request', 'open_pr', APPROVE, {
    description_override: 'Open a draft PR against main. Title under 70 chars. Body must link the issue.',
    presets: { draft: true, base: 'main' },
    hidden_args: ['maintainer_can_modify'],
    policy: { ...APPROVE, redact: [REDACT_TOKENS] },
  }),
  spec('srv_github', 'search_code', 'search_code', { ...ALLOW, rate_limit_per_min: 60 }),
  spec('srv_github', 'delete_branch', 'delete_branch', { ...APPROVE, redact: [REDACT_TOKENS] }),
  spec('srv_slack', 'post_message', 'post_message', { ...APPROVE, rate_limit_per_min: 20 }, { description_override: 'Post to #ops only. Keep it under 300 characters.', presets: { channel: 'C0OPS' } }),
  spec('srv_slack', 'list_channels', 'list_channels', ALLOW),
  spec('srv_postgres', 'query', 'query', { ...ALLOW, rate_limit_per_min: 120, timeout_s: 8 }, { description_override: 'Read-only SQL against the analytics replica. SELECT only.' }),
  spec('srv_postgres', 'list_tables', 'list_tables', ALLOW),
  spec('srv_postgres', 'drop_table', 'drop_table', { mode: 'deny', rate_limit_per_min: null, redact: [], timeout_s: null }),
  spec('srv_fs', 'read_file', 'read_file', ALLOW, { presets: {}, hidden_args: [] }),
  spec('srv_fs', 'list_dir', 'list_dir', ALLOW),
  spec('srv_jira', 'create_issue', 'create_issue', { ...ALLOW, rate_limit_per_min: 30 }, { presets: { project: 'OPS', issuetype: 'Task' } }),
  spec('srv_jira', 'search_issues', 'search_issues', ALLOW),
  spec('srv_browser', 'navigate', 'navigate', { ...ALLOW, timeout_s: 15 }),
]

export const LOADOUTS: Loadout[] = [
  {
    id: 'lo_ops',
    name: 'ops-agent',
    slug: 'ops-agent',
    description: 'Release and triage agent. Read broadly, write narrowly, ask before anything destructive.',
    tools: OPS_TOOLS,
    settings: { approval_timeout_s: 120, agent_header: 'X-Agent-Name', default_timeout_s: 60, slack_webhook_configured: true },
    published: true,
    current_version: 4,
    overload: { score: 27, breakdown: { schema_tokens: 2140, unused_tools: 2, duplicate_names: 1, avg_description_chars: 84 } },
    created_at: daysAgo(18),
    updated_at: daysAgo(2),
  },
  {
    id: 'lo_analyst',
    name: 'data-analyst',
    slug: 'data-analyst',
    description: 'Read-only analytics over the replica. No writes, ever.',
    tools: [
      spec('srv_postgres', 'query', 'query', { ...ALLOW, rate_limit_per_min: 240, timeout_s: 10 }),
      spec('srv_postgres', 'list_tables', 'list_tables', ALLOW),
      spec('srv_postgres', 'describe_table', 'describe_table', ALLOW),
      spec('srv_slack', 'post_message', 'share_result', APPROVE, { presets: { channel: 'C0DATA' } }),
    ],
    settings: { approval_timeout_s: 90, agent_header: 'X-Agent-Name', default_timeout_s: 30, slack_webhook_configured: false },
    published: true,
    current_version: 2,
    overload: { score: 11, breakdown: { schema_tokens: 620, unused_tools: 0, duplicate_names: 0, avg_description_chars: 41 } },
    created_at: daysAgo(9),
    updated_at: daysAgo(5),
  },
  {
    id: 'lo_qa',
    name: 'qa-browser',
    slug: 'qa-browser',
    description: 'Drives the staging site for visual checks. Screenshots are the output.',
    tools: [
      spec('srv_browser', 'navigate', 'navigate', ALLOW),
      spec('srv_browser', 'screenshot', 'screenshot', ALLOW),
      spec('srv_browser', 'click', 'click', ALLOW),
      spec('srv_browser', 'type_text', 'type_text', ALLOW),
      spec('srv_browser', 'get_text', 'get_text', ALLOW),
      spec('srv_browser', 'run_script', 'run_script', { mode: 'deny', rate_limit_per_min: null, redact: [], timeout_s: null }),
      spec('srv_jira', 'create_issue', 'file_bug', { ...APPROVE, rate_limit_per_min: 10 }, { presets: { project: 'QA', issuetype: 'Bug' } }),
    ],
    settings: { approval_timeout_s: 120, agent_header: 'X-Agent-Name', default_timeout_s: 45, slack_webhook_configured: false },
    published: false,
    current_version: 1,
    overload: { score: 19, breakdown: { schema_tokens: 980, unused_tools: 1, duplicate_names: 0, avg_description_chars: 33 } },
    created_at: daysAgo(3),
    updated_at: daysAgo(1),
  },
]

export const VERSIONS: LoadoutVersion[] = [
  { id: 'v_ops_1', loadout_id: 'lo_ops', version: 1, summary: { added: ['search_code', 'query', 'list_tables', 'read_file', 'list_dir'], removed: [], changed: [] }, created_at: daysAgo(18) },
  { id: 'v_ops_2', loadout_id: 'lo_ops', version: 2, summary: { added: ['open_pr', 'delete_branch', 'post_message', 'list_channels'], removed: [], changed: ['query'] }, created_at: daysAgo(12) },
  { id: 'v_ops_3', loadout_id: 'lo_ops', version: 3, summary: { added: ['write_file', 'navigate', 'search_issues'], removed: [], changed: ['open_pr'] }, created_at: daysAgo(6) },
  { id: 'v_ops_4', loadout_id: 'lo_ops', version: 4, summary: { added: ['create_issue'], removed: ['write_file'], changed: ['post_message', 'open_pr'] }, created_at: daysAgo(2) },
  { id: 'v_an_1', loadout_id: 'lo_analyst', version: 1, summary: { added: ['query', 'list_tables', 'describe_table'], removed: [], changed: [] }, created_at: daysAgo(9) },
  { id: 'v_an_2', loadout_id: 'lo_analyst', version: 2, summary: { added: ['share_result'], removed: [], changed: ['query'] }, created_at: daysAgo(5) },
  { id: 'v_qa_1', loadout_id: 'lo_qa', version: 1, summary: { added: ['navigate', 'screenshot', 'click', 'type_text', 'get_text', 'run_script', 'file_bug'], removed: [], changed: [] }, created_at: daysAgo(3) },
]

export const KEYS: ApiKey[] = [
  { id: 'k_ops', name: 'release-bot', prefix: 'qv_live_3f', scope: { type: 'loadout', loadout_id: 'lo_ops' }, created_at: daysAgo(17), last_used_at: minutesAgo(1), revoked_at: null },
  { id: 'k_triage', name: 'triage', prefix: 'qv_live_9a', scope: { type: 'loadout', loadout_id: 'lo_ops' }, created_at: daysAgo(15), last_used_at: minutesAgo(3), revoked_at: null },
  { id: 'k_analyst', name: 'analyst', prefix: 'qv_live_c1', scope: { type: 'loadout', loadout_id: 'lo_analyst' }, created_at: daysAgo(8), last_used_at: minutesAgo(9), revoked_at: null },
  { id: 'k_ci', name: 'ci (account)', prefix: 'qv_live_77', scope: { type: 'account' }, created_at: daysAgo(20), last_used_at: daysAgo(1), revoked_at: null },
  { id: 'k_old', name: 'laptop', prefix: 'qv_live_02', scope: { type: 'account' }, created_at: daysAgo(30), last_used_at: daysAgo(12), revoked_at: daysAgo(4) },
]

const AGENTS = ['release-bot', 'triage', 'analyst', 'qa']

const SAMPLE_ARGS: Record<string, Record<string, unknown>> = {
  open_pr: { owner: 'acme', repo: 'billing', title: 'Fix refund loop on partial captures', head: 'hotfix/refund-loop' },
  search_code: { q: 'refund_loop repo:acme/billing', per_page: 20 },
  delete_branch: { owner: 'acme', repo: 'billing', branch: 'hotfix/refund-loop', token: '••••' },
  post_message: { text: 'Deploy 2026.09.07 finished. 0 errors in the first 10 minutes.' },
  list_channels: { limit: 50 },
  query: { sql: 'select count(*) from refunds where created_at > now() - interval \'1 day\'' },
  list_tables: { schema: 'public' },
  drop_table: { table: 'refunds_tmp' },
  read_file: { path: '/srv/app/config/prod.yaml' },
  list_dir: { path: '/srv/app/config' },
  create_issue: { summary: 'Refund loop on partial captures', description: 'Seen in 3 accounts since the 09.06 deploy.' },
  search_issues: { jql: 'project = OPS AND status = Open', max: 25 },
  navigate: { url: 'https://staging.acme.dev/checkout' },
  screenshot: { full_page: true },
  click: { selector: '#pay' },
  type_text: { selector: '#email', text: 'qa@acme.dev' },
  get_text: { selector: '.total' },
  run_script: { script: 'document.cookie' },
  file_bug: { summary: 'Checkout total wraps on 390px' },
  describe_table: { table: 'refunds' },
  share_result: { text: 'Refunds up 12% week over week.' },
}

export function sampleArgs(alias: string): Record<string, unknown> {
  return SAMPLE_ARGS[alias] ?? {}
}

export function outcomeFor(policy: Policy, r = Math.random()): { status: CallStatus; action: 'allow' | 'hold' | 'deny' } {
  if (policy.mode === 'deny') return { status: 'denied', action: 'deny' }
  if (policy.mode === 'approve') {
    if (r < 0.7) return { status: 'held_approved', action: 'hold' }
    if (r < 0.88) return { status: 'held_denied', action: 'hold' }
    return { status: 'expired', action: 'hold' }
  }
  if (r < 0.9) return { status: 'ok', action: 'allow' }
  if (r < 0.96) return { status: 'error', action: 'allow' }
  return { status: 'rate_limited', action: 'deny' }
}

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

export function buildCalls(loadouts: Loadout[], servers: Server[], count = 220): Call[] {
  const rand = seeded(7)
  const calls: Call[] = []
  const now = Date.now()
  for (let i = 0; i < count; i++) {
    const lo = loadouts[rand() < 0.7 ? 0 : rand() < 0.6 ? 1 : 2]
    const enabled = lo.tools.filter((t) => t.enabled)
    const t = enabled[Math.floor(rand() * enabled.length)]
    const srv = servers.find((s) => s.id === t.server_id)!
    const { status } = outcomeFor(t.policy, rand())
    const started = now - Math.floor(rand() * 48 * 3600000)
    const dur = status === 'denied' || status === 'rate_limited' ? 1 : status.startsWith('held') || status === 'expired' ? 4000 + Math.floor(rand() * 60000) : Math.floor(5 + rand() * 900)
    const agent = lo.id === 'lo_ops' ? (rand() < 0.5 ? 'release-bot' : 'triage') : lo.id === 'lo_analyst' ? 'analyst' : 'qa'
    calls.push({
      id: `c_${i.toString(36)}${Math.floor(rand() * 1e6).toString(36)}`,
      loadout_id: lo.id,
      loadout_slug: lo.slug,
      tool_id: t.id,
      alias: t.alias,
      server_id: srv.id,
      server_name: srv.name,
      upstream_name: t.upstream_name,
      agent,
      api_key_name: agent,
      source: rand() < 0.06 ? 'playground' : 'mcp',
      args_redacted: sampleArgs(t.alias),
      result_preview: status === 'ok' || status === 'held_approved' ? '{"ok":true,"items":3}' : null,
      result_size: status === 'ok' || status === 'held_approved' ? 120 + Math.floor(rand() * 4000) : 0,
      is_error: status !== 'ok' && status !== 'held_approved',
      status,
      error_message:
        status === 'denied' ? 'Quiver: denied by policy on this tool' : status === 'rate_limited' ? 'Quiver: rate limit of 60 per minute reached' : status === 'expired' ? 'Quiver: approval expired after 120 s' : status === 'error' ? 'upstream: 502 Bad Gateway' : null,
      approval_id: status.startsWith('held') || status === 'expired' ? `a_${i}` : null,
      started_at: new Date(started).toISOString(),
      finished_at: new Date(started + dur).toISOString(),
      duration_ms: dur,
      policy_trace: [
        `alias ${t.alias} resolved to ${srv.name}/${t.upstream_name}`,
        t.policy.rate_limit_per_min ? `rate limit ${t.policy.rate_limit_per_min}/min: ${status === 'rate_limited' ? 'exceeded' : 'ok'}` : 'no rate limit',
        `policy ${t.policy.mode}`,
        ...(Object.keys(t.presets).length ? [`presets applied: ${Object.keys(t.presets).join(', ')}`] : []),
        ...(t.hidden_args.length ? [`hidden args stripped: ${t.hidden_args.join(', ')}`] : []),
        ...(t.policy.redact.length ? ['redaction applied to args and result'] : []),
      ],
    })
  }
  return calls.sort((a, b) => b.started_at.localeCompare(a.started_at))
}

export function buildApprovals(calls: Call[], servers: Server[]): Approval[] {
  const out: Approval[] = []
  for (const c of calls) {
    if (!c.approval_id) continue
    const decided = c.status === 'held_approved' ? 'approved' : c.status === 'held_denied' ? 'denied' : 'expired'
    out.push({
      id: c.approval_id,
      loadout_id: c.loadout_id,
      loadout_slug: c.loadout_slug,
      call_id: c.id,
      alias: c.alias,
      server_name: servers.find((s) => s.id === c.server_id)?.name ?? '',
      args_redacted: c.args_redacted,
      agent: c.agent,
      status: decided,
      requested_at: c.started_at,
      expires_at: new Date(new Date(c.started_at).getTime() + 120000).toISOString(),
      decided_at: c.finished_at,
      decided_by: decided === 'expired' ? null : 'you',
      reason: decided === 'denied' ? 'Not during the deploy window.' : null,
    })
  }
  // two live pending ones so the inbox is never empty on first visit
  const pendingBase = calls.find((c) => c.alias === 'delete_branch') ?? calls[0]
  out.unshift(
    {
      id: 'a_pending_1',
      loadout_id: 'lo_ops',
      loadout_slug: 'ops-agent',
      call_id: 'c_pending_1',
      alias: 'delete_branch',
      server_name: 'github',
      args_redacted: { owner: 'acme', repo: 'billing', branch: 'hotfix/refund-loop', token: '••••' },
      agent: 'release-bot',
      status: 'pending',
      requested_at: new Date(Date.now() - 12000).toISOString(),
      expires_at: new Date(Date.now() + 108000).toISOString(),
      decided_at: null,
      decided_by: null,
      reason: null,
    },
    {
      id: 'a_pending_2',
      loadout_id: 'lo_analyst',
      loadout_slug: 'data-analyst',
      call_id: 'c_pending_2',
      alias: 'share_result',
      server_name: 'slack',
      args_redacted: { text: 'Refunds up 12% week over week. Chart attached.' },
      agent: 'analyst',
      status: 'pending',
      requested_at: new Date(Date.now() - 41000).toISOString(),
      expires_at: new Date(Date.now() + 49000).toISOString(),
      decided_at: null,
      decided_by: null,
      reason: null,
    },
  )
  void pendingBase
  void AGENTS
  return out
}
