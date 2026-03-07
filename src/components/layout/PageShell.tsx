import type { ReactNode } from 'react'
import BottomNav from './BottomNav'

export default function PageShell({ children }: { children: ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: 'var(--bg)',
    }}>
      {/* Scrollable content — paddingBottom clears the fixed nav */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingBottom: 80,
      }}>
        {children}
      </div>

      {/* Fixed bottom nav */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 430,
        zIndex: 100,
      }}>
        <BottomNav />
      </div>
    </div>
  )
}