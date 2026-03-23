import { NavLink } from 'react-router-dom'
import type { ElementType } from 'react'
import HomeIcon from '@mui/icons-material/Home'
import BarChartIcon from '@mui/icons-material/BarChart'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'
import TimelineIcon from '@mui/icons-material/Timeline'
import PersonIcon from '@mui/icons-material/Person'

const NAV_ITEMS: { to: string; icon: ElementType; label: string }[] = [
  { to: '/',         icon: HomeIcon,         label: 'Home'     },
  { to: '/expenses', icon: BarChartIcon,      label: 'Expenses' },
  { to: '/carpark',  icon: DirectionsCarIcon, label: 'Car Park' },
  { to: '/timeline', icon: TimelineIcon,      label: 'Timeline' },
  { to: '/profile',  icon: PersonIcon,        label: 'Profile'  },
]

export default function BottomNav() {
  return (
    <nav style={{
      display: 'flex',
      padding: '10px 8px 14px',
      borderTop: '1px solid var(--border)',
      background: 'var(--surface)',
    }}>
      {NAV_ITEMS.map((item) => {
        const NavIcon = item.icon
        return (
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
            <NavIcon sx={{ fontSize: 20 }} />
            {item.label}
          </NavLink>
        )
      })}
    </nav>
  )
}