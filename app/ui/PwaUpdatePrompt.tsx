import { useRegisterSW } from 'virtual:pwa-register/react'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'

export default function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  return (
    <Snackbar
      open={needRefresh}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        severity="info"
        variant="filled"
        sx={{ fontSize: 13, fontWeight: 600 }}
        action={
          <>
            <Button
              color="inherit"
              size="small"
              sx={{ fontWeight: 700 }}
              onClick={() => updateServiceWorker(true)}
            >
              Reload
            </Button>
            <Button
              color="inherit"
              size="small"
              onClick={() => setNeedRefresh(false)}
            >
              Dismiss
            </Button>
          </>
        }
      >
        New version available
      </Alert>
    </Snackbar>
  )
}
