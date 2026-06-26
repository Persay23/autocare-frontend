import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import type { ElementType } from 'react'
import HomeIcon from '@mui/icons-material/Home'
import BarChartIcon from '@mui/icons-material/BarChart'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'
import TimelineIcon from '@mui/icons-material/Timeline'
import PersonIcon from '@mui/icons-material/Person'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import BuildIcon from '@mui/icons-material/Build'
import AddCardIcon from '@mui/icons-material/AddCard'
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation'
import HealingIcon from '@mui/icons-material/Healing'
import logo from '@/assets/Logo.png'
import { useVehiclesStore } from '@/features/vehicles/vehicleStore'
import { useDiagnoseModal } from '@/features/vehicles/diagnoseModalStore'
import { useExpenseModal } from '@/features/expenses/expenseModalStore'
import { useRecordModal } from '@/features/records/recordModalStore'
import { useFuelModal } from '@/features/fuel/fuelModalStore'

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
  const location  = useLocation()
  const vehicles  = useVehiclesStore((s) => s.vehicles)
  const openFor        = useDiagnoseModal((s) => s.openFor)
  const openPicker     = useDiagnoseModal((s) => s.open)
  const openExpense    = useExpenseModal((s) => s.open)
  const openRecord     = useRecordModal((s) => s.openCreate)
  const openRecordPick = useRecordModal((s) => s.open)
  const openFuelCreate = useFuelModal((s) => s.openCreate)

  const quickAddOptions = [
    {
      icon: LocalGasStationIcon,
      label: 'Log Fuel',
      action: () => {
        if (vehicleIdFromPath) openFuelCreate(vehicleIdFromPath)
        else if (vehicles.length === 1) openFuelCreate(String(vehicles[0].vehicleId))
        else openFuelCreate(null)   // modal shows its vehicle selector
      },
    },
    {
      icon: BuildIcon,
      label: 'Service Record',
      action: () => {
        if (vehicleIdFromPath) openRecord(vehicleIdFromPath)
        else if (vehicles.length === 1) openRecord(String(vehicles[0].vehicleId))
        else openRecordPick()
      },
    },
    {
      icon: AddCardIcon,
      label: 'General Expense',
      action: openExpense,
    },
  ]
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const onVehicleRoute    = location.pathname.startsWith('/vehicles/')
  const vehicleIdFromPath = location.pathname.match(/\/vehicles\/(\d+)/)?.[1] ?? null

  const handleDiagnose = () => {
    if (vehicleIdFromPath) {
      openFor(parseInt(vehicleIdFromPath, 10))
    } else if (vehicles.length === 1) {
      openFor(vehicles[0].vehicleId)
    } else {
      openPicker()
    }
  }

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
            top: 4,
            left: 4,
            right: 4,
            height: 32,
            borderRadius: 14,
            background: 'rgba(108,99,255,0.2)',
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

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Quick Actions */}
      <div style={{ padding: '0 10px 12px' }}>
        <div style={{ height: 1, background: 'var(--border)', margin: '0 6px 12px' }} />
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, fontWeight: 700, color: 'var(--text3)',
          textTransform: 'uppercase', letterSpacing: '0.12em',
          padding: '0 6px 8px',
        }}>
          Quick Actions
        </div>
        <button
          onClick={handleDiagnose}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '9px 12px',
            background: 'rgba(108,99,255,0.07)',
            border: '1px solid rgba(108,99,255,0.2)',
            borderRadius: 8, cursor: 'pointer',
            fontSize: 13, color: 'var(--accent)',
            fontFamily: "'Outfit', sans-serif", fontWeight: 600,
            textAlign: 'left' as const,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(108,99,255,0.13)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(108,99,255,0.07)')}
        >
          <HealingIcon sx={{ fontSize: 18, color: 'var(--accent)' }} />
          Diagnose with AI
        </button>
      </div>

      {/* Quick Add */}
      <div style={{ padding: '0 10px 20px' }}>
        {/* Options — expand upward */}
        {quickAddOpen && (
          <div style={{
            marginBottom: 6,
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}>
            {quickAddOptions.map((opt) => {
              const Icon = opt.icon
              return (
                <button
                  key={opt.label}
                  onClick={() => { setQuickAddOpen(false); opt.action() }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 10px',
                    borderRadius: 7,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 500,
                    color: 'var(--text)',
                    textAlign: 'left',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface3)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <Icon sx={{ fontSize: 17, color: 'var(--text2)' }} />
                  {opt.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Toggle button */}
        <button
          onClick={() => setQuickAddOpen((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            width: '100%',
            padding: '9px 12px',
            borderRadius: 8,
            background: quickAddOpen ? 'rgba(108,99,255,0.12)' : 'rgba(108,99,255,0.07)',
            border: `1px solid ${quickAddOpen ? 'rgba(108,99,255,0.35)' : 'rgba(108,99,255,0.2)'}`,
            color: 'var(--accent)',
            cursor: 'pointer',
            fontSize: 13,
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 600,
            transition: 'background 0.15s, border-color 0.15s',
          }}
        >
          {quickAddOpen
            ? <CloseIcon sx={{ fontSize: 16 }} />
            : <AddIcon sx={{ fontSize: 16 }} />}
          Quick Add
        </button>
      </div>
    </nav>
  )
}
