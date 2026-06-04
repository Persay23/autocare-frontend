import type { ReactNode } from 'react'
import SideNav from './SideNav'
import { useIsDesktop } from '@/lib/useIsDesktop'

export default function PageShell({ children }: { children: ReactNode }) {
  const isDesktop = useIsDesktop()

  if (isDesktop) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface)' }}>
        {/* Fixed sidebar */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 240,
          height: '100vh',
          zIndex: 100,
        }}>
          <SideNav />
        </div>

        {/* Content — offset by sidebar width */}
        <div style={{
          marginLeft: 240,
          flex: 1,
          minWidth: 0,
          minHeight: '100vh',
          overflowY: 'auto',
        }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            {children}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: 'var(--bg)',
    }}>
      {/* Scrollable content — paddingBottom clears the floating nav */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingBottom: 96,
      }}>
        {children}
      </div>
    </div>
  )
}
