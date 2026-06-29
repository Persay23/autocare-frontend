import { NavLink, useLocation } from 'react-router-dom'
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
  const location = useLocation()
  const onVehicleRoute = location.pathname.startsWith('/vehicles/')

  const activeIndex = NAV_ITEMS.findIndex((item) => {
    if (item.to === '/carpark' && onVehicleRoute) return true
    if (item.to === '/') return location.pathname === '/'
    return location.pathname.startsWith(item.to)
  })

  return (
    <nav style={{
      padding: '6px 6px 8px',
      background: 'var(--nav-bg)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderRadius: 22,
      border: '1px solid var(--nav-border)',
      boxShadow: 'var(--nav-shadow)',
    }}>
      <div style={{ position: 'relative', display: 'flex' }}>
        {/* Sliding indicator */}
        {activeIndex >= 0 && (
          <div style={{
            position: 'absolute',
            inset: 0,
            width: `${100 / NAV_ITEMS.length}%`,
            borderRadius: 14,
            background: 'var(--brand-tint)',
            boxShadow: '0 0 16px rgba(108,103,240,0.25)',
            transform: `translateX(${activeIndex * 100}%)`,
            transition: 'transform 0.28s cubic-bezier(0.34,1.56,0.64,1)',
            pointerEvents: 'none',
          }} />
        )}

        {NAV_ITEMS.map((item) => {
          const NavIcon = item.icon
          const isCarPark = item.to === '/carpark'
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={({ isActive }) => {
                const active = isActive || (isCarPark && onVehicleRoute)
                return {
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  padding: '5px 0 2px',
                  fontSize: 8,
                  color: active ? 'var(--accent)' : 'var(--text3)',
                  textDecoration: 'none',
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: '0.05em',
                  transition: 'color 0.15s',
                  position: 'relative',
                  zIndex: 1,
                }
              }}
            >
              <NavIcon sx={{ fontSize: 20 }} />
              {item.label}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
