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

export default function SideNav() {
  const location = useLocation()
  const onVehicleRoute = location.pathname.startsWith('/vehicles/')

  return (
    <nav style={{
      width: 240,
      height: '100vh',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '28px 0 20px',
      overflowY: 'auto',
    }}>
      {/* Brand */}
      <div style={{
        padding: '0 20px 24px',
        fontFamily: "'Outfit', sans-serif",
        fontWeight: 800,
        fontSize: 17,
        color: 'var(--accent)',
        letterSpacing: '-0.01em',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <DirectionsCarIcon sx={{ fontSize: 22 }} />
        AutoCare
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '0 16px 12px' }} />

      {/* Nav items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 10px' }}>
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--accent)' : 'var(--text2)',
                  background: active ? 'rgba(108, 99, 255, 0.12)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s',
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
