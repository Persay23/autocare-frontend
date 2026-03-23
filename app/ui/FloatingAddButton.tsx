import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import type { FabOption } from '@/lib/types'

interface FloatingAddButtonProps {
  options?: FabOption[]
  onPress?: () => void
}

export default function FloatingAddButton({ options, onPress }: FloatingAddButtonProps) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const handleClick = () => {
    if (options?.length) {
      setOpen((prev) => !prev)
    } else {
      onPress?.()
    }
  }

  return (
    <>
      {/* Expanded option sheet */}
      {open && options?.length && (
        <>
          {/* Backdrop — tap to close */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 98,
            }}
          />
          <div style={{
            position: 'fixed',
            bottom: 140,
            right: 22,
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            zIndex: 99,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            maxWidth: 220,
          }}>
            {options.map((opt) => (
              <button
                key={opt.path ?? opt.label}
                onClick={() => {
                  setOpen(false)
                  if (opt.path) navigate(opt.path)
                  else opt.onPress?.()
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--text)',
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                <span style={{ width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {(() => { const I = opt.icon; return <I sx={{ fontSize: 18 }} /> })()}
                </span>
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* The + button itself */}
      <button
        onClick={handleClick}
        style={{
          position: 'fixed',
          bottom: 80,
          right: 22,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: open
            ? 'linear-gradient(135deg, var(--accent3), var(--red))'
            : 'linear-gradient(135deg, var(--accent), var(--accent2))',
          border: 'none',
          cursor: 'pointer',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(108,99,255,0.5)',
          zIndex: 100,
          transition: 'background 0.2s, transform 0.2s',
        }}
      >
        {open ? <CloseIcon sx={{ fontSize: 22 }} /> : <AddIcon sx={{ fontSize: 22 }} />}
      </button>
    </>
  )
}