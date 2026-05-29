import { useId, useState } from 'react'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import NotesIcon from '@mui/icons-material/Notes'
import CloseIcon from '@mui/icons-material/Close'
import { inputStyle, onFocus, onBlur } from './formStyles'

interface Props {
  onCapture?: (file: File) => void
  onText?: (text: string) => void
  title?: string
  subtitle?: string
}

type CapturedState =
  | { kind: 'file'; name: string }
  | { kind: 'text'; preview: string }
  | null

const optionBtnStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 5,
  padding: '10px 6px',
  borderRadius: 10,
  background: active ? 'rgba(108,99,255,0.2)' : 'var(--surface2)',
  border: `1px solid ${active ? 'rgba(108,99,255,0.5)' : 'var(--border)'}`,
  color: active ? 'var(--accent)' : 'var(--text2)',
  cursor: 'pointer',
  fontSize: 11,
  fontWeight: 500,
  width: '100%',
  transition: 'all 0.15s',
})

export default function SmartFillButton({ onCapture, onText, title, subtitle }: Props) {
  const uid = useId()
  const cameraId = `${uid}-camera`
  const uploadId = `${uid}-upload`

  const [open, setOpen] = useState(false)
  const [showText, setShowText] = useState(false)
  const [rawText, setRawText] = useState('')
  const [captured, setCaptured] = useState<CapturedState>(null)

  const handleFile = (file: File | undefined) => {
    if (!file) return
    onCapture?.(file)
    setCaptured({ kind: 'file', name: file.name })
    setShowText(false)
  }

  const handleTextSubmit = () => {
    const t = rawText.trim()
    if (!t) return
    onText?.(t)
    setCaptured({ kind: 'text', preview: t.slice(0, 60) + (t.length > 60 ? '…' : '') })
    setShowText(false)
    setRawText('')
  }

  const close = () => {
    setOpen(false)
    setShowText(false)
    setRawText('')
  }

  // ── Closed ────────────────────────────────────────────────────────────────
  if (!open) {
    const accent = captured ? 'var(--green)' : 'var(--accent)'
    const accentAlpha = captured ? 'rgba(52,211,153,' : 'rgba(108,99,255,'
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          width: '100%', padding: '12px 14px', borderRadius: 14,
          background: `${accentAlpha}0.07)`,
          border: `1px solid ${accentAlpha}0.25)`,
          display: 'flex', alignItems: 'center', gap: 12,
          cursor: 'pointer', marginBottom: 16, textAlign: 'left',
          transition: 'all 0.2s',
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 11, flexShrink: 0,
          background: `${accentAlpha}0.18)`,
          border: `1px solid ${accentAlpha}0.3)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AutoAwesomeIcon sx={{ fontSize: 18, color: accent }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: captured ? 'var(--green)' : 'var(--text)', marginBottom: 2 }}>
            {captured ? 'Input captured' : (title ?? 'AI Quick Fill')}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
            {captured
              ? (captured.kind === 'file' ? captured.name : captured.preview)
              : (subtitle ?? 'Scan receipt to autofill')}
          </div>
        </div>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
          background: `${accentAlpha}0.15)`, color: accent,
          padding: '2px 7px', borderRadius: 4, letterSpacing: '0.1em', flexShrink: 0,
        }}>
          {captured ? 'READY' : 'BETA'}
        </span>
      </button>
    )
  }

  // ── Open ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: 'rgba(108,99,255,0.06)',
      border: '1px solid rgba(108,99,255,0.25)',
      borderRadius: 14,
      padding: 12,
      marginBottom: 14,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <AutoAwesomeIcon sx={{ fontSize: 13, color: 'var(--accent)' }} />
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: 'var(--accent)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
          }}>
            AI Quick Fill
          </span>
        </div>
        <button
          type="button"
          onClick={close}
          style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 2 }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </button>
      </div>

      {/* 3 option buttons — camera and upload use <label> to trigger hidden inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: showText ? 10 : 0 }}>
        <label htmlFor={cameraId} style={optionBtnStyle(false)}>
          <CameraAltIcon sx={{ fontSize: 18 }} />
          Camera
        </label>

        <label htmlFor={uploadId} style={optionBtnStyle(false)}>
          <FileUploadIcon sx={{ fontSize: 18 }} />
          Upload
        </label>

        <button
          type="button"
          onClick={() => setShowText((p) => !p)}
          style={optionBtnStyle(showText)}
        >
          <NotesIcon sx={{ fontSize: 18 }} />
          Text
        </button>
      </div>

      {/* Hidden file inputs triggered by labels above */}
      <input
        id={cameraId}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        id={uploadId}
        type="file"
        accept="image/*,application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {/* Text input panel */}
      {showText && (
        <div>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste receipt text, describe the service, list what was done…"
            rows={4}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, marginBottom: 8 }}
            onFocus={onFocus}
            onBlur={onBlur}
            autoFocus
          />
          <button
            type="button"
            onClick={handleTextSubmit}
            disabled={!rawText.trim()}
            style={{
              width: '100%',
              padding: '9px 14px',
              borderRadius: 9,
              background: rawText.trim() ? 'var(--accent)' : 'var(--surface)',
              border: 'none',
              color: rawText.trim() ? '#fff' : 'var(--text3)',
              fontSize: 12,
              fontWeight: 600,
              cursor: rawText.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
            }}
          >
            Use this text →
          </button>
        </div>
      )}

      {/* Captured indicator */}
      {captured && (
        <div style={{
          marginTop: 10,
          padding: '8px 10px',
          borderRadius: 8,
          background: 'rgba(52,211,153,0.08)',
          border: '1px solid rgba(52,211,153,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          color: 'var(--green)',
        }}>
          <span>✓</span>
          <span>
            {captured.kind === 'file'
              ? `${captured.name} captured`
              : `Text captured · ${captured.preview}`}
          </span>
          <span style={{ color: 'var(--text3)', marginLeft: 'auto' }}>pending AI</span>
        </div>
      )}

      {/* Footer hint */}
      <div style={{
        marginTop: 10,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        color: 'var(--text3)',
        textAlign: 'center',
      }}>
        AI form filling coming soon · fields will auto-populate
      </div>
    </div>
  )
}
