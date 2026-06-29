import { useState, useEffect, useRef } from 'react'
import { diagnoseVehicle, getDiagnosisHistory } from '@/features/ai/api'
import { useVehiclesStore } from '@/features/vehicles/vehicleStore'
import { useDiagnoseModal } from '@/features/vehicles/diagnoseModalStore'
import type { AiDiagnosis } from '@/shared/types'
import CloseIcon from '@mui/icons-material/Close'

// ── constants ─────────────────────────────────────────────────────────────────

const DIAGNOSIS_DISCLAIMER =
  'This is an AI-assisted assessment only. Always consult a qualified mechanic ' +
  'before making repair decisions or continuing to drive if safety may be affected.'

// ── urgency config ────────────────────────────────────────────────────────────

const URGENCY_CONFIG = {
  stop: { label: 'Do not drive',         color: 'var(--red)',    bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)', icon: '⛔' },
  soon: { label: 'Book a mechanic soon', color: 'var(--orange)', bg: 'rgba(251,146,60,0.08)',  border: 'rgba(251,146,60,0.25)',  icon: '⚠' },
  safe: { label: 'Safe to drive',        color: 'var(--green)',  bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.25)',  icon: '✓' },
} as const

// ── sub-components ────────────────────────────────────────────────────────────

function AiCard({ item }: { item: AiDiagnosis }) {
  const u = URGENCY_CONFIG[item.urgency] ?? URGENCY_CONFIG.safe

  return (
    <div style={{
      background: u.bg, border: `1px solid ${u.border}`,
      borderRadius: '4px 14px 14px 14px',
      padding: '14px 16px', maxWidth: '92%',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 14 }}>{u.icon}</span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, fontWeight: 700, color: u.color,
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          {u.label}
        </span>
      </div>

      <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.55, marginBottom: 12 }}>
        {item.urgencyExplanation}
      </div>

      {item.likelyCauses.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Likely causes
          </div>
          {item.likelyCauses.map((cause, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: i < item.likelyCauses.length - 1 ? 8 : 0 }}>
              <div style={{
                flexShrink: 0, width: 18, height: 18, borderRadius: '50%',
                background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 700,
                color: 'var(--accent)', marginTop: 1,
              }}>
                {i + 1}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5, flex: 1 }}>{cause}</div>
            </div>
          ))}
        </div>
      )}

      {item.recommendedActions.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Recommended actions
          </div>
          {item.recommendedActions.map((action, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: i < item.recommendedActions.length - 1 ? 6 : 0 }}>
              <div style={{ flexShrink: 0, width: 5, height: 5, borderRadius: '50%', background: 'var(--accent2)', marginTop: 7 }} />
              <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5, flex: 1 }}>{action}</div>
            </div>
          ))}
        </div>
      )}

      {item.relatedComponents.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Related components
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {item.relatedComponents.map((name, i) => (
              <div key={i} style={{
                padding: '4px 10px', borderRadius: 999,
                background: 'rgba(79,143,255,0.1)', border: '1px solid rgba(79,143,255,0.25)',
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600, color: 'var(--accent2)',
              }}>
                {name}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{
        paddingTop: 10, borderTop: '1px solid var(--border)',
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 6,
      }}>
        {DIAGNOSIS_DISCLAIMER}
      </div>
      <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
        {new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
      </div>
    </div>
  )
}

function TypingCard() {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '4px 14px 14px 14px',
      padding: '14px 16px', maxWidth: '92%',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%',
        border: '2px solid var(--border)', borderTopColor: 'var(--accent)',
        animation: 'diagnose-spin 0.8s linear infinite', flexShrink: 0,
      }} />
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
        AI is analysing your vehicle…
      </span>
      <style>{`@keyframes diagnose-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function DiagnoseModal() {
  const { isOpen, vehicleId, openFor, close } = useDiagnoseModal()
  const vehicles = useVehiclesStore((s) => s.vehicles)
  const vehicle  = vehicleId != null ? vehicles.find((v) => v.vehicleId === vehicleId) : null

  if (!isOpen) return null

  const threadRef = useRef<HTMLDivElement>(null)

  const [history,        setHistory]        = useState<AiDiagnosis[]>([])
  const [symptom,        setSymptom]        = useState('')
  const [pendingSymptom, setPendingSymptom] = useState('')
  const [loading,        setLoading]        = useState(false)
  const [fetching,       setFetching]       = useState(false)
  const [error,          setError]          = useState<string | null>(null)

  // Prevent background scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Load history whenever vehicleId changes
  useEffect(() => {
    if (vehicleId == null) return
    setFetching(true)
    setHistory([])
    setError(null)
    getDiagnosisHistory(vehicleId)
      .then((res) => setHistory(res.data))
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [vehicleId])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (threadRef.current)
      threadRef.current.scrollTop = threadRef.current.scrollHeight
  }, [history, loading])

  const handleSubmit = async () => {
    const trimmed = symptom.trim()
    if (!trimmed || loading || vehicleId == null) return
    setLoading(true)
    setPendingSymptom(trimmed)
    setSymptom('')
    setError(null)
    try {
      const res = await diagnoseVehicle(vehicleId, trimmed)
      setHistory((prev) => [...prev, res.data])
    } catch {
      setError('Something went wrong. Please try again.')
      setSymptom(trimmed)
    } finally {
      setLoading(false)
      setPendingSymptom('')
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  const showEmpty = !fetching && history.length === 0 && !loading

  // ── shared wrapper ──────────────────────────────────────────────────────────
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <>
      <div onClick={close} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 300 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(600px, 92vw)',
        background: 'var(--surface)', borderRadius: 20,
        border: '1px solid var(--border)', zIndex: 301,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
      }}>
        {children}
      </div>
    </>
  )

  // ── vehicle picker (multiple vehicles, none selected yet) ───────────────────
  if (vehicleId == null) {
    return (
      <Wrapper>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '15px 18px 12px', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Diagnose with AI</div>
          <button onClick={close} style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--text2)', cursor: 'pointer',
            padding: '4px 6px', display: 'flex', alignItems: 'center',
          }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </button>
        </div>
        <div style={{ padding: '16px 18px 20px' }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)',
            textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12,
          }}>
            Select a vehicle
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {vehicles.map((v) => (
              <button
                key={v.vehicleId}
                onClick={() => openFor(v.vehicleId)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  textAlign: 'left', width: '100%',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(108,99,255,0.4)'
                  e.currentTarget.style.background = 'rgba(108,99,255,0.06)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.background = 'var(--surface2)'
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                    {v.brand} {v.model}
                  </div>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                    color: 'var(--text3)', marginTop: 2,
                  }}>
                    {v.yearOfProduction}{v.licensePlate ? ` · ${v.licensePlate}` : ''}
                  </div>
                </div>
                <span style={{ color: 'var(--accent)', fontSize: 18, lineHeight: 1 }}>›</span>
              </button>
            ))}
          </div>
        </div>
      </Wrapper>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 300 }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(600px, 92vw)', height: 'min(720px, 88vh)',
        background: 'var(--surface)', borderRadius: 20,
        border: '1px solid var(--border)', zIndex: 301,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '15px 18px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Diagnose with AI</div>
            {vehicle && (
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                color: 'var(--text3)', marginTop: 1,
              }}>
                {vehicle.brand} {vehicle.model} · {vehicle.yearOfProduction}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {vehicles.length > 1 && (
              <button
                onClick={() => useDiagnoseModal.getState().open()}
                style={{
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 8, cursor: 'pointer', padding: '5px 10px',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                  color: 'var(--text2)',
                }}
              >
                Switch
              </button>
            )}
            <button
              onClick={close}
              style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text2)', cursor: 'pointer',
                padding: '4px 6px', display: 'flex', alignItems: 'center',
              }}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </button>
          </div>
        </div>

        {/* Thread */}
        <div
          ref={threadRef}
          style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0', background: 'var(--bg)' }}
        >
          {fetching && (
            <div style={{
              textAlign: 'center', padding: '40px 0',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)',
            }}>
              Loading history…
            </div>
          )}

          {showEmpty && (
            <div style={{ textAlign: 'center', padding: '48px 16px' }}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>🔍</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                Describe what feels off
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                color: 'var(--text2)', lineHeight: 1.7,
              }}>
                The AI will analyse your vehicle's<br />components and service history.
              </div>
            </div>
          )}

          {!fetching && history.map((item) => (
            <div key={item.aiDiagnosisId} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <div style={{
                  maxWidth: '82%', background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px 14px 4px 14px',
                  padding: '10px 14px', fontSize: 13, color: 'var(--text)',
                  lineHeight: 1.5, wordBreak: 'break-word',
                }}>
                  {item.symptom}
                </div>
              </div>
              <AiCard item={item} />
            </div>
          ))}

          {loading && pendingSymptom && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <div style={{
                  maxWidth: '82%', background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px 14px 4px 14px',
                  padding: '10px 14px', fontSize: 13, color: 'var(--text)', lineHeight: 1.5,
                }}>
                  {pendingSymptom}
                </div>
              </div>
              <TypingCard />
            </div>
          )}

          {error && (
            <div style={{
              margin: '0 0 16px', padding: '12px 14px',
              background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.25)',
              borderRadius: 12, fontSize: 13, color: 'var(--red)',
            }}>
              {error}
            </div>
          )}

          <div style={{ height: 16 }} />
        </div>

        {/* Input bar */}
        <div style={{
          flexShrink: 0, padding: '10px 16px 14px',
          borderTop: '1px solid var(--border)', background: 'var(--surface)',
          display: 'flex', gap: 10, alignItems: 'flex-end',
        }}>
          <textarea
            value={symptom}
            onChange={(e) => setSymptom(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Describe what feels wrong… (Enter to send)"
            rows={2}
            disabled={loading}
            style={{
              flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '10px 12px', fontSize: 13, color: 'var(--text)',
              resize: 'none', fontFamily: "'Outfit', sans-serif",
              lineHeight: 1.4, minHeight: 42, maxHeight: 100, overflowY: 'auto', outline: 'none',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(108,99,255,0.5)')}
            onBlur={(e)  => (e.target.style.borderColor = 'var(--border)')}
          />
          <button
            onClick={handleSubmit}
            disabled={!symptom.trim() || loading}
            style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: (!symptom.trim() || loading) ? 'var(--surface2)' : 'var(--accent)',
              border: 'none',
              color: (!symptom.trim() || loading) ? 'var(--text3)' : '#fff',
              fontSize: 18, cursor: (!symptom.trim() || loading) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            ↑
          </button>
        </div>
      </div>
    </>
  )
}
