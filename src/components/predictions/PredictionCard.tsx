import { formatEnumLabel } from '../../utils/formatters'
import { toConfidencePercent } from '../../utils/predictions'
import type { Prediction } from '../../types'

interface PredictionCardProps {
  prediction: Prediction
  onDone?: (p: Prediction) => void
  onIgnore?: (p: Prediction) => void
  onClick?: () => void
}

export default function PredictionCard({ prediction, onDone, onIgnore, onClick }: PredictionCardProps) {
  const isCompleted = prediction.status === 'Completed'
  const isIgnored   = prediction.status === 'Ignored'
  const isDim       = isCompleted || isIgnored

  const cardStyle = isCompleted
    ? { background: 'var(--surface2)', borderColor: 'var(--border)', opacity: 0.55 }
    : isIgnored
    ? { background: 'var(--surface2)', borderColor: 'var(--border)', opacity: 0.4 }
    : { background: 'linear-gradient(135deg, rgba(108,99,255,0.1), rgba(79,143,255,0.06))', borderColor: 'rgba(108,99,255,0.25)' }

  const confidence = toConfidencePercent(prediction.confidenceScore)

  return (
    <div
      onClick={onClick}
      style={{
        margin: '0 22px 10px',
        border: '1px solid',
        borderRadius: 14,
        padding: 14,
        cursor: onClick ? 'pointer' : 'default',
        ...cardStyle,
      }}
    >
      {/* Priority label */}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: 6,
        color: isCompleted
          ? 'var(--green)'
          : isIgnored
          ? 'var(--text3)'
          : 'var(--accent)',
      }}>
        {isCompleted ? '✓ Completed' : isIgnored ? '— Ignored' : '⚠ Predicted'}
      </div>

      {/* Component name */}
      <div style={{
        fontSize: 15,
        fontWeight: 700,
        color: isDim ? 'var(--text3)' : 'var(--text)',
        textDecoration: isCompleted ? 'line-through' : 'none',
        marginBottom: 4,
      }}>
        {formatEnumLabel(prediction.componentType)}
      </div>

      {/* Predicted date */}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        color: 'var(--text2)',
        marginBottom: 10,
      }}>
        {isCompleted
          ? `Completed ${prediction.completedAt
              ? new Date(prediction.completedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              : ''}`
          : `Predicted: ${new Date(prediction.predictedServiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
        }
      </div>

      {/* Confidence bar */}
      <div style={{
        height: 4,
        background: 'var(--border)',
        borderRadius: 99,
        overflow: 'hidden',
        marginBottom: 5,
      }}>
        <div style={{
          height: '100%',
          width: `${confidence}%`,
          borderRadius: 99,
          background: isCompleted
            ? 'var(--green)'
            : isDim
            ? 'var(--text3)'
            : 'linear-gradient(90deg, var(--accent), var(--accent2))',
        }} />
      </div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        color: 'var(--text2)',
        marginBottom: isDim ? 0 : 12,
      }}>
        {isCompleted
          ? 'Auto-completed when maintenance record was logged'
          : isIgnored
          ? `Confidence: ${confidence}% · Ignored by user`
          : `Confidence: ${confidence}%`
        }
      </div>

      {/* Action buttons — only for active predictions */}
      {!isDim && (onDone || onIgnore) && (
        <div style={{ display: 'flex', gap: 8 }}>
          {onDone && (
            <button
              onClick={(e) => { e.stopPropagation(); onDone(prediction) }}
              style={{
                flex: 1,
                padding: 8,
                borderRadius: 8,
                background: 'rgba(52,211,153,0.12)',
                color: 'var(--green)',
                border: '1px solid rgba(52,211,153,0.25)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ✓ Done
            </button>
          )}
          {onIgnore && (
            <button
              onClick={(e) => { e.stopPropagation(); onIgnore(prediction) }}
              style={{
                flex: 1,
                padding: 8,
                borderRadius: 8,
                background: 'rgba(248,113,113,0.08)',
                color: 'var(--red)',
                border: '1px solid rgba(248,113,113,0.2)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
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
