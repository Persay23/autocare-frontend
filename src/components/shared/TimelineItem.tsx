import type { TimelineEvent } from '../../types'

interface TimelineItemProps {
  event: TimelineEvent
  showVehicle?: boolean
  onClick?: () => void
  isLast?: boolean
}

const DOT_STYLES: Record<string, { borderColor: string; bg: string; icon: string }> = {
  Maintenance: { borderColor: 'var(--accent)',  bg: 'rgba(108,99,255,0.12)', icon: '🔧' },
  Fuel:        { borderColor: 'var(--accent2)', bg: 'rgba(79,143,255,0.12)',  icon: '⛽' },
  Liquid:      { borderColor: 'var(--accent4)', bg: 'rgba(56,189,248,0.12)', icon: '💧' },
  Other:       { borderColor: 'var(--orange)',  bg: 'rgba(251,146,60,0.12)', icon: '📋' },
}

export default function TimelineItem({ event, showVehicle, onClick, isLast }: TimelineItemProps) {
  const dot = DOT_STYLES[event.type] ?? DOT_STYLES.Other

  const formattedDate = event.date
    ? new Date(event.date).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—'

  return (
    <div style={{ display: 'flex', gap: 14, paddingBottom: isLast ? 0 : 15 }}>
      {/* Left — dot + line */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
        <div
          onClick={onClick}
          style={{
            width: 28, height: 28, borderRadius: '50%',
            background: dot.bg,
            border: `2px solid ${dot.borderColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, flexShrink: 0,
            cursor: onClick ? 'pointer' : 'default',
            zIndex: 1,
          }}
        >
          {dot.icon}
        </div>
        {!isLast && (
          <div style={{
            width: 1,
            flex: 1,
            background: 'var(--border)',
            marginTop: 4,
            marginBottom: -20, // pulls line into the next item's padding space
          }} />
        )}
      </div>

      {/* Right — content */}
      <div
        onClick={onClick}
        style={{
          flex: 1,
          paddingTop: 4,
          cursor: onClick ? 'pointer' : 'default',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>
            {event.description}
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: 'var(--text2)',
          }}>
            {formattedDate}
            {showVehicle && event.vehicleName && ` · ${event.vehicleName}`}
          </div>
        </div>
        {event.cost != null && event.cost > 0 && (
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--accent3)',
            flexShrink: 0,
            paddingLeft: 8,
          }}>
            {event.cost.toLocaleString()} zł
          </div>
        )}
      </div>
    </div>
  )
}