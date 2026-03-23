import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import StatCard from '@/ui/StatCard'
import BarChart from '@/ui/BarChart'
import { getVehicleCostSummary } from '@/features/expenses/api'
import { createComponent } from '@/features/components/api'
import { PRESET_GROUPS } from '@/lib/presetComponents'
import { COMPONENT_DEFAULTS } from '@/lib/componentDefaults'
import { formatEnumLabel } from '@/lib/formatters'

import type { Vehicle, ComponentHealth, MonthlyCostSummary } from '@/lib/types'
import type { VehicleLayoutContext } from './vehicles._layout'

interface BarChartPoint { label: string; maintenance: number; fuel: number }

function HealthRing({ health }: { health: ComponentHealth[] | null | undefined }) {
  if (!health?.length) {
    return (
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'var(--surface3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>NO DATA</span>
      </div>
    )
  }

  const total = health.length
  const counts = health.reduce<Record<string, number>>((acc, component) => {
    acc[component.currentState] = (acc[component.currentState] ?? 0) + 1
    return acc
  }, {})

  const avg = Math.round(
    health.reduce((sum, component) => sum + Math.min(component.kmLifetimePercent ?? 0, component.yearsLifetimePercent ?? 0), 0) /
      total
  )

  const segments = [
    { state: 'Unknown', color: '#444870' },
    { state: 'Critical', color: '#f87171' },
    { state: 'Repair', color: '#fb923c' },
    { state: 'Normal', color: '#fbbf24' },
    { state: 'Good', color: '#34d399' },
    { state: 'Perfect', color: '#38bdf8' },
  ]

  let cumulative = 0
  const stops = segments
    .filter(({ state }) => counts[state])
    .map(({ state, color }) => {
      const pct = ((counts[state] ?? 0) / total) * 100
      const from = cumulative
      cumulative += pct
      return `${color} ${from}% ${cumulative}%`
    })
    .join(', ')

  return (
    <div
      style={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        background: `conic-gradient(${stops})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: '50%',
          background: 'var(--surface2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1 }}>{avg}%</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, color: 'var(--text3)', marginTop: 1 }}>
          HEALTH
        </div>
      </div>
    </div>
  )
}

export default function VehicleOverview() {
  const { vehicle, health, refresh: onComponentsCreated } = useOutletContext<VehicleLayoutContext>()
  const [costData, setCostData] = useState<BarChartPoint[]>([])
  const [settingUp, setSettingUp] = useState(false)
  const [selectedPresets, setSelectedPresets] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!vehicle?.vehicleId) return

    const to = new Date()
    const from = new Date()
    from.setMonth(from.getMonth() - 6)

    getVehicleCostSummary(vehicle.vehicleId, from.toISOString(), to.toISOString())
      .then((res) => {
        const raw: MonthlyCostSummary[] = Array.isArray(res.data) ? res.data : []
        setCostData(
          raw.map((item) => ({
            label: new Date(item.month).toLocaleDateString('en-GB', { month: 'short' }),
            maintenance: item.maintenanceCost ?? 0,
            fuel: item.fuelCost ?? 0,
          }))
        )
      })
      .catch(() => setCostData([]))
  }, [vehicle?.vehicleId])

  if (!vehicle) return null

  const totalSpent = costData.reduce((sum, item) => sum + item.maintenance + item.fuel, 0)

  const stateColors = {
    Unknown: '#444870',
    Critical: '#f87171',
    Repair: '#fb923c',
    Normal: '#fbbf24',
    Good: '#34d399',
    Perfect: '#38bdf8',
  }

  const counts = (health ?? []).reduce<Record<string, number>>((acc, component) => {
    acc[component.currentState] = (acc[component.currentState] ?? 0) + 1
    return acc
  }, {})

  const togglePreset = (type: string) => {
    setSelectedPresets((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]))
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 22px', marginBottom: 14 }}>
        <HealthRing health={health} />
        <div style={{ flex: 1 }}>
          {Object.entries(stateColors).map(([state, color]) =>
            counts[state] ? (
              <div key={state} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, marginBottom: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                <span style={{ color: 'var(--text2)' }}>{counts[state]} {state}</span>
              </div>
            ) : null
          )}
          {!health?.length && (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
              No components tracked yet
            </div>
          )}
        </div>
      </div>

      {!health?.length && !settingUp && (
        <div
          style={{
            margin: '0 22px 14px',
            background: 'rgba(108,99,255,0.06)',
            border: '1px solid rgba(108,99,255,0.2)',
            borderRadius: 14,
            padding: 16,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Set up component tracking</div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: 'var(--text2)',
              marginBottom: 12,
            }}
          >
            Pick the components you want to track. Lifetimes are set automatically.
          </div>
          <button
            onClick={() => setSettingUp(true)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Quick Setup
          </button>
        </div>
      )}

      {settingUp && (
        <div style={{ margin: '0 22px 14px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Select components to track</div>
          {PRESET_GROUPS.map((group) => (
            <div key={group.group} style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  color: 'var(--text3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 6,
                }}
              >
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
                        padding: '5px 12px',
                        borderRadius: 999,
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 9,
                        cursor: 'pointer',
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
                flex: 1,
                padding: '10px 0',
                borderRadius: 10,
                background: selectedPresets.length ? 'var(--accent)' : 'var(--surface3)',
                color: '#fff',
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: selectedPresets.length ? 'pointer' : 'not-allowed',
              }}
            >
              {saving
                ? 'Setting up...'
                : `Add ${selectedPresets.length} component${selectedPresets.length !== 1 ? 's' : ''}`}
            </button>
            <button
              onClick={() => {
                setSettingUp(false)
                setSelectedPresets([])
              }}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 10,
                background: 'var(--surface2)',
                color: 'var(--text2)',
                border: '1px solid var(--border)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 22px', marginBottom: 10 }}>
        <StatCard label="Total Spent" value={`${totalSpent.toLocaleString()} zl`} sub="all time" accent="purple" />
        <StatCard label="Components" value={health?.length ?? 0} sub="tracked parts" accent="blue" />
      </div>

      <div
        style={{
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: 14,
          margin: '0 22px 10px',
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: 'var(--text3)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: 12,
          }}
        >
          Vehicle Info
        </div>
        {[
          { key: 'Brand', val: vehicle.brand },
          { key: 'Model', val: vehicle.model },
          { key: 'Year', val: vehicle.yearOfProduction },
          { key: 'Fuel', val: vehicle.fuelType },
          { key: 'Transmission', val: vehicle.transmissionType },
          { key: 'Mileage', val: `${vehicle.mileage?.toLocaleString()} km` },
        ].map(({ key, val }) => (
          <div
            key={key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '9px 0',
              borderBottom: '1px solid var(--border2)',
            }}
          >
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text2)' }}>{key}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{val}</span>
          </div>
        ))}
      </div>

      {costData.length > 0 && (
        <BarChart data={costData} title={`${totalSpent.toLocaleString()} zl`} subtitle="spent this year" />
      )}
    </div>
  )
}
