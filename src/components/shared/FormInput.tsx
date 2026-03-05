import { inputStyle, onFocus, onBlur } from './formStyles'

const labelStyle = {
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
}) {
  const isSelect = !!children

  return (
    <div style={{ marginBottom: 10 }}>
      <label style={labelStyle}>{label}</label>

      {isSelect ? (
        <select
          value={value}
          onChange={onChange}
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
          onChange={onChange}
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
