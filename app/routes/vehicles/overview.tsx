import { useState, useEffect, useMemo } from 'react'
import { useOutletContext, useNavigate, useParams } from 'react-router-dom'
import BarChart from '@/ui/BarChart'
import ActionButton from '@/ui/ActionButton'
import { getVehicleCostSummary, getGeneralExpensesByVehicle } from '@/features/expenses/api'
import { getRecordsByVehicle } from '@/features/records/api'
import { getPredictionsByVehicle } from '@/features/predictions/api'
import { deleteVehicle } from '@/features/vehicles/api'
import { useVehiclesStore } from '@/features/vehicles/vehiclesStore'
import { dedupFetch } from '@/lib/dedup'
import { createComponent } from '@/features/components/api'
import { PRESET_GROUPS } from '@/lib/presetComponents'
import { COMPONENT_DEFAULTS } from '@/lib/componentTemplates'
import { formatEnumLabel } from '@/lib/formatters'
import { toConfidencePercent } from '@/lib/confidenceUtils'
import { healthPctToState } from '@/lib/healthState'

import type { ComponentHealth, GeneralExpense, MonthlyCostSummary, Prediction } from '@/lib/types'
import type { VehicleLayoutContext } from './layout'
import { useCurrencyStore, formatMoney } from '@/features/currency/currencyStore'

interface BarChartPoint { label: string; maintenance: number; fuel: number; general?: number }

const OVERVIEW_CATEGORY_EMOJI: Record<string, string> = {
  Insurance:   '🛡️',
  Tax:         '💰',
  Parking:     '🅿️',
  Tolls:       '🛣️',
  Fines:       '📜',
  CarWash:     '🫧',
  Accessories: '🔧',
  Other:       '📦',
}

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

  const knownHealth = health.filter((c) => c.currentState !== 'Unknown')
  const ringTotal = health.length || 1
  const counts = health.reduce<Record<string, number>>((acc, c) => {
    const state = c.currentState === 'Unknown'
      ? 'Unknown'
      : healthPctToState(Math.min(c.kmLifetimePercent ?? 0, c.yearsLifetimePercent ?? 0))
    acc[state] = (acc[state] ?? 0) + 1
    return acc
  }, {})
  const avg = knownHealth.length > 0
    ? Math.round(knownHealth.reduce((sum, c) => sum + Math.min(c.kmLifetimePercent ?? 0, c.yearsLifetimePercent ?? 0), 0) / knownHealth.length)
    : 0

  const stops = STATE_ORDER
    .filter((s) => counts[s])
    .reduce<{ parts: string[]; sum: number }>(
      ({ parts, sum }, s) => {
        const pct = ((counts[s] ?? 0) / ringTotal) * 100
        return { parts: [...parts, `${STATE_COLORS[s]} ${sum}% ${sum + pct}%`], sum: sum + pct }
      },
      { parts: [], sum: 0 }
    ).parts.join(', ')

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
  const { currency } = useCurrencyStore()

  const [costData, setCostData] = useState<BarChartPoint[]>([])
  const [recordCount, setRecordCount] = useState<number | null>(null)
  const [allPredictions, setAllPredictions] = useState<Prediction[]>([])
  const [recentExpenses, setRecentExpenses] = useState<GeneralExpense[]>([])
  const [expensesExpanded, setExpensesExpanded] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [settingUp, setSettingUp] = useState(false)
  const [selectedPresets, setSelectedPresets] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!vehicle?.vehicleId) return
    if (String(vehicle.vehicleId) !== vehicleId) return
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
      dedupFetch(`ge-${vehicle.vehicleId}`, () => getGeneralExpensesByVehicle(vehicle.vehicleId)),
    ]).then(([costRes, recordsRes, predsRes, geRes]) => {
      if (cancelled) return
      if (costRes.status === 'fulfilled') {
        const raw: MonthlyCostSummary[] = Array.isArray(costRes.value.data) ? costRes.value.data : []

        // Build month → general expenses total map
        const geByMonth: Record<string, number> = {}
        if (geRes.status === 'fulfilled' && Array.isArray(geRes.value.data)) {
          const geData = geRes.value.data as GeneralExpense[]
          for (const e of geData) {
            const key = e.date.slice(0, 7) // YYYY-MM
            geByMonth[key] = (geByMonth[key] ?? 0) + (e.cost ?? 0)
          }
          setRecentExpenses(
            geData
              .filter((e) => !e.isRecurring)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          )
        }

        setCostData(raw.map((item) => {
          const key = item.month.slice(0, 7)
          return {
            label:       new Date(item.month).toLocaleDateString('en-GB', { month: 'short' }),
            maintenance: item.maintenanceCost ?? 0,
            fuel:        item.fuelCost ?? 0,
            general:     geByMonth[key] ?? 0,
          }
        }))
      }
      if (recordsRes.status === 'fulfilled') {
        setRecordCount(Array.isArray(recordsRes.value.data) ? recordsRes.value.data.length : 0)
      }
      if (predsRes.status === 'fulfilled') {
        const preds: Prediction[] = Array.isArray(predsRes.value.data) ? predsRes.value.data : []
        setAllPredictions(preds)
      }
    })
    return () => { cancelled = true }
  }, [vehicle?.vehicleId, vehicleId])

  const todayStr = new Date().toISOString().slice(0, 10)

  // Derive next upcoming active prediction (existing card)
  const nextPrediction = useMemo(() =>
    allPredictions
      .filter((p) => p.status === 'Active')
      .sort((a, b) => {
        const da = a.suggestedByDate ? new Date(a.suggestedByDate).getTime() : Infinity
        const db = b.suggestedByDate ? new Date(b.suggestedByDate).getTime() : Infinity
        return da - db
      })[0] ?? null
  , [allPredictions])

  // Build the calendar event map: YYYY-MM-DD → [{label, color}]
  const serviceEvents = useMemo(() => {
    const map = new Map<string, { label: string; color: string }[]>()
    const add = (key: string, ev: { label: string; color: string }) => {
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ev)
    }
    const URGENCY_COLOR: Record<string, string> = {
      Immediate: 'var(--red)',
      Soon:      'var(--orange)',
      Scheduled: 'var(--yellow)',
      Suggested: 'var(--text3)',
    }
    for (const p of allPredictions.filter((p) => p.status === 'Active')) {
      const color = URGENCY_COLOR[p.urgency] ?? 'var(--text3)'
      const key = p.suggestedByDate
        ? p.suggestedByDate.slice(0, 10)
        : p.urgency === 'Immediate' ? todayStr : null
      if (key) add(key, { label: p.title, color })
    }
    for (const c of (health ?? [])) {
      if (c.aiEstimatedNextServiceDate) {
        add(c.aiEstimatedNextServiceDate.slice(0, 10), {
          label: c.vehicleComponentName ?? formatEnumLabel(c.componentType),
          color: 'var(--accent)',
        })
      }
    }
    return map
  }, [allPredictions, health, todayStr])

  // Build flat array of day cells for the current calendar month
  const calendarDays = useMemo(() => {
    const yr  = calendarMonth.getFullYear()
    const mo  = calendarMonth.getMonth()
    const firstDow    = new Date(yr, mo, 1).getDay()         // 0=Sun
    const daysInMonth = new Date(yr, mo + 1, 0).getDate()
    const startOffset = (firstDow + 6) % 7                   // convert to Mon-first
    const cells: (number | null)[] = Array(startOffset).fill(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [calendarMonth])

  if (!vehicle) return null

  const totalSpent = costData.reduce((sum, item) => sum + item.maintenance + item.fuel + (item.general ?? 0), 0)

  const counts = (health ?? [])
    .reduce<Record<string, number>>((acc, c) => {
      const state = c.currentState === 'Unknown'
        ? 'Unknown'
        : healthPctToState(Math.min(c.kmLifetimePercent ?? 0, c.yearsLifetimePercent ?? 0))
      acc[state] = (acc[state] ?? 0) + 1
      return acc
    }, {})

  const attnComponents = (health ?? []).filter((c) => {
    if (c.currentState === 'Unknown') return false
    const state = healthPctToState(Math.min(c.kmLifetimePercent ?? 0, c.yearsLifetimePercent ?? 0))
    return state === 'Critical' || state === 'Repair'
  })

  const criticalCount = attnComponents.filter((c) =>
    healthPctToState(Math.min(c.kmLifetimePercent ?? 0, c.yearsLifetimePercent ?? 0)) === 'Critical'
  ).length
  const repairCount = attnComponents.length - criticalCount

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
            installedAtVehicleMileage: 0,
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
          {/* Header row: title left, counts right */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange)' }}>
                {attnComponents.length} need attention
              </span>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, flexShrink: 0 }}>
              {criticalCount > 0 && (
                <span style={{ color: 'var(--red)' }}>{criticalCount} critical</span>
              )}
              {criticalCount > 0 && repairCount > 0 && (
                <span style={{ color: 'var(--text3)' }}> · </span>
              )}
              {repairCount > 0 && (
                <span style={{ color: 'var(--orange)' }}>{repairCount} repair</span>
              )}
            </div>
          </div>

          {/* Chips — max 4, 2-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {attnComponents.slice(0, 4).map((c) => {
              const state = healthPctToState(Math.min(c.kmLifetimePercent ?? 0, c.yearsLifetimePercent ?? 0))
              const isCritical = state === 'Critical'
              return (
                <div
                  key={c.componentId}
                  onClick={() => navigate(`/vehicles/${vehicleId}/components/${c.componentId}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, minWidth: 0,
                    padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
                    background: isCritical ? 'rgba(248,113,113,0.12)' : 'rgba(251,146,60,0.12)',
                    border: `1px solid ${isCritical ? 'rgba(248,113,113,0.3)' : 'rgba(251,146,60,0.3)'}`,
                  }}
                >
                  <div style={{
                    width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                    background: isCritical ? 'var(--red)' : 'var(--orange)',
                  }} />
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10, fontWeight: 600,
                    color: isCritical ? 'var(--red)' : 'var(--orange)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {c.vehicleComponentName ?? formatEnumLabel(c.componentType)}
                  </span>
                </div>
              )
            })}
          </div>

          {/* View all link */}
          <div
            onClick={() => navigate(`/vehicles/${vehicleId}/components`)}
            style={{ marginTop: 10, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, fontWeight: 600, color: 'var(--accent)',
            }}>
              → View all in Components
            </span>
          </div>
        </div>
      )}

      {attnComponents.length === 0 && (
        <div style={{
          margin: '8px 16px 12px',
          background: 'rgba(74,222,128,0.06)',
          border: '1px solid rgba(74,222,128,0.2)',
          borderRadius: 12,
          padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>
            Everything looks good
          </span>
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
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
        margin: '0 16px 12px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        <div style={{ padding: '12px 0', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>
            {formatMoney(totalSpent, currency)}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text2)', marginTop: 3 }}>
            all time
          </div>
        </div>
        <div style={{ padding: '12px 0', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            {health?.length ?? 0}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text2)', marginTop: 3 }}>
            components
          </div>
        </div>
        <div style={{ padding: '12px 0', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            {recordCount ?? '—'}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text2)', marginTop: 3 }}>
            records
          </div>
        </div>
        <div style={{ padding: '12px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            {vehicle.averageKmPerYear != null
              ? `${(vehicle.averageKmPerYear / 1000).toFixed(1)}k`
              : '—'}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text2)', marginTop: 3 }}>
            km/year
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
                {nextPrediction.title}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text2)' }}>
                {nextPrediction.componentName ?? nextPrediction.urgency}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--orange)' }}>
                {nextPrediction.suggestedByDate
                  ? new Date(nextPrediction.suggestedByDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                  : nextPrediction.urgency}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
                {nextPrediction.suggestedByDate ? relativeDay(nextPrediction.suggestedByDate) : ''}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Calendar */}
      {serviceEvents.size > 0 && (
        <div style={{
          margin: '0 16px 12px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '12px 14px',
        }}>
          {/* Calendar header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              Service Calendar
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: '0 4px' }}
              >‹</button>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, fontWeight: 600, color: 'var(--text)',
                minWidth: 82, textAlign: 'center',
              }}>
                {calendarMonth.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
              </span>
              <button
                onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: '0 4px' }}
              >›</button>
            </div>
          </div>

          {/* Weekday headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 2 }}>
            {['Mo','Tu','We','Th','Fr','Sa','Su'].map((d) => (
              <div key={d} style={{
                textAlign: 'center',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 8, color: 'var(--text3)', paddingBottom: 4,
              }}>{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {calendarDays.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} />
              const yr  = calendarMonth.getFullYear()
              const mo  = String(calendarMonth.getMonth() + 1).padStart(2, '0')
              const dy  = String(day).padStart(2, '0')
              const key = `${yr}-${mo}-${dy}`
              const evs = serviceEvents.get(key) ?? []
              const isToday    = key === todayStr
              const isSelected = selectedDay === key
              const hasEvs     = evs.length > 0
              return (
                <div
                  key={key}
                  onClick={() => hasEvs && setSelectedDay((prev) => prev === key ? null : key)}
                  style={{
                    borderRadius: 7,
                    padding: '4px 2px 3px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    background: isSelected
                      ? 'rgba(108,99,255,0.14)'
                      : isToday ? 'rgba(108,99,255,0.06)' : 'none',
                    border: isToday
                      ? '1px solid rgba(108,99,255,0.28)'
                      : '1px solid transparent',
                    cursor: hasEvs ? 'pointer' : 'default',
                  }}
                >
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    color: isToday ? 'var(--accent)' : 'var(--text2)',
                    fontWeight: isToday ? 700 : 400,
                  }}>
                    {day}
                  </span>
                  {hasEvs && (
                    <div style={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                      {evs.slice(0, 3).map((ev, j) => (
                        <div key={j} style={{
                          width: 4, height: 4, borderRadius: '50%',
                          background: ev.color, flexShrink: 0,
                        }} />
                      ))}
                      {evs.length > 3 && (
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 7, color: 'var(--text3)', lineHeight: 1,
                        }}>+{evs.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Selected day event list */}
          {selectedDay && (serviceEvents.get(selectedDay)?.length ?? 0) > 0 && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, color: 'var(--text3)', marginBottom: 6,
              }}>
                {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-GB', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
              </div>
              {serviceEvents.get(selectedDay)!.map((ev, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: ev.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.3 }}>{ev.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Legend */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 10,
            marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)',
          }}>
            {[
              { color: 'var(--red)',    label: 'Immediate' },
              { color: 'var(--orange)', label: 'Soon' },
              { color: 'var(--yellow)', label: 'Scheduled' },
              { color: 'var(--accent)', label: 'AI estimate' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text3)' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spent this year chart */}
      {costData.length > 0 && (
        <BarChart data={costData} sectionLabel="SPENT THIS YEAR" />
      )}

      {/* Recent one-off expenses */}
      {recentExpenses.length > 0 && (
        <div style={{ margin: '0 16px 12px' }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, color: 'var(--text3)',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            marginBottom: 8,
          }}>
            Recent Expenses
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, overflow: 'hidden',
              maxHeight: !expensesExpanded && recentExpenses.length > 2 ? 150 : undefined,
            }}>
              {recentExpenses.map((expense, i) => {
                const emoji = OVERVIEW_CATEGORY_EMOJI[expense.expenseCategory] ?? '💳'
                const date = new Date(expense.date).toLocaleDateString('en-GB', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })
                return (
                  <div
                    key={expense.generalExpenseId}
                    onClick={() => navigate(`/expenses/${expense.generalExpenseId}`)}
                    style={{
                      padding: '10px 12px', cursor: 'pointer',
                      borderBottom: i < recentExpenses.length - 1 ? '1px solid var(--border)' : 'none',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                        {emoji} {formatEnumLabel(expense.expenseCategory)}
                      </div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>
                        {date}
                        {expense.description && (
                          <> · <span style={{ color: 'var(--text2)' }}>{expense.description}</span></>
                        )}
                      </div>
                    </div>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12, fontWeight: 700, color: 'var(--accent4)',
                      flexShrink: 0, marginLeft: 8,
                    }}>
                      {formatMoney(expense.cost, currency)}
                    </span>
                  </div>
                )
              })}
            </div>

            {!expensesExpanded && recentExpenses.length > 2 && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 48,
                background: 'linear-gradient(to bottom, transparent, var(--surface))',
                borderRadius: '0 0 12px 12px',
                pointerEvents: 'none',
              }} />
            )}
          </div>

          {recentExpenses.length > 2 && (
            <button
              onClick={() => setExpensesExpanded((p) => !p)}
              style={{
                marginTop: 6, width: '100%',
                background: 'none', border: '1px solid var(--border)',
                borderRadius: 8, padding: '6px 0',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, fontWeight: 600, color: 'var(--text3)',
                cursor: 'pointer',
                textTransform: 'uppercase' as const, letterSpacing: '0.1em',
              }}
            >
              {expensesExpanded ? '▲ Show less' : `▼ Show all ${recentExpenses.length}`}
            </button>
          )}
        </div>
      )}

      {/* Edit / Delete vehicle */}
      <ActionButton variant="ghost" onClick={() => navigate(`/vehicles/${vehicleId}/edit`)}>
        Edit Vehicle
      </ActionButton>
      <div style={{ height: 8 }} />
      <div style={{ padding: '0 22px 32px' }}>
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
