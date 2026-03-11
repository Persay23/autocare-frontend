import type { ChangeEvent, ReactNode, CSSProperties } from 'react'
import { inputStyle, onFocus, onBlur } from './formStyles'

interface FormInputProps {
  label: string
  value: string | number
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  type?: string
  placeholder?: string
  required?: boolean
  min?: string | number
  max?: string | number
  children?: ReactNode
  hint?: string
}

const labelStyle: CSSProperties = {
  display: 'block',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 9,
  color: 'var(--text3)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginBottom: 5,
}

export default function FormInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  min,
  max,
  children,
  hint,
}: FormInputProps) {
  const isSelect = !!children

  return (
    <div style={{ marginBottom: 10 }}>
      <label style={labelStyle}>{label}</label>

      {isSelect ? (
        <select
          value={value}
          onChange={onChange as (e: ChangeEvent<HTMLSelectElement>) => void}
          required={required}
          style={inputStyle}
          onFocus={onFocus}
          onBlur={onBlur}
        >
          {children}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={onChange as (e: ChangeEvent<HTMLInputElement>) => void}
          placeholder={placeholder}
          required={required}
          min={min}
          max={max}
          style={inputStyle}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      )}

      {hint && (
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          color: 'var(--text3)',
          marginTop: 4,
        }}>
          {hint}
        </div>
      )}
    </div>
  )
}
