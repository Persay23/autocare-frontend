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
      overflowX: 'auto',
      borderBottom: '1px solid var(--border2)',
      padding: '0 22px',
      scrollbarWidth: 'none',
    }}>
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to === '' ? basePath : `${basePath}/${tab.to}`}
          end={tab.to === ''}
          style={({ isActive }) => ({
            padding: '8px 10px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: isActive ? 'var(--accent)' : 'var(--text3)',
            borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -1,
            whiteSpace: 'nowrap',
            textDecoration: 'none',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            transition: 'color 0.15s',
          })}
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  )
}