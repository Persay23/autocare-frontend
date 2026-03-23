import { useState, useEffect } from 'react'
import PageShell from '@/ui/layout/PageShell'
import FilterChips from '@/ui/FilterChips'
import StatCard from '@/ui/StatCard'
import BarChart from '@/ui/BarChart'
import { getVehicles } from '@/features/vehicles/api'
import { getVehicleCostSummary } from '@/features/expenses/api'
import type { Vehicle, MonthlyCostSummary } from '@/lib/types'

export default function Expenses() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [summaries, setSummaries] = useState<Record<number, MonthlyCostSummary[]>>({})
  const [loading, setLoading] = useState(true)

  // Load all vehicles once
  useEffect(() => {
    getVehicles()
      .then((res) => setVehicles(res.data))
      .catch(() => {})
  }, [])

  // Load cost summary when selection changes
  useEffect(() => {
    if (!vehicles.length) return

    const to = new Date()
    const from = new Date()
    from.setMonth(from.getMonth() - 6)

    const targets = selectedId
      ? vehicles.filter((v) => v.vehicleId === selectedId)
      : vehicles

    Promise.allSettled(
      targets.map((v) =>
        getVehicleCostSummary(v.vehicleId, from.toISOString(), to.toISOString())
          .then((res) => ({ vehicleId: v.vehicleId, data: res.data as MonthlyCostSummary[] }))
      )
    ).then((results) => {
      const map: Record<number, MonthlyCostSummary[]> = {}
      results.forEach((r) => {
        if (r.status === 'fulfilled') {
          map[r.value.vehicleId] = r.value.data
        }
      })
      setSummaries(map)
    }).finally(() => setLoading(false))
  }, [vehicles, selectedId])

  // Merge summaries into chart data
  const chartData = (() => {
    const allData: MonthlyCostSummary[] = Object.values(summaries).flat()
    if (!allData.length) return []

    const byMonth: Record<string, { label: string; maintenance: number; fuel: number }> = {}
    allData.forEach((d) => {
      const label = new Date(d.month).toLocaleDateString('en-GB', { month: 'short' })
      if (!byMonth[label]) byMonth[label] = { label, maintenance: 0, fuel: 0 }
      byMonth[label].maintenance += d.maintenanceCost ?? 0
      byMonth[label].fuel += d.fuelCost ?? 0
    })
    return Object.values(byMonth).slice(-6)
  })()

  const maintenanceCost = Object.values(summaries)
  .flat()
  .reduce((sum, d) => sum + (d.maintenanceCost ?? 0), 0)

  const fuelCost = Object.values(summaries)
    .flat()
    .reduce((sum, d) => sum + (d.fuelCost ?? 0), 0)

  const allTimeCost = maintenanceCost + fuelCost
  
  return (
    <PageShell>
      {/* Header */}
      <div style={{ padding: '20px 22px 8px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Expenses</div>
      </div>

      {/* Vehicle filter chips */}
      <FilterChips
        vehicles={vehicles}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      {/* Stat cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
        padding: '0 22px',
        marginBottom: 10,
      }}>
        <StatCard
          label="All Time"
          value={`${allTimeCost.toLocaleString()} zł`}
          accent="purple"
        />
        <StatCard
          label="This Period"
          value={`${(maintenanceCost + fuelCost).toLocaleString()} zł`}
          sub="last 6 months"
          accent="blue"
        />
      </div>

      {/* Chart */}
      {!loading && chartData.length > 0 && (
        <BarChart
          data={chartData}
          title={`${(maintenanceCost + fuelCost).toLocaleString()} zł`}
          subtitle={selectedId
            ? `${vehicles.find((v) => v.vehicleId === selectedId)?.brand} · last 6 months`
            : 'all vehicles · last 6 months'
          }
        />
      )}

      {loading && (
        <div style={{
          padding: '40px 22px',
          textAlign: 'center',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: 'var(--text3)',
        }}>
          LOADING...
        </div>
      )}

      {/* By category */}
      {!loading && (
        <div style={{ padding: '0 22px' }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: 'var(--text3)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: 12,
          }}>
            By Category
          </div>

          {[
            { label: '🔧 Maintenance', value: maintenanceCost, color: 'var(--accent)',  max: allTimeCost },
            { label: '⛽ Fuel',        value: fuelCost,        color: 'var(--accent2)', max: allTimeCost },
          ].map(({ label, value, color, max }) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 4,
              }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{label}</span>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  fontWeight: 600,
                  color,
                }}>
                  {value.toLocaleString()} zł
                </span>
              </div>
              <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: max > 0 ? `${(value / max) * 100}%` : '0%',
                  background: color,
                  borderRadius: 99,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  )
}