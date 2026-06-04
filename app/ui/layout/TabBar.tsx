import { NavLink, useLocation } from 'react-router-dom'
import { useRef, useState, useEffect } from 'react'

interface Tab {
  label: string
  to: string
}

interface TabBarProps {
  tabs: Tab[]
  basePath: string
}

export default function TabBar({ tabs, basePath }: TabBarProps) {
  const location = useLocation()
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  const [compact, setCompact] = useState(() => window.innerWidth < 470)

  const activeIndex = tabs.findIndex((tab) => {
    if (tab.to === '') return location.pathname === basePath || location.pathname === basePath + '/'
    return location.pathname.startsWith(`${basePath}/${tab.to}`)
  })

  useEffect(() => {
    const measure = () => {
      const el = tabRefs.current[activeIndex]
      if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth })
      setCompact(window.innerWidth < 470)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [activeIndex])

  const fontSize   = compact ? 7.5 : 9
  const padding    = compact ? '5px 5px' : '7px 10px'
  const letterSpacing = compact ? '0.03em' : '0.08em'

  return (
    <div style={{
      margin: '0 22px 14px',
      padding: 4,
      background: 'var(--surface2)',
      border: '1px solid var(--border)',
      borderRadius: 16,
    }}>
      <div style={{ position: 'relative', display: 'flex' }}>
        {indicator.width > 0 && (
          <div style={{
            position: 'absolute',
            top: 0, bottom: 0,
            left: indicator.left,
            width: indicator.width,
            borderRadius: 12,
            background: 'var(--accent)',
            transition: 'left 0.28s cubic-bezier(0.34,1.56,0.64,1), width 0.28s cubic-bezier(0.34,1.56,0.64,1)',
            pointerEvents: 'none',
          }} />
        )}

        {tabs.map((tab, i) => (
          <NavLink
            key={tab.to}
            to={tab.to === '' ? basePath : `${basePath}/${tab.to}`}
            end={tab.to === ''}
            ref={(el) => { tabRefs.current[i] = el }}
            style={({ isActive }) => ({
              flex: 1,
              minWidth: 0,
              textAlign: 'center',
              padding,
              borderRadius: 12,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize,
              fontWeight: isActive ? 700 : 400,
              color: isActive ? '#fff' : 'var(--text3)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textDecoration: 'none',
              textTransform: 'uppercase',
              letterSpacing,
              transition: 'color 0.15s',
              position: 'relative',
              zIndex: 1,
            })}
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}
