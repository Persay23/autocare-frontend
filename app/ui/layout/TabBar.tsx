import { NavLink } from 'react-router-dom'

interface Tab {
  label: string
  to: string
}

interface TabBarProps {
  tabs: Tab[]
  basePath: string
}

export default function TabBar({ tabs, basePath }: TabBarProps) {
  return (
    <div style={{
      display: 'flex',
      borderBottom: '1px solid var(--border2)',
      scrollbarWidth: 'none',
    }}>
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to === '' ? basePath : `${basePath}/${tab.to}`}
          end={tab.to === ''}
          style={({ isActive }) => ({
            flex: 1,
            textAlign: 'center',
            padding: '8px 4px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: isActive ? 'var(--accent)' : 'var(--text3)',
            borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -1,
            whiteSpace: 'nowrap',
            textDecoration: 'none',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            transition: 'color 0.15s',
          })}
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  )
}