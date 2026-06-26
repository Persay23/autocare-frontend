import { useEffect, useState } from 'react'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import type { AlertColor } from '@mui/material/Alert'
import { useAiQuotaStore } from '@/features/ai/aiQuotaStore'

// Mounted once at the app root. After any AI action (signalled by the axios interceptor) it
// refreshes the quota and shows a brief top banner with the remaining count — or a limit-reached
// message on 429. Max-tier (unlimited) users see nothing.
export default function AiQuotaSnackbar() {
  const refresh = useAiQuotaStore((s) => s.refresh)
  const [open, setOpen] = useState(false)
  const [severity, setSeverity] = useState<AlertColor>('info')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent).detail as { ok: boolean; status?: number } | undefined

      await refresh()
      const q = useAiQuotaStore.getState().quota

      if (detail?.ok === false && detail.status === 429) {
        setSeverity('error')
        setMessage('Daily AI limit reached — resets at midnight.')
        setOpen(true)
        return
      }

      if (q && !q.unlimited && q.remaining != null) {
        setSeverity(q.remaining <= 3 ? 'warning' : 'info')
        setMessage(`${q.remaining} AI request${q.remaining === 1 ? '' : 's'} left today`)
        setOpen(true)
      }
      // unlimited (Max tier) → no banner
    }

    window.addEventListener('ai-usage', handler)
    return () => window.removeEventListener('ai-usage', handler)
  }, [refresh])

  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={() => setOpen(false)}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert
        severity={severity}
        variant="filled"
        onClose={() => setOpen(false)}
        sx={{ fontSize: 13, fontWeight: 600 }}
      >
        {message}
      </Alert>
    </Snackbar>
  )
}
