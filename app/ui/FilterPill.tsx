import { useState, useRef, useEffect } from 'react'
import type { FilterOption } from '@/shared/filters'

/**
 * Self-contained filter/sort pill — trigger button + dropdown in one component.
 *
 * Single-select  : pass `value` + `onChange`  — auto-closes on pick, radio-style highlight
 * Multi-select   : pass `selected` + `onChangeMulti` + `multi` — stays open, checkbox rows
 * Sort           : same as single-select but pass `isSort` so the pill never shows the
 *                  "active" accent at rest (sort always has a value, but that's expected)
 *
 * Each instance manages its own open state + outside-click — no boilerplate in pages.
 */

interface FilterPillProps {
  /** Shown on the pill when nothing is selected (e.g. "Type", "State"). For sort, this
   *  is never shown — the current option label is always used instead. */
  placeholder: string

  options: FilterOption[]

  // ── Single-select ──────────────────────────────────────────────────────────
  value?: string
  onChange?: (key: string) => void

  // ── Multi-select ───────────────────────────────────────────────────────────
  selected?: string[]
  onChangeMulti?: (keys: string[]) => void
  multi?: boolean
  /** Pluralised noun used for the "3 states" compact label. Defaults to "selected". */
  noun?: string

  // ── Visual tweaks ──────────────────────────────────────────────────────────
  /** When true, the pill never shows the accent colour at rest — only while open.
   *  Use for sort, where there is always a value but it's not a "filter". */
  isSort?: boolean
  minWidth?: number
  /** Which side of the trigger the dropdown anchors to. Default: left. */
  align?: 'left' | 'right'
}

export default function FilterPill({
  placeholder,
  options,
  value,
  onChange,
  selected = [],
  onChangeMulti,
  multi = false,
  noun = 'selected',
  isSort = false,
  minWidth = 180,
  align = 'left',
}: FilterPillProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Outside-click — only active while open to avoid always-on listener cost
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // ── Pill display label ─────────────────────────────────────────────────────
  const pillText = (() => {
    if (multi) {
      if (selected.length === 0) return placeholder
      if (selected.length === 1) {
        const raw = options.find((o) => o.key === selected[0])?.label ?? selected[0]
        return raw.replace(/\s*\(\d+\)$/, '') // strip " (N)" count suffix
      }
      return `${selected.length} ${noun}`
    }
    // single / sort: show the matched option label; fall back to placeholder
    if (!value || value === 'all') return placeholder
    return options.find((o) => o.key === value)?.label ?? value
  })()

  // ── Active state — drives accent colour on the pill ───────────────────────
  const isActive = isSort
    ? false
    : multi
    ? selected.length > 0
    : Boolean(value) && value !== 'all'

  const accent = open || isActive

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSingle = (key: string) => {
    onChange?.(key)
    setOpen(false)
  }

  const handleMulti = (key: string) => {
    if (!onChangeMulti) return
    onChangeMulti(
      selected.includes(key)
        ? selected.filter((k) => k !== key)
        : [...selected, key],
    )
    // intentionally stays open
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} style={{ position: 'relative' }}>

      {/* Trigger pill */}
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '5px 10px', borderRadius: 999, cursor: 'pointer',
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 500,
          whiteSpace: 'nowrap',
          border:      accent ? '1px solid var(--accent)' : '1px solid var(--border)',
          background:  accent ? 'rgba(108,99,255,0.1)'    : 'var(--surface2)',
          color:       accent ? 'var(--accent)'            : 'var(--text3)',
          transition:  'border-color 0.15s, background 0.15s, color 0.15s',
        }}
      >
        {pillText} ▾
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute',
          ...(align === 'right' ? { right: 0 } : { left: 0 }),
          top: 'calc(100% + 6px)',
          zIndex: 200,
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          overflow: 'hidden',
          minWidth,
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }}>

          {/* Multi-select: clear row */}
          {multi && selected.length > 0 && (
            <button
              onClick={() => onChangeMulti?.([])}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '9px 14px', background: 'none', border: 'none',
                borderBottom: '1px solid var(--border)',
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                color: 'var(--text3)', cursor: 'pointer',
              }}
            >
              × Clear ({selected.length} selected)
            </button>
          )}

          {options.map(({ key, label, color }) => {
            const isSelected = multi ? selected.includes(key) : value === key
            return (
              <button
                key={key}
                onClick={() => (multi ? handleMulti(key) : handleSingle(key))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', textAlign: 'left',
                  padding: '10px 14px', background: 'none', border: 'none',
                  borderBottom: '1px solid var(--border)',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                  color: isSelected ? 'var(--accent)' : 'var(--text2)',
                  fontWeight: isSelected ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                {/* Checkbox (multi-select only) */}
                {multi && (
                  <span style={{
                    width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                    border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                    background: isSelected ? 'var(--accent)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, color: '#fff',
                  }}>
                    {isSelected && '✓'}
                  </span>
                )}

                {/* Colored dot (optional) */}
                {color && (
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: color, flexShrink: 0,
                  }} />
                )}

                {/* Single-select: leading checkmark */}
                {!multi && isSelected && '✓ '}
                {label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
