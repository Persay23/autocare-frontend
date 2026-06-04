import { NavLink, useLocation } from 'react-router-dom'
import type { ElementType } from 'react'
import HomeIcon from '@mui/icons-material/Home'
import BarChartIcon from '@mui/icons-material/BarChart'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'
import TimelineIcon from '@mui/icons-material/Timeline'
import PersonIcon from '@mui/icons-material/Person'
import logo from '@/assets/Logo.png'

const NAV_ITEMS: { to: string; icon: ElementType; label: string }[] = [
  { to: '/',         icon: HomeIcon,         label: 'Home'     },
  { to: '/expenses', icon: BarChartIcon,      label: 'Expenses' },
  { to: '/carpark',  icon: DirectionsCarIcon, label: 'Car Park' },
  { to: '/timeline', icon: TimelineIcon,      label: 'Timeline' },
  { to: '/profile',  icon: PersonIcon,        label: 'Profile'  },
]

const ITEM_HEIGHT = 40  // 10px padding top + 20px content + 10px padding bottom
const ITEM_GAP    = 2
const SLOT_HEIGHT = ITEM_HEIGHT + ITEM_GAP

export default function SideNav() {
  const location = useLocation()
  const onVehicleRoute = location.pathname.startsWith('/vehicles/')

  const activeIndex = NAV_ITEMS.findIndex((item) => {
    if (item.to === '/carpark' && onVehicleRoute) return true
    if (item.to === '/') return location.pathname === '/'
    return location.pathname.startsWith(item.to)
  })

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
      <div style={{ padding: '0 20px 24px' }}>
        <img src={logo} alt="AutoCare" style={{ height: 24, width: 'auto', display: 'block' }} />
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '0 16px 12px' }} />

      {/* Nav items */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: ITEM_GAP, padding: '0 10px' }}>
        {/* Sliding indicator */}
        {activeIndex >= 0 && (
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: ITEM_HEIGHT,
            borderRadius: 8,
            background: 'rgba(108,99,255,0.12)',
            transform: `translateY(${activeIndex * SLOT_HEIGHT}px)`,
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--accent)' : 'var(--text2)',
                  background: 'transparent',
                  textDecoration: 'none',
                  transition: 'color 0.15s, font-weight 0.15s',
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
