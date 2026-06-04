import { type ElementType } from 'react'
import type { TimelineEvent } from '@/lib/types'
import { TIMELINE_ICONS } from '@/lib/icons'
import { useCurrencyStore, formatMoney } from '@/features/currency/currencyStore'

interface TimelineItemProps {
  event: TimelineEvent
  showVehicle?: boolean
  showDate?: boolean
  isDuplicate?: boolean
  duplicateGroup?: number
  onDismissDuplicate?: () => void
  onClick?: () => void
  isLast?: boolean
}

const DOT_STYLES: Record<string, { borderColor: string; bg: string }> = {
  Maintenance: { borderColor: 'var(--accent)',  bg: 'rgba(108,99,255,0.12)' },
  Service:     { borderColor: 'var(--accent)',  bg: 'rgba(108,99,255,0.12)' },
  Fuel:        { borderColor: 'var(--orange)',  bg: 'rgba(251,146,60,0.12)' },
  Liquid:      { borderColor: 'var(--orange)',  bg: 'rgba(251,146,60,0.12)' },
  Expense:     { borderColor: 'var(--accent4)', bg: 'rgba(56,189,248,0.12)' },
  Other:       { borderColor: 'var(--orange)',  bg: 'rgba(251,146,60,0.12)' },
}

const AMOUNT_COLORS: Record<string, string> = {
  Maintenance: 'var(--accent)',
  Service:     'var(--accent)',
  Fuel:        'var(--orange)',
  Liquid:      'var(--orange)',
  Expense:     'var(--accent4)',
  Other:       'var(--accent3)',
}

const JUNK = /^(none|nothing|n\/a|test|asas|-{1,3}|\.{1,3}|untitled|unnamed|null|undefined|xxx)$/i

function isJunk(desc: string | null | undefined): boolean {
  if (!desc || desc.trim() === '') return true
  return JUNK.test(desc.trim())
}

export default function TimelineItem({ event, showVehicle, showDate, isDuplicate, duplicateGroup, onDismissDuplicate, onClick, isLast }: TimelineItemProps) {
  const { currency } = useCurrencyStore()
  const dot        = DOT_STYLES[event.type]  ?? DOT_STYLES.Other
  const amountColor = AMOUNT_COLORS[event.type] ?? 'var(--accent3)'
  const DotIcon: ElementType = TIMELINE_ICONS[event.type] ?? TIMELINE_ICONS.Other

  const junk        = isJunk(event.description)
  const emptyName   = !event.description || event.description.trim() === ''
  const displayName = emptyName ? 'Unnamed entry' : event.description

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', gap: 12, paddingBottom: isLast ? 0 : 14,
        cursor: onClick ? 'pointer' : 'default',
        opacity: junk && !emptyName ? 0.45 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      {/* Dot + connector line */}
      <div style={{ position: 'relative', width: 28, flexShrink: 0 }}>
        {!isLast && (
          <div style={{
            position: 'absolute',
            left: '50%', transform: 'translateX(-50%)',
            top: 28, bottom: -14,
            width: 2, background: 'var(--border)',
          }} />
        )}
        <div style={{
          position: 'relative',
          width: 28, height: 28, borderRadius: '50%',
          background: dot.bg, border: `2px solid ${dot.borderColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1,
        }}>
          <DotIcon sx={{ fontSize: 13, color: dot.borderColor }} />
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1, minWidth: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        paddingTop: 2,
      }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
          {/* Title — single line, truncated */}
          <div style={{
            fontSize: 13, fontWeight: emptyName ? 400 : 500,
            color: emptyName ? 'var(--text2)' : 'var(--text)',
            fontStyle: emptyName ? 'italic' : 'normal',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            marginBottom: 2,
          }}>
            {displayName}
          </div>

          {/* Subtitle: date + vehicle name */}
          {(showDate || (showVehicle && event.vehicleName)) && (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
              {[
                showDate && new Date(event.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
                showVehicle && event.vehicleName,
              ].filter(Boolean).join(' · ')}
            </div>
          )}

          {/* Warning badge for empty description */}
          {emptyName && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              marginTop: 4, padding: '2px 8px', borderRadius: 999,
              background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.3)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, fontWeight: 600, color: 'var(--orange)',
            }}>
              ⚠ add a description
            </div>
          )}

          {/* Duplicate badge */}
          {isDuplicate && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              marginTop: 4, padding: '2px 6px 2px 8px', borderRadius: 999,
              background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, fontWeight: 600, color: 'var(--yellow)',
            }}>
              ⚠ duplicate{duplicateGroup != null ? ` #${duplicateGroup}` : ''}
              <button
                onClick={(e) => { e.stopPropagation(); onDismissDuplicate?.() }}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  marginLeft: 2, width: 14, height: 14, borderRadius: '50%',
                  border: 'none', background: 'rgba(251,191,36,0.2)',
                  color: 'var(--yellow)', cursor: 'pointer', fontSize: 9, lineHeight: 1,
                  padding: 0, flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Amount */}
        {event.cost != null && event.cost > 0 && (
          <div style={{
            fontSize: 13, fontWeight: 600,
            color: junk ? 'var(--text3)' : amountColor,
            flexShrink: 0,
          }}>
            {formatMoney(event.cost, currency)}
          </div>
        )}
      </div>
    </div>
  )
}
