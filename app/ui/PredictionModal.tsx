import { useState, useEffect } from 'react'
import { getPredictionById, updatePrediction } from '@/features/predictions/api'
import { dedupFetch } from '@/lib/dedup'
import type { Prediction } from '@/lib/types'
import CloseIcon from '@mui/icons-material/Close'

const URGENCY_STYLE: Record<string, { dot: string; label: string; border: string; bg: string }> = {
  Immediate: { dot: 'var(--red)',    label: 'var(--red)',    border: 'rgba(248,113,113,0.3)', bg: 'rgba(248,113,113,0.06)' },
  Soon:      { dot: 'var(--orange)', label: 'var(--orange)', border: 'rgba(251,146,60,0.3)',  bg: 'rgba(251,146,60,0.06)'  },
  Scheduled: { dot: 'var(--yellow)', label: 'var(--yellow)', border: 'rgba(251,191,36,0.3)',  bg: 'rgba(251,191,36,0.05)'  },
  Suggested: { dot: 'var(--green)',  label: 'var(--green)',  border: 'rgba(52,211,153,0.25)', bg: 'rgba(52,211,153,0.05)'  },
}

function statusPill(status: string): { bg: string; color: string; text: string } {
  if (status === 'Completed') return { bg: 'rgba(52,211,153,0.15)',  color: 'var(--green)',  text: '✓ Completed' }
  if (status === 'Ignored')   return { bg: 'rgba(123,128,168,0.15)', color: 'var(--text2)', text: '— Ignored'   }
  return                             { bg: 'rgba(251,191,36,0.15)',  color: 'var(--yellow)', text: '◉ Active'    }
}

interface Props {
  predictionId: number
  onClose: () => void
  onUpdated: (updated: Prediction) => void
}

export default function PredictionModal({ predictionId, onClose, onUpdated }: Props) {
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    let cancelled = false
    dedupFetch(`prediction-${predictionId}`, () => getPredictionById(predictionId))
      .then((res) => {
        if (!cancelled) { setPrediction(res.data as Prediction); setLoading(false) }
      })
    return () => { cancelled = true }
  }, [predictionId])

  const applyUpdate = async (patch: Record<string, unknown>) => {
    setSaving(true)
    try {
      await updatePrediction(predictionId, patch)
      const updated = { ...prediction!, ...patch } as Prediction
      setPrediction(updated)
      onUpdated(updated)
    } finally {
      setSaving(false)
    }
  }

  const handleDone       = () => applyUpdate({ status: 'Completed', completedAt: new Date().toISOString() })
  const handleIgnore     = () => applyUpdate({ status: 'Ignored',   ignoredAt: new Date().toISOString() })
  const handleReactivate = () => applyUpdate({ status: 'Active', completedAt: null, ignoredAt: null })

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const us      = prediction ? (URGENCY_STYLE[prediction.urgency] ?? URGENCY_STYLE.Suggested) : URGENCY_STYLE.Suggested
  const isActive    = prediction?.status === 'Active'
  const isDim       = prediction?.status === 'Completed' || prediction?.status === 'Ignored'
  const pill        = prediction ? statusPill(prediction.status) : { bg: '', color: '', text: '' }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 300 }}
      />

      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(460px, 88vw)',
        maxHeight: '88vh',
        background: 'var(--surface)',
        borderRadius: 20,
        border: '1px solid var(--border)',
        zIndex: 301,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '15px 18px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Prediction</div>
            {prediction && (
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginTop: 1 }}>
                {prediction.urgency} · {fmtDate(prediction.createdAt)}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text2)', cursor: 'pointer',
              padding: '4px 6px', display: 'flex', alignItems: 'center',
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
          {loading ? (
            <div style={{
              textAlign: 'center', padding: '48px 0',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text3)',
            }}>
              Loading…
            </div>
          ) : prediction ? (
            <>
              {/* Hero card */}
              <div style={{
                background: isDim ? 'var(--surface2)' : us.bg,
                border: `1px solid ${isDim ? 'var(--border)' : us.border}`,
                borderRadius: 14, padding: 14, marginBottom: 12,
                opacity: isDim ? 0.75 : 1,
              }}>
                {/* Urgency + status row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: us.dot,
                      boxShadow: isDim ? 'none' : `0 0 5px ${us.dot}`,
                    }} />
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.1em',
                      color: us.label,
                    }}>
                      {prediction.urgency}
                    </span>
                  </div>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600,
                    background: pill.bg, color: pill.color, borderRadius: 6, padding: '3px 9px',
                  }}>
                    {pill.text}
                  </span>
                </div>

                {/* Title */}
                <div style={{
                  fontSize: 18, fontWeight: 700, lineHeight: 1.25,
                  color: isDim ? 'var(--text3)' : 'var(--text)',
                  marginBottom: prediction.description ? 8 : 0,
                }}>
                  {prediction.title}
                </div>

                {/* Description */}
                {prediction.description && (
                  <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                    {prediction.description}
                  </div>
                )}
              </div>

              {/* Meta pills */}
              {(prediction.suggestedByDate || prediction.estimatedRemainingKm != null || prediction.componentName) && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${[prediction.suggestedByDate, prediction.estimatedRemainingKm != null, prediction.componentName].filter(Boolean).length}, 1fr)`,
                  gap: 6, marginBottom: 12,
                }}>
                  {prediction.suggestedByDate && (
                    <div style={{
                      background: 'var(--surface2)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '10px 12px',
                    }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text3)', marginBottom: 4 }}>By date</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{fmtDate(prediction.suggestedByDate)}</div>
                    </div>
                  )}
                  {prediction.estimatedRemainingKm != null && (
                    <div style={{
                      background: 'var(--surface2)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '10px 12px',
                    }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text3)', marginBottom: 4 }}>Remaining</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{prediction.estimatedRemainingKm.toLocaleString()} km</div>
                    </div>
                  )}
                  {prediction.componentName && (
                    <div style={{
                      background: 'var(--surface2)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '10px 12px', minWidth: 0,
                    }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text3)', marginBottom: 4 }}>Component</div>
                      <div style={{
                        fontSize: 13, fontWeight: 700, color: 'var(--text)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {prediction.componentName}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Confidence bar */}
              {prediction.confidenceScore != null && !isDim && (
                <div style={{
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '12px 14px', marginBottom: 12,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>Confidence</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, color: us.label }}>
                      {Math.round(prediction.confidenceScore * 100)}%
                    </span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--surface3)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.round(prediction.confidenceScore * 100)}%`,
                      background: `linear-gradient(90deg, ${us.dot}, ${us.label})`,
                      borderRadius: 3, transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              )}

            </>
          ) : null}
        </div>

        {/* Footer */}
        {!loading && prediction && (
          <div style={{ padding: '10px 18px 18px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            {isActive ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleDone} disabled={saving}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 12,
                    background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)',
                    color: 'var(--green)', fontSize: 13, fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
                  }}
                >
                  ✓ Mark as done
                </button>
                <button
                  onClick={handleIgnore} disabled={saving}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 12,
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    color: 'var(--text2)', fontSize: 13, fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
                  }}
                >
                  Dismiss
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleReactivate} disabled={saving}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 12,
                    background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)',
                    color: 'var(--accent)', fontSize: 13, fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
                  }}
                >
                  Reactivate
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
