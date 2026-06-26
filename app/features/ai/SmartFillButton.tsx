import { useRef, useState } from 'react'
import { parseDocument, type ParseTarget } from '@/features/ai/api'
import CircularProgress from '@mui/material/CircularProgress'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

interface Props<T> {
  target: ParseTarget
  /** Maps the parsed result onto the form. Return an optional note to append to the success banner. */
  onParsed: (data: T) => string | void
  /** Notified when a file is picked (or removed) — used by forms that store the image on submit. */
  onFileSelected?: (file: File | null) => void
  label?: string
  hint?: string
}

/**
 * Reusable "scan a photo to autofill this form" control: file picker + validation +
 * AI parse call + loading / success / failure banners. Form-specific field mapping lives
 * in the caller's onParsed.
 */
export default function SmartFillButton<T>({
  target,
  onParsed,
  onFileSelected,
  label = 'Scan to autofill',
  hint = 'AI fills the fields below — review before saving',
}: Props<T>) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) { setError('Use a JPG, PNG, or WebP image.'); return }
    if (file.size > MAX_IMAGE_BYTES) { setError('Image must be under 10 MB.'); return }

    setError(null)
    setSuccess(null)
    setFileName(file.name)
    onFileSelected?.(file)
    setScanning(true)
    try {
      const res = await parseDocument<T>(target, file)
      const note = onParsed(res.data)
      setSuccess(`Scanned — review the fields below.${note ? ' ' + note : ''}`)
    } catch {
      setError('Could not read the document. Enter the details manually.')
    } finally {
      setScanning(false)
    }
  }

  const remove = () => {
    setFileName(null); setError(null); setSuccess(null); onFileSelected?.(null)
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handlePick}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={scanning}
        style={{
          width: '100%', padding: '12px 14px', marginBottom: 12,
          background: 'rgba(108,99,255,0.08)',
          border: '1.5px dashed rgba(108,99,255,0.4)',
          borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10,
          cursor: scanning ? 'wait' : 'pointer', transition: 'all 0.15s',
        }}
      >
        <span style={{ fontSize: 16 }}>{scanning ? '⏳' : '📷'}</span>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
            {scanning ? 'Reading…' : label}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text3)', marginTop: 1 }}>
            {hint}
          </div>
        </div>
      </button>

      {scanning && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.25)',
          borderRadius: 8, padding: '10px 12px', marginBottom: 12,
        }}>
          <CircularProgress size={14} sx={{ color: 'var(--accent)' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--accent)' }}>
            Reading document — extracting details…
          </span>
        </div>
      )}

      {success && !scanning && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--green)',
          background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)',
          borderRadius: 8, padding: '8px 12px', marginBottom: 12,
        }}>
          <span style={{ flexShrink: 0 }}>✓</span>
          <span>{success}</span>
        </div>
      )}

      {error && !scanning && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--red)',
          background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
          borderRadius: 8, padding: '8px 12px', marginBottom: 12,
        }}>
          <span style={{ flexShrink: 0 }}>⚠</span>
          <span>{error}</span>
        </div>
      )}

      {fileName && !scanning && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '8px 12px', marginBottom: 12,
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text2)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8,
          }}>
            📎 {fileName}
          </span>
          <button
            type="button"
            onClick={remove}
            style={{
              flexShrink: 0, background: 'none', border: 'none', color: 'var(--text3)',
              cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            }}
          >
            remove
          </button>
        </div>
      )}
    </>
  )
}
