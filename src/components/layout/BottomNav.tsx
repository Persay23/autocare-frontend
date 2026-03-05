import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/',          icon: '🏡', label: 'Home'     },
  { to: '/expenses',  icon: '📊', label: 'Expenses'  },
  { to: '/carpark',   icon: '🚗', label: 'Car Park'  },
  { to: '/timeline',  icon: '📅', label: 'Timeline'  },
  { to: '/profile',   icon: '👤', label: 'Profile'   },
]

export default function BottomNav() {
  return (
    <nav style={{
      display: 'flex',
      padding: '10px 8px 14px',
      borderTop: '1px solid var(--border)',
      background: 'var(--surface)',
    }}>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          style={({ isActive }) => ({
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            fontSize: 8,
            color: isActive ? 'var(--accent)' : 'var(--text3)',
            textDecoration: 'none',
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.05em',
            transition: 'color 0.15s',
          })}
        >
          <span style={{ fontSize: 18 }}>{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}