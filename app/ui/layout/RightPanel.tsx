import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVehiclesStore } from '@/features/vehicles/vehicleStore'
import { useExpensesStore } from '@/features/expenses/expenseStore'
import { usePredictionsStore } from '@/features/predictions/predictionStore'
import { useCurrencyStore, formatMoney } from '@/features/currency/currencyStore'
import { getFuelByVehicle } from '@/features/fuel/api'
import { dedupFetch } from '@/shared/dedup'
import { colorFromPct } from '@/shared/healthState'
import HealthBar from '@/ui/HealthBar'
import type { FuelEntry } from '@/shared/types'

function relativeDay(dateStr: string): string {
  const diff = Math.round(
    (new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000
  )
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff > 0 && diff <= 30) return `in ${diff}d`
  if (diff < 0) return `${Math.abs(diff)}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

const URGENCY_COLOR: Record<string, string> = {
  Immediate: 'var(--red)',
  Soon:      'var(--orange)',
  Scheduled: 'var(--yellow)',
  Suggested: 'var(--text2)',
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />
}

export default function RightPanel() {
  const navigate = useNavigate()

  const { vehicles, healthMap, fetch: fetchVehicles } = useVehiclesStore()
  const { summaries, generalExpenses, fetchAll: fetchExpenses, fetchGeneralExpenses } = useExpensesStore()
  const { predictions, fetchAll: fetchPredictions } = usePredictionsStore()
  const { currency } = useCurrencyStore()

  const [fuelMap, setFuelMap] = useState<Record<number, FuelEntry[]>>({})

  useEffect(() => { fetchVehicles() }, [fetchVehicles])

  useEffect(() => {
    if (!vehicles.length) return
    const ids = vehicles.map((v) => v.vehicleId)
    fetchExpenses(ids)
    fetchGeneralExpenses(ids)
    fetchPredictions(ids)
    Promise.allSettled(
      vehicles.map((v) =>
        dedupFetch(`fuel-vehicle-${v.vehicleId}`, () => getFuelByVehicle(v.vehicleId))
          .then((r) => ({ vehicleId: v.vehicleId, data: r.data as FuelEntry[] }))
      )
    ).then((results) => {
      const map: Record<number, FuelEntry[]> = {}
      results.forEach((r) => { if (r.status === 'fulfilled') map[r.value.vehicleId] = r.value.data })
      setFuelMap(map)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles.length])

  // ── Fleet health ─────────────────────────────────────────────────────────────
  const allComponents = Object.values(healthMap).flat()
  const allPcts = allComponents.map((c) =>
    Math.min(c.kmLifetimePercent ?? 0, c.yearsLifetimePercent ?? 0)
  )
  const fleetHealthPct = allPcts.length > 0
    ? Math.round(allPcts.reduce((a, b) => a + b, 0) / allPcts.length)
    : null
  const healthyCount = allComponents.filter((c) =>
    c.currentState === 'Perfect' || c.currentState === 'Good' || c.currentState === 'Normal'
  ).length

  // ── This month spend (maintenance + fuel + general expenses) ─────────────
  const currentMonthKey = new Date().toISOString().slice(0, 7)
  const summarySpend = Object.values(summaries)
    .flat()
    .filter((s) => (s.month ?? '').startsWith(currentMonthKey))
    .reduce((sum, s) => sum + (s.maintenanceCost ?? 0) + (s.fuelCost ?? 0), 0)
  const generalSpend = generalExpenses
    .filter((e) => e.date.startsWith(currentMonthKey))
    .reduce((sum, e) => sum + (e.cost ?? 0), 0)
  const thisMonthSpend = summarySpend + generalSpend

  // ── Mileage this month (odometer delta across fleet) ──────────────────────
  const mileageThisMonth = vehicles.reduce((total, v) => {
    const entries = (fuelMap[v.vehicleId] ?? []).slice().sort(
      (a, b) => new Date(a.refillDate).getTime() - new Date(b.refillDate).getTime()
    )
    const monthEntries = entries.filter((e) => e.refillDate.startsWith(currentMonthKey))
    if (!monthEntries.length) return total
    const maxThisMonth = Math.max(...monthEntries.map((e) => e.mileage))
    const prevEntries = entries.filter((e) => e.refillDate < currentMonthKey)
    const baseline = prevEntries.length
      ? Math.max(...prevEntries.map((e) => e.mileage))
      : Math.min(...monthEntries.map((e) => e.mileage))
    return total + Math.max(0, maxThisMonth - baseline)
  }, 0)

  // ── Upcoming services (top 3 active predictions across fleet) ─────────────
  const upcomingServices = vehicles
    .flatMap((v) =>
      (predictions[v.vehicleId] ?? [])
        .filter((p) => p.status === 'Active')
        .map((p) => ({ prediction: p, vehicle: v }))
    )
    .sort((a, b) => {
      const da = a.prediction.suggestedByDate
        ? new Date(a.prediction.suggestedByDate).getTime()
        : Infinity
      const db = b.prediction.suggestedByDate
        ? new Date(b.prediction.suggestedByDate).getTime()
        : Infinity
      return da - db
    })
    .slice(0, 3)

  // ── Vehicles ranked by health (best first) ───────────────────────────────
  const vehiclesByHealth = vehicles
    .map((v) => {
      const health = healthMap[v.vehicleId] ?? []
      const pcts = health.map((c) =>
        Math.min(c.kmLifetimePercent ?? 0, c.yearsLifetimePercent ?? 0)
      )
      const avg = pcts.length > 0
        ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
        : null
      return { vehicle: v, avg }
    })
    .filter((x): x is { vehicle: typeof x.vehicle; avg: number } => x.avg !== null)
    .sort((a, b) => b.avg - a.avg)

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })

  return (
    <aside style={{
      width: 260,
      height: '100vh',
      background: 'var(--surface)',
      borderLeft: '1px solid var(--border)',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Header */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={LABEL}>FLEET OVERVIEW</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
            {today}
          </div>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <div style={{ padding: '32px 16px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', lineHeight: 1.6 }}>
            ADD A VEHICLE<br />TO SEE FLEET STATS
          </div>
        </div>
      ) : (
        <>
          {/* Fleet Health */}
          <div style={SECTION}>
            <div style={LABEL}>FLEET HEALTH</div>
            {fleetHealthPct !== null ? (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 8 }}>
                  <span style={{
                    fontSize: 30,
                    fontWeight: 800,
                    lineHeight: 1,
                    color: colorFromPct(fleetHealthPct),
                  }}>
                    {fleetHealthPct}%
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
                    avg
                  </span>
                </div>
                <HealthBar percent={fleetHealthPct} height={5} />
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginTop: 6 }}>
                  {healthyCount} / {allComponents.length} components healthy
                </div>
              </>
            ) : (
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>—</div>
            )}
          </div>

          <Divider />

          {/* This Month */}
          <div style={SECTION}>
            <div style={LABEL}>EXPENSES THIS MONTH</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>
              {thisMonthSpend > 0 ? formatMoney(thisMonthSpend, currency) : '—'}
            </div>
          </div>

          <Divider />

          {/* Mileage This Month */}
          <div style={SECTION}>
            <div style={LABEL}>MILEAGE THIS MONTH</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent2)', lineHeight: 1 }}>
              {mileageThisMonth > 0
                ? `${mileageThisMonth.toLocaleString()} km`
                : '—'}
            </div>
          </div>

          <Divider />

          {/* Upcoming Services */}
          <div style={SECTION}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={LABEL}>UPCOMING SERVICES</div>
            </div>
            {upcomingServices.length === 0 ? (
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
                No active predictions
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {upcomingServices.map(({ prediction, vehicle }) => (
                  <div
                    key={prediction.predictionId}
                    onClick={() => navigate(`/vehicles/${vehicle.vehicleId}/predictions`)}
                    style={{
                      borderRadius: 8,
                      padding: '8px 10px',
                      background: 'var(--surface3)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text)',
                      lineHeight: 1.25,
                      marginBottom: 4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {prediction.title}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 9,
                        color: 'var(--text3)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        marginRight: 6,
                      }}>
                        {vehicle.brand} {vehicle.model}
                      </div>
                      <div style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 9,
                        fontWeight: 700,
                        color: URGENCY_COLOR[prediction.urgency] ?? 'var(--text2)',
                        flexShrink: 0,
                      }}>
                        {prediction.suggestedByDate
                          ? relativeDay(prediction.suggestedByDate)
                          : prediction.urgency}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Divider />

          {/* Vehicles by Health */}
          {vehiclesByHealth.length > 0 && (
            <div style={SECTION}>
              <div style={LABEL}>VEHICLES BY HEALTH</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {vehiclesByHealth.map(({ vehicle, avg }, i) => (
                  <div
                    key={vehicle.vehicleId}
                    onClick={() => navigate(`/vehicles/${vehicle.vehicleId}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 9,
                        color: 'var(--text3)',
                        width: 14,
                        flexShrink: 0,
                        textAlign: 'right',
                      }}>
                        {i + 1}
                      </span>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text)',
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {vehicle.brand} {vehicle.model}
                      </span>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 10,
                        fontWeight: 700,
                        flexShrink: 0,
                        color: colorFromPct(avg),
                      }}>
                        {avg}%
                      </span>
                    </div>
                    <div style={{ paddingLeft: 20 }}>
                      <HealthBar percent={avg} height={3} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Divider />
        </>
      )}
    </aside>
  )
}

const SECTION: React.CSSProperties = { padding: '18px 16px' }

const LABEL: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 9,
  fontWeight: 700,
  color: 'var(--text3)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  marginBottom: 10,
}
