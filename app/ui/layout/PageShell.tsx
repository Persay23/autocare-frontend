import type { ReactNode } from 'react'
import { useIsDesktop } from '@/ui/hooks/useIsDesktop'

export default function PageShell({ children }: { children: ReactNode }) {
  const isDesktop = useIsDesktop()

  if (isDesktop) {
    return (
      <div style={{
        marginLeft: 240,
        marginRight: 260,
        minHeight: '100vh',
        background: 'var(--bg)',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          {children}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{
        maxWidth: 680,
        margin: '0 auto',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ flex: 1, paddingBottom: 96 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
