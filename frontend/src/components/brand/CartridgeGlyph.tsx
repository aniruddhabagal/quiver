interface Props {
  size?: number
  className?: string
}

/** The mark: a chamfered cartridge with two rails through it. */
export function CartridgeGlyph({ size = 22, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <path d="M10 6h13l3 3v14l-3 3H9l-3-3V9z" stroke="var(--color-arc)" strokeWidth="2" />
      <path d="M6 13h20M6 19h20" stroke="var(--color-ion)" strokeWidth="1.5" opacity="0.9" />
    </svg>
  )
}
