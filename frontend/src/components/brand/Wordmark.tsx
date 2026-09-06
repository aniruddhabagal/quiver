import { CartridgeGlyph } from './CartridgeGlyph'

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-fg-1">
      <CartridgeGlyph size={compact ? 20 : 24} />
      <span className="font-display font-semibold text-[1.125rem] leading-none tracking-tight">
        quiver
      </span>
    </span>
  )
}
