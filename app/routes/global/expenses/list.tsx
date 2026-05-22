import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import BarChart from '@/ui/BarChart'
import FloatingAddButton from '@/ui/FloatingAddButton'
import { useVehiclesStore } from '@/features/vehicles/vehiclesStore'
import { useExpensesStore } from '@/features/expenses/expensesStore'

import { formatEnumLabel } from '@/lib/formatters'
import { useCurrencyStore, formatMoney } from '@/features/currency/currencyStore'
import AddCardIcon from '@mui/icons-material/AddCard'
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation'
import BuildIcon from '@mui/icons-material/Build'


const CATEGORY_EMOJI: Record<string, string> = {
  Insurance:   '🛡️',
  Tax:         '💰',
  Parking:     '🅿️',
  Tolls:       '🛣️',
  Fines:       '📜',
  CarWash:     '🫧',
  Accessories: '🔧',
  Other:       '📦',
}

const VEHICLE_COLORS = [
  'var(--accent)', 'var(--orange)', 'var(--green)',
  'var(--accent4)', 'var(--accent3)', 'var(--yellow)',
]

const CAT_COLORS = {
  maintenance: 'var(--accent3)',
  fuel:        'var(--orange)',
  general:     'var(--accent4)',
}

const CHART_H = 90
const Y_TICKS = 4

function niceMax(v: number): number {
  if (v <= 0) return 10
  const exp = Math.pow(10, Math.floor(Math.log10(v)))
  const f = v / exp
  if (f <= 1) return exp
  if (f <= 2) return 2 * exp
  if (f <= 5) return 5 * exp
  return 10 * exp
}

function fmtY(n: number): string {
  if (n === 0) return '0'
  if (n >= 1000) {
    const k = n / 1000
    return (k % 1 === 0 ? k : parseFloat(k.toFixed(1))) + 'k'
  }
  return String(n)
}

type ViewMode = 'category' | 'vehicles'

export default function Expenses() {
  const navigate = useNavigate()
  const { currency } = useCurrencyStore()
  const [viewMode, setViewMode] = useState<ViewMode>('category')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showFilter, setShowFilter] = useState(false)
  const [showOneOff, setShowOneOff] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  const { vehicles, loading: vehiclesLoading, fetch: fetchVehicles } = useVehiclesStore()
  const { summaries, generalExpenses, loading: summariesLoading, generalLoading, fetchAll, fetchGeneralExpenses } = useExpensesStore()

  const loading = vehiclesLoading || summariesLoading || generalLoading

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilter(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => { fetchVehicles() }, [fetchVehicles])

  useEffect(() => {
    if (!vehicles.length) return
    fetchAll(vehicles.map((v) => v.vehicleId))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles.length])

  useEffect(() => {
    if (!vehicles.length) return
    fetchGeneralExpenses(vehicles.map((v) => v.vehicleId))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles.length])

  const activeSummaries = selectedId
    ? (summaries[selectedId] ?? [])
    : Object.values(summaries).flat()

  const activeGeneralExpenses = selectedId
    ? generalExpenses.filter((e) => e.vehicleId === selectedId)
    : generalExpenses

  const chartData = (() => {
    if (!activeSummaries.length && !activeGeneralExpenses.length) return []
    const byMonth: Record<string, { key: string; label: string; maintenance: number; fuel: number; general: number }> = {}
    activeSummaries.forEach((d) => {
      const key = (d.month ?? '').slice(0, 7)
      const label = new Date(d.month).toLocaleDateString('en-GB', { month: 'short' })
      if (!byMonth[key]) byMonth[key] = { key, label, maintenance: 0, fuel: 0, general: 0 }
      byMonth[key].maintenance += d.maintenanceCost ?? 0
      byMonth[key].fuel += d.fuelCost ?? 0
    })
    activeGeneralExpenses.forEach((e) => {
      const key = (e.date ?? '').slice(0, 7)
      if (!key) return
      const label = new Date(e.date).toLocaleDateString('en-GB', { month: 'short' })
      if (!byMonth[key]) byMonth[key] = { key, label, maintenance: 0, fuel: 0, general: 0 }
      byMonth[key].general += e.cost ?? 0
    })
    return Object.values(byMonth)
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-6)
  })()

  const vehicleChartMonths = (() => {
    const allData = Object.values(summaries).flat()
    if (!allData.length) return []
    const byMonth: Record<string, string> = {}
    allData.forEach((d) => {
      const key = (d.month ?? '').slice(0, 7)
      const label = new Date(d.month).toLocaleDateString('en-GB', { month: 'short' })
      byMonth[key] = label
    })
    return Object.keys(byMonth).sort().slice(-6).map((k) => ({ key: k, label: byMonth[k] }))
  })()

  const maintenanceCost = activeSummaries.reduce((sum, d) => sum + (d.maintenanceCost ?? 0), 0)
  const fuelCost        = activeSummaries.reduce((sum, d) => sum + (d.fuelCost ?? 0), 0)
  const generalCost     = activeGeneralExpenses.reduce((sum, e) => sum + (e.cost ?? 0), 0)
  const allTimeCost     = maintenanceCost + fuelCost + generalCost

  const now = new Date()
  const currentMonthKey = now.toISOString().slice(0, 7)
  const lastMonthKey = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7)

  const thisMonthCost = activeSummaries
    .filter((s) => (s.month ?? '').startsWith(currentMonthKey))
    .reduce((sum, s) => sum + (s.maintenanceCost ?? 0) + (s.fuelCost ?? 0), 0)

  const lastMonthCost = activeSummaries
    .filter((s) => (s.month ?? '').startsWith(lastMonthKey))
    .reduce((sum, s) => sum + (s.maintenanceCost ?? 0) + (s.fuelCost ?? 0), 0)

  const monthChange = lastMonthCost > 0
    ? Math.round(((thisMonthCost - lastMonthCost) / lastMonthCost) * 100)
    : null

  const uniqueMonths = new Set(activeSummaries.map((s) => (s.month ?? '').slice(0, 7))).size
  const avgMonthly = uniqueMonths > 0 ? Math.round((maintenanceCost + fuelCost) / uniqueMonths) : 0

  const vehicleBreakdown = vehicles
    .map((v) => {
      const vSummaries = summaries[v.vehicleId] ?? []
      const maintTotal = vSummaries.reduce((s, d) => s + (d.maintenanceCost ?? 0), 0)
      const fuelTotal  = vSummaries.reduce((s, d) => s + (d.fuelCost ?? 0), 0)
      const genTotal   = generalExpenses
        .filter((e) => e.vehicleId === v.vehicleId)
        .reduce((s, e) => s + (e.cost ?? 0), 0)
      const total = maintTotal + fuelTotal + genTotal
      return { name: `${v.brand} ${v.model}`, total, vehicleId: v.vehicleId, maintTotal, fuelTotal, genTotal }
    })
    .filter((v) => v.total > 0)
    .sort((a, b) => b.total - a.total)

  const vcMaxVal = (() => {
    let max = 0
    vehicleChartMonths.forEach(({ key }) => {
      vehicles.forEach((v) => {
        const total = (summaries[v.vehicleId] ?? [])
          .filter((d) => (d.month ?? '').startsWith(key))
          .reduce((s, d) => s + (d.maintenanceCost ?? 0) + (d.fuelCost ?? 0), 0)
        if (total > max) max = total
      })
    })
    return max
  })()
  const vcScale = niceMax(vcMaxVal)
  const vcTicks = Array.from({ length: Y_TICKS + 1 }, (_, i) => Math.round((vcScale / Y_TICKS) * i))

  const fabOptions = [
    { icon: AddCardIcon,         label: 'New General Expense',   path: '/expenses/new' },
    { icon: LocalGasStationIcon, label: 'Log Fuel Refill',       path: '/fuel/new'     },
    { icon: BuildIcon,           label: 'New Maintenance Record', path: '/records/new'  },
  ]

  return (
    <PageShell>
      {/* Header with inline vehicle filter */}
      <div style={{ padding: '20px 22px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Expenses</div>
        {vehicles.length > 0 && (
          <div ref={filterRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowFilter((p) => !p)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '5px 10px', borderRadius: 999, cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 500,
                border: (showFilter || selectedId !== null) ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: (showFilter || selectedId !== null) ? 'rgba(108,99,255,0.1)' : 'var(--surface2)',
                color: (showFilter || selectedId !== null) ? 'var(--accent)' : 'var(--text3)',
                transition: 'all 0.15s',
              }}
            >
              {selectedId === null
                ? 'All cars'
                : (() => { const v = vehicles.find((x) => x.vehicleId === selectedId); return v ? `${v.brand} ${v.model}` : 'All cars' })()
              } ▾
            </button>
            {showFilter && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 100,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 10, overflow: 'hidden', minWidth: 200,
                boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              }}>
                {[{ vehicleId: null, label: 'All cars' }, ...vehicles.map((v) => ({ vehicleId: v.vehicleId, label: `${v.brand} ${v.model}` }))].map(({ vehicleId, label }) => (
                  <button
                    key={vehicleId ?? 'all'}
                    onClick={() => { setSelectedId(vehicleId as number | null); setShowFilter(false) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '11px 14px', background: 'none', border: 'none',
                      borderBottom: '1px solid var(--border)',
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                      color: selectedId === vehicleId ? 'var(--accent)' : 'var(--text2)',
                      fontWeight: selectedId === vehicleId ? 600 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {selectedId === vehicleId && '✓ '}{label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* View mode tabs */}
      <div style={{ padding: '0 22px 12px', display: 'flex', gap: 6 }}>
        {(['category', 'vehicles'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            style={{
              padding: '5px 14px', borderRadius: 999, cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600,
              textTransform: 'uppercase',
              border: viewMode === mode ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: viewMode === mode ? 'rgba(108,99,255,0.1)' : 'var(--surface2)',
              color: viewMode === mode ? 'var(--accent)' : 'var(--text3)',
              transition: 'all 0.15s',
            }}
          >
            {mode === 'category' ? 'By Category' : 'By Vehicles'}
          </button>
        ))}
      </div>

      {/* Month comparison card */}
      {!loading && (
        <div style={{
          margin: '0 22px 10px',
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '14px 16px',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: avgMonthly > 0 ? 10 : 0 }}>
            <div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5,
              }}>
                This Month
              </div>
              {thisMonthCost === 0 ? (
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', fontStyle: 'italic' }}>
                  Nothing logged yet
                </div>
              ) : (
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>
                  {formatMoney(thisMonthCost, currency)}
                </div>
              )}
              {monthChange !== null && (
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, marginTop: 4,
                  color: monthChange <= 0 ? 'var(--green)' : 'var(--red)',
                }}>
                  {monthChange > 0 ? '+' : ''}{monthChange}% vs last month
                </div>
              )}
            </div>

            <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 12 }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5,
              }}>
                Last Month
              </div>
              {lastMonthCost === 0 ? (
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)', fontStyle: 'italic' }}>
                  Nothing logged yet
                </div>
              ) : (
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text2)', lineHeight: 1 }}>
                  {formatMoney(lastMonthCost, currency)}
                </div>
              )}
            </div>
          </div>

          {avgMonthly > 0 && (
            <div style={{
              borderTop: '1px solid var(--border)', paddingTop: 10,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
                Monthly avg
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text2)', fontWeight: 600 }}>
                {formatMoney(avgMonthly, currency)}
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>·</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
                {uniqueMonths} month{uniqueMonths !== 1 ? 's' : ''} tracked
              </span>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div style={{ padding: '40px 22px', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text3)' }}>
          LOADING...
        </div>
      )}

      {/* CATEGORY MODE */}
      {!loading && viewMode === 'category' && (
        <>
          {chartData.length > 0 && (
            <BarChart
              data={chartData}
              title={formatMoney(maintenanceCost + fuelCost + generalCost, currency)}
              subtitle={selectedId
                ? `${vehicles.find((v) => v.vehicleId === selectedId)?.brand} · last 6 months`
                : 'all vehicles · last 6 months'
              }
            />
          )}

          {selectedId === null && vehicleBreakdown.length > 1 && (
            <div style={{ padding: '0 22px', marginBottom: 16 }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12,
              }}>
                By Vehicle
              </div>
              {vehicleBreakdown.map(({ name, total, vehicleId: vid, maintTotal, fuelTotal, genTotal }) => (
                <div key={vid} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{name}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: 'var(--accent)' }}>
                      {formatMoney(total, currency)}
                    </span>
                  </div>
                  <div style={{ height: 5, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', display: 'flex' }}>
                    {total > 0 && (
                      <>
                        {maintTotal > 0 && <div style={{ flex: maintTotal, background: CAT_COLORS.maintenance }} />}
                        {fuelTotal  > 0 && <div style={{ flex: fuelTotal,  background: CAT_COLORS.fuel }} />}
                        {genTotal   > 0 && <div style={{ flex: genTotal,   background: CAT_COLORS.general }} />}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ padding: '0 22px' }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12,
            }}>
              By Category
            </div>
            {[
              { label: '🔧 Maintenance', value: maintenanceCost, color: CAT_COLORS.maintenance },
              { label: '⛽ Fuel',        value: fuelCost,        color: CAT_COLORS.fuel        },
              { label: '💳 General',     value: generalCost,     color: CAT_COLORS.general      },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{label}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color }}>
                    {formatMoney(value, currency)}
                  </span>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: allTimeCost > 0 ? `${(value / allTimeCost) * 100}%` : '0%',
                    background: color, borderRadius: 99, transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* VEHICLES MODE */}
      {!loading && viewMode === 'vehicles' && (
        <>
          {vehicleChartMonths.length > 0 && vehicleBreakdown.length > 0 && (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, padding: 14, margin: '0 16px 12px',
            }}>
              {/* Legend */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {vehicleBreakdown.map(({ name, vehicleId: vid }, i) => (
                  <div key={vid} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: VEHICLE_COLORS[i % VEHICLE_COLORS.length] }} />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text2)' }}>{name}</span>
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ position: 'relative', height: CHART_H }}>
                    {vcTicks.map((tick) => (
                      <div key={tick} style={{
                        position: 'absolute', left: 0, right: 0,
                        bottom: `${(tick / vcScale) * 100}%`, height: 1,
                        background: 'var(--border)', opacity: tick === 0 ? 1 : 0.6,
                      }} />
                    ))}

                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: '100%', position: 'relative', zIndex: 1 }}>
                      {vehicleChartMonths.map(({ key }) => (
                        <div key={key} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 1, height: '100%' }}>
                          {vehicleBreakdown.map(({ vehicleId: vid }, i) => {
                            const monthTotal = (summaries[vid] ?? [])
                              .filter((d) => (d.month ?? '').startsWith(key))
                              .reduce((s, d) => s + (d.maintenanceCost ?? 0) + (d.fuelCost ?? 0), 0)
                            const barH = vcScale > 0 ? (monthTotal / vcScale) * 100 : 0
                            return (
                              <div key={vid} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                                {monthTotal > 0 && (
                                  <div style={{
                                    height: `${barH}%`, minHeight: 2,
                                    background: VEHICLE_COLORS[i % VEHICLE_COLORS.length],
                                    opacity: 0.85, borderRadius: '3px 3px 0 0',
                                  }} />
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', marginTop: 6 }}>
                    {vehicleChartMonths.map(({ key, label }) => (
                      <span key={key} style={{
                        flex: 1, textAlign: 'center',
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)',
                      }}>
                        {label}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ position: 'relative', height: CHART_H, width: 26, flexShrink: 0 }}>
                  {vcTicks.map((tick) => (
                    <span key={tick} style={{
                      position: 'absolute', bottom: `${(tick / vcScale) * 100}%`, right: 0,
                      transform: 'translateY(50%)',
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text3)', lineHeight: 1,
                    }}>
                      {fmtY(tick)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {vehicleBreakdown.length > 0 && (
            <div style={{ padding: '0 22px', marginBottom: 16 }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12,
              }}>
                By Vehicle
              </div>
              {vehicleBreakdown.map(({ name, total, vehicleId: vid }, i) => {
                const color = VEHICLE_COLORS[i % VEHICLE_COLORS.length]
                const allVehiclesTotal = vehicleBreakdown.reduce((s, v) => s + v.total, 0)
                return (
                  <div key={vid} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{name}</span>
                      </div>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color }}>
                        {formatMoney(total, currency)}
                      </span>
                    </div>
                    <div style={{ height: 5, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: allVehiclesTotal > 0 ? `${(total / allVehiclesTotal) * 100}%` : '0%',
                        background: color, borderRadius: 99, transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* General expenses list */}
      {!loading && activeGeneralExpenses.length > 0 && (() => {
        const sorted = activeGeneralExpenses
          .slice()
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        const recurring = sorted.filter((e) => e.isRecurring)
        const oneOff    = sorted.filter((e) => !e.isRecurring && !e.vehicleId)

        const ExpenseCard = (expense: typeof activeGeneralExpenses[0]) => {
          const vehicle       = vehicles.find((v) => v.vehicleId === expense.vehicleId)
          const emoji         = CATEGORY_EMOJI[expense.expenseCategory] ?? '💳'
          const formattedDate = new Date(expense.date).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
          })
          return (
            <div
              key={expense.generalExpenseId}
              onClick={() => navigate(`/expenses/${expense.generalExpenseId}`)}
              style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '12px 14px', marginBottom: 8,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                      {formatEnumLabel(expense.expenseCategory)}
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>
                      {formattedDate}
                      {!selectedId && vehicle && ` · ${vehicle.brand} ${vehicle.model}`}
                    </div>
                    {expense.description && (
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                        {expense.description}
                      </div>
                    )}
                    {expense.isRecurring && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 5,
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 600,
                        color: 'var(--accent4)',
                        background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)',
                        padding: '2px 7px', borderRadius: 4, letterSpacing: '0.06em',
                      }}>
                        ↻ RECURRING · every {expense.recurrenceEvery} {(expense.recurrenceInterval ?? '').toLowerCase()}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, paddingLeft: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: CAT_COLORS.general }}>
                    {formatMoney(expense.cost ?? 0, currency)}
                  </span>
                  <span style={{ color: 'var(--text3)', fontSize: 12 }}>›</span>
                </div>
              </div>
            </div>
          )
        }

        return (
          <>
            {/* Recurring — always visible */}
            {recurring.length > 0 && (
              <>
                <div style={{
                  padding: '8px 22px 10px',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                  color: 'var(--text3)', textTransform: 'uppercase' as const, letterSpacing: '0.12em',
                }}>
                  Subscriptions &amp; recurring
                </div>
                <div style={{ padding: '0 22px' }}>
                  {recurring.map(ExpenseCard)}
                </div>
              </>
            )}

            {/* One-off — collapsible */}
            {oneOff.length > 0 && (
              <div style={{ padding: '0 22px' }}>
                <button
                  onClick={() => setShowOneOff((p) => !p)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', marginBottom: showOneOff ? 8 : 0,
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: showOneOff ? '12px 12px 0 0' : 12,
                    cursor: 'pointer', transition: 'border-radius 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase' as const, letterSpacing: '0.12em' }}>
                      One-off expenses
                    </span>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      color: 'var(--text3)', padding: '1px 6px', borderRadius: 4,
                    }}>
                      {oneOff.length}
                    </span>
                  </div>
                  <span style={{ color: 'var(--text3)', fontSize: 11, transition: 'transform 0.15s', display: 'inline-block', transform: showOneOff ? 'rotate(180deg)' : 'none' }}>
                    ▾
                  </span>
                </button>

                {showOneOff && (
                  <div style={{
                    border: '1px solid var(--border)', borderTop: 'none',
                    borderRadius: '0 0 12px 12px', padding: '8px 0 0',
                    background: 'var(--surface2)',
                  }}>
                    <div style={{ padding: '0 8px' }}>
                      {oneOff.map(ExpenseCard)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )
      })()}

      <div style={{ height: 80 }} />
      <FloatingAddButton options={fabOptions} />
    </PageShell>
  )
}
