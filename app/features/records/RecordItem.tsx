import { SERVICE_ICONS } from '@/lib/icons'
import { formatEnumLabel } from '@/lib/formatters'
import type { MaintenanceRecord } from '@/lib/types'

export default function RecordItem({ record, onClick }: { record: MaintenanceRecord; onClick: () => void }) {
  const RecordIcon = SERVICE_ICONS[record.serviceType] ?? SERVICE_ICONS.Other

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '12px 22px',
        borderBottom: '1px solid var(--border2)',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'var(--surface3)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <RecordIcon sx={{ fontSize: 16, color: 'var(--accent)' }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>
          {formatEnumLabel(record.serviceType)}
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: 'var(--text2)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {record.description ?? '\u2014'}
        </div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent3)' }}>
          {record.cost != null ? `${record.cost.toLocaleString()} zl` : '\u2014'}
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: 'var(--text3)',
            marginTop: 2,
          }}
        >
          {record.serviceDate
            ? new Date(record.serviceDate).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : '\u2014'}
        </div>
      </div>
    </div>
  )
}
