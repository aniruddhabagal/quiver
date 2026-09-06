import { Section } from '../Section'
import { ServerTableMock } from '../mocks/ServerTableMock'
import { SchemaDiff, type DiffLine } from '../../../components/brand/SchemaDiff'
import { EndpointBlock } from '../../../components/brand/EndpointBlock'

const DIFF: DiffLine[] = [
  { kind: 'same', text: '{' },
  { kind: 'del', text: '  "name": "create_pull_request",' },
  { kind: 'add', text: '  "name": "open_pr",' },
  { kind: 'del', text: '  "description": "Create a new pull request in a GitHub repository",' },
  { kind: 'add', text: '  "description": "Open a draft PR against main. Title under 70 chars.' },
  { kind: 'add', text: '                  Body must link the issue.",' },
  { kind: 'same', text: '  "inputSchema": {' },
  { kind: 'same', text: '    "properties": {' },
  { kind: 'same', text: '      "owner": { "type": "string" },' },
  { kind: 'same', text: '      "repo":  { "type": "string" },' },
  { kind: 'same', text: '      "title": { "type": "string" },' },
  { kind: 'same', text: '      "body":  { "type": "string" },' },
  { kind: 'del', text: '      "draft": { "type": "boolean" },' },
  { kind: 'note', text: '      preset: draft is always true' },
  { kind: 'del', text: '      "maintainer_can_modify": { "type": "boolean" }' },
  { kind: 'note', text: '      hidden from the agent' },
  { kind: 'same', text: '    },' },
  { kind: 'del', text: '    "required": ["owner", "repo", "title", "draft"]' },
  { kind: 'add', text: '    "required": ["owner", "repo", "title"]' },
  { kind: 'same', text: '  }' },
  { kind: 'same', text: '}' },
]

export function HowItWorks() {
  return (
    <Section
      id="how-it-works"
      rule
      title="Connect. Curate. Publish."
      lede="Three steps, and the last one is a URL."
    >
      <div className="grid gap-6 lg:grid-cols-12 items-start" data-reveal-stagger>
        <Step
          className="lg:col-span-4"
          title="Connect your servers"
          copy="Point Quiver at every remote MCP server you run. It fetches their tool manifests, probes health, and keeps credentials encrypted."
        >
          <ServerTableMock />
        </Step>
        <Step
          className="lg:col-span-5"
          title="Curate what the agent sees"
          copy="Pick tools across servers. Rename them, rewrite descriptions, pin arguments the agent should never choose, hide the rest."
        >
          <SchemaDiff title="github / create_pull_request" lines={DIFF} />
        </Step>
        <Step
          className="lg:col-span-3"
          title="Publish one endpoint"
          copy="Each loadout is a real MCP server. Hand the URL and a scoped key to Claude Code, Cursor, or your own agent."
        >
          <EndpointBlock url="https://quiver.aniruddha.fyi/mcp/ops-agent" apiKey="qv_live_••••••••••••3f9a" />
          <p className="t-body-sm text-fg-3 mt-4">
            Speaks MCP over Streamable HTTP. Works with anything that can add a remote server.
          </p>
        </Step>
      </div>
    </Section>
  )
}

function Step({
  title,
  copy,
  children,
  className,
}: {
  title: string
  copy: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <h3 className="t-display-sm text-fg-1">{title}</h3>
      <p className="t-body-sm text-fg-2 mt-2 mb-5 max-w-[42ch]">{copy}</p>
      {children}
    </div>
  )
}
