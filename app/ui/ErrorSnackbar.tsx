import { useEffect, useState } from 'react'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import type { AlertColor } from '@mui/material/Alert'

export type ErrorToastDetail = { message: string; severity?: AlertColor }

// Mounted once at the app root. Listens for 'error-toast' custom events dispatched
// by the axios interceptor and shows a bottom-centre snackbar.
export default function ErrorSnackbar() {
  const [open, setOpen] = useState(false)
  const [severity, setSeverity] = useState<AlertColor>('error')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ErrorToastDetail>).detail
      setMessage(detail.message)
      setSeverity(detail.severity ?? 'error')
      setOpen(true)
    }
    window.addEventListener('error-toast', handler)
    return () => window.removeEventListener('error-toast', handler)
  }, [])

  return (
    <Snackbar
      open={open}
      autoHideDuration={5000}
      onClose={() => setOpen(false)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
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
