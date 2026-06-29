import { StrictMode, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { RouterProvider } from 'react-router-dom'
import './styles/global.css'
import { createAppTheme } from './styles/muiTheme'
import { useThemeStore } from './styles/themeStore'
import { router } from './router.tsx'
import { initTheme } from './styles/theme'
import AiQuotaSnackbar from './ui/AiQuotaSnackbar'
import ErrorSnackbar from './ui/ErrorSnackbar'
import PwaUpdatePrompt from './ui/PwaUpdatePrompt'

initTheme()

function Root() {
  const mode = useThemeStore((s) => s.mode)
  const theme = useMemo(() => createAppTheme(mode), [mode])
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
      <AiQuotaSnackbar />
      <ErrorSnackbar />
      <PwaUpdatePrompt />
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>
)
