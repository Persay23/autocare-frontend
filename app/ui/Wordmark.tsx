// Text wordmark used in the nav and home header. Replaces the PNG logo
// (whose white "Auto" was invisible on the light theme). Colours come from
// CSS variables, so it reads correctly in both themes.
export default function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span
      style={{
        fontSize: size,
        fontWeight: 800,
        color: 'var(--text)',
        letterSpacing: '-0.01em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      Auto<span style={{ color: 'var(--accent)' }}>Care</span>
    </span>
  )
}
