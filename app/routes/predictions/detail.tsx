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

const URGENCY_COLOR: Record<string, string> = {
  Immediate: 'var(--red)',
  Soon:      'var(--orange)',
  Scheduled: 'var(--yellow)',
  Suggested: 'var(--green)',
}

function statusPill(status: string): { bg: string; color: string; text: string } {
  if (status === 'Completed') return { bg: 'rgba(52,211,153,0.15)',  color: 'var(--green)',  text: '✓ Completed' }
  if (status === 'Ignored')   return { bg: 'rgba(123,128,168,0.15)', color: 'var(--text2)', text: '— Ignored'   }
  return                             { bg: 'rgba(251,191,36,0.15)',  color: 'var(--yellow)', text: '◉ Active'    }
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
    const ignoredAt = new Date().toISOString()
    await updatePrediction(predictionId!, { status: 'Ignored', ignoredAt })
    setPrediction((prev) => prev ? { ...prev, status: 'Ignored', ignoredAt } : prev)
  }

  if (loading) return <PageShell><LoadingText /></PageShell>
  if (!prediction) return <PageShell><div style={{ padding: 22, color: 'var(--text2)' }}>Prediction not found.</div></PageShell>

  const { bg: pillBg, color: pillColor, text: pillText } = statusPill(prediction.status)
  const urgencyColor = URGENCY_COLOR[prediction.urgency] ?? 'var(--accent)'
  const isActive = prediction.status === 'Active'

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            {/* Urgency badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: urgencyColor, flexShrink: 0,
                boxShadow: `0 0 5px ${urgencyColor}`,
              }} />
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                color: urgencyColor,
              }}>
                {prediction.urgency}
              </span>
            </div>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600,
              background: pillBg, color: pillColor, borderRadius: 6, padding: '3px 9px',
            }}>
              {pillText}
            </span>
          </div>

          {/* Title */}
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8, lineHeight: 1.25 }}>
            {prediction.title}
          </div>

          {/* Description */}
          {prediction.description && (
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 10 }}>
              {prediction.description}
            </div>
          )}

          {/* Meta row */}
          {(prediction.suggestedByDate || prediction.estimatedRemainingKm || prediction.componentName) && (
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '4px 12px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, color: 'var(--text3)',
            }}>
              {prediction.suggestedByDate && (
                <span>By {fmtDate(prediction.suggestedByDate)}</span>
              )}
              {prediction.estimatedRemainingKm != null && (
                <span>{prediction.estimatedRemainingKm.toLocaleString()} km remaining</span>
              )}
              {prediction.componentName && (
                <span>→ {prediction.componentName}</span>
              )}
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

      {prediction.vehicleComponentId && (
        <ActionButton
          variant="ghost"
          onClick={() => navigate(`/vehicles/${vehicleId}/components/${prediction.vehicleComponentId}`)}
        >
          View component →
        </ActionButton>
      )}
      <div style={{ height: 24 }} />
    </PageShell>
  )
}
