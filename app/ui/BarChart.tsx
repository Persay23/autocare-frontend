interface BarChartDataPoint {
  label: string
  maintenance?: number
  fuel?: number
  general?: number
}

interface BarChartProps {
  data?: BarChartDataPoint[]
  sectionLabel?: string
  title?: string
  subtitle?: string
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

export default function BarChart({ data = [], sectionLabel, title, subtitle }: BarChartProps) {
  if (!data.length) return null

  const hasGeneral = data.some((d) => (d.general ?? 0) > 0)

  const LEGEND = [
    { color: 'var(--accent3)', label: 'Service' },
    { color: 'var(--orange)',  label: 'Fuel' },
    ...(hasGeneral ? [{ color: 'var(--accent4)', label: 'General' }] : []),
  ]

  const maxIndividual = Math.max(
    ...data.flatMap((d) => [d.maintenance ?? 0, d.fuel ?? 0, d.general ?? 0]),
    1,
  )
  const scale = niceMax(maxIndividual)
  const ticks = Array.from({ length: Y_TICKS + 1 }, (_, i) => Math.round((scale / Y_TICKS) * i))

  const legend = (
    <div style={{ display: 'flex', gap: 12 }}>
      {LEGEND.map(({ color, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
          <span style={{ fontSize: 10, color: 'var(--text2)', fontFamily: "'JetBrains Mono', monospace" }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  )

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: 14,
      margin: '0 16px 12px',
    }}>
      {sectionLabel ? (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 12,
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, color: 'var(--text3)',
            textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>
            {sectionLabel}
          </div>
          {legend}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>
                {subtitle}
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>{legend}</div>
        </>
      )}

      {/* Chart */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
        {/* Bars + X-labels */}
        <div style={{ flex: 1 }}>
          {/* Bars area with gridlines */}
          <div style={{ position: 'relative', height: CHART_H }}>
            {/* Horizontal gridlines */}
            {ticks.map((tick) => (
              <div
                key={tick}
                style={{
                  position: 'absolute',
                  left: 0, right: 0,
                  bottom: `${(tick / scale) * 100}%`,
                  height: 1,
                  background: 'var(--border)',
                  opacity: tick === 0 ? 1 : 0.6,
                }}
              />
            ))}

            {/* Grouped bars */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: '100%', position: 'relative', zIndex: 1 }}>
              {data.map((d) => {
                const maint   = d.maintenance ?? 0
                const fuel    = d.fuel ?? 0
                const general = d.general ?? 0
                const maintH   = (maint   / scale) * 100
                const fuelH    = (fuel    / scale) * 100
                const generalH = (general / scale) * 100
                return (
                  <div key={d.label} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 2, height: '100%' }}>
                    {/* Service bar */}
                    <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                      {maint > 0 && (
                        <div style={{
                          height: `${maintH}%`, minHeight: 2,
                          background: 'var(--accent3)', opacity: 0.85,
                          borderRadius: '3px 3px 0 0',
                        }} />
                      )}
                    </div>
                    {/* Fuel bar */}
                    <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                      {fuel > 0 && (
                        <div style={{
                          height: `${fuelH}%`, minHeight: 2,
                          background: 'var(--orange)', opacity: 0.85,
                          borderRadius: '3px 3px 0 0',
                        }} />
                      )}
                    </div>
                    {/* General bar — only rendered when the dataset has general data */}
                    {hasGeneral && (
                      <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                        {general > 0 && (
                          <div style={{
                            height: `${generalH}%`, minHeight: 2,
                            background: 'var(--accent4)', opacity: 0.85,
                            borderRadius: '3px 3px 0 0',
                          }} />
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* X-axis labels */}
          <div style={{ display: 'flex', marginTop: 6 }}>
            {data.map((d) => (
              <span key={d.label} style={{
                flex: 1, textAlign: 'center',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, color: 'var(--text3)',
              }}>
                {d.label}
              </span>
            ))}
          </div>
        </div>

        {/* Y-axis labels (right side) */}
        <div style={{ position: 'relative', height: CHART_H, width: 26, flexShrink: 0 }}>
          {ticks.map((tick) => (
            <span
              key={tick}
              style={{
                position: 'absolute',
                bottom: `${(tick / scale) * 100}%`,
                right: 0,
                transform: 'translateY(50%)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 8,
                color: 'var(--text3)',
                lineHeight: 1,
              }}
            >
              {fmtY(tick)}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
