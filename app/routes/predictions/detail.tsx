import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import ActionButton from '@/ui/ActionButton'
import { getPredictionById, updatePrediction } from '@/features/predictions/api'
import { dedupFetch } from '@/lib/dedup'
import type { Prediction } from '@/lib/types'
import { LoadingText } from '@/ui/AsyncStates'
import { backBtnStyle } from '@/styles/pageStyles'
import VehicleLabel from '@/ui/VehicleLabel'
import { formatEnumLabel } from '@/lib/formatters'
import { toConfidencePercent } from '@/lib/confidenceUtils'

function relativeDate(iso: string): string {
  const target = new Date(iso)
  target.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff === -1) return 'yesterday'
  if (diff > 0) return `in ${diff} days`
  return `${-diff} days ago`
}

function confidenceLevel(pct: number): { label: string; color: string } {
  if (pct >= 75) return { label: 'High',   color: 'var(--green)'  }
  if (pct >= 50) return { label: 'Medium', color: 'var(--yellow)' }
  return              { label: 'Low',    color: 'var(--red)'    }
}

function statusPill(status: string): { bg: string; color: string; text: string } {
  if (status === 'Completed') return { bg: 'rgba(52,211,153,0.15)',  color: 'var(--green)',  text: '✓ Completed' }
  if (status === 'Ignored')   return { bg: 'rgba(123,128,168,0.15)', color: 'var(--text2)', text: '— Ignored'   }
  return                             { bg: 'rgba(251,191,36,0.15)',  color: 'var(--yellow)', text: '⚠ Predicted' }
}

export default function PredictionDetail() {
  const { vehicleId, predictionId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = () => location.key !== 'default'
    ? navigate(-1)
    : navigate(`/vehicles/${vehicleId}/predictions`)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [loading, setLoading] = useState(true)
  const [showConfidenceInfo, setShowConfidenceInfo] = useState(false)

  useEffect(() => {
    let cancelled = false
    dedupFetch(`prediction-${predictionId}`, () => getPredictionById(predictionId!))
      .then((res) => { if (!cancelled) setPrediction(res.data as Prediction) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [predictionId])

  const handleDone = async () => {
    const completedAt = new Date().toISOString()
    await updatePrediction(predictionId!, { status: 'Completed', completedAt })
    setPrediction((prev) => prev ? { ...prev, status: 'Completed', completedAt } : prev)
  }

  const handleIgnore = async () => {
    await updatePrediction(predictionId!, { status: 'Ignored' })
    setPrediction((prev) => prev ? { ...prev, status: 'Ignored' } : prev)
  }

  if (loading) return <PageShell><LoadingText /></PageShell>
  if (!prediction) return <PageShell><div style={{ padding: 22, color: 'var(--text2)' }}>Prediction not found.</div></PageShell>

  const pct = toConfidencePercent(prediction.confidenceScore)
  const { label: confLabel, color: confColor } = confidenceLevel(pct)
  const { bg: pillBg, color: pillColor, text: pillText } = statusPill(prediction.status)
  const componentName = formatEnumLabel(prediction.componentType)
  const formattedDate = new Date(prediction.predictedServiceDate).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
  const relative = relativeDate(prediction.predictedServiceDate)
  const isActive = prediction.status === 'Active'
  const isUrgent = relative === 'today' || relative === 'tomorrow'

  return (
    <PageShell>
      <button onClick={goBack} style={backBtnStyle}>
        {'<-'} Back
      </button>
      <VehicleLabel vehicleId={vehicleId} />

      <div style={{
        margin: '0 22px 10px',
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 16px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
              Service predicted
            </span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600,
              background: pillBg, color: pillColor, borderRadius: 6, padding: '3px 9px',
            }}>
              {pillText}
            </span>
          </div>

          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 8, lineHeight: 1.2 }}>
            {componentName}
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text2)' }}>
              {formattedDate}
            </span>
            <span style={{ color: 'var(--text3)', fontSize: 10 }}>·</span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              color: isUrgent ? 'var(--yellow)' : 'var(--text2)',
              fontWeight: isUrgent ? 600 : 400,
            }}>
              {relative}
            </span>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border)' }} />

        {/* AI Confidence */}
        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', flex: 1 }}>
              AI confidence
            </span>
            <button
              type="button"
              onMouseEnter={() => setShowConfidenceInfo(true)}
              onMouseLeave={() => setShowConfidenceInfo(false)}
              onClick={() => setShowConfidenceInfo((p) => !p)}
              style={{
                width: 18, height: 18, borderRadius: '50%',
                background: 'var(--surface3)', border: '1px solid var(--border)',
                color: 'var(--text3)', fontSize: 10, fontWeight: 700,
                cursor: 'pointer', flexShrink: 0, marginRight: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ?
            </button>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text3)', marginRight: 4 }}>
              {confLabel}
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: confColor }}>
              {pct}%
            </span>
          </div>

          <div style={{ height: 6, borderRadius: 3, background: 'var(--surface3)', overflow: 'hidden', marginBottom: showConfidenceInfo ? 12 : 0 }}>
            <div style={{
              height: '100%', width: `${pct}%`,
              background: confColor, borderRadius: 3,
              transition: 'width 0.4s ease',
            }} />
          </div>

          {showConfidenceInfo && (
            <div style={{
              background: 'rgba(108,99,255,0.06)', border: '1px solid rgba(108,99,255,0.15)',
              borderRadius: 10, padding: '10px 12px',
            }}>
              <div style={{ fontStyle: 'italic', fontSize: 11, color: 'var(--text3)', marginBottom: 5 }}>
                About confidence
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text2)', lineHeight: 1.6 }}>
                Confidence shows how certain the AI is about the date — not how soon the part will fail.
                Treat this as a reminder, not a guarantee.
              </div>
            </div>
          )}
        </div>

        {/* Action buttons — active only */}
        {isActive && (
          <>
            <div style={{ height: 1, background: 'var(--border)' }} />
            <div style={{ display: 'flex', gap: 8, padding: '14px 16px' }}>
              <button
                onClick={handleDone}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 10,
                  background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)',
                  color: 'var(--green)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >
                ✓ Mark as done
              </button>
              <button
                onClick={handleIgnore}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 10,
                  background: 'var(--surface3)', border: '1px solid var(--border)',
                  color: 'var(--text2)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Dismiss
              </button>
            </div>
          </>
        )}
      </div>

      <ActionButton variant="ghost" onClick={() => navigate(`/vehicles/${vehicleId}/components`)}>
        View component →
      </ActionButton>
      <div style={{ height: 24 }} />
    </PageShell>
  )
}
