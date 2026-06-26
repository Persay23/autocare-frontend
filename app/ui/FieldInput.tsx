import { useState } from 'react'

interface Props {
  label: string
  value: string | number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string
  placeholder?: string
  error?: string
}

export default function FieldInput({ label, value, onChange, type = 'text', placeholder, error }: Props) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text3)',
        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4,
      }}>
        {label}
      </div>
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '9px 11px', borderRadius: 10, boxSizing: 'border-box',
          background: 'var(--surface2)', outline: 'none',
          border: `1px solid ${error ? 'var(--red)' : focused ? 'var(--accent)' : 'var(--border)'}`,
          boxShadow: focused ? '0 0 0 3px rgba(108,99,255,0.10)' : 'none',
          color: 'var(--text)', fontSize: 13, fontFamily: 'inherit',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      />
      {error && (
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--red)', marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  )
}
