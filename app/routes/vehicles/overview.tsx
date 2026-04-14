import { useState, useEffect } from 'react'
import { useOutletContext, useNavigate, useParams } from 'react-router-dom'
import BarChart from '@/ui/BarChart'
import { getVehicleCostSummary } from '@/features/expenses/api'
import { getRecordsByVehicle } from '@/features/records/api'
import { getPredictionsByVehicle } from '@/features/predictions/api'
import { deleteVehicle } from '@/features/vehicles/api'
import { useVehiclesStore } from '@/features/vehicles/vehiclesStore'
import { dedupFetch } from '@/lib/dedup'
import { createComponent } from '@/features/components/api'
import { PRESET_GROUPS } from '@/lib/presetComponents'
import { COMPONENT_DEFAULTS } from '@/lib/componentDefaults'
import { formatEnumLabel } from '@/lib/formatters'
import { toConfidencePercent } from '@/lib/confidenceUtils'

import type { ComponentHealth, MonthlyCostSummary, Prediction } from '@/lib/types'
import type { VehicleLayoutContext } from './layout'

interface BarChartPoint { label: string; maintenance: number; fuel: number }

const STATE_ORDER = ['Perfect', 'Good', 'Normal', 'Repair', 'Critical', 'Unknown'] as const
const STATE_COLORS: Record<string, string> = {
  Perfect:  '#38bdf8',
  Good:     '#34d399',
  Normal:   '#fbbf24',
  Repair:   '#fb923c',
  Critical: '#f87171',
  Unknown:  '#444870',
}

function relativeDay(dateStr: string): string {
  const diff = Math.round(
    (new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000
  )
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff === -1) return 'yesterday'
  if (diff > 1 && diff <= 30) return `in ${diff} days`
  if (diff < 0) return `${Math.abs(diff)} days ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function HealthRing({ health }: { health: ComponentHealth[] | null | undefined }) {
  if (!health?.length) {
    return (
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'var(--surface3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>NO DATA</span>
      </div>
    )
  }

  const total = health.length
  const counts = health.reduce<Record<string, number>>((acc, c) => {
    acc[c.currentState] = (acc[c.currentState] ?? 0) + 1
    return acc
  }, {})
  const avg = Math.round(
    health.reduce((sum, c) => sum + Math.min(c.kmLifetimePercent ?? 0, c.yearsLifetimePercent ?? 0), 0) / total
  )

  let cumulative = 0
  const stops = STATE_ORDER
    .filter((s) => counts[s])
    .map((s) => {
      const pct = ((counts[s] ?? 0) / total) * 100
      const from = cumulative
      cumulative += pct
      return `${STATE_COLORS[s]} ${from}% ${cumulative}%`
    })
    .join(', ')

  return (
    <div style={{
      width: 72, height: 72, borderRadius: '50%',
      background: `conic-gradient(${stops})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <div style={{
        width: 54, height: 54, borderRadius: '50%',
        background: 'var(--surface)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1, color: 'var(--text)' }}>{avg}%</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, color: 'var(--text3)', marginTop: 1 }}>
          health
        </div>
      </div>
    </div>
  )
}

export default function VehicleOverview() {
  const { vehicle, health, refresh: onComponentsCreated } = useOutletContext<VehicleLayoutContext>()
  const { vehicleId } = useParams()
  const navigate = useNavigate()
  const invalidate = useVehiclesStore((s) => s.invalidate)

  const [costData, setCostData] = useState<BarChartPoint[]>([])
  const [recordCount, setRecordCount] = useState<number | null>(null)
  const [nextPrediction, setNextPrediction] = useState<Prediction | null>(null)
  const [settingUp, setSettingUp] = useState(false)
  const [selectedPresets, setSelectedPresets] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!vehicle?.vehicleId) return
    let cancelled = false

    const to = new Date()
    const from = new Date()
    from.setMonth(from.getMonth() - 6)

    Promise.allSettled([
      dedupFetch(`cost-${vehicle.vehicleId}`, () =>
        getVehicleCostSummary(vehicle.vehicleId, from.toISOString(), to.toISOString())
      ),
      dedupFetch(`records-${vehicleId}`, () => getRecordsByVehicle(vehicleId!)),
      dedupFetch(`predictions-${vehicleId}`, () => getPredictionsByVehicle(vehicleId!)),
    ]).then(([costRes, recordsRes, predsRes]) => {
      if (cancelled) return
      if (costRes.status === 'fulfilled') {
        const raw: MonthlyCostSummary[] = Array.isArray(costRes.value.data) ? costRes.value.data : []
        setCostData(raw.map((item) => ({
          label: new Date(item.month).toLocaleDateString('en-GB', { month: 'short' }),
          maintenance: item.maintenanceCost ?? 0,
          fuel: item.fuelCost ?? 0,
        })))
      }
      if (recordsRes.status === 'fulfilled') {
        setRecordCount(Array.isArray(recordsRes.value.data) ? recordsRes.value.data.length : 0)
      }
      if (predsRes.status === 'fulfilled') {
        const preds: Prediction[] = Array.isArray(predsRes.value.data) ? predsRes.value.data : []
        const next = preds
          .filter((p) => p.status === 'Active')
          .sort((a, b) => new Date(a.predictedServiceDate).getTime() - new Date(b.predictedServiceDate).getTime())[0] ?? null
        setNextPrediction(next)
      }
    })
    return () => { cancelled = true }
  }, [vehicle?.vehicleId, vehicleId])

  if (!vehicle) return null

  const totalSpent = costData.reduce((sum, item) => sum + item.maintenance + item.fuel, 0)

  const counts = (health ?? []).reduce<Record<string, number>>((acc, c) => {
    acc[c.currentState] = (acc[c.currentState] ?? 0) + 1
    return acc
  }, {})

  const attnComponents = (health ?? []).filter(
    (c) => c.currentState === 'Critical' || c.currentState === 'Repair'
  )

  const togglePreset = (type: string) =>
    setSelectedPresets((prev) => prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteVehicle(vehicleId!)
      invalidate()
      navigate('/carpark')
    } finally {
      setDeleting(false)
    }
  }

  const handleQuickSetup = async () => {
    setSaving(true)
    try {
      await Promise.all(
        selectedPresets.map((type) => {
          const defaults = COMPONENT_DEFAULTS[type] ?? COMPONENT_DEFAULTS.Other
          return createComponent({
            vehicleId: vehicle.vehicleId,
            componentType: type,
            vehicleComponentName: null,
            vehicleComponentBrand: null,
            state: 'Good',
            installationDate: new Date().toISOString(),
            currentMileage: 0,
            expectedLifetimeKm: defaults.lifetimeKm,
            expectedLifetimeYears: defaults.lifetimeYears,
            notes: null,
          })
        })
      )
      setSelectedPresets([])
      setSettingUp(false)
      onComponentsCreated?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Alert banner — Critical / Repair components */}
      {attnComponents.length > 0 && (
        <div style={{
          margin: '8px 16px 12px',
          background: 'rgba(248,113,113,0.07)',
          border: '1px solid rgba(248,113,113,0.25)',
          borderRadius: 12,
          padding: '12px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange)' }}>
              {attnComponents.length} component{attnComponents.length > 1 ? 's' : ''} need attention
            </span>
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, color: 'var(--text2)', marginTop: 6,
          }}>
            {attnComponents
              .map((c) => `${c.vehicleComponentName ?? formatEnumLabel(c.componentType)} (${c.currentState})`)
              .join(' · ')}
          </div>
        </div>
      )}

      {/* Health card */}
      <div style={{
        margin: '0 16px 12px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '14px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <HealthRing health={health} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 8px', flex: 1 }}>
            {STATE_ORDER.filter((s) => counts[s]).map((s) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: 7, height: 7, borderRadius: 2,
                  background: STATE_COLORS[s], flexShrink: 0,
                }} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text2)' }}>
                  {counts[s]} {s.toLowerCase()}
                </span>
              </div>
            ))}
            {!health?.length && (
              <div style={{
                gridColumn: '1 / -1',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, color: 'var(--text3)',
              }}>
                No components tracked yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick setup prompt */}
      {!health?.length && !settingUp && (
        <div style={{
          margin: '0 16px 12px',
          background: 'rgba(108,99,255,0.06)',
          border: '1px solid rgba(108,99,255,0.2)',
          borderRadius: 12,
          padding: 14,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
            Set up component tracking
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, color: 'var(--text2)', marginBottom: 12,
          }}>
            Pick the components you want to track. Lifetimes are set automatically.
          </div>
          <button
            onClick={() => setSettingUp(true)}
            style={{
              padding: '8px 16px', borderRadius: 8,
              background: 'var(--accent)', color: '#fff',
              border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Quick Setup
          </button>
        </div>
      )}

      {settingUp && (
        <div style={{ margin: '0 16px 12px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
            Select components to track
          </div>
          {PRESET_GROUPS.map((group) => (
            <div key={group.group} style={{ marginBottom: 12 }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, color: 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6,
              }}>
                {group.group}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {group.components.map((type) => {
                  const active = selectedPresets.includes(type)
                  return (
                    <button
                      key={type}
                      onClick={() => togglePreset(type)}
                      style={{
                        padding: '5px 12px', borderRadius: 999,
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 9, cursor: 'pointer',
                        background: active ? 'rgba(108,99,255,0.15)' : 'var(--surface2)',
                        border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                        color: active ? 'var(--accent)' : 'var(--text3)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {formatEnumLabel(type)}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              onClick={handleQuickSetup}
              disabled={!selectedPresets.length || saving}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10,
                background: selectedPresets.length ? 'var(--accent)' : 'var(--surface3)',
                color: '#fff', border: 'none', fontSize: 13, fontWeight: 600,
                cursor: selectedPresets.length ? 'pointer' : 'not-allowed',
              }}
            >
              {saving ? 'Setting up...' : `Add ${selectedPresets.length} component${selectedPresets.length !== 1 ? 's' : ''}`}
            </button>
            <button
              onClick={() => { setSettingUp(false); setSelectedPresets([]) }}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10,
                background: 'var(--surface2)', color: 'var(--text2)',
                border: '1px solid var(--border)', fontSize: 13, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        margin: '0 16px 12px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        <div style={{ padding: '12px 0', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>
            {totalSpent.toLocaleString()} zł
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text2)', marginTop: 3 }}>
            all time
          </div>
        </div>
        <div style={{ padding: '12px 0', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
            {health?.length ?? 0}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text2)', marginTop: 3 }}>
            components
          </div>
        </div>
        <div style={{ padding: '12px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
            {recordCount ?? '—'}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text2)', marginTop: 3 }}>
            records
          </div>
        </div>
      </div>

      {/* Next prediction */}
      {nextPrediction && (
        <div style={{
          margin: '0 16px 12px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '12px 14px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              Next Prediction
            </div>
            <button
              onClick={() => navigate(`/vehicles/${vehicleId}/predictions`)}
              style={{
                background: 'none', border: 'none',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, color: 'var(--accent)', cursor: 'pointer',
              }}
            >
              See all →
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                {formatEnumLabel(nextPrediction.componentType)} service
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text2)' }}>
                {formatEnumLabel(nextPrediction.componentType)} · {toConfidencePercent(nextPrediction.confidenceScore)}% confidence
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--orange)' }}>
                {new Date(nextPrediction.predictedServiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
                {relativeDay(nextPrediction.predictedServiceDate)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spent this year chart */}
      {costData.length > 0 && (
        <BarChart data={costData} sectionLabel="SPENT THIS YEAR" />
      )}

      {/* Delete vehicle */}
      <div style={{ padding: '10px 22px 32px' }}>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              display: 'block', margin: '0 auto',
              background: 'none', border: 'none',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, color: 'var(--red)',
              textDecoration: 'underline', cursor: 'pointer',
            }}
          >
            Delete vehicle
          </button>
        ) : (
          <div style={{
            background: 'rgba(248,113,113,0.07)',
            border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: 12,
            padding: 14,
          }}>
            <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 4, fontWeight: 600 }}>
              Delete this vehicle?
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, color: 'var(--text2)', marginBottom: 12,
            }}>
              All records, components, and fuel entries will be removed. This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8,
                  background: 'var(--red)', color: '#fff',
                  border: 'none', fontSize: 13, fontWeight: 600,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.7 : 1, fontFamily: 'inherit',
                }}
              >
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8,
                  background: 'var(--surface2)', color: 'var(--text2)',
                  border: '1px solid var(--border)', fontSize: 13,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
