interface BarChartDataPoint {
  label: string
  maintenance?: number
  fuel?: number
}

interface BarChartProps {
  data?: BarChartDataPoint[]
  title?: string
  subtitle?: string
}

export default function BarChart({ data = [], title, subtitle }: BarChartProps) {
  if (!data.length) return null

  const maxVal = Math.max(...data.flatMap((d) => [d.maintenance ?? 0, d.fuel ?? 0]), 1)

  return (
    <div style={{
      background: 'var(--surface2)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: 14,
      margin: '0 22px 10px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
            {title}
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: 'var(--text2)',
            marginTop: 2,
          }}>
            {subtitle}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
        {[
          { color: 'var(--accent)',  label: 'Maintenance' },
          { color: 'var(--accent2)', label: 'Fuel' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
            <span style={{
              fontSize: 10,
              color: 'var(--text2)',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Bars */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 6,
        height: 90,
      }}>
        {data.map((d) => {
          const maintH = ((d.maintenance ?? 0) / maxVal) * 90
          const fuelH  = ((d.fuel ?? 0) / maxVal) * 90
          return (
            <div
              key={d.label}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'flex-end',
                gap: 2,
                height: '100%',
              }}
            >
              <div style={{
                flex: 1,
                height: `${maintH}%`,
                minHeight: maintH > 0 ? 3 : 0,
                background: 'var(--accent)',
                borderRadius: '3px 3px 0 0',
                opacity: 0.85,
              }} />
              <div style={{
                flex: 1,
                height: `${fuelH}%`,
                minHeight: fuelH > 0 ? 3 : 0,
                background: 'var(--accent2)',
                borderRadius: '3px 3px 0 0',
                opacity: 0.85,
              }} />
            </div>
          )
        })}
      </div>

      {/* X axis labels */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: 6,
      }}>
        {data.map((d) => (
          <span key={d.label} style={{
            flex: 1,
            textAlign: 'center',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: 'var(--text3)',
          }}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  )
}