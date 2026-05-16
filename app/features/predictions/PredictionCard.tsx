import type { Prediction } from '@/lib/types'

interface PredictionCardProps {
  prediction: Prediction
  onDone?: (p: Prediction) => void
  onIgnore?: (p: Prediction) => void
  onClick?: () => void
}

const URGENCY_STYLE: Record<string, { dot: string; label: string; border: string; bg: string }> = {
  Immediate: { dot: 'var(--red)',    label: 'var(--red)',    border: 'rgba(248,113,113,0.3)', bg: 'rgba(248,113,113,0.06)' },
  Soon:      { dot: 'var(--orange)', label: 'var(--orange)', border: 'rgba(251,146,60,0.3)',  bg: 'rgba(251,146,60,0.06)'  },
  Scheduled: { dot: 'var(--yellow)', label: 'var(--yellow)', border: 'rgba(251,191,36,0.3)',  bg: 'rgba(251,191,36,0.05)'  },
  Suggested: { dot: 'var(--green)',  label: 'var(--green)',  border: 'rgba(52,211,153,0.25)', bg: 'rgba(52,211,153,0.05)'  },
}

export default function PredictionCard({ prediction, onDone, onIgnore, onClick }: PredictionCardProps) {
  const isCompleted = prediction.status === 'Completed'
  const isIgnored   = prediction.status === 'Ignored'
  const isDim       = isCompleted || isIgnored

  const urgencyStyle = URGENCY_STYLE[prediction.urgency] ?? URGENCY_STYLE.Suggested

  const cardStyle = isDim
    ? { background: 'var(--surface2)', borderColor: 'var(--border)', opacity: isDim ? (isCompleted ? 0.55 : 0.4) : 1 }
    : { background: urgencyStyle.bg, borderColor: urgencyStyle.border }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div
      onClick={onClick}
      style={{
        margin: '0 0 10px',
        border: '1px solid',
        borderRadius: 14,
        padding: 14,
        cursor: onClick ? 'pointer' : 'default',
        ...cardStyle,
      }}
    >
      {/* Urgency row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        {!isDim ? (
          <>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: urgencyStyle.dot, flexShrink: 0,
              boxShadow: `0 0 4px ${urgencyStyle.dot}`,
            }} />
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.1em',
              color: urgencyStyle.label,
            }}>
              {prediction.urgency}
            </span>
          </>
        ) : (
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            color: isCompleted ? 'var(--green)' : 'var(--text3)',
          }}>
            {isCompleted ? '✓ Completed' : '— Ignored'}
          </span>
        )}
      </div>

      {/* Title */}
      <div style={{
        fontSize: 15,
        fontWeight: 700,
        color: isDim ? 'var(--text3)' : 'var(--text)',
        textDecoration: isCompleted ? 'line-through' : 'none',
        marginBottom: 5,
        lineHeight: 1.3,
      }}>
        {prediction.title}
      </div>

      {/* Description */}
      {!isDim && prediction.description && (
        <div style={{
          fontSize: 12,
          color: 'var(--text2)',
          lineHeight: 1.55,
          marginBottom: 10,
        }}>
          {prediction.description}
        </div>
      )}

      {/* Meta row */}
      {!isDim && (prediction.suggestedByDate || prediction.estimatedRemainingKm || prediction.componentName) && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '4px 12px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, color: 'var(--text3)',
          marginBottom: 10,
        }}>
          {prediction.suggestedByDate && (
            <span>By {fmtDate(prediction.suggestedByDate)}</span>
          )}
          {prediction.estimatedRemainingKm != null && (
            <span>{prediction.estimatedRemainingKm.toLocaleString()} km</span>
          )}
          {prediction.componentName && (
            <span>{prediction.componentName}</span>
          )}
        </div>
      )}

      {/* Confidence bar */}
      {!isDim && prediction.confidenceScore != null && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
              CONFIDENCE
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: urgencyStyle.label }}>
              {Math.round(prediction.confidenceScore * 100)}%
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.round(prediction.confidenceScore * 100)}%`,
              background: urgencyStyle.dot,
              borderRadius: 2,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}

      {/* Action buttons — only for active predictions */}
      {!isDim && (onDone || onIgnore) && (
        <div style={{ display: 'flex', gap: 8 }}>
          {onDone && (
            <button
              onClick={(e) => { e.stopPropagation(); onDone(prediction) }}
              style={{
                flex: 1, padding: 8, borderRadius: 8,
                background: 'rgba(52,211,153,0.12)',
                color: 'var(--green)',
                border: '1px solid rgba(52,211,153,0.25)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}
            >
              ✓ Done
            </button>
          )}
          {onIgnore && (
            <button
              onClick={(e) => { e.stopPropagation(); onIgnore(prediction) }}
              style={{
                flex: 1, padding: 8, borderRadius: 8,
                background: 'rgba(248,113,113,0.08)',
                color: 'var(--red)',
                border: '1px solid rgba(248,113,113,0.2)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}
            >
              ✕ Ignore
            </button>
          )}
        </div>
      )}
    </div>
  )
}
