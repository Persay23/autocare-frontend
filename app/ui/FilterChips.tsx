import type { Vehicle } from '@/lib/types'

interface FilterChipsProps {
  vehicles: Vehicle[]
  selectedId: number | null
  onSelect: (id: number | null) => void
}

interface ChipProps {
  label: string
  active: boolean
  onClick: () => void
}

export default function FilterChips({ vehicles, selectedId, onSelect }: FilterChipsProps) {
  return (
    <div style={{
      display: 'flex',
      gap: 6,
      padding: '0 22px 12px',
      overflowX: 'auto',
      scrollbarWidth: 'none',
    }}>
      <Chip
        label="All cars"
        active={selectedId === null}
        onClick={() => onSelect(null)}
      />
      {vehicles.map((v) => (
        <Chip
          key={v.vehicleId}
          label={`🚗 ${v.brand} ${v.model}`}
          active={selectedId === v.vehicleId}
          onClick={() => onSelect(v.vehicleId)}
        />
      ))}
    </div>
  )
}

function Chip({ label, active, onClick }: ChipProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 12px',
        borderRadius: 999,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
        background: active ? 'rgba(108,99,255,0.15)' : 'var(--surface2)',
        color: active ? 'var(--accent)' : 'var(--text3)',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}