import { Wordmark } from '../../../components/brand/Wordmark'

export function Footer() {
  return (
    <footer className="rule-top py-8">
      <div className="container flex flex-wrap items-center justify-between gap-4 t-body-sm text-fg-3">
        <Wordmark compact />
        <div className="flex flex-wrap items-center gap-6">
          <span>MIT licensed</span>
          <a href="https://github.com/aniruddhabagal/quiver" className="link" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href="https://mcp-hub.aniruddha.fyi" className="link" target="_blank" rel="noreferrer">
            MCP-Hub
          </a>
          <a href="https://aniruddha.fyi" className="link" target="_blank" rel="noreferrer">
            Made by Aniruddha
          </a>
        </div>
      </div>
    </footer>
  )
}
