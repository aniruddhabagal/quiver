export type Policy = 'allow' | 'approve'

export interface HeroTool {
  id: string
  name: string
  lit: boolean
  policy: Policy
}

export interface HeroServer {
  id: string
  name: string
  tools: HeroTool[]
}

const t = (name: string, lit = false, policy: Policy = 'allow'): HeroTool => ({
  id: name,
  name,
  lit,
  policy,
})

export const SERVERS: HeroServer[] = [
  {
    id: 'github',
    name: 'github',
    tools: [t('create_pull_request', true, 'approve'), t('search_code', true), t('delete_branch', true, 'approve'), t('fork_repo')],
  },
  {
    id: 'slack',
    name: 'slack',
    tools: [t('post_message', true, 'approve'), t('list_channels', true), t('upload_file'), t('add_reaction')],
  },
  {
    id: 'postgres',
    name: 'postgres',
    tools: [t('query', true), t('list_tables', true), t('drop_table'), t('vacuum')],
  },
  {
    id: 'filesystem',
    name: 'filesystem',
    tools: [t('read_file', true), t('list_dir', true), t('write_file'), t('delete_path')],
  },
  {
    id: 'jira',
    name: 'jira',
    tools: [t('create_issue', true), t('search_issues', true), t('delete_issue'), t('bulk_edit')],
  },
  {
    id: 'browser',
    name: 'browser',
    tools: [t('navigate', true), t('screenshot'), t('click'), t('run_script')],
  },
]

// Phones get three servers with three tools each; the flow turns vertical.
export const SERVERS_COMPACT: HeroServer[] = SERVERS.slice(0, 3).map((s) => ({
  ...s,
  tools: s.tools.slice(0, 3),
}))

export interface Pt {
  x: number
  y: number
}

export interface ServerBox {
  server: HeroServer
  x: number
  y: number
  w: number
  h: number
}

export interface ToolRow {
  tool: HeroTool
  serverIdx: number
  x: number
  y: number
  w: number
  h: number
  /** Where a wire leaves this tool. */
  out: Pt
}

export interface Layout {
  compact: boolean
  width: number
  height: number
  servers: ServerBox[]
  tools: ToolRow[]
  cartridge: { x: number; y: number; w: number; h: number; cx: number; cy: number }
  endpoint: { x: number; y: number; w: number; h: number }
  stampAt: Pt
  parkAt: Pt
  /** Wire from a lit tool into the cartridge. */
  wirePath: (toolIdx: number) => string
  /** Wire from the cartridge to the endpoint. */
  outPath: string
  litCount: number
}

function bezierH(a: Pt, b: Pt): string {
  const dx = (b.x - a.x) * 0.55
  return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`
}

function bezierV(a: Pt, b: Pt): string {
  const dy = (b.y - a.y) * 0.55
  return `M ${a.x} ${a.y} C ${a.x} ${a.y + dy}, ${b.x} ${b.y - dy}, ${b.x} ${b.y}`
}

export function buildLayout(compact: boolean): Layout {
  if (!compact) {
    const width = 1200
    const height = 600
    const rowH = 22
    const top = 36
    const toolX = 214
    const toolW = 190
    const servers: ServerBox[] = []
    const tools: ToolRow[] = []
    let row = 0
    SERVERS.forEach((s, si) => {
      const groupTop = top + row * rowH
      const groupH = s.tools.length * rowH
      servers.push({ server: s, x: 32, y: groupTop + groupH / 2 - 17, w: 150, h: 34 })
      s.tools.forEach((tool) => {
        const y = top + row * rowH
        tools.push({
          tool,
          serverIdx: si,
          x: toolX,
          y,
          w: toolW,
          h: rowH,
          out: { x: toolX + toolW + 6, y: y + rowH / 2 },
        })
        row++
      })
    })
    const cartridge = { x: 640, y: 200, w: 170, h: 200, cx: 725, cy: 300 }
    const endpoint = { x: 900, y: 268, w: 280, h: 64 }
    const lit = tools.map((r, i) => ({ r, i })).filter(({ r }) => r.tool.lit)
    const litCount = lit.length
    const entry = new Map<number, Pt>()
    lit.forEach(({ i }, k) => {
      entry.set(i, { x: cartridge.x, y: cartridge.cy + (k - (litCount - 1) / 2) * 9 })
    })
    return {
      compact,
      width,
      height,
      servers,
      tools,
      cartridge,
      endpoint,
      stampAt: { x: cartridge.cx, y: cartridge.y - 34 },
      parkAt: { x: cartridge.x + 24, y: cartridge.cy },
      wirePath: (i) => bezierH(tools[i].out, entry.get(i) ?? { x: cartridge.x, y: cartridge.cy }),
      outPath: bezierH({ x: cartridge.x + cartridge.w, y: cartridge.cy }, { x: endpoint.x, y: endpoint.y + endpoint.h / 2 }),
      litCount,
    }
  }

  const width = 400
  const height = 740
  const colW = 124
  const chipW = 116
  const chipH = 26
  const servers: ServerBox[] = []
  const tools: ToolRow[] = []
  SERVERS_COMPACT.forEach((s, si) => {
    const x = 12 + si * colW
    servers.push({ server: s, x, y: 16, w: chipW, h: 26 })
    s.tools.forEach((tool, ti) => {
      const y = 56 + ti * 36
      tools.push({ tool, serverIdx: si, x, y, w: chipW, h: chipH, out: { x: x + chipW / 2, y: y + chipH } })
    })
  })
  const cartridge = { x: 125, y: 260, w: 150, h: 170, cx: 200, cy: 345 }
  const endpoint = { x: 16, y: 560, w: 368, h: 64 }
  const lit = tools.map((r, i) => ({ r, i })).filter(({ r }) => r.tool.lit)
  const litCount = lit.length
  const entry = new Map<number, Pt>()
  lit.forEach(({ i }, k) => {
    entry.set(i, { x: cartridge.cx + (k - (litCount - 1) / 2) * 14, y: cartridge.y })
  })
  return {
    compact,
    width,
    height,
    servers,
    tools,
    cartridge,
    endpoint,
    stampAt: { x: cartridge.x + cartridge.w + 58, y: cartridge.cy },
    parkAt: { x: cartridge.cx, y: cartridge.y + 24 },
    wirePath: (i) => bezierV(tools[i].out, entry.get(i) ?? { x: cartridge.cx, y: cartridge.y }),
    outPath: bezierV({ x: cartridge.cx, y: cartridge.y + cartridge.h }, { x: cartridge.cx, y: endpoint.y }),
    litCount,
  }
}
