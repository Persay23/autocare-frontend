import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getPredictionsByVehicle, updatePrediction } from '@/features/predictions/api'
import { dedupFetch } from '@/lib/dedup'
import { LoadingState, ErrorState, EmptyState } from '@/ui/AsyncStates'
import { COMPONENT_ICONS } from '@/lib/icons'
import { formatEnumLabel } from '@/lib/formatters'
import { toConfidencePercent } from '@/lib/confidenceUtils'

import type { Prediction } from '@/lib/types'

function daysDiff(dateStr: string): number {
  return Math.round(
    (new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000
  )
}

function relativeLabel(dateStr: string): string {
  const d = daysDiff(dateStr)
  if (d < 0)  return `${Math.abs(d)} day${Math.abs(d) !== 1 ? 's' : ''} overdue`
  if (d === 0) return 'today'
  if (d === 1) return 'tomorrow'
  if (d < 7)  return `in ${d} days`
  if (d < 30) return `in ${Math.round(d / 7)} week${Math.round(d / 7) !== 1 ? 's' : ''}`
  return `in ${Math.round(d / 30)} month${Math.round(d / 30) !== 1 ? 's' : ''}`
}

function formatDate(dateStr: string): string {
  const d = daysDiff(dateStr)
  if (d < 60) {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }
  return new Date(dateStr).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

function PredIcon({ componentType }: { componentType: string }) {
  const Icon = COMPONENT_ICONS[componentType] ?? COMPONENT_ICONS.Other
  return (
    <div style={{
      width: 34, height: 34, borderRadius: 9,
      background: 'var(--surface3)', border: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon sx={{ fontSize: 16, color: 'var(--text3)' }} />
    </div>
  )
}

export default function VehiclePredictions() {
  const { vehicleId } = useParams()
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    dedupFetch(`predictions-${vehicleId}`, () => getPredictionsByVehicle(vehicleId!))
      .then((res) => { if (!cancelled) setPredictions(res.data) })
      .catch(() => { if (!cancelled) setError('Failed to load predictions.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [vehicleId])

  const handleIgnore = async (p: Prediction) => {
    try {
      await updatePrediction(p.predictionId, { status: 'Ignored' })
      setPredictions((prev) => prev.map((x) => x.predictionId === p.predictionId ? { ...x, status: 'Ignored' } : x))
    } catch { /* no-op */ }
  }

  const handleDone = async (p: Prediction) => {
    const completedAt = new Date().toISOString()
    try {
      await updatePrediction(p.predictionId, { status: 'Completed', completedAt })
      setPredictions((prev) => prev.map((x) => x.predictionId === p.predictionId ? { ...x, status: 'Completed', completedAt } : x))
    } catch { /* no-op */ }
  }

  const active    = predictions.filter((p) => p.status === 'Active')
  const dueSoon   = active.filter((p) => daysDiff(p.predictedServiceDate) <= 7)
    .sort((a, b) => new Date(a.predictedServiceDate).getTime() - new Date(b.predictedServiceDate).getTime())
  const upcoming  = active.filter((p) => daysDiff(p.predictedServiceDate) > 7)
    .sort((a, b) => new Date(a.predictedServiceDate).getTime() - new Date(b.predictedServiceDate).getTime())
  const completed = predictions.filter((p) => p.status === 'Completed' || p.status === 'Ignored')
    .sort((a, b) => new Date(b.predictedServiceDate).getTime() - new Date(a.predictedServiceDate).getTime())

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        padding: '16px 22px 10px',
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Predictions</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
            AI-estimated service dates
          </div>
        </div>
        {active.length > 0 && (
          <div style={{
            padding: '5px 12px', borderRadius: 999,
            background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.35)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, fontWeight: 600, color: 'var(--accent)',
            flexShrink: 0,
          }}>
            {active.length} active
          </div>
        )}
      </div>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && predictions.length === 0 && (
        <EmptyState icon="🤖" message="No predictions yet — add components and records first" />
      )}

      {!loading && !error && predictions.length > 0 && (
        <div style={{ padding: '0 16px 24px' }}>

          {/* DUE SOON */}
          {dueSoon.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, fontWeight: 700, color: 'var(--orange)',
                textTransform: 'uppercase', letterSpacing: '0.1em',
                marginBottom: 8,
              }}>
                Due Soon
              </div>
              {dueSoon.map((p) => {
                const conf = toConfidencePercent(p.confidenceScore)
                const rel  = relativeLabel(p.predictedServiceDate)
                const dateFormatted = new Date(p.predictedServiceDate)
                  .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                return (
                  <div key={p.predictionId} style={{
                    background: 'rgba(251,146,60,0.07)',
                    border: '1px solid rgba(251,146,60,0.25)',
                    borderRadius: 12, padding: '12px 14px',
                    marginBottom: 8,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                            {formatEnumLabel(p.componentType)}
                          </span>
                          <span style={{
                            padding: '2px 7px', borderRadius: 999,
                            background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.3)',
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 9, fontWeight: 600, color: 'var(--orange)',
                          }}>
                            {rel}
                          </span>
                        </div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text2)' }}>
                          {formatEnumLabel(p.componentType)} · {dateFormatted}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                        <div style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 9, color: 'var(--text3)', marginBottom: 2,
                        }}>
                          Confidence
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>
                          {conf}%
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button
                        onClick={() => handleDone(p)}
                        style={{
                          flex: 1, padding: '10px 0', borderRadius: 8,
                          background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)',
                          color: 'var(--green)',
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        ✓ Mark as done
                      </button>
                      <button
                        onClick={() => handleIgnore(p)}
                        style={{
                          padding: '10px 16px', borderRadius: 8,
                          background: 'var(--surface3)', border: '1px solid var(--border)',
                          color: 'var(--text2)',
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 11, cursor: 'pointer',
                        }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* UPCOMING */}
          {upcoming.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, fontWeight: 700, color: 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: '0.1em',
                marginBottom: 8,
              }}>
                Upcoming
              </div>
              {upcoming.map((p) => {
                const conf = toConfidencePercent(p.confidenceScore)
                return (
                  <div key={p.predictionId} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '10px 12px', marginBottom: 8,
                  }}>
                    <PredIcon componentType={p.componentType} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                        {formatEnumLabel(p.componentType)}
                      </div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text2)' }}>
                        {formatEnumLabel(p.componentType)} · {relativeLabel(p.predictedServiceDate)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                        {formatDate(p.predictedServiceDate)}
                      </div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>
                        {conf}% conf.
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* COMPLETED / IGNORED */}
          {completed.length > 0 && (
            <div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, fontWeight: 700, color: 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: '0.1em',
                marginBottom: 8,
              }}>
                Completed
              </div>
              {completed.map((p) => {
                const isIgnored = p.status === 'Ignored'
                const dateStr = p.completedAt
                  ? new Date(p.completedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                  : new Date(p.predictedServiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                return (
                  <div key={p.predictionId} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '10px 12px', marginBottom: 8,
                    opacity: 0.55,
                  }}>
                    <PredIcon componentType={p.componentType} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text3)', marginBottom: 2 }}>
                        {formatEnumLabel(p.componentType)}
                      </div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
                        {formatEnumLabel(p.componentType)} · {dateStr}
                      </div>
                    </div>
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10, fontWeight: 600,
                      color: isIgnored ? 'var(--text3)' : 'var(--green)',
                      flexShrink: 0,
                    }}>
                      {isIgnored ? '✕ Ignored' : '✓ Done'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </div>
      )}
    </div>
  )
}
